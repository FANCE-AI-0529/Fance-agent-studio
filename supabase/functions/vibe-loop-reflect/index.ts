import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const REFLECTION_SYSTEM_PROMPT = `You are a code error analyst for NanoClaw containers. When given an error log from a failed command execution, you must:

1. Identify the root cause of the error
2. Classify the error type (syntax, dependency, runtime, permission, configuration, network)
3. Generate a concrete fix (code patch or command)
4. Provide the retry command

IMPORTANT: Be precise and actionable. The fix will be applied automatically.

Output JSON via the analyze_error tool.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { command, exitCode, stderr, attempt, maxRetries, containerId, context } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
      const errorText = await response.text();
      console.error("[vibe-loop-reflect] AI error:", response.status, errorText);
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
    console.error('[vibe-loop-reflect] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
