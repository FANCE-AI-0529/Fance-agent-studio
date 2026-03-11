import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  user_id: string;
  status: string;
  mode: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  node_results: Array<{
    nodeId: string;
    nodeType: string;
    status: string;
    output: Record<string, unknown>;
    duration: number;
    tokensUsed: number;
    error?: string;
  }>;
  total_duration_ms: number;
  total_tokens_used: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export function useWorkflowRuns(workflowId: string | null) {
  return useQuery({
    queryKey: ["workflow-runs", workflowId],
    queryFn: async () => {
      if (!workflowId) return [];
      const { data, error } = await supabase
        .from("workflow_runs")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as WorkflowRun[];
    },
    enabled: !!workflowId,
  });
}
