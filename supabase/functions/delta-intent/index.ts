import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeltaIntentRequest {
  action: "track" | "analyze" | "get_history";
  agentId: string;
  sessionId?: string;
  originalIntent?: string;
  currentMessage?: string;
  responseContent?: string;
  turnNumber?: number;
}

// Intent drift thresholds
const INTENT_THRESHOLDS = {
  low: 0.3,
  medium: 0.5,
  high: 0.7,
  critical: 0.85,
};

// Simple keyword-based intent similarity (in production, use embeddings)
function calculateIntentSimilarity(original: string, current: string): number {
  const normalizeText = (text: string) => 
    text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);
  
  const originalWords = new Set(normalizeText(original));
  const currentWords = new Set(normalizeText(current));
  
  if (originalWords.size === 0 || currentWords.size === 0) return 1;
  
  // Calculate Jaccard similarity
  const intersection = new Set([...originalWords].filter(x => currentWords.has(x)));
  const union = new Set([...originalWords, ...currentWords]);
  
  return intersection.size / union.size;
}

// Detect topic shift using keyword categories
function detectTopicShift(original: string, current: string): {
  shifted: boolean;
  originalTopics: string[];
  currentTopics: string[];
  shiftScore: number;
} {
  const TOPIC_KEYWORDS: Record<string, string[]> = {
    "税务": ["税", "纳税", "税率", "增值税", "所得税", "申报", "税收"],
    "政策": ["政策", "规定", "法规", "条例", "办法", "规则"],
    "补贴": ["补贴", "补助", "资助", "扶持", "支持", "奖励"],
    "注册": ["注册", "登记", "成立", "设立", "开业", "办理"],
    "审批": ["审批", "许可", "批准", "核准", "备案"],
    "技术": ["技术", "研发", "创新", "专利", "科技"],
    "金融": ["贷款", "融资", "投资", "银行", "资金", "信贷"],
    "人事": ["招聘", "员工", "社保", "工资", "劳动", "人才"],
  };

  const detectTopics = (text: string): string[] => {
    const topics: string[] = [];
    const lowerText = text.toLowerCase();
    
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      if (keywords.some(kw => lowerText.includes(kw))) {
        topics.push(topic);
      }
    }
    return topics;
  };

  const originalTopics = detectTopics(original);
  const currentTopics = detectTopics(current);
  
  if (originalTopics.length === 0 && currentTopics.length === 0) {
    return { shifted: false, originalTopics, currentTopics, shiftScore: 0 };
  }
  
  // Calculate topic overlap
  const commonTopics = originalTopics.filter(t => currentTopics.includes(t));
  const totalTopics = new Set([...originalTopics, ...currentTopics]).size;
  
  const overlapScore = totalTopics > 0 ? commonTopics.length / totalTopics : 1;
  const shiftScore = 1 - overlapScore;
  
  return {
    shifted: shiftScore > INTENT_THRESHOLDS.medium,
    originalTopics,
    currentTopics,
    shiftScore,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: DeltaIntentRequest = await req.json();
    const { action, agentId, sessionId, originalIntent, currentMessage, responseContent, turnNumber } = body;

    console.log(`[delta-intent] Action: ${action}, Agent: ${agentId}`);

    switch (action) {
      case "track": {
        if (!originalIntent || !currentMessage) {
          return new Response(
            JSON.stringify({ error: "originalIntent and currentMessage required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calculate intent similarity
        const similarity = calculateIntentSimilarity(originalIntent, currentMessage);
        const deltaScore = 1 - similarity;
        
        // Detect topic shift
        const topicAnalysis = detectTopicShift(originalIntent, currentMessage);
        
        // Combined drift score (weighted average)
        const combinedDelta = deltaScore * 0.6 + topicAnalysis.shiftScore * 0.4;
        const driftDetected = combinedDelta > INTENT_THRESHOLDS.medium;
        
        // Determine severity
        let severity = "none";
        if (combinedDelta >= INTENT_THRESHOLDS.critical) severity = "critical";
        else if (combinedDelta >= INTENT_THRESHOLDS.high) severity = "high";
        else if (combinedDelta >= INTENT_THRESHOLDS.medium) severity = "medium";
        else if (combinedDelta >= INTENT_THRESHOLDS.low) severity = "low";

        // Store intent history
        const { data: intentRecord, error: insertError } = await supabase
          .from("intent_history")
          .insert({
            agent_id: agentId,
            session_id: sessionId,
            user_id: user.id,
            original_intent: originalIntent,
            current_intent: currentMessage,
            delta_score: combinedDelta,
            drift_detected: driftDetected,
            message_content: currentMessage,
            response_content: responseContent,
            turn_number: turnNumber || 1,
          })
          .select()
          .single();

        if (insertError) {
          console.error("[delta-intent] Insert error:", insertError);
          throw insertError;
        }

        // If critical drift, log to drift_logs and alert
        if (severity === "critical" || severity === "high") {
          await supabase.from("drift_logs").insert({
            agent_id: agentId,
            user_id: user.id,
            drift_type: "intent_drift",
            severity,
            baseline_value: { 
              original_intent: originalIntent,
              original_topics: topicAnalysis.originalTopics,
            },
            current_value: { 
              current_intent: currentMessage,
              current_topics: topicAnalysis.currentTopics,
            },
            deviation_score: combinedDelta,
            context: {
              session_id: sessionId,
              turn_number: turnNumber,
              topic_shift: topicAnalysis.shifted,
              similarity_score: similarity,
            },
          });

          // Alert connected agents
          const { data: collaborations } = await supabase
            .from("agent_collaborations")
            .select("id, initiator_agent_id, target_agent_id")
            .or(`initiator_agent_id.eq.${agentId},target_agent_id.eq.${agentId}`)
            .eq("status", "connected");

          if (collaborations && collaborations.length > 0) {
            const alertMessages = collaborations.map((collab) => {
              const partnerAgentId = collab.initiator_agent_id === agentId
                ? collab.target_agent_id
                : collab.initiator_agent_id;

              return {
                collaboration_id: collab.id,
                sender_agent_id: agentId,
                receiver_agent_id: partnerAgentId,
                message_type: "intent_drift_alert",
                payload: {
                  severity,
                  delta_score: combinedDelta,
                  original_intent: originalIntent.substring(0, 100),
                  current_intent: currentMessage.substring(0, 100),
                  topic_shift: topicAnalysis,
                  recommendation: severity === "critical"
                    ? "CRITICAL: Intent severely drifted. Consider redirecting user or requesting clarification."
                    : "WARNING: Significant intent drift detected. Monitor closely.",
                },
              };
            });

            await supabase.from("collaboration_messages").insert(alertMessages);
          }
        }

        console.log(`[delta-intent] Delta: ${combinedDelta.toFixed(3)}, Severity: ${severity}`);

        return new Response(
          JSON.stringify({
            success: true,
            deltaScore: combinedDelta,
            similarity,
            driftDetected,
            severity,
            topicAnalysis,
            intentRecord,
            recommendation: driftDetected
              ? topicAnalysis.shifted
                ? `话题偏移检测：从 [${topicAnalysis.originalTopics.join(", ")}] 转移到 [${topicAnalysis.currentTopics.join(", ")}]`
                : "意图偏移检测：用户表达方式发生显著变化"
              : "意图保持一致",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "analyze": {
        // Get recent intent history for analysis
        let query = supabase
          .from("intent_history")
          .select("*")
          .eq("agent_id", agentId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (sessionId) {
          query = query.eq("session_id", sessionId);
        }

        const { data: history, error } = await query;
        if (error) throw error;

        if (!history || history.length === 0) {
          return new Response(
            JSON.stringify({
              success: true,
              analysis: {
                totalTurns: 0,
                driftEvents: 0,
                avgDeltaScore: 0,
                trend: "stable",
              },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calculate analytics
        const driftEvents = history.filter(h => h.drift_detected).length;
        const avgDeltaScore = history.reduce((sum, h) => sum + Number(h.delta_score), 0) / history.length;
        
        // Determine trend (are recent deltas higher than older ones?)
        const recentHalf = history.slice(0, Math.ceil(history.length / 2));
        const olderHalf = history.slice(Math.ceil(history.length / 2));
        
        const recentAvg = recentHalf.reduce((sum, h) => sum + Number(h.delta_score), 0) / recentHalf.length;
        const olderAvg = olderHalf.length > 0 
          ? olderHalf.reduce((sum, h) => sum + Number(h.delta_score), 0) / olderHalf.length 
          : recentAvg;

        let trend = "stable";
        if (recentAvg > olderAvg * 1.3) trend = "increasing";
        else if (recentAvg < olderAvg * 0.7) trend = "decreasing";

        return new Response(
          JSON.stringify({
            success: true,
            analysis: {
              totalTurns: history.length,
              driftEvents,
              driftRate: (driftEvents / history.length * 100).toFixed(1) + "%",
              avgDeltaScore: avgDeltaScore.toFixed(3),
              recentAvgDelta: recentAvg.toFixed(3),
              trend,
              recommendation: trend === "increasing" && avgDeltaScore > INTENT_THRESHOLDS.medium
                ? "警告：意图偏移趋势上升，建议引导用户回到原始目标"
                : trend === "stable" && driftEvents === 0
                ? "良好：对话意图保持一致"
                : "正常：存在轻微意图变化，属于正常范围",
            },
            history: history.slice(0, 10),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get_history": {
        let query = supabase
          .from("intent_history")
          .select("*")
          .eq("agent_id", agentId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (sessionId) {
          query = query.eq("session_id", sessionId);
        }

        const { data: history, error } = await query;
        if (error) throw error;

        return new Response(
          JSON.stringify({
            success: true,
            history: history || [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[delta-intent] Error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
