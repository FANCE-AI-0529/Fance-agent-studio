import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SKILL_CRAFTER_SYSTEM_PROMPT = `You are a NanoClaw Skill Crafter. Given a natural language request, generate a complete NanoClaw skill package.

Output a JSON object with these fields:
- skillName: kebab-case name (e.g., "telegram-channel")
- skillMd: Complete SKILL.md in NanoClaw native format with frontmatter (allowed-tools, etc.)
- handlerPy: Python handler code for the skill
- configYaml: YAML configuration for the skill
- testCode: Basic test script to validate the skill

SKILL.md Format:
\`\`\`
---
allowed-tools: [list tools needed]
description: Brief description
---

# [Skill Name]

## Quick start
Step-by-step setup instructions.

## Core workflow
Main logic flow.

## Commands
Available commands and usage.

## Examples
Concrete usage examples.
\`\`\`

Rules:
- Skills must be self-contained and follow NanoClaw conventions
- Use allowed-tools frontmatter, NOT traditional manifest fields
- Handler should be production-ready with error handling
- Include meaningful test cases
- Config should have sensible defaults`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request, context } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const messages = [
      { role: "system", content: SKILL_CRAFTER_SYSTEM_PROMPT },
      { 
        role: "user", 
        content: `Generate a NanoClaw skill for the following request:\n\n${request}\n\n${context ? `Additional context:\n${context}` : ''}` 
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: [{
          type: "function",
          function: {
            name: "generate_skill",
            description: "Generate a complete NanoClaw skill package",
            parameters: {
              type: "object",
              properties: {
                skillName: { type: "string", description: "kebab-case skill name" },
                skillMd: { type: "string", description: "Complete SKILL.md content" },
                handlerPy: { type: "string", description: "Python handler code" },
                configYaml: { type: "string", description: "YAML configuration" },
                testCode: { type: "string", description: "Test validation script" },
              },
              required: ["skillName", "skillMd", "handlerPy", "configYaml"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_skill" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted, please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("[skill-crafter] AI error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("AI did not return structured skill output");
    }

    const skillPackage = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ success: true, skill: skillPackage }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[skill-crafter] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
