/**
 * 沙箱验证 Edge Function — with mandatory auth
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

const VALID_GATEWAY_MODELS = [
  'google/gemini-2.5-pro', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite',
  'google/gemini-3-pro-preview', 'google/gemini-3-flash-preview',
  'openai/gpt-5', 'openai/gpt-5-mini', 'openai/gpt-5-nano', 'openai/gpt-5.2',
];

function mapToValidModel(model?: string): string {
  if (!model) return 'google/gemini-2.5-flash';
  if (VALID_GATEWAY_MODELS.includes(model)) return model;
  const m = model.toLowerCase();
  if (m.includes('claude')) return 'google/gemini-2.5-flash';
  if (m.includes('gpt-4') || m.includes('gpt4')) return 'openai/gpt-5-mini';
  if (m.includes('gpt-3') || m.includes('gpt3')) return 'google/gemini-2.5-flash-lite';
  return 'google/gemini-2.5-flash';
}

interface SandboxRequest {
  agentConfig: { name: string; systemPrompt: string; model?: string };
  testMessage: string;
  generatedSkills?: Array<{ id: string; name: string; description: string; capabilities: string[]; templateContent?: string }>;
  timeoutMs?: number;
}

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const startTime = Date.now();

  try {
    // Mandatory auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized", statusCode: 401, duration: Date.now() - startTime }),
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
        JSON.stringify({ success: false, error: "Unauthorized", statusCode: 401, duration: Date.now() - startTime }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const request: SandboxRequest = await req.json();
    const { agentConfig, testMessage, generatedSkills = [], timeoutMs = 10000 } = request;

    if (!agentConfig || !testMessage) {
      return new Response(
        JSON.stringify({ success: false, error: "agentConfig and testMessage are required", statusCode: 400, duration: Date.now() - startTime }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate skill templates
    for (const skill of generatedSkills) {
      if (skill.templateContent?.includes('{{') && !skill.templateContent.includes('}}')) {
        return new Response(
          JSON.stringify({ success: false, error: `技能 "${skill.name}" 的模板语法错误`, statusCode: 422, duration: Date.now() - startTime, failedComponent: skill.id }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Build enhanced system prompt
    let enhancedSystemPrompt = agentConfig.systemPrompt;
    if (generatedSkills.length > 0) {
      enhancedSystemPrompt += `\n\n你具备以下能力：\n`;
      for (const skill of generatedSkills) {
        enhancedSystemPrompt += `- ${skill.name}: ${skill.description}\n`;
        if (skill.capabilities.length > 0) enhancedSystemPrompt += `  能力: ${skill.capabilities.join(', ')}\n`;
      }
    }
    enhancedSystemPrompt += `\n\n响应格式：禁用 ** 加粗和 # 标题。必须使用语义标签：
<h-entity>实体</h-entity>（文件/人名/ID）
<h-alert>警告</h-alert>（错误/警告）
<h-data>数据</h-data>（金额/百分比/日期）
<h-status>状态</h-status>（完成/成功）
<h-code>代码</h-code>（命令/变量名）
<h-action>操作</h-action>（建议操作）
结构符号：[v]/[x]/(!)、┌─├─└─│
`;

    const aiGatewayUrl = Deno.env.get("AI_GATEWAY_URL") || "https://ai.gateway.lovable.dev/v1/chat/completions";
    const apiKey = Deno.env.get("FANCE_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "AI API key not configured", statusCode: 500, duration: Date.now() - startTime, failedComponent: "config" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const validModel = mapToValidModel(agentConfig.model);
      
      const response = await fetch(aiGatewayUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
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
        return new Response(
          JSON.stringify({ success: false, error: `AI service error: ${response.status}`, statusCode: response.status, duration: Date.now() - startTime, failedComponent: "ai_gateway" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content || aiResponse.content || aiResponse.response || "";

      if (!content || content.trim().length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: "AI returned empty response", statusCode: 204, duration: Date.now() - startTime, failedComponent: "agent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const errorIndicators = ["无法处理", "不支持", "出错了", "发生错误", "I cannot", "I'm unable", "error occurred"];
      const hasErrorIndicator = errorIndicators.some(i => content.toLowerCase().includes(i.toLowerCase()));

      if (hasErrorIndicator) {
        return new Response(
          JSON.stringify({ success: false, error: "AI response contains error indicators", response: content, statusCode: 200, duration: Date.now() - startTime, failedComponent: "agent" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, response: content, statusCode: 200, duration: Date.now() - startTime }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return new Response(
          JSON.stringify({ success: false, error: `Request timeout (${timeoutMs}ms)`, statusCode: 408, duration: Date.now() - startTime, failedComponent: "network" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw fetchError;
    }

  } catch (error: unknown) {
    console.error("Sandbox validation error:", error instanceof Error ? error.message : "Unknown");
    return new Response(
      JSON.stringify({ success: false, error: "Internal error", statusCode: 500, duration: Date.now() - startTime, failedComponent: "sandbox_system" }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get("origin")), "Content-Type": "application/json" } }
    );
  }
});
