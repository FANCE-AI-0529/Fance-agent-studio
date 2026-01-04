import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface IntentDriftResult {
  driftDetected: boolean;
  severity: "none" | "low" | "medium" | "high" | "critical";
  deltaScore: number;
  message?: string;
}

interface IntentAnalysis {
  totalTurns: number;
  driftEvents: number;
  avgDeltaScore: number;
  trend: string;
  recentHistory: Array<{
    turnNumber: number;
    originalIntent: string;
    currentIntent: string;
    deltaScore: number;
    driftDetected: boolean;
  }>;
}

export function useIntentDrift(agentId?: string) {
  const originalIntentRef = useRef<string | null>(null);
  const turnNumberRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);

  const trackIntent = useCallback(async (
    currentMessage: string,
    responseContent?: string
  ): Promise<IntentDriftResult | null> => {
    if (!agentId) return null;

    // First message becomes the baseline
    if (turnNumberRef.current === 0) {
      originalIntentRef.current = currentMessage;
      turnNumberRef.current = 1;
      return { driftDetected: false, severity: "none", deltaScore: 1.0 };
    }

    turnNumberRef.current += 1;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      const response = await supabase.functions.invoke("delta-intent", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: "track",
          agentId,
          originalIntent: originalIntentRef.current,
          currentIntent: currentMessage,
          turnNumber: turnNumberRef.current,
          sessionId: sessionIdRef.current,
          messageContent: currentMessage,
          responseContent,
        },
      });

      if (response.error) {
        console.error("Intent drift tracking error:", response.error);
        return null;
      }

      const data = response.data;
      
      // Store session ID if returned
      if (data?.sessionId && !sessionIdRef.current) {
        sessionIdRef.current = data.sessionId;
      }

      return {
        driftDetected: data?.driftDetected || false,
        severity: data?.severity || "none",
        deltaScore: data?.deltaScore || 1.0,
        message: data?.driftDetected 
          ? `检测到意图漂移 (${data.severity}): 当前话题与最初意图偏离 ${Math.round((1 - data.deltaScore) * 100)}%` 
          : undefined,
      };
    } catch (error) {
      console.error("Failed to track intent drift:", error);
      return null;
    }
  }, [agentId]);

  const analyzeIntentHistory = useCallback(async (): Promise<IntentAnalysis | null> => {
    if (!agentId) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      const response = await supabase.functions.invoke("delta-intent", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: "analyze",
          agentId,
        },
      });

      if (response.error) {
        console.error("Intent analysis error:", response.error);
        return null;
      }

      return response.data as IntentAnalysis;
    } catch (error) {
      console.error("Failed to analyze intent history:", error);
      return null;
    }
  }, [agentId]);

  const resetSession = useCallback(() => {
    originalIntentRef.current = null;
    turnNumberRef.current = 0;
    sessionIdRef.current = null;
  }, []);

  return {
    trackIntent,
    analyzeIntentHistory,
    resetSession,
    currentTurn: turnNumberRef.current,
    hasOriginalIntent: !!originalIntentRef.current,
  };
}
