import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// MCP Protocol version
const MCP_VERSION = "2024-11-05";

interface MCPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface AgentTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get API key from header
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!apiKey) {
      return jsonRpcError(null, -32000, "API key required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key and get agent info
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from("agent_api_keys")
      .select(`
        id,
        agent_id,
        user_id,
        is_active,
        agents (
          id,
          name,
          model,
          manifest,
          status
        )
      `)
      .eq("api_key", apiKey)
      .single();

    if (apiKeyError || !apiKeyData) {
      return jsonRpcError(null, -32000, "Invalid API key");
    }

    if (!apiKeyData.is_active) {
      return jsonRpcError(null, -32000, "API key is disabled");
    }

    const agent = apiKeyData.agents as any;
    if (!agent || agent.status !== "deployed") {
      return jsonRpcError(null, -32000, "Agent is not deployed");
    }

    // Parse MCP request
    const body: MCPRequest = await req.json();
    
    if (body.jsonrpc !== "2.0") {
      return jsonRpcError(body.id, -32600, "Invalid JSON-RPC version");
    }

    console.log(`MCP request: method=${body.method}, agent=${agent.name}`);

    // Handle MCP methods
    switch (body.method) {
      case "initialize":
        return handleInitialize(body, agent);
      
      case "tools/list":
        return handleToolsList(body, agent);
      
      case "tools/call":
        return handleToolsCall(body, agent, supabase, apiKeyData);
      
      case "resources/list":
        return handleResourcesList(body, agent);
      
      case "resources/read":
        return handleResourcesRead(body, agent);
      
      case "prompts/list":
        return handlePromptsList(body, agent);
      
      case "prompts/get":
        return handlePromptsGet(body, agent);
      
      case "ping":
        return jsonRpcSuccess(body.id, {});
      
      default:
        return jsonRpcError(body.id, -32601, `Method not found: ${body.method}`);
    }

  } catch (error) {
    console.error("MCP error:", error);
    return jsonRpcError(null, -32603, "An internal error occurred. Please try again later.");
  }
});

function jsonRpcSuccess(id: string | number | null, result: unknown): Response {
  const response: MCPResponse = {
    jsonrpc: "2.0",
    id: id || 0,
    result,
  };
  return new Response(JSON.stringify(response), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function jsonRpcError(id: string | number | null, code: number, message: string, data?: unknown): Response {
  const response: MCPResponse = {
    jsonrpc: "2.0",
    id: id || 0,
    error: { code, message, data },
  };
  return new Response(JSON.stringify(response), {
    status: code === -32000 ? 401 : 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function handleInitialize(req: MCPRequest, agent: any): Response {
  return jsonRpcSuccess(req.id, {
    protocolVersion: MCP_VERSION,
    capabilities: {
      tools: { listChanged: false },
      resources: { subscribe: false, listChanged: false },
      prompts: { listChanged: false },
    },
    serverInfo: {
      name: agent.name,
      version: "1.0.0",
    },
  });
}

function handleToolsList(req: MCPRequest, agent: any): Response {
  const manifest = agent.manifest as any;
  const skills = manifest?.skills?.details || [];
  
  // Convert agent skills to MCP tools
  const tools: AgentTool[] = [
    // Default chat tool
    {
      name: "chat",
      description: `Chat with ${agent.name}. Send a message and receive an AI response.`,
      inputSchema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The message to send to the agent",
          },
          context: {
            type: "string",
            description: "Optional context or system instructions",
          },
        },
        required: ["message"],
      },
    },
  ];

  // Add skills as tools
  for (const skill of skills) {
    const inputs = skill.inputs || {};
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(inputs)) {
      const inputDef = value as any;
      properties[key] = {
        type: inputDef.type || "string",
        description: inputDef.description || key,
      };
      if (inputDef.required) {
        required.push(key);
      }
    }

    tools.push({
      name: `skill_${skill.name.replace(/\s+/g, "_").toLowerCase()}`,
      description: skill.description || `Execute the ${skill.name} skill`,
      inputSchema: {
        type: "object",
        properties: properties.message ? properties : {
          input: {
            type: "string",
            description: "Input for the skill",
          },
          ...properties,
        },
        required: required.length > 0 ? required : undefined,
      },
    });
  }

  return jsonRpcSuccess(req.id, { tools });
}

async function handleToolsCall(
  req: MCPRequest,
  agent: any,
  supabase: any,
  apiKeyData: any
): Promise<Response> {
  const params = req.params as { name: string; arguments?: Record<string, unknown> };
  
  if (!params?.name) {
    return jsonRpcError(req.id, -32602, "Tool name is required");
  }

  const startTime = Date.now();
  const manifest = agent.manifest as any;
  const systemPrompt = manifest?.system_prompt || `You are ${agent.name}, an AI assistant.`;
  
  // Terminal style instructions with role meta protocol
  const terminalStyle = `
响应格式：禁用 # 标题。使用 [标题]、---、[v]/[x]/(!)、┌─├─└─│ 结构符号。禁止使用 **双星号**，改用「书名号」包裹关键词。

每次回复开头必须包含元数据标签：
- 规划架构时: <meta role="architect" mood="neutral" />
- 编写代码时: <meta role="engineer" mood="neutral" />
- 检索知识时: <meta role="researcher" mood="neutral" />
- 安全警告时: <meta role="auditor" mood="warning" />
`;

  let userMessage = "";
  let enhancedSystemPrompt = systemPrompt + terminalStyle;

  if (params.name === "chat") {
    userMessage = (params.arguments?.message as string) || "";
    if (params.arguments?.context) {
      enhancedSystemPrompt += `\n\nAdditional context: ${params.arguments.context}`;
    }
  } else if (params.name.startsWith("skill_")) {
    const skillName = params.name.replace("skill_", "").replace(/_/g, " ");
    const skills = manifest?.skills?.details || [];
    const skill = skills.find((s: any) => 
      s.name.toLowerCase().replace(/\s+/g, " ") === skillName.toLowerCase().replace(/_/g, " ")
    );
    
    if (skill) {
      enhancedSystemPrompt += `\n\nYou are now executing the "${skill.name}" skill. ${skill.description || ""}`;
      if (skill.content) {
        enhancedSystemPrompt += `\n\nSkill instructions:\n${skill.content}`;
      }
    }
    
    userMessage = JSON.stringify(params.arguments || {});
  } else {
    return jsonRpcError(req.id, -32602, `Unknown tool: ${params.name}`);
  }

  // Call AI
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return jsonRpcError(req.id, -32603, "AI service not configured");
  }

  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error("AI Gateway error:", aiResponse.status, errorText);
    return jsonRpcError(req.id, -32603, "AI service error");
  }

  const aiData = await aiResponse.json();
  const responseContent = aiData.choices?.[0]?.message?.content || "";
  const tokensUsed = aiData.usage?.total_tokens || 0;
  const latencyMs = Date.now() - startTime;

  // Log the call
  await supabase.from("agent_api_logs").insert({
    api_key_id: apiKeyData.id,
    agent_id: apiKeyData.agent_id,
    user_id: apiKeyData.user_id,
    request_body: { mcp_method: "tools/call", tool: params.name, arguments: params.arguments },
    response_body: { content: responseContent },
    status_code: 200,
    latency_ms: latencyMs,
    tokens_used: tokensUsed,
  });

  return jsonRpcSuccess(req.id, {
    content: [
      {
        type: "text",
        text: responseContent,
      },
    ],
    isError: false,
  });
}

