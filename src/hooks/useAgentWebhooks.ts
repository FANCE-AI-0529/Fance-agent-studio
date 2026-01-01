import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AgentWebhook {
  id: string;
  agent_id: string;
  user_id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  retry_count: number;
  timeout_ms: number;
  headers: Record<string, string>;
  last_triggered_at: string | null;
  total_triggers: number;
  successful_triggers: number;
  failed_triggers: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  agent_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  latency_ms: number | null;
  attempt_number: number;
  error_message: string | null;
  success: boolean;
  created_at: string;
}

export const WEBHOOK_EVENTS = [
  { value: "task.completed", label: "任务完成" },
  { value: "task.failed", label: "任务失败" },
  { value: "chat.response", label: "对话响应" },
  { value: "api.called", label: "API 调用" },
  { value: "skill.executed", label: "技能执行" },
  { value: "chain.completed", label: "任务链完成" },
  { value: "chain.failed", label: "任务链失败" },
];

export function useAgentWebhooks(agentId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agent-webhooks", agentId],
    queryFn: async () => {
      if (!agentId || !user) return [];
      
      const { data, error } = await supabase
        .from("agent_webhooks")
        .select("*")
        .eq("agent_id", agentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AgentWebhook[];
    },
    enabled: !!agentId && !!user,
  });
}

export function useWebhookLogs(webhookId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["webhook-logs", webhookId],
    queryFn: async () => {
      if (!webhookId || !user) return [];
      
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .eq("webhook_id", webhookId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as WebhookLog[];
    },
    enabled: !!webhookId && !!user,
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      agentId: string;
      name: string;
      url: string;
      events: string[];
      secret?: string;
      headers?: Record<string, string>;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("agent_webhooks")
        .insert({
          agent_id: params.agentId,
          user_id: user.id,
          name: params.name,
          url: params.url,
          events: params.events,
          secret: params.secret || null,
          headers: params.headers || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agent-webhooks", variables.agentId] });
      toast.success("Webhook 创建成功");
    },
    onError: (error) => {
      toast.error("创建失败: " + error.message);
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      agentId: string;
      name?: string;
      url?: string;
      events?: string[];
      secret?: string | null;
      headers?: Record<string, string>;
      is_active?: boolean;
      retry_count?: number;
      timeout_ms?: number;
    }) => {
      const { id, agentId, ...updates } = params;
      
      const { data, error } = await supabase
        .from("agent_webhooks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, agentId };
    },
    onSuccess: ({ agentId }) => {
      queryClient.invalidateQueries({ queryKey: ["agent-webhooks", agentId] });
      toast.success("Webhook 更新成功");
    },
    onError: (error) => {
      toast.error("更新失败: " + error.message);
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { id: string; agentId: string }) => {
      const { error } = await supabase
        .from("agent_webhooks")
        .delete()
        .eq("id", params.id);

      if (error) throw error;
      return params.agentId;
    },
    onSuccess: (agentId) => {
      queryClient.invalidateQueries({ queryKey: ["agent-webhooks", agentId] });
      toast.success("Webhook 已删除");
    },
    onError: (error) => {
      toast.error("删除失败: " + error.message);
    },
  });
}

export function useTestWebhook() {
  return useMutation({
    mutationFn: async (params: { webhook: AgentWebhook }) => {
      const { data, error } = await supabase.functions.invoke("webhook-trigger", {
        body: {
          agentId: params.webhook.agent_id,
          eventType: "test.ping",
          data: {
            message: "This is a test webhook ping",
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("测试 Webhook 已发送");
    },
    onError: (error) => {
      toast.error("测试失败: " + error.message);
    },
  });
}
