import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================
// Types
// ============================

interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface WorkflowRequest {
  workflowId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  inputs: Record<string, unknown>;
  mode?: "workflow" | "chatflow";
}

interface NodeResult {
  nodeId: string;
  nodeType: string;
  status: "success" | "failed" | "skipped";
  output: Record<string, unknown>;
  duration: number;
  tokensUsed: number;
  error?: string;
}

// ============================
// Topological Sort (Kahn's algorithm)
// ============================

function topologicalSort(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const nodeIds = new Set(nodes.map(n => n.id));
  const inDegree: Record<string, number> = {};
  const adjacency: Record<string, string[]> = {};

  for (const id of nodeIds) {
    inDegree[id] = 0;
    adjacency[id] = [];
  }

  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      adjacency[edge.source].push(edge.target);
      inDegree[edge.target]++;
    }
  }

  const queue: string[] = [];
  for (const id of nodeIds) {
    if (inDegree[id] === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adjacency[current]) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) queue.push(neighbor);
    }
  }

  if (sorted.length !== nodeIds.size) {
    throw new Error("Cycle detected in workflow graph");
  }

  return sorted;
}

// ============================
// Variable Resolution
// ============================

function resolveVariables(
  template: string,
  context: Record<string, Record<string, unknown>>
): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, expr) => {
    const parts = expr.trim().split(".");
    if (parts.length < 2) return match;
    const [nodeId, ...pathParts] = parts;
    const nodeData = context[nodeId];
    if (!nodeData) return match;
    let current: unknown = nodeData;
    for (const key of pathParts) {
      if (current === null || current === undefined || typeof current !== "object") return match;
      current = (current as Record<string, unknown>)[key];
    }
    return current !== undefined && current !== null ? String(current) : match;
  });
}

function resolveDeep(
  obj: unknown,
  context: Record<string, Record<string, unknown>>
): unknown {
  if (typeof obj === "string") return resolveVariables(obj, context);
  if (Array.isArray(obj)) return obj.map(item => resolveDeep(item, context));
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveDeep(value, context);
    }
    return result;
  }
  return obj;
}

// ============================
// Node Executors
// ============================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function callEdgeFunction(name: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { error: text, success: false };
  }
}

async function executeLLMNode(
  data: Record<string, unknown>,
  context: Record<string, Record<string, unknown>>
): Promise<{ output: Record<string, unknown>; tokensUsed: number }> {
  // Support both flat data.* and nested data.config.* (from config panel)
  const config = (data.config || {}) as Record<string, unknown>;
  const model = String(config.model || data.model || "google/gemini-2.5-flash");
  const temperature = (config.temperature ?? data.temperature ?? 0.7) as number;
  const topP = (config.topP ?? data.topP ?? 1.0) as number;
  const maxTokens = (config.maxTokens ?? data.maxTokens ?? 4096) as number;
  const rawSystemPrompt = String(config.systemPrompt || data.systemPrompt || "");
  const rawUserMessage = String(config.userMessage || data.userMessage || data.prompt || "");
  const structuredOutputEnabled = !!(config.structuredOutput || data.structuredOutput);
  const outputSchema = (config.outputSchema || data.outputSchema) as Record<string, unknown> | undefined;

  const systemPrompt = resolveVariables(rawSystemPrompt, context);
  const userMessage = resolveVariables(rawUserMessage, context);
  
  const messages: Array<{ role: string; content: string }> = [];
  if (userMessage) messages.push({ role: "user", content: userMessage });

  // Build structured output config
  const structuredOutput = structuredOutputEnabled && outputSchema
    ? { enabled: true, schema: outputSchema }
    : undefined;

  const result = await callEdgeFunction("workflow-llm-call", {
    model,
    messages,
    systemPrompt,
    temperature,
    topP,
    maxTokens,
    structuredOutput,
  }) as Record<string, unknown>;

  const metadata = (result.metadata || {}) as Record<string, unknown>;
  const usage = (metadata.usage || {}) as Record<string, number>;

  return {
    output: {
      text: result.text || "",
      structuredOutput: result.structuredOutput || null,
    },
    tokensUsed: (usage.total_tokens || 0),
  };
}

