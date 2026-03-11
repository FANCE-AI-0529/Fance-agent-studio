import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "./use-toast.ts";

export interface CreatorProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  department: string | null;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  total_agents: number;
  total_likes_received: number;
  creator_level: number;
  badges: any[];
  social_links: Record<string, string>;
  cover_image_url: string | null;
  created_at: string;
}

export function useCreatorProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["creatorProfile", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      
      return data as CreatorProfile;
    },
    enabled: !!userId,
  });
}

export function useCreatorAgents(userId: string | undefined) {
  return useQuery({
    queryKey: ["creatorAgents", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("author_id", userId)
        .eq("status", "deployed")
        .order("usage_count", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useCreatorStats(userId: string | undefined) {
  return useQuery({
    queryKey: ["creatorStats", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data: agents, error } = await supabase
        .from("agents")
        .select("usage_count, likes_count, clones_count")
        .eq("author_id", userId)
        .eq("status", "deployed");

      if (error) throw error;
      
      const totalUsage = agents?.reduce((sum, a) => sum + (a.usage_count || 0), 0) || 0;
      const totalLikes = agents?.reduce((sum, a) => sum + (a.likes_count || 0), 0) || 0;
      const totalClones = agents?.reduce((sum, a) => sum + (a.clones_count || 0), 0) || 0;
      
      return {
        agentCount: agents?.length || 0,
        totalUsage,
        totalLikes,
        totalClones,
      };
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<CreatorProfile>) => {
      if (!user?.id) throw new Error("未登录");
      
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creatorProfile", user?.id] });
      toast({ title: "个人资料已更新" });
    },
    onError: (error) => {
      toast({
        title: "更新失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
