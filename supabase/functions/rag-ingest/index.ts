/**
 * @file rag-ingest/index.ts
 * @description RAG 知识库文档摄入服务，负责文档解析、切片和向量化
 * @module EdgeFunctions/RAGIngest
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 2.0.0 - 集成真实向量化
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { generateBatchEmbeddings, extractTextWithAI } from "../_shared/embed-with-gateway.ts";

/**
 * CORS 响应头配置
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * 文档切片结果数据结构
 */
interface ChunkResult {
  /** 切片文本内容 */
  content: string;
  /** 切片索引序号 */
  index: number;
  /** 估算的 Token 数量 */
  tokenCount: number;
  /** 切片元数据 */
  metadata: Record<string, unknown>;
}

/**
 * PDF 文本提取 - 正则表达式方法 (降级方案)
 * 
 * 使用多种模式匹配从 PDF 二进制数据中提取文本内容。
 * 作为 AI 解析失败时的降级方案。
 * 
 * @param {ArrayBuffer} pdfBuffer - PDF 文件二进制数据
 * @returns {Promise<string>} 提取的文本内容
 */
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(pdfBuffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  
  const extractedParts: string[] = [];
  
  // [方法1]：提取 BT...ET 文本块
  const btEtPattern = /BT\s*([\s\S]*?)\s*ET/g;
  let match;
  while ((match = btEtPattern.exec(text)) !== null) {
    const block = match[1];
    
    // 提取 Tj 操作符的文本
    const tjPattern = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjPattern.exec(block)) !== null) {
      const decoded = decodeEscapedString(tjMatch[1]);
      if (decoded.trim()) {
        extractedParts.push(decoded);
      }
    }
    
    // 提取 TJ 数组中的文本
    const tjArrayPattern = /\[((?:[^\[\]]*|\[(?:[^\[\]]*|\[[^\[\]]*\])*\])*)\]\s*TJ/gi;
    let tjArrayMatch;
    while ((tjArrayMatch = tjArrayPattern.exec(block)) !== null) {
      const arrayContent = tjArrayMatch[1];
      const stringPattern = /\(((?:[^()\\]|\\.)*)\)/g;
      let strMatch;
      while ((strMatch = stringPattern.exec(arrayContent)) !== null) {
        const decoded = decodeEscapedString(strMatch[1]);
        if (decoded.trim()) {
          extractedParts.push(decoded);
        }
      }
    }
  }

  // [方法2]：提取 Unicode 流 (常见于中文 PDF)
  const unicodePattern = /<([0-9A-Fa-f]+)>\s*Tj/g;
  while ((match = unicodePattern.exec(text)) !== null) {
    const hexString = match[1];
    const decoded = decodeHexString(hexString);
    if (decoded.trim()) {
      extractedParts.push(decoded);
    }
  }
  
  // [方法3]：查找纯文本模式
  const plainTextPattern = /\/Contents\s*\(([^)]+)\)/g;
  while ((match = plainTextPattern.exec(text)) !== null) {
    const content = match[1];
    if (content.trim() && !content.includes('\\') && content.length > 10) {
      extractedParts.push(content);
    }
  }
  
  // [合并]：清理并拼接结果
  let result = extractedParts.join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // [降级]：如果提取内容过少，尝试备用方法
  if (result.length < 100) {
    const altResult = extractPlainTextFallback(text);
    if (altResult.length > result.length) {
      result = altResult;
    }
  }
  
  return result;
}

/**
 * 解码 PDF 转义字符串
 */
function decodeEscapedString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\(.)/g, '$1');
}

/**
 * 解码十六进制字符串 (UTF-16BE)
 */
function decodeHexString(hex: string): string {
  let result = '';
  // 尝试 UTF-16BE 解码 (常见于 CJK)
  if (hex.length % 4 === 0) {
    for (let i = 0; i < hex.length; i += 4) {
      const code = parseInt(hex.substr(i, 4), 16);
      if (code > 0) {
        result += String.fromCharCode(code);
      }
    }
    if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(result) || /[a-zA-Z0-9]/.test(result)) {
      return result;
    }
  }
  // 降级到单字节解码
  result = '';
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.substr(i, 2), 16);
    if (code > 31 && code < 127) {
      result += String.fromCharCode(code);
    }
  }
  return result;
}

