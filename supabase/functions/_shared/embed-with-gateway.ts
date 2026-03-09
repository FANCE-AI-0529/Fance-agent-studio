/**
 * @file embed-with-gateway.ts
 * @description 共享向量嵌入模块，通过配置的 Embedding API 生成向量
 * @module EdgeFunctions/Shared/Embedding
 * @author Fance Studio Team
 * @copyright 2025 Fance Studio. All rights reserved.
 * @version 2.0.0 - 开源版本，支持自定义 Embedding 端点
 */

import { EMBEDDING_CONFIG, AI_CONFIG, getEmbeddingHeaders, getAIHeaders, isEmbeddingConfigured } from "./config.ts";

/**
 * Embedding 响应数据结构
 */
interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

/**
 * 生成单个文本的向量嵌入
 * 
 * 调用配置的 Embedding API 将文本转换为向量表示，
 * 返回指定维度的浮点数数组。
 * 
 * @param {string} text - 待向量化的文本内容
 * @param {string} [apiKey] - API 密钥 (可选，默认使用环境变量)
 * @param {string} [model] - 可选的模型名称
 * @returns {Promise<number[]>} 返回向量数组
 * @throws {Error} 当 API 调用失败时抛出错误
 * 
 * @example
 * const embedding = await generateEmbedding("你好世界");
 * console.log(embedding.length); // 1536 (取决于模型)
 */
export async function generateEmbedding(
  text: string,
  apiKey?: string,
  model?: string
): Promise<number[]> {
  // [校验]：确保文本非空
  if (!text || text.trim().length === 0) {
    throw new Error("Embedding text cannot be empty");
  }

  // Use FANCE_API_KEY with LOVABLE_API_KEY fallback
  const gatewayApiKey = Deno.env.get("FANCE_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
  const effectiveApiKey = gatewayApiKey || apiKey || EMBEDDING_CONFIG.API_KEY;
  const effectiveModel = gatewayApiKey ? "text-embedding-3-small" : (model || EMBEDDING_CONFIG.DEFAULT_MODEL);
  const effectiveEndpoint = gatewayApiKey 
    ? "https://ai.gateway.lovable.dev/v1/embeddings" 
    : EMBEDDING_CONFIG.ENDPOINT;

  if (!effectiveApiKey) {
    throw new Error("Embedding API key not configured. Set FANCE_API_KEY, AI_EMBEDDING_KEY or AI_API_KEY environment variable.");
  }

  console.debug(`[embed-with-gateway] Using ${gatewayApiKey ? 'AI Gateway' : 'custom endpoint'} for embedding`);

  // [请求]：调用 Embedding API
  const response = await fetch(effectiveEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${effectiveApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: effectiveModel,
      input: text.trim(),
    }),
  });

  // [错误处理]：检查响应状态
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[embed-with-gateway] Embedding API error: ${response.status}`, errorText);
    throw new Error(`Embedding API error: ${response.status} - ${errorText}`);
  }

  // [解析]：提取向量数据
  const data: EmbeddingResponse = await response.json();
  
  if (!data.data || data.data.length === 0 || !data.data[0].embedding) {
    throw new Error("Invalid embedding response: no embedding data");
  }

  console.log(`[embed-with-gateway] Generated embedding for ${text.length} chars, ${data.usage?.total_tokens || 0} tokens`);
  
  return data.data[0].embedding;
}

/**
 * 批量生成多个文本的向量嵌入
 * 
 * 通过单次 API 调用处理多个文本，比逐个调用更高效。
 * 适用于文档切片后的批量向量化场景。
 * 
 * @param {string[]} texts - 待向量化的文本数组
 * @param {string} [apiKey] - API 密钥 (可选，默认使用环境变量)
 * @param {string} [model] - 可选的模型名称
 * @returns {Promise<number[][]>} 返回向量数组的数组，顺序与输入一致
 * @throws {Error} 当 API 调用失败或响应格式错误时抛出
 * 
 * @example
 * const embeddings = await generateBatchEmbeddings(["段落一", "段落二", "段落三"]);
 * console.log(embeddings.length); // 3
 */
export async function generateBatchEmbeddings(
  texts: string[],
  apiKey?: string,
  model?: string
): Promise<number[][]> {
  // [校验]：确保数组非空
  if (!texts || texts.length === 0) {
    throw new Error("Texts array cannot be empty");
  }

  // [过滤]：清理空白文本
  const cleanedTexts = texts.map(t => t.trim()).filter(t => t.length > 0);
  
  if (cleanedTexts.length === 0) {
    throw new Error("All texts are empty after trimming");
  }

  // Use FANCE_API_KEY with LOVABLE_API_KEY fallback
  const gatewayApiKey = Deno.env.get("FANCE_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
  const effectiveApiKey = gatewayApiKey || apiKey || EMBEDDING_CONFIG.API_KEY;
  const effectiveModel = gatewayApiKey ? "text-embedding-3-small" : (model || EMBEDDING_CONFIG.DEFAULT_MODEL);
  const effectiveEndpoint = gatewayApiKey 
    ? "https://ai.gateway.lovable.dev/v1/embeddings" 
    : EMBEDDING_CONFIG.ENDPOINT;

  if (!effectiveApiKey) {
    throw new Error("Embedding API key not configured. Set FANCE_API_KEY, AI_EMBEDDING_KEY or AI_API_KEY environment variable.");
  }

  console.debug(`[embed-with-gateway] Batch embedding ${cleanedTexts.length} texts via ${gatewayApiKey ? 'AI Gateway' : 'custom endpoint'}`);

  // [请求]：调用 Embedding API (批量模式)
  const response = await fetch(effectiveEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${effectiveApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: effectiveModel,
      input: cleanedTexts,
    }),
  });

  // [错误处理]：检查响应状态
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[embed-with-gateway] Batch embedding API error: ${response.status}`, errorText);
    throw new Error(`Batch embedding API error: ${response.status} - ${errorText}`);
  }

  // [解析]：提取向量数据
  const data: EmbeddingResponse = await response.json();
  
  if (!data.data || data.data.length === 0) {
    throw new Error("Invalid batch embedding response: no embedding data");
  }

  // [排序]：确保返回顺序与输入一致
  const sortedEmbeddings = data.data
    .sort((a, b) => a.index - b.index)
    .map(d => d.embedding);

  console.log(`[embed-with-gateway] Batch embedding completed: ${sortedEmbeddings.length} vectors, ${data.usage?.total_tokens || 0} tokens`);

  return sortedEmbeddings;
}

