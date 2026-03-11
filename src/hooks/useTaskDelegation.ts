import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "sonner";
import { useEffect, useCallback } from "react";

// Key entity extracted from conversation
export interface KeyEntity {
  name: string;
  type: "person" | "organization" | "location" | "date" | "number" | "policy" | "document" | "other";
  value?: string;
  confidence?: number;
  source?: string;
}

// Completed step in the workflow
export interface DoneStep {
  stepId: string;
  description: string;
  completedAt: string;
  result?: unknown;
  agentId?: string;
}

// Artifact generated during the workflow
export interface Artifact {
  id: string;
  type: "document" | "report" | "form" | "calculation" | "data" | "image" | "other";
  name: string;
  url?: string;
  content?: string;
  createdAt: string;
  createdBy?: string;
}

// User preferences for the task
export interface UserPreferences {
  language?: string;
  responseFormat?: "brief" | "detailed" | "structured";
  priorityFocus?: string[];
  excludeTopics?: string[];
  customPreferences?: Record<string, unknown>;
}

// Enhanced HandoffPacket following A2A protocol
export interface HandoffContext {
  // Core task context
  goal?: string;
  userQuery?: string;
  urgency?: "low" | "normal" | "high" | "urgent";
  
  // Conversation context
  conversationSummary?: string;
  conversationId?: string;
  turnCount?: number;
  
  // Completed work history
  doneHistory?: DoneStep[];
  previousResults?: unknown[];
  
  // Key information extracted
  keyEntities?: KeyEntity[];
  
  // Constraints and rules
  constraints?: string[];
  legalRequirements?: string[];
  
  // Generated artifacts
  artifacts?: Artifact[];
  
  // User context
  userPreferences?: UserPreferences;
  userProfile?: {
    department?: string;
    role?: string;
    accessLevel?: string;
  };
  
  // Agent-specific context
  sourceAgentContext?: {
    agentId: string;
    agentName: string;
    capabilities: string[];
    reasonForHandoff: string;
  };
  
  // Metadata
  handoffTimestamp?: string;
  protocolVersion?: string;
}

export interface DelegatedTask {
  id: string;
  collaboration_id: string | null;
  source_agent_id: string;
  target_agent_id: string;
  user_id: string;
  title: string;
  description: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  task_type: "general" | "analysis" | "generation" | "query" | "validation";
  handoff_context: HandoffContext;
  status: "pending" | "accepted" | "in_progress" | "completed" | "rejected" | "failed" | "cancelled";
  result: Record<string, unknown> | null;
  error_message: string | null;
  estimated_duration_ms: number | null;
  actual_duration_ms: number | null;
  tokens_used: number | null;
  created_at: string;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  deadline: string | null;
  source_agent?: { id: string; name: string; model: string };
  target_agent?: { id: string; name: string; model: string };
}

// Fetch delegated tasks for an agent
export function useDelegatedTasks(agentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["delegated-tasks", user?.id, agentId],
    queryFn: async () => {
      let query = supabase
        .from("delegated_tasks")
        .select(`
          *,
          source_agent:agents!delegated_tasks_source_agent_id_fkey(id, name, model),
          target_agent:agents!delegated_tasks_target_agent_id_fkey(id, name, model)
        `)
        .order("created_at", { ascending: false });

      if (agentId) {
        query = query.or(`source_agent_id.eq.${agentId},target_agent_id.eq.${agentId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DelegatedTask[];
    },
    enabled: !!user,
  });
}

// Real-time subscription for task updates
export function useRealtimeTaskUpdates(
  agentId: string | null,
  onTaskUpdate: (task: DelegatedTask) => void
) {
  useEffect(() => {
    if (!agentId) return;

    const channel = supabase
      .channel(`tasks-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "delegated_tasks",
        },
        (payload) => {
          const task = payload.new as DelegatedTask;
          if (task.source_agent_id === agentId || task.target_agent_id === agentId) {
            onTaskUpdate(task);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, onTaskUpdate]);
}

// Delegate a task
export function useDelegateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      sourceAgentId: string;
      targetAgentId: string;
      collaborationId?: string;
      title: string;
      description?: string;
      priority?: "low" | "normal" | "high" | "urgent";
      taskType?: "general" | "analysis" | "generation" | "query" | "validation";
      handoffContext?: HandoffContext;
      deadline?: string;
    }) => {
      const response = await supabase.functions.invoke("task-delegation", {
        body: {
          action: "delegate",
          ...params,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegated-tasks"] });
      toast.success("任务已委派");
    },
    onError: (error) => {
      toast.error(`委派失败: ${error.message}`);
    },
  });
}

