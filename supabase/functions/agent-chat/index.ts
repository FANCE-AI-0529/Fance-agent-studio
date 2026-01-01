import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AgentSkill {
  name: string;
  description?: string;
  permissions?: string[];
}

interface AgentConfig {
  name?: string;
  systemPrompt?: string;
  model?: string;
  skills?: AgentSkill[];
  mplpPolicy?: string;
}

// Multimodal message content types
type TextContent = { type: "text"; text: string };
type ImageContent = { type: "image_url"; image_url: { url: string } };
type MessageContent = string | (TextContent | ImageContent)[];

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: MessageContent;
}

// Available models - all support multimodal
const validModels = [
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash-lite",
  "google/gemini-3-pro-preview",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
];

function getValidModel(requestedModel?: string): string {
  if (requestedModel && validModels.includes(requestedModel)) {
    return requestedModel;
  }
  return "google/gemini-2.5-flash"; // default
}

// Check if message contains multimodal content
function hasMultimodalContent(messages: ChatMessage[]): boolean {
  return messages.some(msg => {
    if (Array.isArray(msg.content)) {
      return msg.content.some(c => c.type === 'image_url');
    }
    return false;
  });
}

function buildSystemPrompt(config?: AgentConfig, isMultimodal?: boolean): string {
  const agentName = config?.name || "Agent OS Assistant";
  const skills = config?.skills || [];
  const mplpPolicy = config?.mplpPolicy || "standard";
  
  // Build skills section
  const skillsSection = skills.length > 0
    ? `\n\n可用技能：\n${skills.map((s, i) => 
        `${i + 1}. ${s.name}${s.description ? ` - ${s.description}` : ''}${s.permissions?.length ? ` (权限: ${s.permissions.join(', ')})` : ''}`
      ).join('\n')}`
    : '';

  // Multimodal instructions
  const multimodalInstructions = isMultimodal ? `

## 图像分析能力

当用户发送图片时，请：
1. 仔细观察图片的所有细节
2. 描述图片的主要内容和关键元素
3. 根据上下文提供有价值的分析和建议
4. 如果是代码截图，提供代码相关的帮助
5. 如果是图表/数据，提供数据分析
6. 如果是设计稿，提供设计反馈` : '';

  // Custom system prompt takes precedence
  if (config?.systemPrompt) {
    return `${config.systemPrompt}${skillsSection}${multimodalInstructions}`;
  }

  // Default Agent OS system prompt
  return `你是 ${agentName}，运行在 Agent OS 平台上的智能助手。

你的核心职责是帮助用户完成各种任务，同时遵循 MPLP (Multi-Party Lifecycle Protocol) 协议规范。

## 工作原则

1. **安全第一**：涉及敏感操作（写入、删除、执行、支付）时，明确告知用户风险
2. **透明可控**：清晰说明你将执行的操作和所需权限
3. **高效专业**：给出简洁、可操作的回复
4. **友好耐心**：保持专业且友善的沟通风格

## MPLP 权限级别

- 🟢 **低风险 (read)**: 读取文件、查询数据 - 可直接执行
- 🟡 **中风险 (write/network)**: 写入数据、调用外部API - 需用户确认
- 🔴 **高风险 (execute/admin)**: 执行脚本、删除数据、支付 - 需严格确认

## 当前 MPLP 策略: ${mplpPolicy}
${skillsSection}
${multimodalInstructions}

## 回复格式要求

1. 使用 Markdown 格式化回复
2. 重要信息使用加粗或列表
3. 代码或配置使用代码块
4. 操作结果使用适当的 emoji 提示状态

请根据用户的问题，选择合适的技能来回答。如果用户的请求涉及敏感操作，请先说明所需权限和可能的影响。`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, agentConfig } = await req.json() as {
      messages: ChatMessage[];
      agentConfig?: AgentConfig;
    };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI 服务未配置");
    }

    // Check if this is a multimodal request
    const isMultimodal = hasMultimodalContent(messages);
    const systemPrompt = buildSystemPrompt(agentConfig, isMultimodal);
    const model = getValidModel(agentConfig?.model);

    console.log(`[agent-chat] Starting ${isMultimodal ? 'multimodal' : 'text'} chat with model: ${model}, agent: ${agentConfig?.name || 'default'}`);
    console.log(`[agent-chat] Message count: ${messages?.length || 0}`);

    // Build messages array
    const apiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const statusCode = response.status;
      console.error(`[agent-chat] AI gateway error: ${statusCode}`);
      
      if (statusCode === 429) {
        return new Response(
          JSON.stringify({ error: "请求过于频繁，请稍后再试", code: "RATE_LIMITED" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (statusCode === 402) {
        return new Response(
          JSON.stringify({ error: "服务额度不足，请在设置中添加额度", code: "PAYMENT_REQUIRED" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error(`[agent-chat] Error details: ${errorText}`);
      
      return new Response(
        JSON.stringify({ error: "AI 服务暂时不可用，请稍后重试", code: "SERVICE_ERROR" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[agent-chat] Streaming response started with model: ${model}, multimodal: ${isMultimodal}`);
    
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("[agent-chat] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "未知错误",
        code: "UNKNOWN_ERROR"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
