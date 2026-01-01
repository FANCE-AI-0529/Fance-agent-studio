import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface AgentApiKey {
  id: string;
  agent_id: string;
  user_id: string;
  name: string;
  api_key: string;
  is_active: boolean;
  rate_limit: number;
  total_calls: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AgentApiLog {
  id: string;
  api_key_id: string;
  agent_id: string;
  user_id: string;
  request_body: any;
  response_body: any;
  status_code: number;
  latency_ms: number | null;
  tokens_used: number | null;
  error_message: string | null;
  ip_address: string | null;
  created_at: string;
}

// Generate a secure API key
function generateApiKey(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  const base64 = btoa(String.fromCharCode(...array));
  return "agos_" + base64.replace(/[+/=]/g, "").substring(0, 32);
}

// Hook to get API keys for an agent
export function useAgentApiKeys(agentId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agent-api-keys", agentId],
    queryFn: async () => {
      if (!agentId || !user) return [];
      
      const { data, error } = await supabase
        .from("agent_api_keys")
        .select("*")
        .eq("agent_id", agentId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AgentApiKey[];
    },
    enabled: !!agentId && !!user,
  });
}

// Hook to create a new API key
export function useCreateAgentApiKey() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      agentId, 
      name = "Default API Key",
      rateLimit = 100,
      expiresAt = null as string | null
    }: { 
      agentId: string; 
      name?: string;
      rateLimit?: number;
      expiresAt?: string | null;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const apiKey = generateApiKey();

      const { data, error } = await supabase
        .from("agent_api_keys")
        .insert({
          agent_id: agentId,
          user_id: user.id,
          name,
          api_key: apiKey,
          rate_limit: rateLimit,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;
      return data as AgentApiKey;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agent-api-keys", data.agent_id] });
      toast.success("API 密钥已创建");
    },
    onError: (error) => {
      console.error("Failed to create API key:", error);
      toast.error("创建 API 密钥失败");
    },
  });
}

// Hook to update an API key
export function useUpdateAgentApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      name,
      isActive,
      rateLimit,
      expiresAt
    }: { 
      id: string;
      name?: string;
      isActive?: boolean;
      rateLimit?: number;
      expiresAt?: string | null;
    }) => {
      const updates: any = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (isActive !== undefined) updates.is_active = isActive;
      if (rateLimit !== undefined) updates.rate_limit = rateLimit;
      if (expiresAt !== undefined) updates.expires_at = expiresAt;

      const { data, error } = await supabase
        .from("agent_api_keys")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as AgentApiKey;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agent-api-keys", data.agent_id] });
      toast.success("API 密钥已更新");
    },
    onError: (error) => {
      console.error("Failed to update API key:", error);
      toast.error("更新 API 密钥失败");
    },
  });
}

// Hook to delete an API key
export function useDeleteAgentApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId: string }) => {
      const { error } = await supabase
        .from("agent_api_keys")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, agentId };
    },
    onSuccess: ({ agentId }) => {
      queryClient.invalidateQueries({ queryKey: ["agent-api-keys", agentId] });
      toast.success("API 密钥已删除");
    },
    onError: (error) => {
      console.error("Failed to delete API key:", error);
      toast.error("删除 API 密钥失败");
    },
  });
}

// Hook to get API logs
export function useAgentApiLogs(apiKeyId: string | null, limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agent-api-logs", apiKeyId, limit],
    queryFn: async () => {
      if (!apiKeyId || !user) return [];
      
      const { data, error } = await supabase
        .from("agent_api_logs")
        .select("*")
        .eq("api_key_id", apiKeyId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AgentApiLog[];
    },
    enabled: !!apiKeyId && !!user,
  });
}

// Hook to get API stats for an agent
export function useAgentApiStats(agentId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agent-api-stats", agentId],
    queryFn: async () => {
      if (!agentId || !user) return null;
      
      // Get all API keys for this agent
      const { data: keys, error: keysError } = await supabase
        .from("agent_api_keys")
        .select("id, total_calls, last_used_at")
        .eq("agent_id", agentId)
        .eq("user_id", user.id);

      if (keysError) throw keysError;

      const totalCalls = keys?.reduce((sum, k) => sum + (k.total_calls || 0), 0) || 0;
      const lastUsed = keys
        ?.filter(k => k.last_used_at)
        ?.sort((a, b) => new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime())[0]
        ?.last_used_at;

      return {
        totalKeys: keys?.length || 0,
        totalCalls,
        lastUsed,
      };
    },
    enabled: !!agentId && !!user,
  });
}
