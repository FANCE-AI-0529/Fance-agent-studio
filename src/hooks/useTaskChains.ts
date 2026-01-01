import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useCallback } from "react";

export interface ChainStep {
  id: string;
  chain_id: string;
  step_order: number;
  parallel_group: number;
  name: string;
  description: string | null;
  task_type: string;
  target_agent_id: string | null;
  input_mapping: Record<string, string>;
  output_key: string | null;
  status: string;
  task_id: string | null;
  result: any;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  retry_count: number;
  max_retries: number;
  timeout_ms: number;
  created_at: string;
  target_agent?: { id: string; name: string; model: string };
}

export interface TaskChain {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  status: string;
  execution_mode: "sequential" | "parallel" | "mixed";
  source_agent_id: string | null;
  collaboration_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  final_result: any;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  source_agent?: { id: string; name: string; model: string };
  steps?: ChainStep[];
}

// Fetch all task chains
export function useTaskChains() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["task-chains", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_chains")
        .select(`
          *,
          source_agent:agents!task_chains_source_agent_id_fkey(id, name, model)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as TaskChain[];
    },
    enabled: !!user,
  });
}

// Fetch a specific chain with steps
export function useTaskChain(chainId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["task-chain", chainId],
    queryFn: async () => {
      if (!chainId) return null;

      const { data: chain, error: chainError } = await supabase
        .from("task_chains")
        .select(`
          *,
          source_agent:agents!task_chains_source_agent_id_fkey(id, name, model)
        `)
        .eq("id", chainId)
        .single();

      if (chainError) throw chainError;

      const { data: steps, error: stepsError } = await supabase
        .from("task_chain_steps")
        .select(`
          *,
          target_agent:agents!task_chain_steps_target_agent_id_fkey(id, name, model)
        `)
        .eq("chain_id", chainId)
        .order("step_order", { ascending: true });

      if (stepsError) throw stepsError;

      return { ...chain, steps } as TaskChain;
    },
    enabled: !!user && !!chainId,
  });
}

// Real-time chain updates
export function useRealtimeChainUpdates(
  chainId: string | null,
  onUpdate: (chain: TaskChain) => void
) {
  useEffect(() => {
    if (!chainId) return;

    const channel = supabase
      .channel(`chain-${chainId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_chains",
          filter: `id=eq.${chainId}`,
        },
        (payload) => {
          onUpdate(payload.new as TaskChain);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_chain_steps",
          filter: `chain_id=eq.${chainId}`,
        },
        () => {
          // Refetch the chain when steps change
          supabase
            .from("task_chains")
            .select("*")
            .eq("id", chainId)
            .single()
            .then(({ data }) => {
              if (data) onUpdate(data as TaskChain);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chainId, onUpdate]);
}

// Create a new task chain
export function useCreateChain() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      executionMode: "sequential" | "parallel" | "mixed";
      sourceAgentId?: string;
      collaborationId?: string;
      steps: Array<{
        name: string;
        description?: string;
        taskType?: string;
        targetAgentId?: string;
        inputMapping?: Record<string, string>;
        outputKey?: string;
        parallelGroup?: number;
        maxRetries?: number;
        timeoutMs?: number;
      }>;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Create the chain
      const { data: chain, error: chainError } = await supabase
        .from("task_chains")
        .insert({
          user_id: user.id,
          name: params.name,
          description: params.description,
          execution_mode: params.executionMode,
          source_agent_id: params.sourceAgentId,
          collaboration_id: params.collaborationId,
          total_steps: params.steps.length,
          status: "draft",
        })
        .select()
        .single();

      if (chainError) throw chainError;

      // Create steps
      const stepsToInsert = params.steps.map((step, index) => ({
        chain_id: chain.id,
        step_order: index,
        parallel_group: step.parallelGroup ?? index,
        name: step.name,
        description: step.description,
        task_type: step.taskType || "general",
        target_agent_id: step.targetAgentId,
        input_mapping: step.inputMapping || {},
        output_key: step.outputKey,
        max_retries: step.maxRetries ?? 3,
        timeout_ms: step.timeoutMs ?? 60000,
        status: "pending",
      }));

      const { error: stepsError } = await supabase
        .from("task_chain_steps")
        .insert(stepsToInsert);

      if (stepsError) throw stepsError;

      return chain;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-chains"] });
      toast.success("任务链已创建");
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });
}

