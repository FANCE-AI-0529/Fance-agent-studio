import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "sonner";
import { useIsAdmin } from "./useAdminInvite.ts";
import { LLMProvider, PROVIDER_TEMPLATES } from "./useLLMProviders.ts";

// Hook to fetch global (admin) providers
export function useGlobalLLMProviders() {
  const { data: isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ["global-llm-providers"],
    queryFn: async () => {
      // Fetch providers from admin users (those with admin role)
      const { data: adminUsers, error: adminError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminError || !adminUsers?.length) return [];

      const adminUserIds = adminUsers.map(u => u.user_id);

      const { data, error } = await supabase
        .from("llm_providers")
        .select("*")
        .in("user_id", adminUserIds)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LLMProvider[];
    },
    enabled: isAdmin === true,
    staleTime: 30000,
  });
}

// Hook to get global default provider (for non-admin usage resolution)
export function useGlobalDefaultProvider() {
  return useQuery({
    queryKey: ["global-default-provider"],
    queryFn: async () => {
      // Fetch admin users first
      const { data: adminUsers, error: adminError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminError || !adminUsers?.length) return null;

      const adminUserIds = adminUsers.map(u => u.user_id);

      // Get the default provider from admin users
      const { data, error } = await supabase
        .from("llm_providers")
        .select("*")
        .in("user_id", adminUserIds)
        .eq("is_default", true)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as LLMProvider | null;
    },
    staleTime: 60000,
  });
}

// Hook for admin to create global provider
export function useCreateGlobalProvider() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      provider_type: string;
      display_name: string;
      api_endpoint: string;
      api_key_name: string;
      available_models?: any[];
      default_model?: string;
      settings?: Record<string, any>;
      is_default?: boolean;
    }) => {
      if (!user || !isAdmin) throw new Error("Admin access required");

      // If setting as default, unset other defaults first (from all admin providers)
      if (input.is_default) {
        const { data: adminUsers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (adminUsers?.length) {
          const adminUserIds = adminUsers.map(u => u.user_id);
          await supabase
            .from("llm_providers")
            .update({ is_default: false })
            .in("user_id", adminUserIds);
        }
      }

      const { data, error } = await supabase
        .from("llm_providers")
        .insert({
          user_id: user.id,
          name: input.name,
          provider_type: input.provider_type,
          display_name: input.display_name,
          api_endpoint: input.api_endpoint,
          api_key_name: input.api_key_name,
          available_models: input.available_models || [],
          default_model: input.default_model || null,
          settings: input.settings || {},
          is_default: input.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LLMProvider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-llm-providers"] });
      queryClient.invalidateQueries({ queryKey: ["global-default-provider"] });
      queryClient.invalidateQueries({ queryKey: ["llm-providers"] });
      toast.success("全局模型供应商已添加");
    },
    onError: (error) => {
      console.error("Failed to create global provider:", error);
      toast.error("添加供应商失败");
    },
  });
}

// Hook for admin to update global provider
export function useUpdateGlobalProvider() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  return useMutation({
    mutationFn: async (input: Partial<LLMProvider> & { id: string }) => {
      if (!user || !isAdmin) throw new Error("Admin access required");

      // If setting as default, unset other defaults first
      if (input.is_default) {
        const { data: adminUsers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        if (adminUsers?.length) {
          const adminUserIds = adminUsers.map(u => u.user_id);
          await supabase
            .from("llm_providers")
            .update({ is_default: false })
            .in("user_id", adminUserIds)
            .neq("id", input.id);
        }
      }

      const { data, error } = await supabase
        .from("llm_providers")
        .update(input)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data as LLMProvider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-llm-providers"] });
      queryClient.invalidateQueries({ queryKey: ["global-default-provider"] });
      queryClient.invalidateQueries({ queryKey: ["llm-providers"] });
      toast.success("供应商已更新");
    },
    onError: (error) => {
      console.error("Failed to update global provider:", error);
      toast.error("更新供应商失败");
    },
  });
}

// Hook for admin to delete global provider
export function useDeleteGlobalProvider() {
  const queryClient = useQueryClient();
  const { data: isAdmin } = useIsAdmin();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isAdmin) throw new Error("Admin access required");

      const { error } = await supabase
        .from("llm_providers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-llm-providers"] });
      queryClient.invalidateQueries({ queryKey: ["global-default-provider"] });
      queryClient.invalidateQueries({ queryKey: ["llm-providers"] });
      toast.success("供应商已删除");
    },
    onError: (error) => {
      console.error("Failed to delete global provider:", error);
      toast.error("删除供应商失败");
    },
  });
}

// Hook to test API connection
export function useTestAPIConnection() {
  return useMutation({
    mutationFn: async (input: {
      api_endpoint: string;
      api_key_name: string;
      provider_type: string;
      model: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("test-llm-connection", {
        body: input,
      });

      if (error) throw error;
      return data;
    },
  });
}

// Re-export provider templates for use in settings
export { PROVIDER_TEMPLATES };
