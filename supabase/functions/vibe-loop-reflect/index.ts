import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const REFLECTION_SYSTEM_PROMPT = `You are a code error analyst for NanoClaw containers. When given an error log from a failed command execution, you must:

1. Identify the root cause of the error
2. Classify the error type (syntax, dependency, runtime, permission, configuration, network)
3. Generate a concrete fix (code patch or command)
4. Provide the retry command

IMPORTANT: Be precise and actionable. The fix will be applied automatically.

Output JSON via the analyze_error tool.`;

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Mandatory auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { command, exitCode, stderr, attempt, maxRetries, containerId, context } = await req.json();

    const AI_API_KEY = Deno.env.get("FANCE_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!AI_API_KEY) {
      throw new Error("AI API key is not configured");
    }

    // Truncate stderr: first 50 lines + last 50 lines
    const stderrLines = (stderr || '').split('\n');
    let truncatedStderr = stderr || '';
    if (stderrLines.length > 100) {
      const head = stderrLines.slice(0, 50).join('\n');
      const tail = stderrLines.slice(-50).join('\n');
      truncatedStderr = `${head}\n\n... [${stderrLines.length - 100} lines omitted] ...\n\n${tail}`;
    }

    const userPrompt = `[Execution Failed with Exit Code ${exitCode}]
Container: ${containerId}
Command: ${command}
Attempt: ${attempt}/${maxRetries}

[Error Log]
${truncatedStderr}

${context ? `[Additional Context]\n${context}` : ''}

Analyze the error, identify root cause, generate a fix, and provide the corrected command to retry.`;

    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";

    const response = await fetch(aiGatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: REFLECTION_SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_error",
            description: "Analyze execution error and provide fix",
            parameters: {
              type: "object",
              properties: {
                analysis: { type: "string", description: "Root cause analysis" },
                errorType: { 
                  type: "string", 
                  enum: ["syntax", "dependency", "runtime", "permission", "configuration", "network", "unknown"],
                  description: "Error classification" 
                },
                fixCode: { type: "string", description: "Code patch or fix commands to apply" },
                retryCommand: { type: "string", description: "Command to retry after fix" },
                confidence: { type: "number", description: "Confidence level 0-1 that the fix will work" },
              },
              required: ["analysis", "errorType", "fixCode", "retryCommand", "confidence"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_error" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("[vibe-loop-reflect] AI error:", response.status);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("AI did not return structured analysis");
    }

    const reflection = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, reflection }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[vibe-loop-reflect] Error:', error instanceof Error ? error.message : 'Unknown');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get("origin")), 'Content-Type': 'application/json' } }
    );
  }
});
