import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface HandoffContext {
  sessionSummary?: string;
  keyEntities?: string[];
  userPreferences?: Record<string, unknown>;
  constraints?: string[];
  previousResults?: unknown[];
  urgency?: string;
}

interface DelegateTaskRequest {
  action: "delegate" | "accept" | "reject" | "start" | "complete" | "fail" | "cancel" | "list";
  taskId?: string;
  sourceAgentId?: string;
  targetAgentId?: string;
  collaborationId?: string;
  title?: string;
  description?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  taskType?: "general" | "analysis" | "generation" | "query" | "validation";
  handoffContext?: HandoffContext;
  result?: unknown;
  errorMessage?: string;
  deadline?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: DelegateTaskRequest = await req.json();
    const { action } = body;

    console.log(`[task-delegation] Action: ${action}, User: ${userId}`);

    switch (action) {
      case "delegate": {
        const { sourceAgentId, targetAgentId, collaborationId, title, description, priority, taskType, handoffContext, deadline } = body;

        if (!sourceAgentId || !targetAgentId || !title || !userId) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Create the delegated task
        const { data: task, error: taskError } = await supabase
          .from("delegated_tasks")
          .insert({
            source_agent_id: sourceAgentId,
            target_agent_id: targetAgentId,
            collaboration_id: collaborationId,
            user_id: userId,
            title,
            description,
            priority: priority || "normal",
            task_type: taskType || "general",
            handoff_context: handoffContext || {},
            deadline: deadline ? new Date(deadline).toISOString() : null,
            status: "pending",
          })
          .select()
          .single();

        if (taskError) {
          console.error("[task-delegation] Create error:", taskError);
          throw taskError;
        }

        // If there's a collaboration, send a message
        if (collaborationId) {
          await supabase.from("collaboration_messages").insert({
            collaboration_id: collaborationId,
            sender_agent_id: sourceAgentId,
            receiver_agent_id: targetAgentId,
            message_type: "task_delegation",
            payload: {
              task_id: task.id,
              title,
              priority,
              task_type: taskType,
              handoff_summary: handoffContext?.sessionSummary || "No context provided",
            },
          });
        }

        console.log(`[task-delegation] Task created: ${task.id}`);
        return new Response(
          JSON.stringify({ success: true, task }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "accept": {
        const { taskId } = body;
        if (!taskId) {
          return new Response(
            JSON.stringify({ error: "Task ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: task, error } = await supabase
          .from("delegated_tasks")
          .update({
            status: "accepted",
            accepted_at: new Date().toISOString(),
          })
          .eq("id", taskId)
          .select(`*, collaboration:agent_collaborations(*)`)
          .single();

        if (error) throw error;

        // Send acceptance message
        if (task.collaboration_id) {
          await supabase.from("collaboration_messages").insert({
            collaboration_id: task.collaboration_id,
            sender_agent_id: task.target_agent_id,
            receiver_agent_id: task.source_agent_id,
            message_type: "task_accepted",
            payload: { task_id: taskId, title: task.title },
          });
        }

        return new Response(
          JSON.stringify({ success: true, task }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reject": {
        const { taskId, errorMessage } = body;
        if (!taskId) {
          return new Response(
            JSON.stringify({ error: "Task ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: task, error } = await supabase
          .from("delegated_tasks")
          .update({
            status: "rejected",
            error_message: errorMessage || "Task rejected by target agent",
            completed_at: new Date().toISOString(),
          })
          .eq("id", taskId)
          .select()
          .single();

        if (error) throw error;

        // Send rejection message
        if (task.collaboration_id) {
          await supabase.from("collaboration_messages").insert({
            collaboration_id: task.collaboration_id,
            sender_agent_id: task.target_agent_id,
            receiver_agent_id: task.source_agent_id,
            message_type: "task_rejected",
            payload: { task_id: taskId, reason: errorMessage },
          });
        }

        return new Response(
          JSON.stringify({ success: true, task }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "start": {
        const { taskId } = body;
        if (!taskId) {
          return new Response(
            JSON.stringify({ error: "Task ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: task, error } = await supabase
          .from("delegated_tasks")
          .update({
            status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .eq("id", taskId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, task }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "complete": {
        const { taskId, result } = body;
        if (!taskId) {
          return new Response(
            JSON.stringify({ error: "Task ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get task to calculate duration
        const { data: existingTask } = await supabase
          .from("delegated_tasks")
          .select("started_at")
          .eq("id", taskId)
          .single();

        const startedAt = existingTask?.started_at ? new Date(existingTask.started_at) : new Date();
        const actualDuration = Date.now() - startedAt.getTime();

        const { data: task, error } = await supabase
          .from("delegated_tasks")
          .update({
            status: "completed",
            result: result || {},
            completed_at: new Date().toISOString(),
            actual_duration_ms: actualDuration,
          })
          .eq("id", taskId)
          .select()
          .single();

        if (error) throw error;

        // Send completion message
        if (task.collaboration_id) {
          await supabase.from("collaboration_messages").insert({
            collaboration_id: task.collaboration_id,
            sender_agent_id: task.target_agent_id,
            receiver_agent_id: task.source_agent_id,
            message_type: "task_completed",
            payload: {
              task_id: taskId,
              title: task.title,
              duration_ms: actualDuration,
              result_summary: typeof result === "object" ? "Result attached" : result,
            },
          });
        }

        return new Response(
          JSON.stringify({ success: true, task }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "fail": {
        const { taskId, errorMessage } = body;
        if (!taskId) {
          return new Response(
            JSON.stringify({ error: "Task ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: task, error } = await supabase
          .from("delegated_tasks")
          .update({
            status: "failed",
            error_message: errorMessage || "Task execution failed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", taskId)
          .select()
          .single();

        if (error) throw error;

        // Send failure message
        if (task.collaboration_id) {
          await supabase.from("collaboration_messages").insert({
            collaboration_id: task.collaboration_id,
            sender_agent_id: task.target_agent_id,
            receiver_agent_id: task.source_agent_id,
            message_type: "task_failed",
            payload: { task_id: taskId, error: errorMessage },
          });
        }

        return new Response(
          JSON.stringify({ success: true, task }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "cancel": {
        const { taskId } = body;
        if (!taskId) {
          return new Response(
            JSON.stringify({ error: "Task ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data: task, error } = await supabase
          .from("delegated_tasks")
          .update({
            status: "cancelled",
            completed_at: new Date().toISOString(),
          })
          .eq("id", taskId)
          .select()
          .single();

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, task }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "list": {
        const { sourceAgentId, targetAgentId } = body;
        
        let query = supabase
          .from("delegated_tasks")
          .select(`
            *,
            source_agent:agents!delegated_tasks_source_agent_id_fkey(id, name, model),
            target_agent:agents!delegated_tasks_target_agent_id_fkey(id, name, model)
          `)
          .order("created_at", { ascending: false });

        if (sourceAgentId) {
          query = query.eq("source_agent_id", sourceAgentId);
        }
        if (targetAgentId) {
          query = query.eq("target_agent_id", targetAgentId);
        }

        const { data: tasks, error } = await query;

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, tasks }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[task-delegation] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
