import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";

export interface AgentCollaboration {
  id: string;
  initiator_agent_id: string;
  target_agent_id: string;
  user_id: string;
  status: string;
  handshake_token: string | null;
  protocol_version: string;
  capabilities: string[];
  trust_level: number;
  last_heartbeat: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollaborationMessage {
  id: string;
  collaboration_id: string;
  sender_agent_id: string;
  receiver_agent_id: string;
  message_type: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
}

export interface DriftLog {
  id: string;
  agent_id: string;
  user_id: string;
  drift_type: string;
  severity: string;
  baseline_value: Record<string, unknown>;
  current_value: Record<string, unknown>;
  deviation_score: number;
  context: Record<string, unknown>;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

// Fetch collaborations with agent details
export function useAgentCollaborations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agent-collaborations", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_collaborations")
        .select(`
          *,
          initiator:agents!agent_collaborations_initiator_agent_id_fkey(id, name, status, model),
          target:agents!agent_collaborations_target_agent_id_fkey(id, name, status, model)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Fetch collaboration messages
export function useCollaborationMessages(collaborationId: string | null) {
  return useQuery({
    queryKey: ["collaboration-messages", collaborationId],
    queryFn: async () => {
      if (!collaborationId) return [];
      
      const { data, error } = await supabase
        .from("collaboration_messages")
        .select("*")
        .eq("collaboration_id", collaborationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as CollaborationMessage[];
    },
    enabled: !!collaborationId,
  });
}

// Real-time subscription for collaboration messages
export function useRealtimeCollaborationMessages(
  collaborationId: string | null,
  onNewMessage: (message: CollaborationMessage) => void
) {
  useEffect(() => {
    if (!collaborationId) return;

    const channel = supabase
      .channel(`collab-messages-${collaborationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "collaboration_messages",
          filter: `collaboration_id=eq.${collaborationId}`,
        },
        (payload) => {
          onNewMessage(payload.new as CollaborationMessage);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [collaborationId, onNewMessage]);
}

// Initiate handshake
export function useInitiateHandshake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      initiatorAgentId,
      targetAgentId,
      capabilities,
    }: {
      initiatorAgentId: string;
      targetAgentId: string;
      capabilities?: string[];
    }) => {
      const response = await supabase.functions.invoke("agent-handshake", {
        body: {
          action: "initiate",
          initiatorAgentId,
          targetAgentId,
          capabilities,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-collaborations"] });
      toast.success("握手请求已发送");
    },
    onError: (error) => {
      toast.error(`握手请求失败: ${error.message}`);
    },
  });
}

// Accept handshake
export function useAcceptHandshake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      collaborationId,
      capabilities,
    }: {
      collaborationId: string;
      capabilities?: string[];
    }) => {
      const response = await supabase.functions.invoke("agent-handshake", {
        body: {
          action: "accept",
          collaborationId,
          capabilities,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-collaborations"] });
      toast.success("握手已接受，连接建立");
    },
    onError: (error) => {
      toast.error(`接受握手失败: ${error.message}`);
    },
  });
}

// Reject handshake
export function useRejectHandshake() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collaborationId: string) => {
      const response = await supabase.functions.invoke("agent-handshake", {
        body: {
          action: "reject",
          collaborationId,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-collaborations"] });
      toast.success("握手已拒绝");
    },
    onError: (error) => {
      toast.error(`拒绝握手失败: ${error.message}`);
    },
  });
}

// Send heartbeat
export function useSendHeartbeat() {
  return useMutation({
    mutationFn: async (collaborationId: string) => {
      const response = await supabase.functions.invoke("agent-handshake", {
        body: {
          action: "heartbeat",
          collaborationId,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  });
}

// Disconnect collaboration
export function useDisconnectCollaboration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (collaborationId: string) => {
      const response = await supabase.functions.invoke("agent-handshake", {
        body: {
          action: "disconnect",
          collaborationId,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-collaborations"] });
      toast.success("连接已断开");
    },
    onError: (error) => {
      toast.error(`断开连接失败: ${error.message}`);
    },
  });
}

// Fetch drift logs
export function useDriftLogs(agentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["drift-logs", user?.id, agentId],
    queryFn: async () => {
      let query = supabase
        .from("drift_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DriftLog[];
    },
    enabled: !!user,
  });
}

// Real-time drift alerts subscription
export function useRealtimeDriftAlerts(
  agentId: string | null,
  onNewDrift: (drift: DriftLog) => void
) {
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel(`drift-alerts-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "drift_logs",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          const drift = payload.new as DriftLog;
          onNewDrift(drift);
          
          // Show toast for high/critical severity
          if (drift.severity === "critical" || drift.severity === "high") {
            toast.error(`漂移警告: ${drift.drift_type} (${drift.severity})`, {
              description: `偏离分数: ${(drift.deviation_score * 100).toFixed(0)}%`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, onNewDrift]);
}

// Check drift
export function useCheckDrift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      agentId,
      sessionId,
      metrics,
    }: {
      agentId: string;
      sessionId?: string;
      metrics: {
        responseLatency?: number;
        confidenceScore?: number;
        tokenUsage?: number;
        errorRate?: number;
        outputLength?: number;
      };
    }) => {
      const response = await supabase.functions.invoke("drift-detection", {
        body: { agentId, sessionId, metrics },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["drift-logs"] });
      if (data.driftsDetected > 0) {
        toast.warning(`检测到 ${data.driftsDetected} 个漂移`);
      }
    },
    onError: (error) => {
      toast.error(`漂移检测失败: ${error.message}`);
    },
  });
}

// Resolve drift
export function useResolveDrift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (driftId: string) => {
      const { error } = await supabase
        .from("drift_logs")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", driftId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drift-logs"] });
      toast.success("漂移已标记为已解决");
    },
    onError: (error) => {
      toast.error(`标记失败: ${error.message}`);
    },
  });
}

// Status colors
export const collaborationStatusColors: Record<string, string> = {
  pending: "#FFC107",
  connected: "#4CAF50",
  disconnected: "#9E9E9E",
  rejected: "#F44336",
};

export const driftSeverityColors: Record<string, string> = {
  low: "#8BC34A",
  medium: "#FFC107",
  high: "#FF9800",
  critical: "#F44336",
};

export const driftTypeLabels: Record<string, string> = {
  behavior_drift: "行为漂移",
  output_drift: "输出漂移",
  latency_drift: "延迟漂移",
  confidence_drift: "置信度漂移",
};
