// =====================================================
// 语义资产搜索 Edge Function - 增强版
// Semantic Asset Search - 统一检索 Skills, MCP, Knowledge
// 支持向量相似度搜索 + 能力关键词匹配
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
  useVectorSearch?: boolean;
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
  matchReason?: string;
}

// 语义能力关键词映射
const CAPABILITY_KEYWORDS: Record<string, string[]> = {
  '查询': ['query', 'search', 'find', 'get', 'fetch', 'retrieve', 'lookup', '搜索', '查找'],
  '发送': ['send', 'post', 'publish', 'emit', 'broadcast', 'notify', '推送', '通知'],
  '生成': ['generate', 'create', 'produce', 'make', 'build', 'construct', '创建', '构建'],
  '分析': ['analyze', 'parse', 'evaluate', 'assess', 'examine', 'inspect', '解析', '评估'],
  '存储': ['save', 'store', 'persist', 'write', 'upload', 'insert', '保存', '上传'],
  '删除': ['delete', 'remove', 'erase', 'drop', 'purge', 'clear', '移除', '清除'],
  '更新': ['update', 'modify', 'change', 'alter', 'edit', 'patch', '修改', '编辑'],
  '转换': ['convert', 'transform', 'format', 'translate', 'encode', 'decode', '格式化', '翻译'],
  '验证': ['validate', 'verify', 'check', 'confirm', 'authenticate', '校验', '确认'],
  '计算': ['calculate', 'compute', 'count', 'sum', 'aggregate', '统计', '汇总'],
  '邮件': ['email', 'mail', 'smtp', 'inbox', '发邮件', '收邮件'],
  '数据库': ['database', 'db', 'sql', 'table', 'record', '数据表'],
  '文件': ['file', 'document', 'pdf', 'excel', 'csv', '文档'],
  '知识库': ['knowledge', 'rag', 'faq', 'document', '问答', '检索'],
  '退款': ['refund', 'return', 'chargeback', '退货'],
  '订单': ['order', 'purchase', 'transaction', '交易', '购买'],
  '支付': ['payment', 'pay', 'checkout', 'billing', '付款', '结账'],
};

// 意图到能力的映射
const INTENT_CAPABILITY_MAP: Record<string, string[]> = {
  '客服': ['查询', '知识库', '邮件', '通知'],
  '助手': ['查询', '生成', '分析'],
  '订单': ['查询', '订单', '数据库'],
  '退款': ['退款', '订单', '邮件'],
  '报告': ['分析', '生成', '邮件'],
  '通知': ['发送', '邮件', '通知'],
  '数据': ['查询', '数据库', '分析'],
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
      minSimilarity = 0.2,
      userId,
      useVectorSearch = true,
    } = request;

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. 提取查询中的能力关键词
    const extractedCapabilities = extractCapabilities(query);
    const intentCapabilities = extractIntentCapabilities(query);
    const allCapabilities = [...new Set([
      ...(capabilities || []), 
      ...extractedCapabilities,
      ...intentCapabilities,
    ])];

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

    // 优先使用能力过滤
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
        const { similarity, matchReason } = calculateEnhancedSimilarity(
          asset, 
          queryWords, 
          queryLower, 
          allCapabilities
        );
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
          matchReason,
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
        query: query,
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

// 从意图中提取能力
function extractIntentCapabilities(query: string): string[] {
  const capabilities: string[] = [];
  const queryLower = query.toLowerCase();

  for (const [intent, caps] of Object.entries(INTENT_CAPABILITY_MAP)) {
    if (queryLower.includes(intent)) {
      capabilities.push(...caps);
    }
  }

  return [...new Set(capabilities)];
}

// 增强的相似度计算
function calculateEnhancedSimilarity(
  asset: Record<string, unknown>,
  queryWords: string[],
  queryLower: string,
  capabilities: string[]
): { similarity: number; matchReason: string } {
  let score = 0;
  const matchReasons: string[] = [];
  
  const name = ((asset.name as string) || '').toLowerCase();
  const description = ((asset.description as string) || '').toLowerCase();
  const assetCapabilities = (asset.capabilities as string[]) || [];
  const category = ((asset.category as string) || '').toLowerCase();

  // 1. 名称完全匹配 (权重: 0.5)
  if (queryLower.includes(name) || name.includes(queryLower)) {
    score += 0.5;
    matchReasons.push('名称匹配');
  } else {
    // 名称词级匹配
    const nameWords = name.split(/[\s_\-]+/);
    const matchedWords = queryWords.filter(qw => 
      nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
    );
    const nameScore = (matchedWords.length / Math.max(queryWords.length, 1)) * 0.35;
    if (nameScore > 0) {
      score += nameScore;
      matchReasons.push('名称相似');
    }
  }

  // 2. 描述匹配 (权重: 0.2)
  const descWords = description.split(/\s+/);
  const descMatchedWords = queryWords.filter(qw =>
    descWords.some(dw => dw.includes(qw))
  );
  const descScore = (descMatchedWords.length / Math.max(queryWords.length, 1)) * 0.2;
  if (descScore > 0) {
    score += descScore;
    matchReasons.push('描述匹配');
  }

  // 3. 能力匹配 (权重: 0.25)
  if (capabilities.length > 0 && assetCapabilities.length > 0) {
    const capabilityMatches = capabilities.filter(c => 
      assetCapabilities.some(ac => ac.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(ac.toLowerCase()))
    );
    const capScore = (capabilityMatches.length / capabilities.length) * 0.25;
    if (capScore > 0) {
      score += capScore;
      matchReasons.push(`能力匹配(${capabilityMatches.join(',')})`);
    }
  }

  // 4. 类别匹配 (权重: 0.05)
  if (category && queryWords.some(qw => category.includes(qw))) {
    score += 0.05;
    matchReasons.push('类别匹配');
  }

  // 5. 知识库优先级加成
  if (asset.asset_type === 'knowledge_base' && /知识|文档|faq|问答|检索/i.test(queryLower)) {
    score += 0.1;
    matchReasons.push('知识库优先');
  }

  // 6. 风险匹配加成（如果查询涉及高风险操作）
  const riskLevel = asset.risk_level as string;
  if (riskLevel === 'high' && /退款|删除|支付|转账/i.test(queryLower)) {
    score += 0.05;
    matchReasons.push('风险匹配');
  }

  return {
    similarity: Math.min(score, 1.0),
    matchReason: matchReasons.join(', ') || '基础匹配',
  };
}