async function executeCodeNode(
  data: Record<string, unknown>,
  context: Record<string, Record<string, unknown>>
): Promise<{ output: Record<string, unknown>; tokensUsed: number }> {
  const code = String(data.code || "");
  const variables: Record<string, unknown> = {};
  
  // Resolve input variables
  const inputVars = (data.inputVariables || []) as Array<{ name: string; value: string }>;
  for (const v of inputVars) {
    variables[v.name] = resolveVariables(String(v.value || ""), context);
  }

  const result = await callEdgeFunction("workflow-code-executor", {
    language: "javascript",
    code,
    variables,
    timeout: data.timeout || 5000,
  }) as Record<string, unknown>;

  return {
    output: {
      result: result.result,
      logs: result.logs || [],
      success: result.success,
      error: result.error,
    },
    tokensUsed: 0,
  };
}

async function executeHTTPNode(
  data: Record<string, unknown>,
  context: Record<string, Record<string, unknown>>
): Promise<{ output: Record<string, unknown>; tokensUsed: number }> {
  const url = resolveVariables(String(data.url || ""), context);
  const method = String(data.method || "GET").toUpperCase();
  const headersArr = (data.headers || []) as Array<{ key: string; value: string }>;
  const headers: Record<string, string> = {};
  for (const h of headersArr) {
    if (h.key) headers[h.key] = resolveVariables(h.value, context);
  }

  const result = await callEdgeFunction("workflow-http-request", {
    url,
    method,
    headers,
    body: data.body ? resolveDeep(data.body, context) : undefined,
    timeout: data.timeout || 10000,
  }) as Record<string, unknown>;

  return {
    output: {
      status: result.status,
      data: result.data,
      headers: result.headers,
      success: result.success,
      error: result.error,
    },
    tokensUsed: 0,
  };
}

function executeConditionNode(
  data: Record<string, unknown>,
  context: Record<string, Record<string, unknown>>
): { output: Record<string, unknown>; branch: string } {
  const conditions = (data.conditions || []) as Array<{
    id: string;
    variable: string;
    operator: string;
    value: string;
    logicalOperator?: string;
  }>;

  let result = false;
  for (const cond of conditions) {
    const actual = resolveVariables(cond.variable || "", context);
    const expected = resolveVariables(cond.value || "", context);
    let match = false;

    switch (cond.operator) {
      case "equals": match = actual === expected; break;
      case "not_equals": match = actual !== expected; break;
      case "contains": match = actual.includes(expected); break;
      case "not_contains": match = !actual.includes(expected); break;
      case "greater_than": match = Number(actual) > Number(expected); break;
      case "less_than": match = Number(actual) < Number(expected); break;
      case "is_empty": match = !actual || actual.trim() === ""; break;
      case "is_not_empty": match = !!actual && actual.trim() !== ""; break;
      default: match = actual === expected;
    }

    if (cond.logicalOperator === "or") {
      result = result || match;
    } else {
      result = conditions.indexOf(cond) === 0 ? match : result && match;
    }
  }

  return {
    output: { result, evaluatedValue: result },
    branch: result ? "true" : "false",
  };
}

function executeTemplateNode(
  data: Record<string, unknown>,
  context: Record<string, Record<string, unknown>>
): { output: Record<string, unknown> } {
  const template = String(data.template || "");
  const rendered = resolveVariables(template, context);
  return { output: { text: rendered } };
}

function executeAggregatorNode(
  data: Record<string, unknown>,
  context: Record<string, Record<string, unknown>>
): { output: Record<string, unknown> } {
  const inputVars = (data.inputVariables || []) as string[];
  const values: unknown[] = [];
  for (const ref of inputVars) {
    const resolved = resolveVariables(`{{${ref}}}`, context);
    values.push(resolved);
  }
  return { output: { values, count: values.length } };
}

