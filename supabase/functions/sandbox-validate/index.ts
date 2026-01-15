// =====================================================
// 沙箱验证 Edge Function
// Sandbox Validate - Isolated Agent Testing Environment
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lovable AI Gateway 支持的模型列表
const VALID_GATEWAY_MODELS = [
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-3-pro-preview',
  'google/gemini-3-flash-preview',
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'openai/gpt-5.2',
];

// 模型映射函数 - 将无效模型名映射为有效模型
function mapToValidModel(model?: string): string {
  if (!model) return 'google/gemini-2.5-flash';
  
  // 已经是有效模型
  if (VALID_GATEWAY_MODELS.includes(model)) {
    return model;
  }
  
  // 映射常见的无效模型名
  const modelLower = model.toLowerCase();
  
  if (modelLower.includes('claude')) {
    return 'google/gemini-2.5-flash';
  }
  if (modelLower.includes('gpt-4') || modelLower.includes('gpt4')) {
    return 'openai/gpt-5-mini';
  }
  if (modelLower.includes('gpt-3') || modelLower.includes('gpt3')) {
    return 'google/gemini-2.5-flash-lite';
  }
  
  return 'google/gemini-2.5-flash';
}

interface SandboxRequest {
  agentConfig: {
    name: string;
    systemPrompt: string;
    model?: string;
  };
  testMessage: string;
  generatedSkills?: Array<{
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    templateContent?: string;
  }>;
  timeoutMs?: number;
}

interface SandboxResponse {
  success: boolean;
  response?: string;
  error?: string;
  statusCode: number;
  duration: number;
  failedComponent?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const request: SandboxRequest = await req.json();
    const {
      agentConfig,
      testMessage,
      generatedSkills = [],
      timeoutMs = 10000,
    } = request;

    if (!agentConfig || !testMessage) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "agentConfig and testMessage are required",
          statusCode: 400,
          duration: Date.now() - startTime,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. 验证生成的技能配置 (简单语法检查)
    for (const skill of generatedSkills) {
      if (skill.templateContent) {
        try {
          // 检查是否是有效的 YAML-like 结构
          if (skill.templateContent.includes('{{') && !skill.templateContent.includes('}}')) {
            return new Response(
              JSON.stringify({
                success: false,
                error: `技能 "${skill.name}" 的模板语法错误：未闭合的模板标签`,
                statusCode: 422,
                duration: Date.now() - startTime,
                failedComponent: skill.id,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } catch (parseError) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `技能 "${skill.name}" 配置解析失败`,
              statusCode: 422,
              duration: Date.now() - startTime,
              failedComponent: skill.id,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // 2. 构建系统提示词 (包含技能信息)
    let enhancedSystemPrompt = agentConfig.systemPrompt;
    
    if (generatedSkills.length > 0) {
      enhancedSystemPrompt += `\n\n你具备以下能力：\n`;
      for (const skill of generatedSkills) {
        enhancedSystemPrompt += `- ${skill.name}: ${skill.description}\n`;
        if (skill.capabilities.length > 0) {
          enhancedSystemPrompt += `  能力: ${skill.capabilities.join(', ')}\n`;
        }
      }
    }

    // 3. 使用 Lovable AI Gateway 进行测试 (模拟对话)
    const aiGatewayUrl = "https://ai.gateway.lovable.dev/v1/chat/completions";
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "LOVABLE_API_KEY 未配置",
          statusCode: 500,
          duration: Date.now() - startTime,
          failedComponent: "config",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // 创建带超时的 fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // 映射模型名称为有效的 Gateway 模型
      const validModel = mapToValidModel(agentConfig.model);
      console.log(`[sandbox-validate] Using model: ${validModel} (requested: ${agentConfig.model})`);
      
      const response = await fetch(aiGatewayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: validModel,
          messages: [
            { role: "system", content: enhancedSystemPrompt },
            { role: "user", content: testMessage },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(
          JSON.stringify({
            success: false,
            error: `AI 服务返回错误: ${response.status}`,
            statusCode: response.status,
            duration: Date.now() - startTime,
            failedComponent: "ai_gateway",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content 
        || aiResponse.content 
        || aiResponse.response
        || "";

      // 4. 验证响应有效性
      if (!content || content.trim().length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "AI 返回了空响应",
            statusCode: 204,
            duration: Date.now() - startTime,
            failedComponent: "agent",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 检查响应是否包含错误指示
      const errorIndicators = [
        "无法处理",
        "不支持",
        "出错了",
        "发生错误",
        "I cannot",
        "I'm unable",
        "error occurred",
      ];

      const hasErrorIndicator = errorIndicators.some(
        (indicator) => content.toLowerCase().includes(indicator.toLowerCase())
      );

      if (hasErrorIndicator) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "AI 响应包含错误指示",
            response: content,
            statusCode: 200,
            duration: Date.now() - startTime,
            failedComponent: "agent",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 5. 成功返回
      return new Response(
        JSON.stringify({
          success: true,
          response: content,
          statusCode: 200,
          duration: Date.now() - startTime,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({
            success: false,
            error: `请求超时 (${timeoutMs}ms)`,
            statusCode: 408,
            duration: Date.now() - startTime,
            failedComponent: "network",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw fetchError;
    }

  } catch (error: unknown) {
    console.error("Sandbox validation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        statusCode: 500,
        duration: Date.now() - startTime,
        failedComponent: "sandbox_system",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
