import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RAG 混合决策引擎
// 基于置信度阈值的三区间决策模型
const THRESHOLDS = {
  AUTO_MOUNT: 0.85,    // 自动区：直接挂载
  CLARIFY_MIN: 0.6,    // 澄清区下限
  GAP_THRESHOLD: 0.15, // 自动区需要与第二名的差距
};

interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  usage_context: string | null;
  intent_tags: string[];
  summary_embedding: number[] | null;
  documents_count: number | null;
  chunks_count: number | null;
}

interface MatchResult {
  knowledgeBase: KnowledgeBase;
  score: number;
  matchReason: string;
  decisionZone: 'auto' | 'clarify' | 'empty';
}

interface MatchResponse {
  matches: MatchResult[];
  decision: 'auto_mount' | 'ask_user' | 'suggest_upload';
  clarifyQuestion?: string;
  debugInfo?: {
    queryIntent: string[];
    totalCandidates: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, userId, limit = 5 } = await req.json();

    if (!query) {
      throw new Error('query is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. 提取用户查询的意图关键词
    const queryIntent = extractIntentKeywords(query);

    // 2. 生成查询向量
    const embeddingResponse = await fetch(`${supabaseUrl}/functions/v1/embed-text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ text: query }),
    });

    let queryEmbedding: number[] | null = null;
    if (embeddingResponse.ok) {
      const embeddingResult = await embeddingResponse.json();
      queryEmbedding = embeddingResult.embedding;
    }

    // 3. 获取用户的所有知识库
    let kbQuery = supabase
      .from('knowledge_bases')
      .select('id, name, description, usage_context, intent_tags, summary_embedding, documents_count, chunks_count')
      .eq('auto_profile_status', 'ready');

    if (userId) {
      kbQuery = kbQuery.eq('user_id', userId);
    }

    const { data: knowledgeBases, error: kbError } = await kbQuery;

    if (kbError) {
      throw new Error(`Failed to fetch knowledge bases: ${kbError.message}`);
    }

    if (!knowledgeBases || knowledgeBases.length === 0) {
      return new Response(JSON.stringify({
        matches: [],
        decision: 'suggest_upload',
        debugInfo: { queryIntent, totalCandidates: 0 },
      } as MatchResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. 计算每个知识库的匹配分数
    const scoredResults: MatchResult[] = knowledgeBases.map(kb => {
      const scores = {
        vector: 0,      // 向量相似度 (40%)
        intentTag: 0,   // 意图标签匹配 (30%)
        context: 0,     // 使用场景匹配 (20%)
        keyword: 0,     // 名称/描述关键词 (10%)
      };

      // 4.1 向量相似度
      if (queryEmbedding && kb.summary_embedding) {
        scores.vector = cosineSimilarity(queryEmbedding, kb.summary_embedding);
      }

      // 4.2 意图标签匹配
      if (kb.intent_tags && kb.intent_tags.length > 0) {
        const matchedTags = queryIntent.filter(intent => 
          kb.intent_tags.some((tag: string) => 
            tag.toLowerCase().includes(intent.toLowerCase()) ||
            intent.toLowerCase().includes(tag.toLowerCase())
          )
        );
        scores.intentTag = matchedTags.length / Math.max(queryIntent.length, 1);
      }

      // 4.3 使用场景匹配
      if (kb.usage_context) {
        scores.context = textSimilarity(query, kb.usage_context);
      }

      // 4.4 名称/描述关键词匹配
      const nameDesc = `${kb.name} ${kb.description || ''}`.toLowerCase();
      const queryWords = query.toLowerCase().split(/\s+/);
      const matchedWords = queryWords.filter((w: string) => w.length > 1 && nameDesc.includes(w));
      scores.keyword = matchedWords.length / Math.max(queryWords.length, 1);

      // 加权总分
      const totalScore = 
        scores.vector * 0.4 +
        scores.intentTag * 0.3 +
        scores.context * 0.2 +
        scores.keyword * 0.1;

      // 生成匹配原因
      const reasons: string[] = [];
      if (scores.vector > 0.5) reasons.push('语义相似');
      if (scores.intentTag > 0.5) reasons.push('意图匹配');
      if (scores.context > 0.3) reasons.push('场景相关');
      if (scores.keyword > 0.3) reasons.push('关键词命中');

      return {
        knowledgeBase: kb,
        score: Math.min(totalScore, 1),
        matchReason: reasons.length > 0 ? reasons.join('、') : '综合匹配',
        decisionZone: totalScore >= THRESHOLDS.AUTO_MOUNT ? 'auto' as const :
                      totalScore >= THRESHOLDS.CLARIFY_MIN ? 'clarify' as const : 'empty' as const,
      };
    });

    // 5. 排序并截取
    scoredResults.sort((a, b) => b.score - a.score);
    const topResults = scoredResults.slice(0, limit);

    // 6. 决策逻辑
    const response = makeDecision(topResults, query);
    response.debugInfo = {
      queryIntent,
      totalCandidates: knowledgeBases.length,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('match-knowledge-bases error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// 决策逻辑
function makeDecision(matches: MatchResult[], query: string): MatchResponse {
  if (matches.length === 0) {
    return {
      matches: [],
      decision: 'suggest_upload',
    };
  }

  const topMatch = matches[0];
  const secondMatch = matches[1];

  // 自动区：最高分 > 0.85 且与第二名差距 > 0.15
  if (topMatch.score >= THRESHOLDS.AUTO_MOUNT) {
    const gap = secondMatch ? topMatch.score - secondMatch.score : 1;
    if (gap >= THRESHOLDS.GAP_THRESHOLD) {
      return {
        matches: [topMatch],
        decision: 'auto_mount',
      };
    }
  }

  // 澄清区：有多个候选在 [0.6, 0.85]
  const candidates = matches.filter(m => m.score >= THRESHOLDS.CLARIFY_MIN);
  
  // 增强：如果有多个高分匹配（都 > 0.7），强制触发澄清
  const highScoreCandidates = matches.filter(m => m.score >= 0.7);
  if (highScoreCandidates.length >= 2) {
    // 检查是否是同类型知识库（如"国内报销"和"海外报销"）
    const names = highScoreCandidates.map(m => m.knowledgeBase.name);
    const hasSimilarNames = names.some((name, i) => 
      names.some((other, j) => i !== j && (
        name.includes('报销') && other.includes('报销') ||
        name.includes('政策') && other.includes('政策') ||
        name.includes('规范') && other.includes('规范')
      ))
    );
    
    if (hasSimilarNames) {
      return {
        matches: highScoreCandidates.slice(0, 4),
        decision: 'ask_user',
        clarifyQuestion: generateClarifyQuestion(highScoreCandidates.slice(0, 4)),
      };
    }
  }
  
  if (candidates.length >= 2) {
    return {
      matches: candidates.slice(0, 3),
      decision: 'ask_user',
      clarifyQuestion: generateClarifyQuestion(candidates.slice(0, 3)),
    };
  }

  // 单一候选但置信度不够高
  if (candidates.length === 1) {
    return {
      matches: candidates,
      decision: 'ask_user',
      clarifyQuestion: `您是想使用「${topMatch.knowledgeBase.name}」知识库吗？`,
    };
  }

  // 空白区：无匹配
  return {
    matches: matches.slice(0, 3), // 仍返回最接近的，供参考
    decision: 'suggest_upload',
  };
}

// 生成澄清问题
function generateClarifyQuestion(candidates: MatchResult[]): string {
  const names = candidates.map(c => `「${c.knowledgeBase.name}」`);
  if (names.length === 2) {
    return `检测到多个相关知识库，您是想使用 ${names[0]} 还是 ${names[1]}？`;
  }
  return `检测到 ${names.length} 个相关知识库：${names.join('、')}，请选择要使用的知识库。`;
}

// 提取意图关键词
function extractIntentKeywords(query: string): string[] {
  const keywords: string[] = [];
  
  // 常见意图模式
  const patterns: Record<string, string[]> = {
    'hr': ['人事', '员工', '招聘', '入职', '离职', '考勤', '假期', '福利'],
    'finance': ['财务', '报销', '发票', '预算', '成本', '费用', '账单'],
    'policy': ['政策', '规定', '制度', '规范', '流程', '标准', '规则'],
    'technical': ['技术', '开发', '代码', 'api', '架构', '系统', '接口'],
    'product': ['产品', '功能', '需求', '设计', '用户', '体验'],
    'sales': ['销售', '客户', '商务', '合同', '订单', '报价'],
    'legal': ['法务', '法律', '合规', '协议', '条款'],
    'marketing': ['市场', '营销', '推广', '品牌', '活动', '广告'],
    'audit': ['审计', '审核', '检查', '合规', '风险'],
  };

  const lowerQuery = query.toLowerCase();
  
  for (const [intent, words] of Object.entries(patterns)) {
    if (words.some(w => lowerQuery.includes(w))) {
      keywords.push(intent);
    }
  }

  // 提取年份
  const yearMatch = query.match(/20\d{2}/);
  if (yearMatch) {
    keywords.push(yearMatch[0]);
  }

  return keywords;
}

// 余弦相似度
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 简单文本相似度
function textSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 1));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 1));
  
  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word)) intersection++;
  }
  
  const union = words1.size + words2.size - intersection;
  return union > 0 ? intersection / union : 0;
}
