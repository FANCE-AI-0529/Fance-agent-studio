import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";

export interface VariablePreset {
  id: string;
  name: string;
  values: Record<string, string>;
  agent_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function useVariablePresets(agentId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["variable-presets", user?.id, agentId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("variable_presets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (agentId) {
        query = query.or(`agent_id.eq.${agentId},agent_id.is.null`);
      } else {
        query = query.is("agent_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        values: item.values as Record<string, string>,
        agent_id: item.agent_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) as VariablePreset[];
    },
    enabled: !!user,
  });
}

export function useSaveVariablePreset() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      values,
      agentId,
    }: {
      name: string;
      values: Record<string, string>;
      agentId?: string | null;
    }) => {
      if (!user) throw new Error("未登录");

      const { data, error } = await supabase
        .from("variable_presets")
        .insert({
          user_id: user.id,
          name,
          values,
          agent_id: agentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variable-presets"] });
    },
  });
}

export function useDeleteVariablePreset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (presetId: string) => {
      const { error } = await supabase
        .from("variable_presets")
        .delete()
        .eq("id", presetId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["variable-presets"] });
    },
  });
}