/**
 * 纯文本提取降级方案
 */
function extractPlainTextFallback(text: string): string {
  const readableChars: string[] = [];
  let currentWord = '';
  
  for (const char of text) {
    const code = char.charCodeAt(0);
    if ((code >= 32 && code <= 126) || (code >= 0x4e00 && code <= 0x9fff)) {
      currentWord += char;
    } else {
      if (currentWord.length > 3) {
        readableChars.push(currentWord);
      }
      currentWord = '';
    }
  }
  if (currentWord.length > 3) {
    readableChars.push(currentWord);
  }
  
  return readableChars.join(' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\u4e00-\u9fff\u3000-\u303f，。！？、；：""''（）【】]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 从对象存储获取文件内容
 * 
 * @param {any} supabase - Supabase 客户端实例
 * @param {string} userId - 用户 ID
 * @param {string} knowledgeBaseId - 知识库 ID
 * @param {string} fileName - 文件名
 * @param {string} apiKey - Lovable API 密钥 (用于 AI PDF 解析)
 * @returns 文件内容或错误信息
 */
async function fetchFileFromStorage(
  supabase: any,
  userId: string,
  knowledgeBaseId: string,
  fileName: string,
  apiKey?: string
): Promise<{ content: string; success: boolean; error?: string }> {
  try {
    const filePath = `${userId}/${knowledgeBaseId}/${fileName}`;
    console.log(`[rag-ingest] Fetching file from storage: ${filePath}`);
    
    // [下载]：从 Storage 获取文件
    const { data, error } = await supabase.storage
      .from('knowledge-documents')
      .download(filePath);
    
    if (error) {
      console.error('[rag-ingest] Storage download error:', error);
      return { content: '', success: false, error: error.message };
    }
    
    if (!data) {
      return { content: '', success: false, error: 'File not found in storage' };
    }
    
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    // [PDF 处理]：优先使用 AI 解析
    if (fileExtension === 'pdf') {
      const buffer = await data.arrayBuffer();
      
      // 尝试 AI Gateway 多模态解析
      if (apiKey) {
        try {
          console.log('[rag-ingest] Attempting AI-powered PDF extraction...');
          const aiExtracted = await extractTextWithAI(buffer, apiKey);
          if (aiExtracted && aiExtracted.trim().length > 50) {
            console.log(`[rag-ingest] AI extraction successful: ${aiExtracted.length} chars`);
            return { content: aiExtracted, success: true };
          }
        } catch (aiError) {
          console.log('[rag-ingest] AI extraction failed, falling back to regex:', aiError);
        }
      }
      
      // 降级到正则解析
      const extractedText = await extractTextFromPDF(buffer);
      console.log(`[rag-ingest] Regex extraction: ${extractedText.length} chars`);
      return { content: extractedText, success: true };
    } 
    
    // [文本文件]：直接读取
    if (['txt', 'md', 'json'].includes(fileExtension || '')) {
      const textContent = await data.text();
      return { content: textContent, success: true };
    }
    
    // [其他格式]：尝试作为文本读取
    const textContent = await data.text();
    return { content: textContent, success: true };
    
  } catch (err) {
    console.error('[rag-ingest] Error fetching file from storage:', err);
    return { 
      content: '', 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

/**
 * 最大可处理文件大小（5MB）
 * 超过此大小的文件将跳过 AI 解析，使用元数据降级
 */
const MAX_PROCESSABLE_SIZE = 5 * 1024 * 1024;

/**
 * 主服务入口
 */
serve(async (req) => {
  // [CORS]：处理预检请求
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 用于错误恢复的变量
  let supabase: any = null;
  let knowledgeBaseId: string | null = null;
  let documentId: string | null = null;

  try {
    // [认证]：验证用户身份
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // [客户端]：创建认证和服务客户端
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    // [用户验证]：获取当前用户
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // [参数解析]：获取文档 ID
    const requestBody = await req.json();
    documentId = requestBody.documentId;
    
    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "documentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[rag-ingest] Starting ingestion for document: ${documentId}, user: ${user.id}`);

    // [查询]：获取文档信息
    const { data: document, error: docError } = await supabase
      .from("knowledge_documents")
      .select("*, knowledge_bases(*)")
      .eq("id", documentId)
      .eq("user_id", user.id)
      .single();

    if (docError || !document) {
      console.error("[rag-ingest] Document not found:", docError);
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 保存 knowledgeBaseId 用于错误恢复
    knowledgeBaseId = document.knowledge_base_id;

    // [文件大小检查]：超大文件直接跳过，使用元数据降级
    const fileSize = document.file_size || 0;
    if (fileSize > MAX_PROCESSABLE_SIZE) {
      console.warn(`[rag-ingest] File too large (${fileSize} bytes > ${MAX_PROCESSABLE_SIZE}), skipping indexing`);
      
      // 标记为 ready 但添加警告
      await supabase
        .from("knowledge_documents")
        .update({ 
          status: "skipped",
          error_message: `文件过大 (${Math.round(fileSize / 1024 / 1024)}MB)，已跳过索引。您仍可使用该知识库，但检索效果可能受限。`,
        })
        .eq("id", documentId);
      
      await supabase
        .from("knowledge_bases")
        .update({ 
          index_status: "ready",
        })
        .eq("id", knowledgeBaseId);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          warning: "file_too_large",
          message: `文件过大 (${Math.round(fileSize / 1024 / 1024)}MB)，已跳过详细索引`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // [状态更新]：标记为处理中
    await supabase
      .from("knowledge_documents")
      .update({ status: "processing" })
      .eq("id", documentId);

    try {
      const knowledgeBase = document.knowledge_bases;
      const chunkSize = knowledgeBase.chunk_size || 512;
      const chunkOverlap = knowledgeBase.chunk_overlap || 50;

      // [内容获取]：优先从数据库读取，否则从 Storage 获取
      let content = document.content || "";
      
      if (!content || content.trim().length === 0) {
        console.log("[rag-ingest] No content in database, fetching from storage...");
        
        const storageResult = await fetchFileFromStorage(
          supabase,
          user.id,
          document.knowledge_base_id,
          document.name,
          LOVABLE_API_KEY
        );
        
        if (storageResult.success && storageResult.content.trim().length > 0) {
          content = storageResult.content;
          console.log(`[rag-ingest] Extracted ${content.length} chars from storage`);
          
          // 更新数据库中的内容
          await supabase
            .from("knowledge_documents")
            .update({ content })
            .eq("id", documentId);
        } else {
          const fileExtension = document.name?.split('.').pop()?.toLowerCase();
          const errorMessage = fileExtension === 'pdf' 
            ? "PDF文档为纯图片格式，无法提取文字内容。请使用包含可选择文字的PDF文档，或手动输入文档内容。"
            : "文档内容为空，请先上传或输入文档内容";
          
          await supabase
            .from("knowledge_documents")
            .update({ 
              status: "failed",
              error_message: errorMessage,
            })
            .eq("id", documentId);

          return new Response(
            JSON.stringify({ 
              error: "Document has no content", 
              message: errorMessage
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // [切片]：将文档分割成小块
      const chunks = chunkText(content, chunkSize, chunkOverlap);
      console.log(`[rag-ingest] Created ${chunks.length} chunks`);

      // [清理]：删除该文档的旧切片
      await supabase
        .from("document_chunks")
        .delete()
        .eq("document_id", documentId);

      // [向量化]：批量生成 Embedding
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY not configured - cannot generate embeddings");
      }

      // 批量处理以提高效率
      const BATCH_SIZE = 10;
      let processedCount = 0;

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const texts = batch.map(c => c.content);
        
        console.log(`[rag-ingest] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}`);
        
        // 调用真实 Embedding API
        const embeddings = await generateBatchEmbeddings(texts, LOVABLE_API_KEY);
        
        // 批量插入切片和向量
        const batchRecords = batch.map((chunk, j) => ({
          document_id: documentId,
          knowledge_base_id: document.knowledge_base_id,
          user_id: user.id,
          content: chunk.content,
          embedding: `[${embeddings[j].join(",")}]`,
          chunk_index: chunk.index,
          token_count: chunk.tokenCount,
          metadata: chunk.metadata,
        }));

        const { error: insertError } = await supabase
          .from("document_chunks")
          .insert(batchRecords);

        if (insertError) {
          console.error("[rag-ingest] Error inserting chunk batch:", insertError);
          // 清理已插入的脏数据
          await supabase
            .from("document_chunks")
            .delete()
            .eq("document_id", documentId);
          throw insertError;
        }
        processedCount += batch.length;
      }

      // [完成]：更新文档状态
      await supabase
        .from("knowledge_documents")
        .update({ 
          status: "indexed",
          chunks_count: chunks.length,
          error_message: null,
        })
        .eq("id", documentId);

      // [知识库状态]：检查是否所有文档都已索引
      const { data: pendingDocs } = await supabase
        .from("knowledge_documents")
        .select("id")
        .eq("knowledge_base_id", document.knowledge_base_id)
        .in("status", ["pending", "processing"]);

      if (!pendingDocs || pendingDocs.length === 0) {
        await supabase
          .from("knowledge_bases")
          .update({ index_status: "ready" })
          .eq("id", document.knowledge_base_id);
      }

      console.log(`[rag-ingest] Successfully indexed document: ${documentId}, ${processedCount} chunks with real embeddings`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          chunksCount: chunks.length,
          documentId,
          embeddingModel: "text-embedding-3-small",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (processingError) {
      console.error("[rag-ingest] Processing error:", processingError);
      
      await supabase
        .from("knowledge_documents")
        .update({ 
          status: "failed",
          error_message: processingError instanceof Error ? processingError.message : "Unknown error",
        })
        .eq("id", documentId);

      await supabase
        .from("knowledge_bases")
        .update({ index_status: "failed" })
        .eq("id", document.knowledge_base_id);

      throw processingError;
    }
  } catch (error) {
    console.error("[rag-ingest] Fatal error:", error);
    
    // [错误恢复]：确保即使崩溃也更新状态为 failed
    if (supabase && knowledgeBaseId) {
      try {
        await supabase
          .from("knowledge_bases")
          .update({ 
            index_status: "failed",
          })
          .eq("id", knowledgeBaseId);
        
        if (documentId) {
          await supabase
            .from("knowledge_documents")
            .update({ 
              status: "failed",
              error_message: error instanceof Error ? error.message : "处理失败",
            })
            .eq("id", documentId);
        }
        
        console.log("[rag-ingest] Error recovery: status updated to failed");
      } catch (recoveryError) {
        console.error("[rag-ingest] Error recovery failed:", recoveryError);
      }
    }
    
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * 文本切片函数
 * 
 * 基于句子边界将长文本分割成适合向量化的小块。
 * 使用重叠策略确保上下文连续性。
 * 
 * @param {string} text - 原始文本内容
 * @param {number} chunkSize - 每个切片的目标 Token 数量
 * @param {number} overlap - 切片之间的重叠 Token 数量
 * @returns {ChunkResult[]} 切片结果数组
 */
function chunkText(text: string, chunkSize: number, overlap: number): ChunkResult[] {
  const chunks: ChunkResult[] = [];
  // 按句子分割 (支持中英文标点)
  const sentences = text.split(/(?<=[.!?。！？])\s+/);
  
  let currentChunk = "";
  let currentTokens = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (currentTokens + sentenceTokens > chunkSize && currentChunk) {
      // 保存当前切片
      chunks.push({
        content: currentChunk.trim(),
        index: chunkIndex,
        tokenCount: currentTokens,
        metadata: {},
      });
      chunkIndex++;

      // 使用重叠开始新切片
      const overlapText = getOverlapText(currentChunk, overlap);
      currentChunk = overlapText + " " + sentence;
      currentTokens = estimateTokens(currentChunk);
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
      currentTokens += sentenceTokens;
    }
  }

  // 保存最后一个切片
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      index: chunkIndex,
      tokenCount: currentTokens,
      metadata: {},
    });
  }

  return chunks;
}

/**
 * 估算文本的 Token 数量
 * 
 * 使用简单规则估算：中文约 2 字符/token，英文约 4 字符/token
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 2 + otherChars / 4);
}

/**
 * 获取切片重叠部分的文本
 */
function getOverlapText(text: string, targetTokens: number): string {
  const words = text.split(/\s+/);
  let overlapText = "";
  let tokens = 0;
  
  for (let i = words.length - 1; i >= 0 && tokens < targetTokens; i--) {
    overlapText = words[i] + (overlapText ? " " + overlapText : "");
    tokens = estimateTokens(overlapText);
  }
  
  return overlapText;
}
