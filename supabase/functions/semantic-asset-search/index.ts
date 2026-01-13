// =====================================================
// 语义资产搜索 Edge Function
// Semantic Asset Search - 统一检索 Skills, MCP, Knowledge
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchRequest {
  query: string;
  assetTypes?: ('skill' | 'mcp_tool' | 'knowledge_base')[];
  categories?: string[];
  capabilities?: string[];
  maxResults?: number;
  minSimilarity?: number;
  userId?: string;
}

interface SemanticAsset {
  id: string;
  assetType: 'skill' | 'mcp_tool' | 'knowledge_base';
  assetId: string;
  name: string;
  description?: string;
  category?: string;
  capabilities: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high';
  similarity: number;
}

// 语义能力关键词映射
const CAPABILITY_KEYWORDS: Record<string, string[]> = {
  '查询': ['query', 'search', 'find', 'get', 'fetch', 'retrieve', 'lookup'],
  '发送': ['send', 'post', 'publish', 'emit', 'broadcast', 'notify'],
  '生成': ['generate', 'create', 'produce', 'make', 'build', 'construct'],
  '分析': ['analyze', 'parse', 'evaluate', 'assess', 'examine', 'inspect'],
  '存储': ['save', 'store', 'persist', 'write', 'upload', 'insert'],
  '删除': ['delete', 'remove', 'erase', 'drop', 'purge', 'clear'],
  '更新': ['update', 'modify', 'change', 'alter', 'edit', 'patch'],
  '转换': ['convert', 'transform', 'format', 'translate', 'encode', 'decode'],
  '验证': ['validate', 'verify', 'check', 'confirm', 'authenticate'],
  '计算': ['calculate', 'compute', 'count', 'sum', 'aggregate'],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: SearchRequest = await req.json();
    const {
      query,
      assetTypes = ['skill', 'mcp_tool', 'knowledge_base'],
      categories,
      capabilities,
      maxResults = 20,
      minSimilarity = 0.3,
      userId,
    } = request;

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. 提取查询中的能力关键词
    const extractedCapabilities = extractCapabilities(query);
    const allCapabilities = [...new Set([...(capabilities || []), ...extractedCapabilities])];

    // 2. 构建数据库查询
    let queryBuilder = supabase
      .from('asset_semantic_index')
      .select('*')
      .in('asset_type', assetTypes)
      .eq('is_active', true);

    if (userId) {
      queryBuilder = queryBuilder.eq('user_id', userId);
    }

    if (categories && categories.length > 0) {
      queryBuilder = queryBuilder.in('category', categories);
    }

    if (allCapabilities.length > 0) {
      queryBuilder = queryBuilder.overlaps('capabilities', allCapabilities);
    }

    const { data: assets, error } = await queryBuilder.limit(100);

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to search assets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. 计算相似度并排序
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);

    const scoredAssets: SemanticAsset[] = (assets || [])
      .map(asset => {
        const similarity = calculateSimilarity(asset, queryWords, queryLower, allCapabilities);
        return {
          id: asset.id,
          assetType: asset.asset_type,
          assetId: asset.asset_id,
          name: asset.name,
          description: asset.description,
          category: asset.category,
          capabilities: asset.capabilities || [],
          inputSchema: asset.input_schema || {},
          outputSchema: asset.output_schema || {},
          riskLevel: asset.risk_level || 'low',
          similarity,
        };
      })
      .filter(asset => asset.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, maxResults);

    // 4. 按类型分组
    const skills = scoredAssets.filter(a => a.assetType === 'skill');
    const mcpTools = scoredAssets.filter(a => a.assetType === 'mcp_tool');
    const knowledgeBases = scoredAssets.filter(a => a.assetType === 'knowledge_base');

    return new Response(
      JSON.stringify({
        skills,
        mcpTools,
        knowledgeBases,
        totalCount: scoredAssets.length,
        extractedCapabilities: allCapabilities,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// 提取能力关键词
function extractCapabilities(query: string): string[] {
  const capabilities: string[] = [];
  const queryLower = query.toLowerCase();

  for (const [capability, keywords] of Object.entries(CAPABILITY_KEYWORDS)) {
    if (keywords.some(kw => queryLower.includes(kw)) || queryLower.includes(capability)) {
      capabilities.push(capability);
    }
  }

  return capabilities;
}

// 计算相似度
function calculateSimilarity(
  asset: Record<string, unknown>,
  queryWords: string[],
  queryLower: string,
  capabilities: string[]
): number {
  let score = 0;
  const name = ((asset.name as string) || '').toLowerCase();
  const description = ((asset.description as string) || '').toLowerCase();
  const assetCapabilities = (asset.capabilities as string[]) || [];
  const category = ((asset.category as string) || '').toLowerCase();

  // 1. 名称匹配 (权重: 0.4)
  if (name.includes(queryLower)) {
    score += 0.4;
  } else {
    const nameWords = name.split(/[\s_\-]+/);
    const matchedWords = queryWords.filter(qw => 
      nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
    );
    score += (matchedWords.length / queryWords.length) * 0.3;
  }

  // 2. 描述匹配 (权重: 0.25)
  const descWords = description.split(/\s+/);
  const descMatchedWords = queryWords.filter(qw =>
    descWords.some(dw => dw.includes(qw))
  );
  score += (descMatchedWords.length / Math.max(queryWords.length, 1)) * 0.25;

  // 3. 能力匹配 (权重: 0.25)
  if (capabilities.length > 0 && assetCapabilities.length > 0) {
    const capabilityMatches = capabilities.filter(c => 
      assetCapabilities.some(ac => ac.toLowerCase().includes(c.toLowerCase()))
    );
    score += (capabilityMatches.length / capabilities.length) * 0.25;
  }

  // 4. 类别匹配 (权重: 0.1)
  if (category && queryWords.some(qw => category.includes(qw))) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}
