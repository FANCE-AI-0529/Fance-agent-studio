import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

// Key entity extracted from conversation
interface KeyEntity {
  name: string;
  type: "person" | "organization" | "location" | "date" | "number" | "policy" | "document" | "other";
  value?: string;
  confidence?: number;
  source?: string;
}

// Completed step in the workflow
interface DoneStep {
  stepId: string;
  description: string;
  completedAt: string;
  result?: unknown;
  agentId?: string;
}

// Artifact generated during the workflow
interface Artifact {
  id: string;
  type: "document" | "report" | "form" | "calculation" | "data" | "image" | "other";
  name: string;
  url?: string;
  content?: string;
  createdAt: string;
  createdBy?: string;
}

// User preferences for the task
interface UserPreferences {
  language?: string;
  responseFormat?: "brief" | "detailed" | "structured";
  priorityFocus?: string[];
  excludeTopics?: string[];
  customPreferences?: Record<string, unknown>;
}

// Enhanced HandoffPacket following A2A protocol
interface HandoffContext {
  // Core task context
  goal?: string;
  userQuery?: string;
  urgency?: "low" | "normal" | "high" | "urgent";
  
  // Conversation context
  conversationSummary?: string;
  conversationId?: string;
  turnCount?: number;
  
  // Completed work history
  doneHistory?: DoneStep[];
  previousResults?: unknown[];
  
  // Key information extracted
  keyEntities?: KeyEntity[];
  
  // Constraints and rules
  constraints?: string[];
  legalRequirements?: string[];
  
  // Generated artifacts
  artifacts?: Artifact[];
  
  // User context
  userPreferences?: UserPreferences;
  userProfile?: {
    department?: string;
    role?: string;
    accessLevel?: string;
  };
  
  // Agent-specific context
  sourceAgentContext?: {
    agentId: string;
    agentName: string;
    capabilities: string[];
    reasonForHandoff: string;
  };
  
  // Metadata
  handoffTimestamp?: string;
  protocolVersion?: string;
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
  handoffContext?: Record<string, unknown>;
  result?: unknown;
  errorMessage?: string;
  deadline?: string;
}

