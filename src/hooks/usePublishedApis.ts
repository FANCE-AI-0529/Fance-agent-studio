import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { toast } from "sonner";

export interface PublishedApi {
  id: string;
  workflow_id: string;
  user_id: string;
  name: string;
  description: string | null;
  slug: string;
  version: string;
  is_active: boolean;
  auth_type: string;
  rate_limit: number;
  allowed_origins: string[];
  input_schema: Record<string, unknown>;
  output_schema: Record<string, unknown>;
  nodes: unknown[];
  edges: unknown[];
  total_calls: number;
  avg_latency_ms: number;
  error_rate: number;
  created_at: string;
  updated_at: string;
}

export function usePublishedApis(workflowId?: string) {
  return useQuery({
    queryKey: ["published-apis", workflowId],
    queryFn: async () => {
      let query = supabase
        .from("workflow_published_apis")
        .select("*")
        .order("created_at", { ascending: false });
      if (workflowId) {
        query = query.eq("workflow_id", workflowId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as PublishedApi[];
    },
  });
}

export function usePublishWorkflowApi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      workflow_id: string;
      name: string;
      description?: string;
      slug: string;
      nodes: unknown[];
      edges: unknown[];
      input_schema?: Record<string, unknown>;
      output_schema?: Record<string, unknown>;
      rate_limit?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登录");

      // Check if existing
      const { data: existing } = await supabase
        .from("workflow_published_apis")
        .select("id")
        .eq("user_id", user.id)
        .eq("slug", payload.slug)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("workflow_published_apis")
          .update({
            name: payload.name,
            description: payload.description || null,
            nodes: payload.nodes as any,
            edges: payload.edges as any,
            input_schema: payload.input_schema as any || {},
            output_schema: payload.output_schema as any || {},
            rate_limit: payload.rate_limit || 60,
          })
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        return data as unknown as PublishedApi;
      }

      const { data, error } = await supabase
        .from("workflow_published_apis")
        .insert({
          workflow_id: payload.workflow_id,
          name: payload.name,
          description: payload.description || null,
          slug: payload.slug,
          user_id: user.id,
          is_active: true,
          auth_type: "api_key",
          rate_limit: payload.rate_limit || 60,
          nodes: payload.nodes as any,
          edges: payload.edges as any,
          input_schema: payload.input_schema as any || {},
          output_schema: payload.output_schema as any || {},
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as PublishedApi;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["published-apis"] });
      toast.success("工作流 API 已发布");
    },
    onError: (e) => toast.error(`发布失败: ${e.message}`),
  });
}

export function useToggleApiStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("workflow_published_apis")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["published-apis"] });
      toast.success("API 状态已更新");
    },
  });
}
