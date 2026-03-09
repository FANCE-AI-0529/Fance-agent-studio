/**
 * @file rag-query/index.ts
 * @description RAG 知识库查询服务，负责向量相似度搜索和上下文构建
 * @module EdgeFunctions/RAGQuery
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 2.0.0 - 集成真实向量查询
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { generateEmbedding } from "../_shared/embed-with-gateway.ts";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

/**
 * 主服务入口
 */
serve(async (req) => {
  // [CORS]：处理预检请求
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // [客户端]：创建带用户认证的 Supabase 客户端
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // [用户验证]：获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // [参数解析]：获取查询参数
    const { 
      query, 
      knowledgeBaseId, 
      topK = 5, 
      threshold = 0.7 
    } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: "query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[rag-query] Query: "${query.substring(0, 50)}..." for user: ${user.id}`);

    // [向量化]：使用真实 Embedding API 生成查询向量
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured - cannot generate query embedding");
    }

    const queryEmbedding = await generateEmbedding(query, LOVABLE_API_KEY);
    const embeddingString = `[${queryEmbedding.join(",")}]`;

    console.log(`[rag-query] Generated query embedding (${queryEmbedding.length} dimensions)`);

    // [搜索]：调用向量相似度搜索函数
    const { data: chunks, error: searchError } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: embeddingString,
        match_threshold: threshold,
        match_count: topK,
        p_knowledge_base_id: knowledgeBaseId || null,
        p_user_id: user.id,
      }
    );

    if (searchError) {
      console.error("[rag-query] Search error:", searchError);
      throw searchError;
    }

    console.log(`[rag-query] Found ${chunks?.length || 0} matching chunks`);

    // [构建上下文]：组装检索到的内容
    let context = "";
    let tokenCount = 0;

    if (chunks && chunks.length > 0) {
      const contextParts: string[] = [];
      
      for (const chunk of chunks) {
        // 添加相关度标签和内容
        contextParts.push(`[相关度: ${(chunk.similarity * 100).toFixed(1)}%]\n${chunk.content}`);
        tokenCount += estimateTokens(chunk.content);
      }
      
      context = contextParts.join("\n\n---\n\n");
    }

    // [返回]：返回查询结果
    return new Response(
      JSON.stringify({
        chunks: chunks || [],
        context,
        tokenCount,
        query,
        knowledgeBaseId,
        embeddingModel: "text-embedding-3-small",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[rag-query] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * 估算文本的 Token 数量
 * 
 * 使用简单规则估算：中文约 2 字符/token，英文约 4 字符/token
 * 
 * @param {string} text - 待估算的文本
 * @returns {number} 估算的 Token 数量
 */
function estimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 2 + otherChars / 4);
}