Deno.serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Mandatory auth via getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub as string;

    const body: DelegateTaskRequest = await req.json();
    const { action } = body;

    switch (action) {
      case "delegate": {
        const { sourceAgentId, targetAgentId, collaborationId, title, description, priority, taskType, handoffContext, deadline } = body;

        if (!sourceAgentId || !targetAgentId || !title) {
          return new Response(
            JSON.stringify({ error: "Missing required fields" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

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

        if (taskError) throw taskError;

        if (collaborationId) {
          await supabase.from("collaboration_messages").insert({
            collaboration_id: collaborationId,
            sender_agent_id: sourceAgentId,
            receiver_agent_id: targetAgentId,
            message_type: "task_delegation",
            payload: { task_id: task.id, title, priority, task_type: taskType },
          });
        }

        return new Response(JSON.stringify({ success: true, task }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "accept": {
        const { taskId } = body;
        if (!taskId) return new Response(JSON.stringify({ error: "Task ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const { data: task, error } = await supabase
          .from("delegated_tasks")
          .update({ status: "accepted", accepted_at: new Date().toISOString() })
          .eq("id", taskId)
          .eq("user_id", userId)
          .select(`*, collaboration:agent_collaborations(*)`)
          .single();

        if (error) throw error;

        if (task.collaboration_id) {
          await supabase.from("collaboration_messages").insert({
            collaboration_id: task.collaboration_id,
            sender_agent_id: task.target_agent_id,
            receiver_agent_id: task.source_agent_id,
            message_type: "task_accepted",
            payload: { task_id: taskId, title: task.title },
          });
        }

        return new Response(JSON.stringify({ success: true, task }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "reject": {
        const { taskId, errorMessage } = body;
        if (!taskId) return new Response(JSON.stringify({ error: "Task ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const { data: task, error } = await supabase
          .from("delegated_tasks")
          .update({ status: "rejected", error_message: errorMessage || "Task rejected", completed_at: new Date().toISOString() })
          .eq("id", taskId)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;

        if (task.collaboration_id) {
          await supabase.from("collaboration_messages").insert({
            collaboration_id: task.collaboration_id,
            sender_agent_id: task.target_agent_id,
            receiver_agent_id: task.source_agent_id,
            message_type: "task_rejected",
            payload: { task_id: taskId, reason: errorMessage },
          });
        }

        return new Response(JSON.stringify({ success: true, task }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "start": {
        const { taskId } = body;
        if (!taskId) return new Response(JSON.stringify({ error: "Task ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const { data: task, error } = await supabase
          .from("delegated_tasks")
          .update({ status: "in_progress", started_at: new Date().toISOString() })
          .eq("id", taskId)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, task }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "complete": {
        const { taskId, result } = body;
        if (!taskId) return new Response(JSON.stringify({ error: "Task ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const { data: existingTask } = await supabase.from("delegated_tasks").select("started_at").eq("id", taskId).eq("user_id", userId).single();
        const startedAt = existingTask?.started_at ? new Date(existingTask.started_at) : new Date();
        const actualDuration = Date.now() - startedAt.getTime();

        const { data: task, error } = await supabase
          .from("delegated_tasks")
          .update({ status: "completed", result: result || {}, completed_at: new Date().toISOString(), actual_duration_ms: actualDuration })
          .eq("id", taskId)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;

        if (task.collaboration_id) {
          await supabase.from("collaboration_messages").insert({
            collaboration_id: task.collaboration_id,
            sender_agent_id: task.target_agent_id,
            receiver_agent_id: task.source_agent_id,
            message_type: "task_completed",
            payload: { task_id: taskId, title: task.title, duration_ms: actualDuration },
          });
        }

        return new Response(JSON.stringify({ success: true, task }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "fail": {
        const { taskId, errorMessage } = body;
        if (!taskId) return new Response(JSON.stringify({ error: "Task ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const { data: task, error } = await supabase
          .from("delegated_tasks")
          .update({ status: "failed", error_message: errorMessage || "Task execution failed", completed_at: new Date().toISOString() })
          .eq("id", taskId)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;

        if (task.collaboration_id) {
          await supabase.from("collaboration_messages").insert({
            collaboration_id: task.collaboration_id,
            sender_agent_id: task.target_agent_id,
            receiver_agent_id: task.source_agent_id,
            message_type: "task_failed",
            payload: { task_id: taskId, error: errorMessage },
          });
        }

        return new Response(JSON.stringify({ success: true, task }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "cancel": {
        const { taskId } = body;
        if (!taskId) return new Response(JSON.stringify({ error: "Task ID required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const { data: task, error } = await supabase
          .from("delegated_tasks")
          .update({ status: "cancelled", completed_at: new Date().toISOString() })
          .eq("id", taskId)
          .eq("user_id", userId)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ success: true, task }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "list": {
        const { sourceAgentId, targetAgentId } = body;
        
        let query = supabase
          .from("delegated_tasks")
          .select(`*, source_agent:agents!delegated_tasks_source_agent_id_fkey(id, name, model), target_agent:agents!delegated_tasks_target_agent_id_fkey(id, name, model)`)
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        if (sourceAgentId) query = query.eq("source_agent_id", sourceAgentId);
        if (targetAgentId) query = query.eq("target_agent_id", targetAgentId);

        const { data: tasks, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify({ success: true, tasks }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (error: unknown) {
    console.error("[task-delegation] Error:", error instanceof Error ? error.message : "Unknown");
    return new Response(
      JSON.stringify({ error: "An internal error occurred.", code: "TASK_DELEGATION_ERROR" }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" } }
    );
  }
});
