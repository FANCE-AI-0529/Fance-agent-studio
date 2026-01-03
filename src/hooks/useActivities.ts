import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  target_id: string | null;
  target_type: string | null;
  metadata: Record<string, any>;
  created_at: string;
  user?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

export function useUserActivities(userId: string | undefined, limit: number = 20) {
  return useQuery({
    queryKey: ["userActivities", userId, limit],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_activities")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Get profile separately
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", userId)
        .single();
      
      return (data || []).map(a => ({
        ...a,
        metadata: (a.metadata as Record<string, any>) || {},
        user: profile,
      })) as Activity[];
    },
    enabled: !!userId,
  });
}

export function useFeedActivities(limit: number = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["feedActivities", user?.id, limit],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Get users we follow
      const { data: following, error: followError } = await supabase
        .from("user_follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (followError) throw followError;
      
      const followingIds = following?.map(f => f.following_id) || [];
      
      if (followingIds.length === 0) return [];
      
      // Get activities from followed users
      const { data, error } = await supabase
        .from("user_activities")
        .select("*")
        .in("user_id", followingIds)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      // Get profiles for these users
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", followingIds);
      
      return (data || []).map(a => ({
        ...a,
        metadata: (a.metadata as Record<string, any>) || {},
        user: profiles?.find(p => p.id === a.user_id),
      })) as Activity[];
    },
    enabled: !!user?.id,
  });
}

export function useRecordActivity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      activityType,
      targetId,
      targetType,
      metadata = {},
    }: {
      activityType: string;
      targetId?: string;
      targetType?: string;
      metadata?: Record<string, any>;
    }) => {
      if (!user?.id) throw new Error("未登录");
      
      const { error } = await supabase
        .from("user_activities")
        .insert({
          user_id: user.id,
          activity_type: activityType,
          target_id: targetId || null,
          target_type: targetType || null,
          metadata,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userActivities", user?.id] });
    },
  });
}

export function formatActivityText(activity: Activity): string {
  const { activity_type, metadata } = activity;
  
  switch (activity_type) {
    case "create_agent":
      return `创建了 Agent "${metadata.agent_name || "未命名"}"`;
    case "publish_agent":
      return `发布了 Agent "${metadata.agent_name || "未命名"}"`;
    case "publish_skill":
      return `发布了技能 "${metadata.skill_name || "未命名"}"`;
    case "earn_achievement":
      return `获得了成就 "${metadata.achievement_name || "未知"}"`;
    case "clone_agent":
      return `克隆了 Agent "${metadata.agent_name || "未命名"}"`;
    case "like_agent":
      return `点赞了 Agent "${metadata.agent_name || "未命名"}"`;
    case "follow_user":
      return `关注了 ${metadata.followed_name || "用户"}`;
    default:
      return activity_type;
  }
}
