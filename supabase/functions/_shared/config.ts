/**
 * @file _shared/config.ts
 * @description 边缘函数共享配置 - 统一环境变量管理
 * @module EdgeFunctions/Shared/Config
 * @author Agent Studio Team
 * @copyright 2025 Agent Studio. All rights reserved.
 * @version 1.0.0
 */

/**
 * AI 服务配置
 * 
 * 通过环境变量配置 AI 服务端点和密钥，支持多种 OpenAI 兼容的 API 提供商。
 */
export const AI_CONFIG = {
  /** AI Gateway URL (兼容 OpenAI Chat Completions API) */
  GATEWAY_URL: Deno.env.get('AI_GATEWAY_URL') || 'https://api.openai.com/v1/chat/completions',
  
  /** AI API 密钥 */
  API_KEY: Deno.env.get('AI_API_KEY') || '',
  
  /** 默认模型名称 */
  DEFAULT_MODEL: Deno.env.get('AI_DEFAULT_MODEL') || 'gpt-4o-mini',
  
  /** 默认温度 */
  DEFAULT_TEMPERATURE: 0.7,
  
  /** 默认最大 Token 数 */
  DEFAULT_MAX_TOKENS: 4096,
};

/**
 * Embedding 服务配置
 */
export const EMBEDDING_CONFIG = {
  /** Embedding API URL */
  ENDPOINT: Deno.env.get('AI_EMBEDDING_URL') || 'https://api.openai.com/v1/embeddings',
  
  /** Embedding API 密钥 (如未设置则使用 AI_API_KEY) */
  API_KEY: Deno.env.get('AI_EMBEDDING_KEY') || Deno.env.get('AI_API_KEY') || '',
  
  /** 默认 Embedding 模型 */
  DEFAULT_MODEL: Deno.env.get('AI_EMBEDDING_MODEL') || 'text-embedding-3-small',
};

/**
 * Supabase 配置
 */
export const SUPABASE_CONFIG = {
  URL: Deno.env.get('SUPABASE_URL') || '',
  ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') || '',
  SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
};

/**
 * 检查 AI 服务是否已配置
 */
export function isAIConfigured(): boolean {
  return !!(AI_CONFIG.API_KEY && AI_CONFIG.GATEWAY_URL);
}

/**
 * 检查 Embedding 服务是否已配置
 */
export function isEmbeddingConfigured(): boolean {
  return !!(EMBEDDING_CONFIG.API_KEY && EMBEDDING_CONFIG.ENDPOINT);
}

/**
 * 获取 AI 请求头
 */
export function getAIHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${AI_CONFIG.API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/**
 * 获取 Embedding 请求头
 */
export function getEmbeddingHeaders(): Record<string, string> {
  return {
    'Authorization': `Bearer ${EMBEDDING_CONFIG.API_KEY}`,
    'Content-Type': 'application/json',
  };
}
