import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const BUILDER_SYSTEM_PROMPT = `You are a NanoClaw Skill Builder. Generate a complete, production-quality NanoClaw skill package.

Output a JSON object with these fields:
- skillName: kebab-case name
- skillMd: Complete SKILL.md with allowed-tools frontmatter
- handlerPy: Python handler code with error handling
- configYaml: YAML config with skill, version, adds, modifies, test fields
- testCode: Comprehensive test script

Rules:
- All manifest fields (skill, version, adds, modifies, test) must be present in configYaml
- No path traversal (../) or absolute paths
- Handler must include try/catch error handling
- No hardcoded secrets
- Test must validate core functionality
- Follow NanoClaw conventions strictly`;

const BUILDER_REFLECTION_TEMPLATE = `Your previously generated skill was REJECTED by the review team.
Fix ALL issues below and regenerate the complete skill package.

## Review Feedback:
{feedback}

## Original Request:
{request}

You MUST fix every issue. Output the same JSON structure.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiCall = async (systemPrompt: string, userContent: string, useTools = false) => {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ];

      const reqBody: Record<string, unknown> = {
        model: "google/gemini-3-flash-preview",
        messages,
      };

      if (useTools) {
        reqBody.tools = [{
          type: "function",
          function: {
            name: "generate_skill",
            description: "Generate a complete NanoClaw skill package",
            parameters: {
              type: "object",
              properties: {
                skillName: { type: "string" },
                skillMd: { type: "string" },
                handlerPy: { type: "string" },
                configYaml: { type: "string" },
                testCode: { type: "string" },
              },
              required: ["skillName", "skillMd", "handlerPy", "configYaml"],
              additionalProperties: false,
            },
          },
        }];
        reqBody.tool_choice = { type: "function", function: { name: "generate_skill" } };
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[skill-eval-loop] AI ${response.status}:`, errText);
        if (response.status === 429) throw new Error("Rate limited");
        if (response.status === 402) throw new Error("Credits exhausted");
        throw new Error(`AI error: ${response.status}`);
      }

      return await response.json();
    };

    // ── Action: Build (generate or reflect) ──
    if (action === 'build') {
      const { request, context, reflectionFeedback } = body;

      let userContent: string;
      let systemPrompt: string;

      if (reflectionFeedback) {
        systemPrompt = BUILDER_SYSTEM_PROMPT;
        userContent = BUILDER_REFLECTION_TEMPLATE
          .replace('{feedback}', reflectionFeedback)
          .replace('{request}', request);
      } else {
        systemPrompt = BUILDER_SYSTEM_PROMPT;
        userContent = `Generate a NanoClaw skill for:\n\n${request}${context ? `\n\nContext:\n${context}` : ''}`;
      }

      const data = await aiCall(systemPrompt, userContent, true);
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("Builder did not return structured output");

      const skill = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify({ success: true, skill }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Action: Agent Call (Analyzer / Comparator / Grader) ──
    if (action === 'agent_call') {
      const { systemPrompt, userContent } = body;
      const data = await aiCall(systemPrompt, userContent, false);
      const response_text = data.choices?.[0]?.message?.content || '';
      return new Response(
        JSON.stringify({ success: true, response: response_text }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error('[skill-eval-loop] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
