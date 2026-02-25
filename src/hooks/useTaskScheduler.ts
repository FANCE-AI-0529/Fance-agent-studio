import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Task priority levels
export type TaskPriority = "hrt" | "srt" | "dt";

// Task types
export type TaskType = 
  | "compliance_check"
  | "content_filter"
  | "memory_update"
  | "log_archive"
  | "model_inference"
  | "agent_self_wake";

export interface SchedulerTask {
  id?: string;
  priority: TaskPriority;
  task_type: TaskType;
  payload: Record<string, unknown>;
  max_latency_ms?: number;
}

export interface TaskResult {
  task_id: string;
  success: boolean;
  result?: unknown;
  error?: string;
  execution_time_ms: number;
}

export interface QueuedTask {
  queued: boolean;
  task_id: string;
  priority: TaskPriority;
  estimated_completion: string;
}

// Priority configuration
export const PRIORITY_CONFIG = {
  hrt: {
    name: "硬实时 (HRT)",
    description: "合规检查、敏感词过滤 - 必须在100ms内完成",
    maxLatencyMs: 100,
    color: "destructive",
    icon: "🔴",
  },
  srt: {
    name: "软实时 (SRT)",
    description: "UI渲染、流式输出 - 允许少量延迟",
    maxLatencyMs: 2000,
    color: "warning",
    icon: "🟡",
  },
  dt: {
    name: "延迟容忍 (DT)",
    description: "日志归档、记忆更新 - 后台处理",
    maxLatencyMs: 30000,
    color: "secondary",
    icon: "🟢",
  },
} as const;

export function useSubmitTask() {
  return useMutation({
    mutationFn: async (task: SchedulerTask): Promise<TaskResult | QueuedTask> => {
      const { data, error } = await supabase.functions.invoke("task-scheduler", {
        body: { action: "submit", task },
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useBatchTasks() {
  return useMutation({
    mutationFn: async (tasks: SchedulerTask[]): Promise<{ results: TaskResult[] }> => {
      const { data, error } = await supabase.functions.invoke("task-scheduler", {
        body: { action: "batch", tasks },
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useTaskStatus() {
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { data, error } = await supabase.functions.invoke("task-scheduler", {
        body: { action: "status", task: { id: taskId } },
      });

      if (error) throw error;
      return data;
    },
  });
}

// Helper to create compliance check task (HRT)
export function createComplianceTask(content: string): SchedulerTask {
  return {
    priority: "hrt",
    task_type: "compliance_check",
    payload: { content },
  };
}

// Helper to create content filter task (HRT)
export function createContentFilterTask(content: string): SchedulerTask {
  return {
    priority: "hrt",
    task_type: "content_filter",
    payload: { content },
  };
}

// Helper to create memory update task (DT)
export function createMemoryUpdateTask(
  sessionId: string,
  memory: Record<string, unknown>
): SchedulerTask {
  return {
    priority: "dt",
    task_type: "memory_update",
    payload: { session_id: sessionId, memory },
  };
}

// Helper to create log archive task (DT)
export function createLogArchiveTask(sessionId: string, logs: unknown[]): SchedulerTask {
  return {
    priority: "dt",
    task_type: "log_archive",
    payload: { session_id: sessionId, logs },
  };
}

// Helper to create agent self-wake task (DT)
export function createSelfWakeTask(
  agentId: string,
  pendingTasks: string[],
  claudeMdPath?: string
): SchedulerTask {
  return {
    priority: "dt",
    task_type: "agent_self_wake",
    payload: {
      agent_id: agentId,
      pending_tasks: pendingTasks,
      claude_md_path: claudeMdPath,
      wake_reason: "pending_tasks_detected",
    },
  };
}