/**
 * 将 ArrayBuffer 转换为 Base64 (内存优化版)
 * 使用分块处理避免大文件导致内存溢出
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 32768; // 32KB chunks to avoid stack overflow
  let result = '';
  
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    result += String.fromCharCode.apply(null, [...chunk]);
  }
  
  return btoa(result);
}

/**
 * 最大允许 AI 解析的文件大小 (3MB)
 * 超过此大小的文件将直接使用正则解析
 */
const MAX_AI_PARSE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 使用 AI 多模态能力解析 PDF 文档
 * 
 * 将 PDF 文件发送给多模态 AI 模型，利用其视觉理解能力
 * 提取文档中的全部文字内容，包括扫描版 PDF。
 * 
 * 注意：大文件（>3MB）会跳过 AI 解析以避免内存溢出
 * 
 * @param {ArrayBuffer} pdfBuffer - PDF 文件的二进制数据
 * @param {string} [apiKey] - API 密钥 (可选)
 * @returns {Promise<string>} 返回提取的文本内容
 * @throws {Error} 当 PDF 解析失败时抛出错误
 */
export async function extractTextWithAI(
  pdfBuffer: ArrayBuffer,
  apiKey?: string
): Promise<string> {
  const fileSizeKB = Math.round(pdfBuffer.byteLength / 1024);
  const fileSizeMB = (pdfBuffer.byteLength / (1024 * 1024)).toFixed(2);
  
  console.log(`[embed-with-gateway] PDF size: ${fileSizeKB}KB (${fileSizeMB}MB)`);
  
  // [大小检查]：超过限制的文件跳过 AI 解析
  if (pdfBuffer.byteLength > MAX_AI_PARSE_SIZE) {
    console.log(`[embed-with-gateway] ⚠️ File too large for AI parsing (${fileSizeMB}MB > 10MB limit)`);
    console.log(`[embed-with-gateway] Skipping AI extraction to avoid memory overflow`);
    throw new Error(`File too large for AI parsing: ${fileSizeMB}MB exceeds 10MB limit`);
  }

    // 优先使用 LOVABLE_API_KEY 通过 Lovable AI Gateway
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const effectiveApiKey = lovableApiKey || apiKey || AI_CONFIG.API_KEY;
    const gatewayUrl = lovableApiKey 
      ? "https://ai.gateway.lovable.dev/v1/chat/completions" 
      : AI_CONFIG.GATEWAY_URL;
    const model = lovableApiKey 
      ? "google/gemini-2.5-flash" 
      : AI_CONFIG.DEFAULT_MODEL;
  
  if (!effectiveApiKey) {
    throw new Error("AI API key not configured for PDF extraction");
  }

  try {
    // [编码]：将 PDF 转换为 Base64 (内存优化)
    console.log(`[embed-with-gateway] Encoding PDF to Base64...`);
    const base64 = arrayBufferToBase64(pdfBuffer);
    console.log(`[embed-with-gateway] Base64 encoded: ${Math.round(base64.length / 1024)}KB`);

    // [请求]：调用 AI Chat API (多模态) - 使用 Gemini 2.5 Flash 进行 PDF OCR
    console.log(`[embed-with-gateway] Calling AI (${model}) for PDF extraction via ${lovableApiKey ? 'Lovable Gateway' : 'custom gateway'}...`);
    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${effectiveApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "请提取这个PDF文档的全部文字内容，保持原始结构和段落格式。只输出文档内容，不要添加任何说明、总结或注释。如果是扫描版文档，请识别其中的文字。"
              },
              {
                type: "image_url",
                image_url: { url: `data:application/pdf;base64,${base64}` }
              }
            ]
          }
        ],
        max_tokens: 32000,
        temperature: 0.1, // 低温度提高准确性
      }),
    });

    // [错误处理]：检查响应状态
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[embed-with-gateway] PDF extraction API error: ${response.status}`, errorText);
      throw new Error(`PDF extraction failed: ${response.status}`);
    }

    // [解析]：提取文本内容
    const data = await response.json();
    const extractedText = data.choices?.[0]?.message?.content || "";

    console.log(`[embed-with-gateway] ✅ Extracted ${extractedText.length} chars from PDF`);

    return extractedText;
  } catch (error) {
    // 显式处理内存相关错误
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('memory') || errorMessage.includes('limit') || errorMessage.includes('heap')) {
      console.error(`[embed-with-gateway] ❌ Memory error during PDF processing: ${errorMessage}`);
      throw new Error(`Memory limit exceeded processing PDF (${fileSizeMB}MB)`);
    }
    throw error;
  }
}
