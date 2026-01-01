import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";

// Circuit Breaker Types
export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerState {
  id: string;
  agent_id: string;
  user_id: string;
  state: CircuitState;
  failure_count: number;
  success_count: number;
  failure_threshold: number;
  success_threshold: number;
  timeout_duration_ms: number;
  last_failure_at: string | null;
  opened_at: string | null;
  half_opened_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutDuration: number;
}

// Intent History Types
export interface IntentHistory {
  id: string;
  agent_id: string;
  session_id: string | null;
  user_id: string;
  original_intent: string;
  current_intent: string;
  delta_score: number;
  drift_detected: boolean;
  message_content: string | null;
  response_content: string | null;
  turn_number: number;
  created_at: string;
}

export interface IntentAnalysis {
  totalTurns: number;
  driftEvents: number;
  driftRate: string;
  avgDeltaScore: string;
  recentAvgDelta: string;
  trend: "stable" | "increasing" | "decreasing";
  recommendation: string;
}

// Circuit Breaker Hooks
export function useCircuitBreakerState(agentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["circuit-breaker", user?.id, agentId],
    queryFn: async () => {
      if (!agentId) return null;
      
      const response = await supabase.functions.invoke("circuit-breaker", {
        body: { action: "get_state", agentId },
      });

      if (response.error) throw response.error;
      return response.data?.cbState as CircuitBreakerState | null;
    },
    enabled: !!user && !!agentId,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useRealtimeCircuitBreaker(
  agentId: string | null,
  onStateChange: (state: CircuitBreakerState) => void
) {
  const { user } = useAuth();

  useEffect(() => {
    if (!agentId || !user) return;

    const channel = supabase
      .channel(`circuit-breaker-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "circuit_breaker_state",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          if (payload.new) {
            onStateChange(payload.new as CircuitBreakerState);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, user, onStateChange]);
}

export function useCheckCircuit() {
  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await supabase.functions.invoke("circuit-breaker", {
        body: { action: "check", agentId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  });
}

export function useRecordSuccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await supabase.functions.invoke("circuit-breaker", {
        body: { action: "record_success", agentId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["circuit-breaker"] });
      if (data.previousState === "half_open" && data.newState === "closed") {
        toast.success("熔断器已恢复", { description: "Agent重新上线" });
      }
    },
  });
}

export function useRecordFailure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await supabase.functions.invoke("circuit-breaker", {
        body: { action: "record_failure", agentId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["circuit-breaker"] });
      if (data.newState === "open") {
        toast.error("熔断器已触发", {
          description: `Agent暂停服务 ${data.cbState.timeout_duration_ms / 1000}秒`,
        });
      }
    },
  });
}

export function useResetCircuit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await supabase.functions.invoke("circuit-breaker", {
        body: { action: "reset", agentId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit-breaker"] });
      toast.success("熔断器已重置");
    },
    onError: (error) => {
      toast.error(`重置失败: ${error.message}`);
    },
  });
}

export function useConfigureCircuit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { agentId: string; config: CircuitBreakerConfig }) => {
      const response = await supabase.functions.invoke("circuit-breaker", {
        body: { action: "configure", agentId: params.agentId, config: params.config },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit-breaker"] });
      toast.success("熔断器配置已更新");
    },
    onError: (error) => {
      toast.error(`配置失败: ${error.message}`);
    },
  });
}

// Delta Intent Hooks
export function useTrackIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      agentId: string;
      sessionId?: string;
      originalIntent: string;
      currentMessage: string;
      responseContent?: string;
      turnNumber?: number;
    }) => {
      const response = await supabase.functions.invoke("delta-intent", {
        body: { action: "track", ...params },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["intent-analysis"] });
      if (data.severity === "critical") {
        toast.error("严重意图偏移", { description: data.recommendation });
      } else if (data.severity === "high") {
        toast.warning("意图偏移警告", { description: data.recommendation });
      }
    },
  });
}

export function useIntentAnalysis(agentId?: string, sessionId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["intent-analysis", user?.id, agentId, sessionId],
    queryFn: async () => {
      if (!agentId) return null;
      
      const response = await supabase.functions.invoke("delta-intent", {
        body: { action: "analyze", agentId, sessionId },
      });

      if (response.error) throw response.error;
      return response.data as {
        success: boolean;
        analysis: IntentAnalysis;
        history: IntentHistory[];
      };
    },
    enabled: !!user && !!agentId,
  });
}

export function useIntentHistory(agentId?: string, sessionId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["intent-history", user?.id, agentId, sessionId],
    queryFn: async () => {
      if (!agentId) return [];
      
      const response = await supabase.functions.invoke("delta-intent", {
        body: { action: "get_history", agentId, sessionId },
      });

      if (response.error) throw response.error;
      return (response.data?.history || []) as IntentHistory[];
    },
    enabled: !!user && !!agentId,
  });
}

// Status colors and labels
export const circuitStateColors: Record<CircuitState, string> = {
  closed: "#4CAF50",
  open: "#F44336",
  half_open: "#FF9800",
};

export const circuitStateLabels: Record<CircuitState, string> = {
  closed: "关闭 (正常)",
  open: "开启 (熔断中)",
  half_open: "半开 (测试中)",
};

export const intentSeverityColors: Record<string, string> = {
  none: "#4CAF50",
  low: "#8BC34A",
  medium: "#FFC107",
  high: "#FF9800",
  critical: "#F44336",
};
