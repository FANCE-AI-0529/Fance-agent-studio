import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChainStep {
  id: string;
  chain_id: string;
  step_order: number;
  parallel_group: number;
  name: string;
  description: string | null;
  task_type: string;
  target_agent_id: string | null;
  input_mapping: Record<string, string>;
  output_key: string | null;
  status: string;
  task_id: string | null;
  result: any;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  timeout_ms: number;
}

interface TaskChain {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  execution_mode: "sequential" | "parallel" | "mixed";
  source_agent_id: string | null;
  collaboration_id: string | null;
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  final_result: any;
}

interface ExecuteChainRequest {
  action: "execute" | "pause" | "resume" | "cancel" | "retry_step";
  chainId: string;
  stepId?: string;
  initialContext?: Record<string, unknown>;
}

// Resolve input mapping using previous results
function resolveInputMapping(
  inputMapping: Record<string, string>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  
  for (const [key, path] of Object.entries(inputMapping)) {
    if (path.startsWith("$context.")) {
      const contextKey = path.replace("$context.", "");
      resolved[key] = context[contextKey];
    } else if (path.startsWith("$step.")) {
      // Format: $step.<step_name>.<field>
      const parts = path.replace("$step.", "").split(".");
      const stepName = parts[0];
      const field = parts.slice(1).join(".");
      
      const stepResult = context[`step_${stepName}`] as Record<string, unknown>;
      if (stepResult && field) {
        resolved[key] = getNestedValue(stepResult, field);
      } else {
        resolved[key] = stepResult;
      }
    } else if (path.startsWith("$prev.")) {
      // Previous step result
      const field = path.replace("$prev.", "");
      const prevResult = context["_prev_result"] as Record<string, unknown>;
      if (prevResult && field) {
        resolved[key] = getNestedValue(prevResult, field);
      } else {
        resolved[key] = prevResult;
      }
    } else {
      resolved[key] = path; // Literal value
    }
  }
  
  return resolved;
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((acc: any, key) => acc?.[key], obj);
}

