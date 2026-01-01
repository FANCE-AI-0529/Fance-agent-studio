import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ApiAlertRule {
  id: string;
  agent_id: string;
  user_id: string;
  name: string;
  error_rate_threshold: number | null;
  latency_threshold_ms: number | null;
  error_count_threshold: number | null;
  time_window_minutes: number;
  notification_email: string;
  notification_enabled: boolean;
  cooldown_minutes: number;
  last_triggered_at: string | null;
  total_alerts_sent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiAlertLog {
  id: string;
  alert_rule_id: string;
  agent_id: string;
  user_id: string;
  alert_type: string;
  threshold_value: number;
  actual_value: number;
  time_window_start: string;
  time_window_end: string;
  sample_size: number;
  notification_sent: boolean;
  notification_error: string | null;
  created_at: string;
}

export function useApiAlertRules(agentId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["api-alert-rules", agentId],
    queryFn: async () => {
      if (!agentId || !user) return [];

      const { data, error } = await supabase
        .from("api_alert_rules")
        .select("*")
        .eq("agent_id", agentId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ApiAlertRule[];
    },
    enabled: !!agentId && !!user,
  });
}

export function useCreateApiAlertRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      agentId: string;
      name?: string;
      errorRateThreshold?: number;
      latencyThresholdMs?: number;
      errorCountThreshold?: number;
      timeWindowMinutes?: number;
      notificationEmail: string;
      cooldownMinutes?: number;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("api_alert_rules")
        .insert({
          agent_id: input.agentId,
          user_id: user.id,
          name: input.name || "默认告警规则",
          error_rate_threshold: input.errorRateThreshold ?? 5,
          latency_threshold_ms: input.latencyThresholdMs ?? 3000,
          error_count_threshold: input.errorCountThreshold ?? 10,
          time_window_minutes: input.timeWindowMinutes ?? 5,
          notification_email: input.notificationEmail,
          cooldown_minutes: input.cooldownMinutes ?? 30,
        })
        .select()
        .single();

      if (error) throw error;
      return data as ApiAlertRule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-alert-rules", data.agent_id] });
      toast.success("告警规则已创建");
    },
    onError: (error) => {
      console.error("Failed to create alert rule:", error);
      toast.error("创建告警规则失败");
    },
  });
}

export function useUpdateApiAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      errorRateThreshold?: number | null;
      latencyThresholdMs?: number | null;
      errorCountThreshold?: number | null;
      timeWindowMinutes?: number;
      notificationEmail?: string;
      notificationEnabled?: boolean;
      cooldownMinutes?: number;
      isActive?: boolean;
    }) => {
      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.errorRateThreshold !== undefined) updates.error_rate_threshold = input.errorRateThreshold;
      if (input.latencyThresholdMs !== undefined) updates.latency_threshold_ms = input.latencyThresholdMs;
      if (input.errorCountThreshold !== undefined) updates.error_count_threshold = input.errorCountThreshold;
      if (input.timeWindowMinutes !== undefined) updates.time_window_minutes = input.timeWindowMinutes;
      if (input.notificationEmail !== undefined) updates.notification_email = input.notificationEmail;
      if (input.notificationEnabled !== undefined) updates.notification_enabled = input.notificationEnabled;
      if (input.cooldownMinutes !== undefined) updates.cooldown_minutes = input.cooldownMinutes;
      if (input.isActive !== undefined) updates.is_active = input.isActive;

      const { data, error } = await supabase
        .from("api_alert_rules")
        .update(updates)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data as ApiAlertRule;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["api-alert-rules", data.agent_id] });
      toast.success("告警规则已更新");
    },
    onError: (error) => {
      console.error("Failed to update alert rule:", error);
      toast.error("更新告警规则失败");
    },
  });
}

export function useDeleteApiAlertRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId: string }) => {
      const { error } = await supabase
        .from("api_alert_rules")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, agentId };
    },
    onSuccess: ({ agentId }) => {
      queryClient.invalidateQueries({ queryKey: ["api-alert-rules", agentId] });
      toast.success("告警规则已删除");
    },
    onError: (error) => {
      console.error("Failed to delete alert rule:", error);
      toast.error("删除告警规则失败");
    },
  });
}

export function useApiAlertLogs(ruleId: string | null, limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["api-alert-logs", ruleId, limit],
    queryFn: async () => {
      if (!ruleId || !user) return [];

      const { data, error } = await supabase
        .from("api_alert_logs")
        .select("*")
        .eq("alert_rule_id", ruleId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ApiAlertLog[];
    },
    enabled: !!ruleId && !!user,
  });
}

export function useCheckAlerts() {
  return useMutation({
    mutationFn: async (input?: { agentId?: string; ruleId?: string }) => {
      const { data, error } = await supabase.functions.invoke("api-alert-check", {
        body: input || {},
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.alertsTriggered > 0) {
        toast.warning(`触发了 ${data.alertsTriggered} 个告警`);
      } else {
        toast.success("检查完成，无告警触发");
      }
    },
    onError: (error) => {
      console.error("Failed to check alerts:", error);
      toast.error("检查告警失败");
    },
  });
}
