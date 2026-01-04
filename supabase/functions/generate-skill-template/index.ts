import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, category, difficulty } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!description) {
      return new Response(
        JSON.stringify({ error: "请提供技能描述" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating skill template for: ${description}`);

    // Use tool calling for guaranteed structured output
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `你是一个专业的 Agent 技能模板生成器。根据用户描述生成完整的技能模板。

技能模板包含三个文件:
1. Skill.md - 技能定义文件 (YAML frontmatter + Markdown)
2. handler.py - Python 处理器代码
3. config.yaml - 运行配置

确保生成的代码是真实可运行的，不要使用占位符。`
          },
          {
            role: "user",
            content: `请为以下需求生成技能模板：

描述：${description}
${category ? `类别：${category}` : ''}
${difficulty ? `难度：${difficulty}` : ''}

请生成完整的技能模板。`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_skill_template",
              description: "创建一个完整的技能模板",
              parameters: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    description: "技能名称（英文，kebab-case格式）"
                  },
                  description: {
                    type: "string",
                    description: "技能描述（中文）"
                  },
                  skillMd: {
                    type: "string",
                    description: "完整的 Skill.md 内容（包含YAML frontmatter和Markdown文档）"
                  },
                  handlerPy: {
                    type: "string",
                    description: "完整的 handler.py Python代码"
                  },
                  configYaml: {
                    type: "string",
                    description: "完整的 config.yaml 配置文件内容"
                  }
                },
                required: ["name", "description", "skillMd", "handlerPy", "configYaml"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_skill_template" } }
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      console.error("AI gateway error:", status, errorText);
      
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "请求过于频繁，请稍后再试", code: "RATE_LIMITED" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "服务额度不足，请添加额度", code: "QUOTA_EXCEEDED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI 服务暂时不可用", code: "AI_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(data));
      throw new Error("Invalid AI response - no tool call");
    }

    let template;
    try {
      template = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error("Failed to parse tool call arguments:", toolCall.function.arguments);
      throw new Error("Failed to parse AI response");
    }

    // Validate required fields
    if (!template.name || !template.skillMd || !template.handlerPy || !template.configYaml) {
      console.error("Missing required fields in template:", Object.keys(template));
      throw new Error("Incomplete template generated");
    }

    console.log(`Successfully generated template: ${template.name}`);

    return new Response(
      JSON.stringify(template),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate skill template error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "生成失败，请重试",
        code: "GENERATION_FAILED"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
