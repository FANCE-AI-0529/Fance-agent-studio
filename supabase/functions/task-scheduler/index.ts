import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Declare EdgeRuntime for Deno
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

// Priority definitions with latency constraints
const PRIORITY_CONFIG = {
  hrt: { // Hard Real-Time
    maxLatencyMs: 100,
    description: "合规检查、敏感词过滤",
    circuitBreaker: true, // Must complete or abort request
  },
  srt: { // Soft Real-Time  
    maxLatencyMs: 2000,
    description: "UI渲染、流式输出",
    circuitBreaker: false,
  },
  dt: { // Delay-Tolerant
    maxLatencyMs: 30000,
    description: "日志归档、记忆更新",
    circuitBreaker: false,
  },
};

interface Task {
  id: string;
  priority: "hrt" | "srt" | "dt";
  task_type: string;
  payload: Record<string, unknown>;
  max_latency_ms?: number;
}

interface TaskResult {
  task_id: string;
  success: boolean;
  result?: unknown;
  error?: string;
  execution_time_ms: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// Task executor based on type
async function executeTask(task: Task, supabase: AnySupabaseClient): Promise<TaskResult> {
  const startTime = Date.now();
  
  try {
    let result: unknown;
    
    switch (task.task_type) {
      case "compliance_check":
        result = await executeComplianceCheck(task.payload);
        break;
      case "content_filter":
        result = await executeContentFilter(task.payload);
        break;
      case "memory_update":
        result = await executeMemoryUpdate(task.payload, supabase);
        break;
      case "log_archive":
        result = await executeLogArchive(task.payload, supabase);
        break;
      case "model_inference":
        result = await executeModelInference(task.payload);
        break;
      default:
        result = { message: `Unknown task type: ${task.task_type}` };
    }
    
    return {
      task_id: task.id,
      success: true,
      result,
      execution_time_ms: Date.now() - startTime,
    };
  } catch (error) {
    console.error(`[scheduler] Task ${task.id} failed:`, error);
    return {
      task_id: task.id,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      execution_time_ms: Date.now() - startTime,
    };
  }
}

// HRT: Compliance check - must complete within 100ms
async function executeComplianceCheck(payload: Record<string, unknown>): Promise<unknown> {
  const content = payload.content as string || "";
  
  // Simple keyword-based compliance check
  const sensitivePatterns = [
    /密码/g,
    /身份证/g,
    /银行卡/g,
    /信用卡/g,
  ];
  
  const findings = sensitivePatterns
    .filter(pattern => pattern.test(content))
    .map(pattern => pattern.source);
  
  return {
    passed: findings.length === 0,
    findings,
    risk_level: findings.length > 2 ? "high" : findings.length > 0 ? "medium" : "low",
  };
}

// HRT: Content filter - must complete within 100ms
async function executeContentFilter(payload: Record<string, unknown>): Promise<unknown> {
  const content = payload.content as string || "";
  
  // Simplified content filter
  const blockedTerms = ["violence", "spam", "phishing"];
  const detected = blockedTerms.filter(term => 
    content.toLowerCase().includes(term)
  );
  
  return {
    safe: detected.length === 0,
    blocked_terms: detected,
    filtered_content: detected.length > 0 ? "[CONTENT FILTERED]" : content,
  };
}

// DT: Memory update - can be delayed
async function executeMemoryUpdate(
  payload: Record<string, unknown>,
  supabase: AnySupabaseClient
): Promise<unknown> {
  const sessionId = payload.session_id as string;
  const memoryData = payload.memory as Record<string, unknown>;
  
  if (!sessionId || !memoryData) {
    return { updated: false, reason: "Missing session_id or memory data" };
  }
  
  // This would update session memory/context
  console.log(`[scheduler] Updating memory for session ${sessionId}`);
  
  return {
    updated: true,
    session_id: sessionId,
    keys_updated: Object.keys(memoryData).length,
  };
}

// DT: Log archive - background task
async function executeLogArchive(
  payload: Record<string, unknown>,
  supabase: AnySupabaseClient
): Promise<unknown> {
  const sessionId = payload.session_id as string;
  const logs = payload.logs as unknown[];
  
  console.log(`[scheduler] Archiving ${logs?.length || 0} logs for session ${sessionId}`);
  
  // Simulate archival
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return {
    archived: true,
    count: logs?.length || 0,
    timestamp: new Date().toISOString(),
  };
}

// SRT: Model inference routing
async function executeModelInference(payload: Record<string, unknown>): Promise<unknown> {
  const model = payload.model as string || "google/gemini-2.5-flash";
  const prompt = payload.prompt as string || "";
  
  console.log(`[scheduler] Model inference routed to: ${model}`);
  
  // This would call the actual model API
  return {
    model,
    routed: true,
    estimated_tokens: Math.ceil(prompt.length / 4),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { action, tasks, task } = await req.json();

    switch (action) {
      case "submit": {
        // Submit a single task
        if (!task) {
          return new Response(
            JSON.stringify({ error: "Missing task" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const priorityConfig = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.srt;
        
        // Execute immediately for HRT tasks
        if (task.priority === "hrt") {
          const result = await Promise.race([
            executeTask(task, supabase),
            new Promise<TaskResult>((_, reject) => 
              setTimeout(() => reject(new Error("HRT timeout")), priorityConfig.maxLatencyMs)
            ),
          ]);
          
          if (!result.success && priorityConfig.circuitBreaker) {
            console.error(`[scheduler] HRT task failed with circuit breaker: ${result.error}`);
            return new Response(
              JSON.stringify({ 
                error: "Critical task failed", 
                circuit_broken: true,
                task_id: task.id,
              }),
              { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // For SRT/DT tasks, queue them
        const { data: queuedTask, error } = await supabase
          .from("task_queue")
          .insert({
            priority: task.priority,
            task_type: task.task_type,
            payload: task.payload,
            max_latency_ms: task.max_latency_ms || priorityConfig.maxLatencyMs,
            user_id: (await supabase.auth.getUser()).data.user?.id,
          })
          .select()
          .single();

        if (error) {
          console.error("[scheduler] Queue insert error:", error);
          throw error;
        }

        // For SRT, execute inline but don't block
        if (task.priority === "srt") {
          const result = await executeTask({ ...task, id: queuedTask.id }, supabase);
          
          // Update task status
          await supabase
            .from("task_queue")
            .update({
              status: result.success ? "completed" : "failed",
              result: result.result,
              error_message: result.error,
              completed_at: new Date().toISOString(),
              execution_time_ms: result.execution_time_ms,
            })
            .eq("id", queuedTask.id);

          return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // DT tasks are queued for background processing
        EdgeRuntime.waitUntil((async () => {
          const result = await executeTask({ ...task, id: queuedTask.id }, supabase);
          
          await supabase
            .from("task_queue")
            .update({
              status: result.success ? "completed" : "failed",
              result: result.result,
              error_message: result.error,
              completed_at: new Date().toISOString(),
              execution_time_ms: result.execution_time_ms,
            })
            .eq("id", queuedTask.id);
            
          console.log(`[scheduler] DT task ${queuedTask.id} completed in background`);
        })());

        return new Response(
          JSON.stringify({ 
            queued: true, 
            task_id: queuedTask.id,
            priority: task.priority,
            estimated_completion: new Date(Date.now() + priorityConfig.maxLatencyMs).toISOString(),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "batch": {
        // Process multiple tasks with priority ordering
        if (!tasks || !Array.isArray(tasks)) {
          return new Response(
            JSON.stringify({ error: "Missing tasks array" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Sort by priority: HRT first, then SRT, then DT
        const priorityOrder = { hrt: 0, srt: 1, dt: 2 };
        const sortedTasks = [...tasks].sort((a, b) => 
          (priorityOrder[a.priority as keyof typeof priorityOrder] || 1) - 
          (priorityOrder[b.priority as keyof typeof priorityOrder] || 1)
        );

        const results: TaskResult[] = [];
        
        for (const t of sortedTasks) {
          const result = await executeTask(t, supabase);
          results.push(result);
          
          // If HRT task fails with circuit breaker, abort batch
          if (t.priority === "hrt" && !result.success && PRIORITY_CONFIG.hrt.circuitBreaker) {
            console.error("[scheduler] Batch aborted due to HRT failure");
            return new Response(
              JSON.stringify({
                error: "Batch aborted due to critical task failure",
                completed: results,
                aborted_at: t.id,
              }),
              { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }

        return new Response(
          JSON.stringify({ results }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "status": {
        // Check task status
        const taskId = task?.id;
        if (!taskId) {
          return new Response(
            JSON.stringify({ error: "Missing task id" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: taskData, error } = await supabase
          .from("task_queue")
          .select("*")
          .eq("id", taskId)
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify(taskData),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[task-scheduler] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
