import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

interface ExecuteTaskRequest {
  taskId: string;
  additionalContext?: string;
}

// Task type specific prompts
const TASK_TYPE_PROMPTS: Record<string, string> = {
  general: `You are a helpful AI assistant executing a delegated task. Complete the task thoroughly and provide a clear result.`,
  analysis: `You are an expert analyst. Analyze the provided information comprehensively. Structure your analysis with clear sections: Overview, Key Findings, Insights, and Recommendations.`,
  generation: `You are a creative content generator. Generate high-quality content based on the task requirements. Be creative while staying relevant to the context.`,
  query: `You are a knowledge assistant. Answer questions accurately based on the provided context. If information is missing, clearly state what additional data would be needed.`,
  validation: `You are a validation expert. Verify and validate the provided information. Check for accuracy, consistency, and completeness. Report any issues found.`,
};

// Build the system prompt based on task and context
function buildSystemPrompt(
  taskType: string,
  handoffContext: HandoffContext,
  sourceAgentName: string
): string {
  let prompt = TASK_TYPE_PROMPTS[taskType] || TASK_TYPE_PROMPTS.general;

  prompt += `\n\nThis task was delegated from Agent "${sourceAgentName}".`;

  // Add goal if provided
  if (handoffContext.goal) {
    prompt += `\n\n## Task Goal:\n${handoffContext.goal}`;
  }

  // Add conversation context
  if (handoffContext.conversationSummary) {
    prompt += `\n\n## Conversation Context:\n${handoffContext.conversationSummary}`;
  }

  // Add done history (completed steps)
  if (handoffContext.doneHistory && handoffContext.doneHistory.length > 0) {
    prompt += `\n\n## Previously Completed Steps:`;
    handoffContext.doneHistory.forEach((step, index) => {
      prompt += `\n${index + 1}. ${step.description}`;
      if (step.result) {
        prompt += ` (Result: ${JSON.stringify(step.result)})`;
      }
    });
  }

  // Add key entities
  if (handoffContext.keyEntities && handoffContext.keyEntities.length > 0) {
    prompt += `\n\n## Key Entities:`;
    handoffContext.keyEntities.forEach((entity) => {
      prompt += `\n- ${entity.name} (${entity.type})`;
      if (entity.value) {
        prompt += `: ${entity.value}`;
      }
    });
  }

  // Add constraints
  if (handoffContext.constraints && handoffContext.constraints.length > 0) {
    prompt += `\n\n## Constraints:\n${handoffContext.constraints.map((c) => `- ${c}`).join("\n")}`;
  }

  // Add legal requirements
  if (handoffContext.legalRequirements && handoffContext.legalRequirements.length > 0) {
    prompt += `\n\n## Legal/Regulatory Requirements:\n${handoffContext.legalRequirements.map((r) => `- ${r}`).join("\n")}`;
  }

  // Add artifacts
  if (handoffContext.artifacts && handoffContext.artifacts.length > 0) {
    prompt += `\n\n## Available Artifacts:`;
    handoffContext.artifacts.forEach((artifact) => {
      prompt += `\n- ${artifact.name} (${artifact.type})`;
      if (artifact.content) {
        prompt += `\n  Content: ${artifact.content.substring(0, 200)}${artifact.content.length > 200 ? "..." : ""}`;
      }
    });
  }

  // Add user preferences
  if (handoffContext.userPreferences) {
    const prefs = handoffContext.userPreferences;
    prompt += `\n\n## User Preferences:`;
    if (prefs.language) prompt += `\n- Language: ${prefs.language}`;
    if (prefs.responseFormat) prompt += `\n- Response Format: ${prefs.responseFormat}`;
    if (prefs.priorityFocus && prefs.priorityFocus.length > 0) {
      prompt += `\n- Priority Focus: ${prefs.priorityFocus.join(", ")}`;
    }
    if (prefs.excludeTopics && prefs.excludeTopics.length > 0) {
      prompt += `\n- Exclude Topics: ${prefs.excludeTopics.join(", ")}`;
    }
  }

  // Add user profile
  if (handoffContext.userProfile) {
    const profile = handoffContext.userProfile;
    prompt += `\n\n## User Profile:`;
    if (profile.department) prompt += `\n- Department: ${profile.department}`;
    if (profile.role) prompt += `\n- Role: ${profile.role}`;
    if (profile.accessLevel) prompt += `\n- Access Level: ${profile.accessLevel}`;
  }

  // Add source agent context
  if (handoffContext.sourceAgentContext) {
    const sourceCtx = handoffContext.sourceAgentContext;
    prompt += `\n\n## Handoff Reason: ${sourceCtx.reasonForHandoff}`;
  }

  prompt += `\n\n## Expected Response Format:
1. Executive Summary (2-3 sentences)
2. Detailed Result
3. Confidence Level (high/medium/low)
4. Any follow-up recommendations`;

  return prompt;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: ExecuteTaskRequest = await req.json();
    const { taskId, additionalContext } = body;

    if (!taskId) {
      return new Response(
        JSON.stringify({ error: "Task ID required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[task-executor] Starting execution for task: ${taskId}`);

    // Get the task with agent details
    const { data: task, error: taskError } = await supabase
      .from("delegated_tasks")
      .select(`
        *,
        source_agent:agents!delegated_tasks_source_agent_id_fkey(id, name, model, manifest),
        target_agent:agents!delegated_tasks_target_agent_id_fkey(id, name, model, manifest)
      `)
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      console.error("[task-executor] Task not found:", taskError);
      return new Response(
        JSON.stringify({ error: "Task not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check task status - must be accepted or in_progress
    if (!["accepted", "in_progress"].includes(task.status)) {
      return new Response(
        JSON.stringify({ error: `Cannot execute task with status: ${task.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update task to in_progress if not already
    if (task.status === "accepted") {
      await supabase
        .from("delegated_tasks")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", taskId);
    }

    const startTime = Date.now();

    // Build the prompt
    const handoffContext = (task.handoff_context || {}) as HandoffContext;
    const sourceAgentName = task.source_agent?.name || "Unknown Agent";
    const systemPrompt = buildSystemPrompt(task.task_type, handoffContext, sourceAgentName);

    // Build user message
    let userMessage = `## Task: ${task.title}`;
    if (task.description) {
      userMessage += `\n\n### Description:\n${task.description}`;
    }
    if (handoffContext.userQuery) {
      userMessage += `\n\n### Original User Query:\n${handoffContext.userQuery}`;
    }
    if (handoffContext.previousResults && handoffContext.previousResults.length > 0) {
      userMessage += `\n\n### Previous Results:\n${JSON.stringify(handoffContext.previousResults, null, 2)}`;
    }
    if (additionalContext) {
      userMessage += `\n\n### Additional Context:\n${additionalContext}`;
    }

    userMessage += `\n\nPlease complete this ${task.task_type} task with priority: ${task.priority}`;
    if (task.deadline) {
      userMessage += `\nDeadline: ${new Date(task.deadline).toLocaleString()}`;
    }

    console.log(`[task-executor] Calling Lovable AI for task type: ${task.task_type}`);

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[task-executor] AI error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        // Mark task as failed due to rate limit
        await supabase
          .from("delegated_tasks")
          .update({
            status: "failed",
            error_message: "Rate limit exceeded. Please try again later.",
            completed_at: new Date().toISOString(),
          })
          .eq("id", taskId);

        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (aiResponse.status === 402) {
        await supabase
          .from("delegated_tasks")
          .update({
            status: "failed",
            error_message: "Payment required. Please add credits.",
            completed_at: new Date().toISOString(),
          })
          .eq("id", taskId);

        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    const tokensUsed = aiData.usage?.total_tokens || 0;

    const executionTime = Date.now() - startTime;

    console.log(`[task-executor] AI completed in ${executionTime}ms, tokens: ${tokensUsed}`);

    // Parse the AI response to extract structured data
    const result = {
      content: aiContent,
      model_used: "google/gemini-2.5-flash",
      execution_time_ms: executionTime,
      tokens_used: tokensUsed,
      task_type: task.task_type,
      priority: task.priority,
      completed_at: new Date().toISOString(),
    };

    // Update task as completed
    const { data: updatedTask, error: updateError } = await supabase
      .from("delegated_tasks")
      .update({
        status: "completed",
        result,
        actual_duration_ms: executionTime,
        tokens_used: tokensUsed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", taskId)
      .select()
      .single();

    if (updateError) {
      console.error("[task-executor] Update error:", updateError);
      throw updateError;
    }

    // Send completion message if collaboration exists
    if (task.collaboration_id) {
      await supabase.from("collaboration_messages").insert({
        collaboration_id: task.collaboration_id,
        sender_agent_id: task.target_agent_id,
        receiver_agent_id: task.source_agent_id,
        message_type: "task_result",
        payload: {
          task_id: taskId,
          title: task.title,
          task_type: task.task_type,
          execution_time_ms: executionTime,
          tokens_used: tokensUsed,
          result_preview: aiContent.substring(0, 200) + (aiContent.length > 200 ? "..." : ""),
        },
      });
    }

    console.log(`[task-executor] Task ${taskId} completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        task: updatedTask,
        result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[task-executor] Error:", error);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