// Accept a task
export function useAcceptTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await supabase.functions.invoke("task-delegation", {
        body: { action: "accept", taskId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegated-tasks"] });
      toast.success("任务已接受");
    },
    onError: (error) => {
      toast.error(`接受失败: ${error.message}`);
    },
  });
}

// Reject a task
export function useRejectTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { taskId: string; reason?: string }) => {
      const response = await supabase.functions.invoke("task-delegation", {
        body: { action: "reject", taskId: params.taskId, errorMessage: params.reason },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegated-tasks"] });
      toast.success("任务已拒绝");
    },
    onError: (error) => {
      toast.error(`拒绝失败: ${error.message}`);
    },
  });
}

// Start a task
export function useStartTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await supabase.functions.invoke("task-delegation", {
        body: { action: "start", taskId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegated-tasks"] });
      toast.success("任务已开始");
    },
    onError: (error) => {
      toast.error(`启动失败: ${error.message}`);
    },
  });
}

// Execute a task using AI
export function useExecuteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { taskId: string; additionalContext?: string }) => {
      const response = await supabase.functions.invoke("task-executor", {
        body: params,
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["delegated-tasks"] });
      toast.success("任务执行完成", {
        description: `耗时: ${(data.result?.execution_time_ms / 1000).toFixed(1)}s`,
      });
    },
    onError: (error: any) => {
      if (error.message?.includes("429")) {
        toast.error("AI 请求频率限制", { description: "请稍后再试" });
      } else if (error.message?.includes("402")) {
        toast.error("AI 余额不足", { description: "请充值后再试" });
      } else {
        toast.error(`执行失败: ${error.message}`);
      }
    },
  });
}

// Complete a task
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { taskId: string; result?: unknown }) => {
      const response = await supabase.functions.invoke("task-delegation", {
        body: { action: "complete", taskId: params.taskId, result: params.result },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegated-tasks"] });
      toast.success("任务已完成");
    },
    onError: (error) => {
      toast.error(`完成失败: ${error.message}`);
    },
  });
}

// Fail a task
export function useFailTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { taskId: string; errorMessage: string }) => {
      const response = await supabase.functions.invoke("task-delegation", {
        body: { action: "fail", ...params },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegated-tasks"] });
      toast.warning("任务已标记为失败");
    },
    onError: (error) => {
      toast.error(`操作失败: ${error.message}`);
    },
  });
}

// Cancel a task
export function useCancelTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await supabase.functions.invoke("task-delegation", {
        body: { action: "cancel", taskId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegated-tasks"] });
      toast.success("任务已取消");
    },
    onError: (error) => {
      toast.error(`取消失败: ${error.message}`);
    },
  });
}

// Task status colors
export const taskStatusColors: Record<string, string> = {
  pending: "#FFC107",
  accepted: "#2196F3",
  in_progress: "#9C27B0",
  completed: "#4CAF50",
  rejected: "#F44336",
  failed: "#FF5722",
  cancelled: "#9E9E9E",
};

export const taskStatusLabels: Record<string, string> = {
  pending: "待处理",
  accepted: "已接受",
  in_progress: "执行中",
  completed: "已完成",
  rejected: "已拒绝",
  failed: "已失败",
  cancelled: "已取消",
};

export const taskPriorityColors: Record<string, string> = {
  low: "#8BC34A",
  normal: "#2196F3",
  high: "#FF9800",
  urgent: "#F44336",
};

export const taskPriorityLabels: Record<string, string> = {
  low: "低",
  normal: "普通",
  high: "高",
  urgent: "紧急",
};

export const taskTypeLabels: Record<string, string> = {
  general: "通用",
  analysis: "分析",
  generation: "生成",
  query: "查询",
  validation: "验证",
};
