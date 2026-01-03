import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface FollowUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  followers_count: number;
  following_count: number;
  followed_at?: string;
}

export function useFollowers(userId: string | undefined) {
  return useQuery({
    queryKey: ["followers", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Get follows
      const { data: follows, error: followError } = await supabase
        .from("user_follows")
        .select("follower_id, created_at")
        .eq("following_id", userId)
        .order("created_at", { ascending: false });

      if (followError) throw followError;
      if (!follows?.length) return [];
      
      // Get profiles for followers
      const followerIds = follows.map(f => f.follower_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, bio, is_verified, followers_count, following_count")
        .in("id", followerIds);

      if (profileError) throw profileError;
      
      // Merge data
      return follows.map(f => {
        const profile = profiles?.find(p => p.id === f.follower_id);
        return profile ? {
          ...profile,
          followed_at: f.created_at,
        } : null;
      }).filter(Boolean) as FollowUser[];
    },
    enabled: !!userId,
  });
}

export function useFollowing(userId: string | undefined) {
  return useQuery({
    queryKey: ["following", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      // Get follows
      const { data: follows, error: followError } = await supabase
        .from("user_follows")
        .select("following_id, created_at")
        .eq("follower_id", userId)
        .order("created_at", { ascending: false });

      if (followError) throw followError;
      if (!follows?.length) return [];
      
      // Get profiles for following
      const followingIds = follows.map(f => f.following_id);
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, bio, is_verified, followers_count, following_count")
        .in("id", followingIds);

      if (profileError) throw profileError;
      
      // Merge data
      return follows.map(f => {
        const profile = profiles?.find(p => p.id === f.following_id);
        return profile ? {
          ...profile,
          followed_at: f.created_at,
        } : null;
      }).filter(Boolean) as FollowUser[];
    },
    enabled: !!userId,
  });
}

export function useIsFollowing(targetUserId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["isFollowing", user?.id, targetUserId],
    queryFn: async () => {
      if (!user?.id || !targetUserId) return false;
      
      const { data, error } = await supabase
        .from("user_follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id && !!targetUserId && user?.id !== targetUserId,
  });
}

export function useToggleFollow() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId, isFollowing }: { targetUserId: string; isFollowing: boolean }) => {
      if (!user?.id) throw new Error("未登录");
      
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", targetUserId);
        
        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from("user_follows")
          .insert({
            follower_id: user.id,
            following_id: targetUserId,
          });
        
        if (error) throw error;
      }
      
      return !isFollowing;
    },
    onSuccess: (nowFollowing, { targetUserId }) => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing", user?.id, targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["followers", targetUserId] });
      queryClient.invalidateQueries({ queryKey: ["following", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["creatorProfile", targetUserId] });
      
      toast({
        title: nowFollowing ? "关注成功" : "已取消关注",
      });
    },
    onError: (error) => {
      toast({
        title: "操作失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useFollowCounts(userId: string | undefined) {
  return useQuery({
    queryKey: ["followCounts", userId],
    queryFn: async () => {
      if (!userId) return { followers: 0, following: 0 };
      
      const { data, error } = await supabase
        .from("profiles")
        .select("followers_count, following_count")
        .eq("id", userId)
        .single();

      if (error) throw error;
      
      return {
        followers: data?.followers_count || 0,
        following: data?.following_count || 0,
      };
    },
    enabled: !!userId,
  });
}