function executeExtractorNode(
  data: Record<string, unknown>,
  context: Record<string, Record<string, unknown>>
): { output: Record<string, unknown> } {
  // Parameter extractor is essentially an LLM call with structured output
  // For now, pass through; real impl would call LLM
  const input = resolveVariables(String(data.inputText || ""), context);
  const params = (data.parameters || []) as Array<{ name: string; type: string }>;
  const extracted: Record<string, unknown> = {};
  for (const p of params) {
    extracted[p.name] = null; // placeholder - real impl calls LLM
  }
  return { output: { input, extracted, parameters: params } };
}

// ============================
// Main Executor
// ============================

async function executeNode(
  node: WorkflowNode,
  context: Record<string, Record<string, unknown>>,
  edges: WorkflowEdge[]
): Promise<NodeResult> {
  const startTime = Date.now();
  
  try {
    let output: Record<string, unknown> = {};
    let tokensUsed = 0;

    switch (node.type) {
      case "trigger": {
        // Trigger node just passes through its input data
        output = (node.data.inputs || {}) as Record<string, unknown>;
        break;
      }
      case "llm": {
        const r = await executeLLMNode(node.data, context);
        output = r.output;
        tokensUsed = r.tokensUsed;
        break;
      }
      case "code": {
        const r = await executeCodeNode(node.data, context);
        output = r.output;
        break;
      }
      case "httpRequest": {
        const r = await executeHTTPNode(node.data, context);
        output = r.output;
        break;
      }
      case "condition": {
        const r = executeConditionNode(node.data, context);
        output = r.output;
        // Store branch decision for edge routing
        output._branch = r.branch;
        break;
      }
      case "template": {
        const r = executeTemplateNode(node.data, context);
        output = r.output;
        break;
      }
      case "variableAggregator": {
        const r = executeAggregatorNode(node.data, context);
        output = r.output;
        break;
      }
      case "parameterExtractor": {
        const r = executeExtractorNode(node.data, context);
        output = r.output;
        break;
      }
      case "iterator": {
        // Iterator: get input array, iterate (simplified - runs sub-nodes inline)
        const inputRef = String(node.data.inputVariable || "");
        const resolved = resolveVariables(`{{${inputRef}}}`, context);
        let items: unknown[];
        try { items = JSON.parse(resolved); } catch { items = [resolved]; }
        output = { items, count: items.length, results: items };
        break;
      }
      case "output": {
        // Collect all specified output mappings
        const mappings = (node.data.outputMappings || []) as Array<{ name: string; value: string }>;
        for (const m of mappings) {
          output[m.name] = resolveVariables(m.value, context);
        }
        // If no mappings, pass through last node's output
        if (Object.keys(output).length === 0) {
          const incomingEdge = edges.find(e => e.target === node.id);
          if (incomingEdge && context[incomingEdge.source]) {
            output = { ...context[incomingEdge.source] };
          }
        }
        break;
      }
      default: {
        // Unknown node type - pass through
        output = { _passthrough: true, type: node.type };
        break;
      }
    }

    return {
      nodeId: node.id,
      nodeType: node.type,
      status: "success",
      output,
      duration: Date.now() - startTime,
      tokensUsed,
    };
  } catch (error) {
    return {
      nodeId: node.id,
      nodeType: node.type,
      status: "failed",
      output: {},
      duration: Date.now() - startTime,
      tokensUsed: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Determine which nodes to execute next after a condition node
function getConditionTargets(
  condNodeId: string,
  branch: string,
  edges: WorkflowEdge[]
): Set<string> {
  const targets = new Set<string>();
  for (const edge of edges) {
    if (edge.source === condNodeId) {
      const handle = edge.sourceHandle || "";
      if (handle.includes(branch) || handle === branch || handle === "") {
        targets.add(edge.target);
      }
    }
  }
  return targets;
}

// ============================
// SSE Streaming
// ============================

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;
  
  const stream = new ReadableStream({
    start(c) { controller = c; },
    cancel() { controller = null; },
  });

  function send(event: string, data: unknown) {
    if (!controller) return;
    try {
      controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    } catch { /* stream closed */ }
  }

  function close() {
    if (!controller) return;
    try { controller.close(); } catch { /* already closed */ }
  }

  return { stream, send, close };
}

// ============================
// Main Handler
// ============================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflowId, nodes, edges, inputs, mode }: WorkflowRequest = await req.json();

    if (!nodes || nodes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No nodes provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for auth and get user id
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader?.startsWith("Bearer ")) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
      userId = data?.claims?.sub as string || null;
    }

    // Create run record if authenticated
    let runId: string | null = null;
    if (userId) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader! } },
      });
      const { data: run } = await supabase
        .from("workflow_runs")
        .insert({
          workflow_id: workflowId || "00000000-0000-0000-0000-000000000000",
          user_id: userId,
          status: "running",
          mode: mode || "workflow",
          inputs,
        })
        .select("id")
        .single();
      runId = run?.id || null;
    }

    // Set up SSE
    const { stream, send, close } = createSSEStream();

    // Execute in background
    (async () => {
      const nodeResults: NodeResult[] = [];
      const context: Record<string, Record<string, unknown>> = {};
      let totalTokens = 0;
      const startTime = Date.now();
      let finalStatus: "completed" | "failed" = "completed";

      try {
        // Sort nodes topologically
        const executionOrder = topologicalSort(nodes, edges);
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const skippedNodes = new Set<string>();

        // Set trigger/start inputs in context
        context["start"] = inputs;
        context["sys"] = {
          user_id: userId || "",
          run_id: runId || "",
          timestamp: new Date().toISOString(),
        };

        send("workflow_start", {
          runId,
          workflowId,
          totalNodes: executionOrder.length,
          executionOrder,
        });

        for (const nodeId of executionOrder) {
          const node = nodeMap.get(nodeId);
          if (!node) continue;

          // Skip nodes that are after a false condition branch
          if (skippedNodes.has(nodeId)) {
            const skipResult: NodeResult = {
              nodeId,
              nodeType: node.type,
              status: "skipped",
              output: {},
              duration: 0,
              tokensUsed: 0,
            };
            nodeResults.push(skipResult);
            send("node_skipped", skipResult);
            continue;
          }

          // If trigger node, inject inputs
          if (node.type === "trigger") {
            node.data.inputs = inputs;
          }

          send("node_start", { nodeId, nodeType: node.type, timestamp: Date.now() });

          const result = await executeNode(node, context, edges);
          nodeResults.push(result);
          totalTokens += result.tokensUsed;

          // Store output in context for downstream nodes
          context[nodeId] = result.output;

          // Handle condition branching
          if (node.type === "condition" && result.status === "success") {
            const branch = String(result.output._branch || "false");
            const oppositeBranch = branch === "true" ? "false" : "true";
            
            // Find nodes on the opposite branch and skip them
            const skipTargets = getConditionTargets(nodeId, oppositeBranch, edges);
            for (const t of skipTargets) skippedNodes.add(t);
          }

          send("node_complete", {
            ...result,
            timestamp: Date.now(),
          });

          if (result.status === "failed") {
            finalStatus = "failed";
            send("workflow_error", {
              nodeId,
              error: result.error,
            });
            break;
          }
        }

        const totalDuration = Date.now() - startTime;

        // Find output node result
        const outputNode = nodeResults.find(r => r.nodeType === "output" && r.status === "success");
        const finalOutputs = outputNode?.output || context[executionOrder[executionOrder.length - 1]] || {};

        // Update run record
        if (userId && runId) {
          const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader! } },
          });
          await supabase
            .from("workflow_runs")
            .update({
              status: finalStatus,
              outputs: finalOutputs,
              node_results: nodeResults,
              total_duration_ms: totalDuration,
              total_tokens_used: totalTokens,
              completed_at: new Date().toISOString(),
              error_message: finalStatus === "failed" 
                ? nodeResults.find(r => r.status === "failed")?.error 
                : null,
            })
            .eq("id", runId);
        }

        send("workflow_complete", {
          runId,
          status: finalStatus,
          outputs: finalOutputs,
          totalDuration,
          totalTokens,
          nodeResults: nodeResults.length,
        });
      } catch (error) {
        send("workflow_error", {
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        close();
      }
    })();

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("workflow-executor error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