function handleResourcesList(req: MCPRequest, agent: any): Response {
  const manifest = agent.manifest as any;
  const resources = [];

  // Expose agent manifest as a resource
  resources.push({
    uri: `agent://${agent.id}/manifest`,
    name: "Agent Manifest",
    description: `Configuration manifest for ${agent.name}`,
    mimeType: "application/json",
  });

  // Expose agent info
  resources.push({
    uri: `agent://${agent.id}/info`,
    name: "Agent Info",
    description: `Basic information about ${agent.name}`,
    mimeType: "application/json",
  });

  return jsonRpcSuccess(req.id, { resources });
}

function handleResourcesRead(req: MCPRequest, agent: any): Response {
  const params = req.params as { uri: string };
  
  if (!params?.uri) {
    return jsonRpcError(req.id, -32602, "Resource URI is required");
  }

  if (params.uri === `agent://${agent.id}/manifest`) {
    return jsonRpcSuccess(req.id, {
      contents: [
        {
          uri: params.uri,
          mimeType: "application/json",
          text: JSON.stringify(agent.manifest || {}, null, 2),
        },
      ],
    });
  }

  if (params.uri === `agent://${agent.id}/info`) {
    return jsonRpcSuccess(req.id, {
      contents: [
        {
          uri: params.uri,
          mimeType: "application/json",
          text: JSON.stringify({
            id: agent.id,
            name: agent.name,
            model: agent.model,
            status: agent.status,
          }, null, 2),
        },
      ],
    });
  }

  return jsonRpcError(req.id, -32602, `Resource not found: ${params.uri}`);
}

function handlePromptsList(req: MCPRequest, agent: any): Response {
  const manifest = agent.manifest as any;
  const prompts = [];

  // Default conversation prompt
  prompts.push({
    name: "conversation",
    description: `Start a conversation with ${agent.name}`,
    arguments: [
      {
        name: "topic",
        description: "The topic to discuss",
        required: false,
      },
    ],
  });

  // Add skill-based prompts
  const skills = manifest?.skills?.details || [];
  for (const skill of skills) {
    prompts.push({
      name: `skill_${skill.name.replace(/\s+/g, "_").toLowerCase()}`,
      description: skill.description || `Use the ${skill.name} skill`,
      arguments: [
        {
          name: "input",
          description: "Input for the skill",
          required: true,
        },
      ],
    });
  }

  return jsonRpcSuccess(req.id, { prompts });
}

function handlePromptsGet(req: MCPRequest, agent: any): Response {
  const params = req.params as { name: string; arguments?: Record<string, string> };
  
  if (!params?.name) {
    return jsonRpcError(req.id, -32602, "Prompt name is required");
  }

  const manifest = agent.manifest as any;
  const systemPrompt = manifest?.system_prompt || `You are ${agent.name}, an AI assistant.`;

  if (params.name === "conversation") {
    const topic = params.arguments?.topic || "general assistance";
    return jsonRpcSuccess(req.id, {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Let's discuss ${topic}. How can you help me with this?`,
          },
        },
      ],
    });
  }

  if (params.name.startsWith("skill_")) {
    const skillName = params.name.replace("skill_", "").replace(/_/g, " ");
    const skills = manifest?.skills?.details || [];
    const skill = skills.find((s: any) => 
      s.name.toLowerCase().replace(/\s+/g, " ") === skillName.toLowerCase().replace(/_/g, " ")
    );

    if (skill) {
      const input = params.arguments?.input || "";
      return jsonRpcSuccess(req.id, {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Using the ${skill.name} skill: ${input}`,
            },
          },
        ],
      });
    }
  }

  return jsonRpcError(req.id, -32602, `Prompt not found: ${params.name}`);
}