// Execute a task chain
export function useExecuteChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      chainId: string;
      initialContext?: Record<string, unknown>;
    }) => {
      const response = await supabase.functions.invoke("task-chain-executor", {
        body: {
          action: "execute",
          chainId: params.chainId,
          initialContext: params.initialContext,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["task-chains"] });
      queryClient.invalidateQueries({ queryKey: ["task-chain"] });
      if (data.success) {
        toast.success("任务链执行完成", {
          description: `完成 ${data.completed_steps} 个步骤`,
        });
      }
    },
    onError: (error: any) => {
      toast.error(`执行失败: ${error.message}`);
    },
  });
}

// Cancel a chain
export function useCancelChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chainId: string) => {
      const response = await supabase.functions.invoke("task-chain-executor", {
        body: { action: "cancel", chainId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-chains"] });
      queryClient.invalidateQueries({ queryKey: ["task-chain"] });
      toast.success("任务链已取消");
    },
    onError: (error) => {
      toast.error(`取消失败: ${error.message}`);
    },
  });
}

// Delete a chain
export function useDeleteChain() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (chainId: string) => {
      const { error } = await supabase
        .from("task_chains")
        .delete()
        .eq("id", chainId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-chains"] });
      toast.success("任务链已删除");
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
}

// Add a step to an existing chain
export function useAddChainStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      chainId: string;
      step: {
        name: string;
        description?: string;
        taskType?: string;
        targetAgentId?: string;
        inputMapping?: Record<string, string>;
        outputKey?: string;
        parallelGroup?: number;
        stepOrder: number;
      };
    }) => {
      const { data, error } = await supabase
        .from("task_chain_steps")
        .insert({
          chain_id: params.chainId,
          step_order: params.step.stepOrder,
          parallel_group: params.step.parallelGroup ?? params.step.stepOrder,
          name: params.step.name,
          description: params.step.description,
          task_type: params.step.taskType || "general",
          target_agent_id: params.step.targetAgentId,
          input_mapping: params.step.inputMapping || {},
          output_key: params.step.outputKey,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      // Update total_steps count
      const { data: chain } = await supabase
        .from("task_chains")
        .select("total_steps")
        .eq("id", params.chainId)
        .single();
      
      if (chain) {
        await supabase
          .from("task_chains")
          .update({ total_steps: chain.total_steps + 1 })
          .eq("id", params.chainId);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-chain"] });
      toast.success("步骤已添加");
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });
}

// Remove a step
export function useRemoveChainStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stepId: string) => {
      const { error } = await supabase
        .from("task_chain_steps")
        .delete()
        .eq("id", stepId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-chain"] });
      toast.success("步骤已删除");
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
}

// Status colors and labels
export const chainStatusColors: Record<string, string> = {
  draft: "#9E9E9E",
  pending: "#FFC107",
  running: "#2196F3",
  paused: "#FF9800",
  completed: "#4CAF50",
  failed: "#F44336",
  cancelled: "#9E9E9E",
};

export const chainStatusLabels: Record<string, string> = {
  draft: "草稿",
  pending: "待执行",
  running: "执行中",
  paused: "已暂停",
  completed: "已完成",
  failed: "已失败",
  cancelled: "已取消",
};

export const stepStatusColors: Record<string, string> = {
  pending: "#9E9E9E",
  in_progress: "#2196F3",
  completed: "#4CAF50",
  failed: "#F44336",
  cancelled: "#9E9E9E",
  skipped: "#FF9800",
};

export const stepStatusLabels: Record<string, string> = {
  pending: "待执行",
  in_progress: "执行中",
  completed: "已完成",
  failed: "已失败",
  cancelled: "已取消",
  skipped: "已跳过",
};

export const executionModeLabels: Record<string, string> = {
  sequential: "串行执行",
  parallel: "并行执行",
  mixed: "混合模式",
};
