// =====================================================
// 知识缺口检测 Edge Function
// Knowledge Gap Detection - Runtime Hot-Mount Phase 4
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GapDetectionRequest {
  agentId: string;
  userId: string;
  currentMessage: string;
  mountedKnowledgeBaseIds: string[];
  conversationContext?: string;
}

interface GapDetectionResult {
  gapDetected: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
  suggestedKnowledgeBase?: {
    id: string;
    name: string;
    description?: string;
    matchScore: number;
    reason: string;
  };
  responseHint?: string;
}

// Keywords that indicate a need for specific knowledge
const KNOWLEDGE_INDICATORS: Record<string, string[]> = {
  policy: ['政策', '规定', '制度', '规章', '条例', '条款'],
  financial: ['报销', '费用', '预算', '财务', '发票', '账单', '报账'],
  hr: ['请假', '考勤', '入职', '离职', '员工', '人事', '福利'],
  product: ['产品', '功能', '使用', '操作', '手册', '指南'],
  technical: ['API', '接口', '文档', '技术', '开发', '配置'],
  report: ['报告', '分析', '数据', '统计', '趋势', '市场'],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const request: GapDetectionRequest = await req.json();
    const {
      agentId,
      userId,
      currentMessage,
      mountedKnowledgeBaseIds,
      conversationContext,
    } = request;

    if (!userId || !currentMessage) {
      return new Response(
        JSON.stringify({ error: "userId and currentMessage are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const messageLower = currentMessage.toLowerCase();

    // 1. Detect knowledge intent from message
    const detectedIntents: string[] = [];
    for (const [intent, keywords] of Object.entries(KNOWLEDGE_INDICATORS)) {
      if (keywords.some(kw => messageLower.includes(kw.toLowerCase()))) {
        detectedIntents.push(intent);
      }
    }

    // If no specific knowledge intent detected, no gap
    if (detectedIntents.length === 0) {
      return new Response(
        JSON.stringify({
          gapDetected: false,
          severity: 'none',
        } as GapDetectionResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get user's available knowledge bases (not currently mounted)
    const { data: availableKBs } = await supabase
      .from('knowledge_bases')
      .select('id, name, description, intent_tags, domain_profile')
      .eq('user_id', userId)
      .not('id', 'in', `(${mountedKnowledgeBaseIds.join(',') || 'null'})`)
      .eq('index_status', 'indexed')
      .limit(20);

    if (!availableKBs || availableKBs.length === 0) {
      return new Response(
        JSON.stringify({
          gapDetected: false,
          severity: 'none',
        } as GapDetectionResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Score each KB against the detected intents
    interface ScoredKB {
      kb: typeof availableKBs[0];
      score: number;
      matchReasons: string[];
    }
    
    const scoredKBs: ScoredKB[] = availableKBs.map(kb => {
      let score = 0;
      const matchReasons: string[] = [];
      const kbName = (kb.name || '').toLowerCase();
      const kbDesc = (kb.description || '').toLowerCase();
      const intentTags = (kb.intent_tags as string[]) || [];

      // Check intent tag matches
      for (const intent of detectedIntents) {
        if (intentTags.includes(intent)) {
          score += 0.3;
          matchReasons.push(`意图匹配: ${intent}`);
        }
      }

      // Check name matches
      for (const intent of detectedIntents) {
        const keywords = KNOWLEDGE_INDICATORS[intent] || [];
        for (const kw of keywords) {
          if (kbName.includes(kw.toLowerCase())) {
            score += 0.2;
            matchReasons.push(`名称包含: ${kw}`);
            break;
          }
        }
      }

      // Check description matches
      const messageWords = messageLower.split(/\s+/).filter(w => w.length > 2);
      const matchedWords = messageWords.filter(w => kbDesc.includes(w));
      if (matchedWords.length > 0) {
        score += (matchedWords.length / messageWords.length) * 0.2;
        matchReasons.push(`描述相关: ${matchedWords.slice(0, 3).join(', ')}`);
      }

      return { kb, score, matchReasons };
    });

    // 4. Find best match
    const sortedKBs = scoredKBs
      .filter(s => s.score > 0.2)
      .sort((a, b) => b.score - a.score);

    if (sortedKBs.length === 0) {
      return new Response(
        JSON.stringify({
          gapDetected: false,
          severity: 'none',
        } as GapDetectionResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bestMatch = sortedKBs[0];
    
    // 5. Determine severity based on score
    let severity: 'low' | 'medium' | 'high' = 'low';
    if (bestMatch.score > 0.7) {
      severity = 'high';
    } else if (bestMatch.score > 0.4) {
      severity = 'medium';
    }

    // 6. Generate response hint
    const responseHint = `这个问题我可能需要查阅「${bestMatch.kb.name}」才能给您更准确的回答，需要我现在挂载它吗？`;

    return new Response(
      JSON.stringify({
        gapDetected: true,
        severity,
        suggestedKnowledgeBase: {
          id: bestMatch.kb.id,
          name: bestMatch.kb.name,
          description: bestMatch.kb.description,
          matchScore: Math.round(bestMatch.score * 100) / 100,
          reason: bestMatch.matchReasons.join('；'),
        },
        responseHint,
      } as GapDetectionResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Gap detection error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
