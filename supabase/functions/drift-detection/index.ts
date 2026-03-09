import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

interface DriftCheckRequest {
  agentId: string;
  sessionId?: string;
  metrics: {
    responseLatency?: number;
    confidenceScore?: number;
    tokenUsage?: number;
    errorRate?: number;
    outputLength?: number;
  };
}

interface DriftBaseline {
  avgLatency: number;
  avgConfidence: number;
  avgTokens: number;
  errorThreshold: number;
  avgOutputLength: number;
}

// Default baseline values (can be customized per agent)
const DEFAULT_BASELINE: DriftBaseline = {
  avgLatency: 2000, // ms
  avgConfidence: 0.85,
  avgTokens: 500,
  errorThreshold: 0.05,
  avgOutputLength: 200,
};

// Thresholds for drift detection
const THRESHOLDS = {
  latency: { low: 1.5, medium: 2.0, high: 3.0 }, // multipliers
  confidence: { low: 0.1, medium: 0.2, high: 0.3 }, // deviation
  tokens: { low: 1.5, medium: 2.0, high: 3.0 }, // multipliers
  errorRate: { low: 2, medium: 3, high: 5 }, // multipliers
  outputLength: { low: 1.5, medium: 2.0, high: 3.0 }, // multipliers
};

function calculateSeverity(deviation: number, thresholds: { low: number; medium: number; high: number }): string {
  if (deviation >= thresholds.high) return "critical";
  if (deviation >= thresholds.medium) return "high";
  if (deviation >= thresholds.low) return "medium";
  return "low";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { agentId, sessionId, metrics }: DriftCheckRequest = await req.json();

    console.log(`Drift check for agent: ${agentId}`);

    // Get agent's baseline (from manifest or use defaults)
    const { data: agent } = await supabase
      .from("agents")
      .select("manifest")
      .eq("id", agentId)
      .single();

    const manifest = agent?.manifest as any;
    const baseline: DriftBaseline = manifest?.drift_baseline || DEFAULT_BASELINE;

    const driftsDetected: Array<{
      type: string;
      severity: string;
      baselineValue: any;
      currentValue: any;
      deviationScore: number;
    }> = [];

    // Check latency drift
    if (metrics.responseLatency !== undefined) {
      const ratio = metrics.responseLatency / baseline.avgLatency;
      if (ratio > THRESHOLDS.latency.low) {
        const severity = calculateSeverity(ratio, THRESHOLDS.latency);
        driftsDetected.push({
          type: "latency_drift",
          severity,
          baselineValue: { avgLatency: baseline.avgLatency },
          currentValue: { latency: metrics.responseLatency },
          deviationScore: Math.min(ratio / THRESHOLDS.latency.high, 1),
        });
      }
    }

    // Check confidence drift
    if (metrics.confidenceScore !== undefined) {
      const deviation = baseline.avgConfidence - metrics.confidenceScore;
      if (deviation > THRESHOLDS.confidence.low) {
        const severity = calculateSeverity(deviation, THRESHOLDS.confidence);
        driftsDetected.push({
          type: "confidence_drift",
          severity,
          baselineValue: { avgConfidence: baseline.avgConfidence },
          currentValue: { confidence: metrics.confidenceScore },
          deviationScore: Math.min(deviation / THRESHOLDS.confidence.high, 1),
        });
      }
    }

    // Check token usage drift
    if (metrics.tokenUsage !== undefined) {
      const ratio = metrics.tokenUsage / baseline.avgTokens;
      if (ratio > THRESHOLDS.tokens.low) {
        const severity = calculateSeverity(ratio, THRESHOLDS.tokens);
        driftsDetected.push({
          type: "output_drift",
          severity,
          baselineValue: { avgTokens: baseline.avgTokens },
          currentValue: { tokens: metrics.tokenUsage },
          deviationScore: Math.min(ratio / THRESHOLDS.tokens.high, 1),
        });
      }
    }

    // Check error rate drift
    if (metrics.errorRate !== undefined) {
      const ratio = metrics.errorRate / baseline.errorThreshold;
      if (ratio > THRESHOLDS.errorRate.low) {
        const severity = calculateSeverity(ratio, THRESHOLDS.errorRate);
        driftsDetected.push({
          type: "behavior_drift",
          severity,
          baselineValue: { errorThreshold: baseline.errorThreshold },
          currentValue: { errorRate: metrics.errorRate },
          deviationScore: Math.min(ratio / THRESHOLDS.errorRate.high, 1),
        });
      }
    }

    // Log detected drifts
    if (driftsDetected.length > 0) {
      const driftLogs = driftsDetected.map((drift) => ({
        agent_id: agentId,
        user_id: user.id,
        drift_type: drift.type,
        severity: drift.severity,
        baseline_value: drift.baselineValue,
        current_value: drift.currentValue,
        deviation_score: drift.deviationScore,
        context: {
          session_id: sessionId,
          timestamp: new Date().toISOString(),
          all_metrics: metrics,
        },
      }));

      const { error: insertError } = await supabase
        .from("drift_logs")
        .insert(driftLogs);

      if (insertError) {
        console.error("Failed to insert drift logs:", insertError);
      }

      // If critical drift, notify connected agents
      const criticalDrifts = driftsDetected.filter(d => d.severity === "critical");
      if (criticalDrifts.length > 0) {
        // Get connected collaborations
        const { data: collaborations } = await supabase
          .from("agent_collaborations")
          .select("id, initiator_agent_id, target_agent_id")
          .or(`initiator_agent_id.eq.${agentId},target_agent_id.eq.${agentId}`)
          .eq("status", "connected");

        // Send drift alerts to connected agents
        if (collaborations && collaborations.length > 0) {
          const alertMessages = collaborations.map((collab) => {
            const partnerAgentId = collab.initiator_agent_id === agentId
              ? collab.target_agent_id
              : collab.initiator_agent_id;

            return {
              collaboration_id: collab.id,
              sender_agent_id: agentId,
              receiver_agent_id: partnerAgentId,
              message_type: "drift_alert",
              payload: {
                alert_type: "critical_drift",
                drifts: criticalDrifts,
                timestamp: new Date().toISOString(),
              },
            };
          });

          await supabase.from("collaboration_messages").insert(alertMessages);
          console.log(`Sent drift alerts to ${alertMessages.length} connected agents`);
        }
      }
    }

    console.log(`Drift check complete. Detected: ${driftsDetected.length} drifts`);

    return new Response(
      JSON.stringify({
        success: true,
        driftsDetected: driftsDetected.length,
        drifts: driftsDetected,
        baseline,
        recommendation: driftsDetected.some(d => d.severity === "critical")
          ? "CRITICAL: Immediate intervention recommended"
          : driftsDetected.some(d => d.severity === "high")
          ? "WARNING: Monitor closely and consider adjustments"
          : driftsDetected.length > 0
          ? "INFO: Minor drifts detected, continue monitoring"
          : "OK: No significant drift detected",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Drift detection error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred. Please try again later.", code: "DRIFT_DETECTION_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
