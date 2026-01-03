import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GeneratedConfig {
  name: string;
  department: string;
  systemPrompt: string;
  suggestedSkills: string[];
  personalityConfig: {
    professional: number;
    detailed: number;
    humor: number;
    creative: number;
    preset?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, currentConfig } = await req.json();

    if (!description || typeof description !== "string") {
      return new Response(
        JSON.stringify({ error: "description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPromptForGenerator = `你是一个AI Agent配置生成专家。用户会用自然语言描述他们想要的Agent，你需要分析需求并生成配置。

请根据用户描述生成以下配置（使用JSON格式）：
1. name: Agent的名称（简短、有特色）
2. department: 所属部门（如：营销部、技术部、客服部、内容部等）
3. systemPrompt: 系统提示词（详细描述Agent的角色、能力和行为准则，100-200字）
4. suggestedSkills: 推荐的技能列表（字符串数组，如：["文案写作", "数据分析"]）
5. personalityConfig: 性格配置
   - professional: 0-1（0=活泼，1=专业）
   - detailed: 0-1（0=简洁，1=详细）
   - humor: 0-1（0=严肃，1=幽默）
   - creative: 0-1（0=保守，1=创意）
   - preset: 可选的预设名称（expert/bestie/comedian/consultant/mentor/creative）

直接返回JSON对象，不要包含其他文字。`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPromptForGenerator },
          { role: "user", content: `用户需求描述：${description}\n\n${currentConfig ? `当前配置参考：${JSON.stringify(currentConfig)}` : ""}` }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "请求过于频繁，请稍后再试" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API额度不足" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI service error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in response");
    }

    // Parse the JSON response
    let generatedConfig: GeneratedConfig;
    try {
      // Try to extract JSON from the response (handle potential markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        generatedConfig = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Return a default config based on description
      generatedConfig = {
        name: "AI助手",
        department: "通用部门",
        systemPrompt: `你是一个${description}。请尽力帮助用户完成相关任务。`,
        suggestedSkills: [],
        personalityConfig: {
          professional: 0.5,
          detailed: 0.5,
          humor: 0.3,
          creative: 0.5
        }
      };
    }

    // Validate and sanitize the response
    const validatedConfig: GeneratedConfig = {
      name: String(generatedConfig.name || "AI助手").slice(0, 50),
      department: String(generatedConfig.department || "通用部门").slice(0, 30),
      systemPrompt: String(generatedConfig.systemPrompt || "").slice(0, 2000),
      suggestedSkills: Array.isArray(generatedConfig.suggestedSkills) 
        ? generatedConfig.suggestedSkills.slice(0, 10).map(s => String(s))
        : [],
      personalityConfig: {
        professional: Math.max(0, Math.min(1, Number(generatedConfig.personalityConfig?.professional) || 0.5)),
        detailed: Math.max(0, Math.min(1, Number(generatedConfig.personalityConfig?.detailed) || 0.5)),
        humor: Math.max(0, Math.min(1, Number(generatedConfig.personalityConfig?.humor) || 0.3)),
        creative: Math.max(0, Math.min(1, Number(generatedConfig.personalityConfig?.creative) || 0.5)),
        preset: generatedConfig.personalityConfig?.preset
      }
    };

    console.log("Generated config:", validatedConfig);

    return new Response(
      JSON.stringify(validatedConfig),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in agent-config-generator:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
