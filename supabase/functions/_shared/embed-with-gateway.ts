/**
 * @file embed-with-gateway.ts
 * @description 共享向量嵌入模块，通过 Lovable AI Gateway 生成真实 Embedding
 * @module EdgeFunctions/Shared/Embedding
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

/**
 * AI Gateway 端点地址
 */
const EMBEDDING_ENDPOINT = "https://ai.gateway.lovable.dev/v1/embeddings";

/**
 * 默认 Embedding 模型
 */
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

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
 * 调用 Lovable AI Gateway 的 Embedding API 将文本转换为向量表示，
 * 返回 1536 维的浮点数数组。
 * 
 * @param {string} text - 待向量化的文本内容
 * @param {string} apiKey - Lovable API 密钥
 * @param {string} [model] - 可选的模型名称，默认使用 text-embedding-3-small
 * @returns {Promise<number[]>} 返回向量数组 (1536 维)
 * @throws {Error} 当 API 调用失败时抛出错误
 * 
 * @example
 * const embedding = await generateEmbedding("你好世界", LOVABLE_API_KEY);
 * console.log(embedding.length); // 1536
 */
export async function generateEmbedding(
  text: string,
  apiKey: string,
  model: string = DEFAULT_EMBEDDING_MODEL
): Promise<number[]> {
  // [校验]：确保文本非空
  if (!text || text.trim().length === 0) {
    throw new Error("Embedding text cannot be empty");
  }

  // [请求]：调用 AI Gateway Embedding API
  const response = await fetch(EMBEDDING_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
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
 * @param {string} apiKey - Lovable API 密钥
 * @param {string} [model] - 可选的模型名称，默认使用 text-embedding-3-small
 * @returns {Promise<number[][]>} 返回向量数组的数组，顺序与输入一致
 * @throws {Error} 当 API 调用失败或响应格式错误时抛出
 * 
 * @example
 * const embeddings = await generateBatchEmbeddings(
 *   ["段落一内容", "段落二内容", "段落三内容"],
 *   LOVABLE_API_KEY
 * );
 * console.log(embeddings.length); // 3
 * console.log(embeddings[0].length); // 1536
 */
export async function generateBatchEmbeddings(
  texts: string[],
  apiKey: string,
  model: string = DEFAULT_EMBEDDING_MODEL
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

  console.log(`[embed-with-gateway] Batch embedding ${cleanedTexts.length} texts`);

  // [请求]：调用 AI Gateway Embedding API (批量模式)
  const response = await fetch(EMBEDDING_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
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
 * 使用 AI Gateway 多模态能力解析 PDF 文档
 * 
 * 将 PDF 文件发送给 Gemini Flash 模型，利用其视觉理解能力
 * 提取文档中的全部文字内容，包括扫描版 PDF。
 * 
 * @param {ArrayBuffer} pdfBuffer - PDF 文件的二进制数据
 * @param {string} apiKey - Lovable API 密钥
 * @returns {Promise<string>} 返回提取的文本内容
 * @throws {Error} 当 PDF 解析失败时抛出错误
 * 
 * @example
 * const pdfData = await file.arrayBuffer();
 * const text = await extractTextWithAI(pdfData, LOVABLE_API_KEY);
 * console.log(text);
 */
export async function extractTextWithAI(
  pdfBuffer: ArrayBuffer,
  apiKey: string
): Promise<string> {
  // [编码]：将 PDF 转换为 Base64
  const bytes = new Uint8Array(pdfBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  console.log(`[embed-with-gateway] Extracting text from PDF (${Math.round(pdfBuffer.byteLength / 1024)}KB)`);

  // [请求]：调用 AI Gateway Chat API (多模态)
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
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
      max_tokens: 16000,
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

  console.log(`[embed-with-gateway] Extracted ${extractedText.length} chars from PDF`);

  return extractedText;
}
