import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StepLog {
  stepId: string;
  stepName: string;
  stepOrder: number;
  taskType: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  result?: any;
  errorMessage?: string;
  retryCount?: number;
}

export interface ChainExecution {
  id: string;
  chain_id: string;
  user_id: string;
  chain_name: string;
  chain_description: string | null;
  execution_mode: string;
  status: "running" | "completed" | "failed" | "cancelled";
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  final_result: any;
  error_message: string | null;
  step_logs: StepLog[];
  variables_used: Record<string, string>;
  created_at: string;
}

export function useChainExecutions(chainId?: string | null) {
  return useQuery({
    queryKey: ["chain-executions", chainId],
    queryFn: async () => {
      let query = supabase
        .from("task_chain_executions")
        .select("*")
        .order("started_at", { ascending: false });

      if (chainId) {
        query = query.eq("chain_id", chainId);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return (data || []).map((item) => ({
        ...item,
        step_logs: (item.step_logs as unknown as StepLog[]) || [],
        variables_used: (item.variables_used as unknown as Record<string, string>) || {},
      })) as ChainExecution[];
    },
  });
}

export function useChainExecution(executionId: string | null) {
  return useQuery({
    queryKey: ["chain-execution", executionId],
    queryFn: async () => {
      if (!executionId) return null;

      const { data, error } = await supabase
        .from("task_chain_executions")
        .select("*")
        .eq("id", executionId)
        .single();

      if (error) throw error;
      return {
        ...data,
        step_logs: (data.step_logs as unknown as StepLog[]) || [],
        variables_used: (data.variables_used as unknown as Record<string, string>) || {},
      } as ChainExecution;
    },
    enabled: !!executionId,
  });
}

export function useCreateExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      chainId,
      chainName,
      chainDescription,
      executionMode,
      totalSteps,
      stepLogs,
      variablesUsed,
    }: {
      chainId: string;
      chainName: string;
      chainDescription?: string;
      executionMode: string;
      totalSteps: number;
      stepLogs: StepLog[];
      variablesUsed?: Record<string, string>;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("未登录");

      const { data, error } = await supabase
        .from("task_chain_executions")
        .insert({
          chain_id: chainId,
          user_id: userData.user.id,
          chain_name: chainName,
          chain_description: chainDescription || null,
          execution_mode: executionMode,
          total_steps: totalSteps,
          step_logs: stepLogs as any,
          variables_used: variablesUsed || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chain-executions"] });
    },
  });
}

export function useUpdateExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      executionId,
      status,
      completedSteps,
      failedSteps,
      stepLogs,
      finalResult,
      errorMessage,
    }: {
      executionId: string;
      status?: string;
      completedSteps?: number;
      failedSteps?: number;
      stepLogs?: StepLog[];
      finalResult?: any;
      errorMessage?: string;
    }) => {
      const updateData: Record<string, any> = {};
      
      if (status !== undefined) {
        updateData.status = status;
        if (status === "completed" || status === "failed" || status === "cancelled") {
          updateData.completed_at = new Date().toISOString();
        }
      }
      if (completedSteps !== undefined) updateData.completed_steps = completedSteps;
      if (failedSteps !== undefined) updateData.failed_steps = failedSteps;
      if (stepLogs !== undefined) updateData.step_logs = stepLogs;
      if (finalResult !== undefined) updateData.final_result = finalResult;
      if (errorMessage !== undefined) updateData.error_message = errorMessage;

      const { data, error } = await supabase
        .from("task_chain_executions")
        .update(updateData)
        .eq("id", executionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chain-executions"] });
      queryClient.invalidateQueries({ queryKey: ["chain-execution"] });
    },
  });
}

export function useDeleteExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (executionId: string) => {
      const { error } = await supabase
        .from("task_chain_executions")
        .delete()
        .eq("id", executionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chain-executions"] });
      toast.success("执行记录已删除");
    },
    onError: () => {
      toast.error("删除失败");
    },
  });
}

// Status colors and labels
export const executionStatusColors: Record<string, string> = {
  running: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
  failed: "bg-red-500/10 text-red-500 border-red-500/20",
  cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export const executionStatusLabels: Record<string, string> = {
  running: "执行中",
  completed: "已完成",
  failed: "失败",
  cancelled: "已取消",
};

export const stepStatusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-blue-500/10 text-blue-500",
  completed: "bg-green-500/10 text-green-500",
  failed: "bg-red-500/10 text-red-500",
  skipped: "bg-gray-500/10 text-gray-500",
};