// Execute a single step
async function executeStep(
  supabase: any,
  step: ChainStep,
  chain: TaskChain,
  context: Record<string, unknown>,
  lovableApiKey: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  console.log(`[task-chain] Executing step: ${step.name} (order: ${step.step_order})`);
  
  // Update step status
  await supabase
    .from("task_chain_steps")
    .update({ status: "in_progress", started_at: new Date().toISOString() })
    .eq("id", step.id);

  try {
    // Resolve input mapping
    const resolvedInputs = resolveInputMapping(step.input_mapping || {}, context);
    
    // Build the task description with resolved inputs
    let taskDescription = step.description || step.name;
    if (Object.keys(resolvedInputs).length > 0) {
      taskDescription += `\n\n### Input Data:\n${JSON.stringify(resolvedInputs, null, 2)}`;
    }
    
    // Add previous results summary if available
    const prevResult = context["_prev_result"];
    if (prevResult) {
      taskDescription += `\n\n### Previous Step Result:\n${JSON.stringify(prevResult, null, 2)}`;
    }

    // Create delegated task
    const { data: task, error: taskError } = await supabase
      .from("delegated_tasks")
      .insert({
        source_agent_id: chain.source_agent_id,
        target_agent_id: step.target_agent_id || chain.source_agent_id,
        collaboration_id: chain.collaboration_id,
        user_id: chain.user_id,
        title: `[Chain: ${chain.name}] ${step.name}`,
        description: taskDescription,
        priority: "normal",
        task_type: step.task_type,
        status: "in_progress",
        started_at: new Date().toISOString(),
        handoff_context: {
          goal: step.name,
          conversationSummary: `Step ${step.step_order + 1} of task chain "${chain.name}"`,
          previousResults: prevResult ? [prevResult] : [],
          constraints: [`This is part of a ${chain.execution_mode} task chain`],
        },
      })
      .select()
      .single();

    if (taskError) {
      console.error("[task-chain] Task creation error:", taskError);
      throw new Error(`Failed to create task: ${taskError.message}`);
    }

    // Link task to step
    await supabase
      .from("task_chain_steps")
      .update({ task_id: task.id })
      .eq("id", step.id);

    // Call Lovable AI to execute
    const systemPrompt = `You are executing step ${step.step_order + 1} of a multi-step task chain called "${chain.name}".
Your current task: ${step.name}
${step.description ? `Description: ${step.description}` : ""}

IMPORTANT: You must provide a structured JSON response that can be used by subsequent steps.
Include a "summary" field with a brief description and a "data" field with any extracted/generated data.`;

    const userMessage = `Execute this task: ${step.name}

${taskDescription}

Provide your response as a JSON object with:
- summary: Brief description of what you did
- data: Any data, results, or extracted information
- recommendations: Any suggestions for next steps`;

    console.log(`[task-chain] Calling Lovable AI for step: ${step.name}`);

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
      console.error("[task-chain] AI error:", aiResponse.status, errorText);
      throw new Error(`AI execution failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";
    const tokensUsed = aiData.usage?.total_tokens || 0;

    // Parse AI response
    let stepResult: any;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) || 
                       aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        stepResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } else {
        stepResult = { summary: aiContent, data: null };
      }
    } catch {
      stepResult = { summary: aiContent, data: null };
    }

    // Update task as completed
    await supabase
      .from("delegated_tasks")
      .update({
        status: "completed",
        result: { content: aiContent, parsed: stepResult },
        tokens_used: tokensUsed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", task.id);

    // Update step as completed
    await supabase
      .from("task_chain_steps")
      .update({
        status: "completed",
        result: stepResult,
        completed_at: new Date().toISOString(),
      })
      .eq("id", step.id);

    console.log(`[task-chain] Step completed: ${step.name}`);
    return { success: true, result: stepResult };

  } catch (error: any) {
    console.error(`[task-chain] Step failed: ${step.name}`, error);

    // Check if we should retry
    if (step.retry_count < step.max_retries) {
      await supabase
        .from("task_chain_steps")
        .update({
          status: "pending",
          retry_count: step.retry_count + 1,
          error_message: error.message,
        })
        .eq("id", step.id);

      return { success: false, error: `Retry ${step.retry_count + 1}/${step.max_retries}: ${error.message}` };
    }

    // Mark as failed
    await supabase
      .from("task_chain_steps")
      .update({
        status: "failed",
        error_message: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", step.id);

    return { success: false, error: error.message };
  }
}

// Execute steps in a parallel group
async function executeParallelGroup(
  supabase: any,
  steps: ChainStep[],
  chain: TaskChain,
  context: Record<string, unknown>,
  lovableApiKey: string
): Promise<{ success: boolean; results: Record<string, any>; errors: string[] }> {
  console.log(`[task-chain] Executing parallel group with ${steps.length} steps`);

  const results: Record<string, any> = {};
  const errors: string[] = [];

  const promises = steps.map(async (step) => {
    const result = await executeStep(supabase, step, chain, context, lovableApiKey);
    if (result.success) {
      results[step.output_key || step.name] = result.result;
    } else {
      errors.push(`${step.name}: ${result.error}`);
    }
    return result;
  });

  await Promise.all(promises);

  return {
    success: errors.length === 0,
    results,
    errors,
  };
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

    const body: ExecuteChainRequest = await req.json();
    const { action, chainId, stepId, initialContext = {} } = body;

    console.log(`[task-chain] Action: ${action}, Chain: ${chainId}`);

    // Get chain details
    const { data: chain, error: chainError } = await supabase
      .from("task_chains")
      .select("*")
      .eq("id", chainId)
      .single();

    if (chainError || !chain) {
      return new Response(
        JSON.stringify({ error: "Chain not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case "execute": {
        // Update chain status
        await supabase
          .from("task_chains")
          .update({
            status: "running",
            started_at: new Date().toISOString(),
          })
          .eq("id", chainId);

        // Get all steps ordered by step_order and parallel_group
        const { data: steps, error: stepsError } = await supabase
          .from("task_chain_steps")
          .select("*")
          .eq("chain_id", chainId)
          .order("step_order", { ascending: true })
          .order("parallel_group", { ascending: true });

        if (stepsError || !steps || steps.length === 0) {
          await supabase
            .from("task_chains")
            .update({ status: "failed", error_message: "No steps found" })
            .eq("id", chainId);

          return new Response(
            JSON.stringify({ error: "No steps found in chain" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Initialize context with initial values
        const context: Record<string, unknown> = { ...initialContext };
        let completedSteps = 0;
        let failedSteps = 0;
        const allResults: Record<string, any> = {};

        if (chain.execution_mode === "sequential") {
          // Execute steps one by one
          for (const step of steps) {
            const result = await executeStep(supabase, step, chain, context, lovableApiKey);
            
            if (result.success) {
              completedSteps++;
              const outputKey = step.output_key || `step_${step.name}`;
              context[outputKey] = result.result;
              context["_prev_result"] = result.result;
              allResults[outputKey] = result.result;

              // Update chain progress
              await supabase
                .from("task_chains")
                .update({ completed_steps: completedSteps })
                .eq("id", chainId);
            } else {
              failedSteps++;
              await supabase
                .from("task_chains")
                .update({
                  status: "failed",
                  failed_steps: failedSteps,
                  error_message: result.error,
                })
                .eq("id", chainId);

              return new Response(
                JSON.stringify({ success: false, error: result.error, completedSteps, results: allResults }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        } else if (chain.execution_mode === "parallel") {
          // Execute all steps in parallel
          const result = await executeParallelGroup(supabase, steps, chain, context, lovableApiKey);
          
          if (result.success) {
            completedSteps = steps.length;
            Object.assign(allResults, result.results);
          } else {
            failedSteps = result.errors.length;
            completedSteps = steps.length - failedSteps;
            Object.assign(allResults, result.results);

            await supabase
              .from("task_chains")
              .update({
                status: "failed",
                completed_steps: completedSteps,
                failed_steps: failedSteps,
                error_message: result.errors.join("; "),
                final_result: allResults,
              })
              .eq("id", chainId);

            return new Response(
              JSON.stringify({ success: false, errors: result.errors, completedSteps, results: allResults }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          // Mixed mode: group by parallel_group
          const groupedSteps = steps.reduce((acc: Record<number, ChainStep[]>, step: ChainStep) => {
            const group = step.parallel_group || 0;
            if (!acc[group]) acc[group] = [];
            acc[group].push(step);
            return acc;
          }, {});

          const groups = Object.keys(groupedSteps).map(Number).sort((a, b) => a - b);

          for (const group of groups) {
            const groupSteps = groupedSteps[group];
            
            if (groupSteps.length === 1) {
              // Single step, execute sequentially
              const step = groupSteps[0];
              const result = await executeStep(supabase, step, chain, context, lovableApiKey);
              
              if (result.success) {
                completedSteps++;
                const outputKey = step.output_key || `step_${step.name}`;
                context[outputKey] = result.result;
                context["_prev_result"] = result.result;
                allResults[outputKey] = result.result;
              } else {
                failedSteps++;
                await supabase
                  .from("task_chains")
                  .update({
                    status: "failed",
                    failed_steps: failedSteps,
                    error_message: result.error,
                  })
                  .eq("id", chainId);

                return new Response(
                  JSON.stringify({ success: false, error: result.error, completedSteps, results: allResults }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            } else {
              // Multiple steps, execute in parallel
              const result = await executeParallelGroup(supabase, groupSteps, chain, context, lovableApiKey);
              
              completedSteps += Object.keys(result.results).length;
              failedSteps += result.errors.length;
              
              // Merge results into context
              for (const [key, value] of Object.entries(result.results)) {
                context[key] = value;
                allResults[key] = value;
              }

              if (!result.success) {
                await supabase
                  .from("task_chains")
                  .update({
                    status: "failed",
                    completed_steps: completedSteps,
                    failed_steps: failedSteps,
                    error_message: result.errors.join("; "),
                  })
                  .eq("id", chainId);

                return new Response(
                  JSON.stringify({ success: false, errors: result.errors, completedSteps, results: allResults }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            }

            // Update progress after each group
            await supabase
              .from("task_chains")
              .update({ completed_steps: completedSteps })
              .eq("id", chainId);
          }
        }

        // All steps completed successfully
        await supabase
          .from("task_chains")
          .update({
            status: "completed",
            completed_steps: completedSteps,
            completed_at: new Date().toISOString(),
            final_result: allResults,
          })
          .eq("id", chainId);

        console.log(`[task-chain] Chain completed: ${chainId}`);

        return new Response(
          JSON.stringify({
            success: true,
            chain_id: chainId,
            completed_steps: completedSteps,
            results: allResults,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "pause": {
        await supabase
          .from("task_chains")
          .update({ status: "paused" })
          .eq("id", chainId);

        return new Response(
          JSON.stringify({ success: true, status: "paused" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "cancel": {
        await supabase
          .from("task_chains")
          .update({ status: "cancelled", completed_at: new Date().toISOString() })
          .eq("id", chainId);

        // Cancel pending steps
        await supabase
          .from("task_chain_steps")
          .update({ status: "cancelled" })
          .eq("chain_id", chainId)
          .eq("status", "pending");

        return new Response(
          JSON.stringify({ success: true, status: "cancelled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "retry_step": {
        if (!stepId) {
          return new Response(
            JSON.stringify({ error: "Step ID required for retry" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase
          .from("task_chain_steps")
          .update({
            status: "pending",
            error_message: null,
            result: null,
          })
          .eq("id", stepId);

        return new Response(
          JSON.stringify({ success: true, message: "Step reset for retry" }),
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
    console.error("[task-chain] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
