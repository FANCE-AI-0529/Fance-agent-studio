import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "sonner";

export interface UserPrompt {
  id: string;
  user_id: string;
  name: string;
  prompt: string;
  is_default: boolean;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
  share_token?: string | null;
  is_shared?: boolean;
  share_count?: number;
}

export function useUserPrompts(agentId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-prompts", user?.id, agentId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("user_prompts")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (agentId) {
        query = query.or(`agent_id.eq.${agentId},agent_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching user prompts:", error);
        throw error;
      }

      return data as UserPrompt[];
    },
    enabled: !!user,
  });
}

export function useDefaultPrompt(agentId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["default-prompt", user?.id, agentId],
    queryFn: async () => {
      if (!user) return null;

      // First try to find agent-specific default prompt
      if (agentId) {
        const { data: agentPrompt } = await supabase
          .from("user_prompts")
          .select("*")
          .eq("user_id", user.id)
          .eq("agent_id", agentId)
          .eq("is_default", true)
          .maybeSingle();

        if (agentPrompt) return agentPrompt as UserPrompt;
      }

      // Fall back to global default prompt
      const { data: globalPrompt } = await supabase
        .from("user_prompts")
        .select("*")
        .eq("user_id", user.id)
        .is("agent_id", null)
        .eq("is_default", true)
        .maybeSingle();

      return globalPrompt as UserPrompt | null;
    },
    enabled: !!user,
  });
}

export function useSavePrompt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      prompt,
      name,
      agentId,
      isDefault,
      existingId,
    }: {
      prompt: string;
      name?: string;
      agentId?: string | null;
      isDefault?: boolean;
      existingId?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Validate prompt
      if (prompt.trim().length < 10) {
        throw new Error("提示词太短，请至少输入10个字符");
      }
      if (prompt.length > 4000) {
        throw new Error("提示词过长，请控制在4000字符以内");
      }

      if (existingId) {
        // Update existing prompt
        const { data, error } = await supabase
          .from("user_prompts")
          .update({
            prompt,
            name: name || "Custom Prompt",
            is_default: isDefault ?? true,
          })
          .eq("id", existingId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;
        return data as UserPrompt;
      } else {
        // If setting as default, clear other defaults first
        if (isDefault) {
          await supabase
            .from("user_prompts")
            .update({ is_default: false })
            .eq("user_id", user.id)
            .eq("is_default", true)
            .or(agentId ? `agent_id.eq.${agentId}` : "agent_id.is.null");
        }

        // Insert new prompt
        const { data, error } = await supabase
          .from("user_prompts")
          .insert({
            user_id: user.id,
            prompt,
            name: name || "Custom Prompt",
            agent_id: agentId || null,
            is_default: isDefault ?? true,
          })
          .select()
          .single();

        if (error) throw error;
        return data as UserPrompt;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-prompts"] });
      queryClient.invalidateQueries({ queryKey: ["default-prompt"] });
    },
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (promptId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_prompts")
        .delete()
        .eq("id", promptId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-prompts"] });
      queryClient.invalidateQueries({ queryKey: ["default-prompt"] });
      toast.success("提示词已删除");
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
}

// Generate share link for a prompt
export function useSharePrompt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (promptId: string) => {
      if (!user) throw new Error("User not authenticated");

      // First check if prompt already has a share token
      const { data: existing, error: fetchError } = await supabase
        .from("user_prompts")
        .select("share_token, is_shared")
        .eq("id", promptId)
        .eq("user_id", user.id)
        .single();

      if (fetchError) throw fetchError;

      if (existing?.share_token && existing?.is_shared) {
        // Return existing share token
        return existing.share_token;
      }

      // Generate new share token using database function
      const { data: tokenData, error: tokenError } = await supabase
        .rpc("generate_share_token");

      if (tokenError) throw tokenError;

      // Update prompt with share token
      const { error: updateError } = await supabase
        .from("user_prompts")
        .update({
          share_token: tokenData,
          is_shared: true,
        })
        .eq("id", promptId)
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      return tokenData as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-prompts"] });
    },
  });
}

// Stop sharing a prompt
export function useUnsharePrompt() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (promptId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("user_prompts")
        .update({
          is_shared: false,
        })
        .eq("id", promptId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-prompts"] });
      toast.success("已取消分享");
    },
    onError: (error) => {
      toast.error(`取消分享失败: ${error.message}`);
    },
  });
}
