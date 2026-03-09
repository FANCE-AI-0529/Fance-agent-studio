/**
 * @file _shared/llm-client.ts
 * @description 统一 LLM 调用客户端，通过 llm-gateway 路由请求到用户配置的供应商
 * @module EdgeFunctions/Shared/LLMClient
 * @author Fance Studio Team
 * @copyright 2025 Fance Studio. All rights reserved.
 * @version 2.0.0 - 开源版本，移除平台特定依赖
 */

import { AI_CONFIG, getAIHeaders, isAIConfigured } from "./config.ts";

/**
 * LLM 请求参数
 */
export interface LLMRequestOptions {
  messages: Array<{ role: string; content: string | any[] }>;
  userId?: string;
  agentId?: string;
  moduleType: string;
  model?: string;
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  toolChoice?: string | object;
  systemPrompt?: string;
}

/**
 * LLM 响应结构
 */
export interface LLMResponse {
  success: boolean;
  content?: string;
  toolCalls?: any[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
  provider?: string;
  latency_ms?: number;
  error?: string;
}

/**
 * 通过 llm-gateway 调用 LLM
 * 
 * 该函数是所有边缘函数调用 LLM 的统一入口点。
 * 它会自动路由到用户配置的供应商，如果不可用则 fallback 到默认 AI 服务。
 * 
 * @param options LLM 请求参数
 * @returns 如果 stream=true 返回 Response，否则返回 LLMResponse
 */
export async function callLLM(options: LLMRequestOptions): Promise<Response | LLMResponse> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  const requestBody = {
    messages: options.messages,
    user_id: options.userId,
    agent_id: options.agentId,
    module_type: options.moduleType,
    model: options.model,
    stream: options.stream ?? false,
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    tools: options.tools,
    tool_choice: options.toolChoice,
    system_prompt: options.systemPrompt,
  };
  
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/llm-gateway`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    // 流式响应直接返回
    if (options.stream) {
      return response;
    }
    
    // 非流式响应解析
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[llm-client] Gateway error: ${response.status}`, errorText);
      
      // 尝试 fallback 到默认 AI 服务
      return await callDirectAI(options);
    }
    
    const data = await response.json();
    return data as LLMResponse;
  } catch (error) {
    console.error('[llm-client] Gateway call failed, trying fallback:', error);
    
    // Fallback 到默认 AI 服务
    return await callDirectAI(options);
  }
}

/**
 * 直接调用 AI Gateway (fallback)
 * 
 * 当 llm-gateway 不可用时，直接调用配置的 AI 服务。
 */
async function callDirectAI(options: LLMRequestOptions): Promise<Response | LLMResponse> {
  if (!isAIConfigured()) {
    return {
      success: false,
      error: 'AI service not configured. Please set AI_API_KEY and AI_GATEWAY_URL environment variables.',
    };
  }
  
  const requestBody: Record<string, unknown> = {
    model: options.model || AI_CONFIG.DEFAULT_MODEL,
    messages: options.messages,
    stream: options.stream ?? false,
    temperature: options.temperature ?? AI_CONFIG.DEFAULT_TEMPERATURE,
    max_tokens: options.maxTokens ?? AI_CONFIG.DEFAULT_MAX_TOKENS,
  };
  
  if (options.tools && options.tools.length > 0) {
    requestBody.tools = options.tools;
    requestBody.tool_choice = options.toolChoice ?? 'auto';
  }
  
  const response = await fetch(AI_CONFIG.GATEWAY_URL, {
    method: 'POST',
    headers: getAIHeaders(),
    body: JSON.stringify(requestBody),
  });
  
  // 流式响应直接返回
  if (options.stream) {
    return response;
  }
  
  if (!response.ok) {
    const errorText = await response.text();
    return {
      success: false,
      error: `AI service error: ${response.status} - ${errorText.slice(0, 200)}`,
    };
  }
  
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const toolCalls = data.choices?.[0]?.message?.tool_calls;
  
  return {
    success: true,
    content,
    toolCalls,
    usage: data.usage,
    model: data.model,
    provider: 'direct',
  };
}

/**
 * 便捷方法：调用流式 LLM
 */
export async function callLLMStream(options: Omit<LLMRequestOptions, 'stream'>): Promise<Response> {
  const result = await callLLM({ ...options, stream: true });
  return result as Response;
}

/**
 * 便捷方法：调用非流式 LLM 并获取文本响应
 */
export async function callLLMText(options: Omit<LLMRequestOptions, 'stream'>): Promise<string> {
  const result = await callLLM({ ...options, stream: false });
  
  if ('body' in result) {
    // 不应该发生，但以防万一
    const text = await (result as Response).text();
    return text;
  }
  
  const response = result as LLMResponse;
  if (!response.success) {
    throw new Error(response.error || 'LLM call failed');
  }
  
  return response.content || '';
}

/**
 * 便捷方法：调用 LLM 并获取工具调用结果
 */
export async function callLLMWithTools(
  options: Omit<LLMRequestOptions, 'stream'> & { tools: any[] }
): Promise<{ content?: string; toolCalls?: any[] }> {
  const result = await callLLM({ ...options, stream: false });
  
  if ('body' in result) {
    throw new Error('Unexpected streaming response');
  }
  
  const response = result as LLMResponse;
  if (!response.success) {
    throw new Error(response.error || 'LLM call failed');
  }
  
  return {
    content: response.content,
    toolCalls: response.toolCalls,
  };
}
