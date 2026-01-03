import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TrendingAgent {
  id: string;
  name: string;
  department: string | null;
  category: string | null;
  tags: string[] | null;
  usage_count: number;
  likes_count: number;
  clones_count: number;
  rating: number;
  is_featured: boolean;
  manifest: Record<string, unknown> | null;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
  author_id: string | null;
  is_liked?: boolean;
}

type SortBy = "usage" | "likes" | "recent" | "rating";

export function useTrendingAgents(sortBy: SortBy = "usage", limit: number = 10) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trending-agents", sortBy, limit, user?.id],
    queryFn: async (): Promise<TrendingAgent[]> => {
      // Fetch trending agents from view
      const { data: agents, error } = await supabase
        .from("trending_agents")
        .select("*")
        .limit(limit);

      if (error) throw error;

      // If user is logged in, check which agents they've liked
      let likedAgentIds: Set<string> = new Set();
      if (user) {
        const { data: likes } = await supabase
          .from("agent_likes")
          .select("agent_id")
          .eq("user_id", user.id);
        
        if (likes) {
          likedAgentIds = new Set(likes.map(l => l.agent_id));
        }
      }

      // Sort based on sortBy parameter
      let sortedAgents = [...(agents || [])];
      switch (sortBy) {
        case "likes":
          sortedAgents.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
          break;
        case "recent":
          sortedAgents.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          break;
        case "rating":
          sortedAgents.sort((a, b) => (b.rating || 0) - (a.rating || 0));
          break;
        case "usage":
        default:
          sortedAgents.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
          break;
      }

      return sortedAgents.map(agent => ({
        ...agent,
        is_liked: likedAgentIds.has(agent.id),
      })) as TrendingAgent[];
    },
  });
}

export function useFeaturedAgents(limit: number = 5) {
  return useQuery({
    queryKey: ["featured-agents", limit],
    queryFn: async (): Promise<TrendingAgent[]> => {
      const { data, error } = await supabase
        .from("trending_agents")
        .select("*")
        .eq("is_featured", true)
        .limit(limit);

      if (error) throw error;
      return (data || []) as TrendingAgent[];
    },
  });
}

export function useToggleAgentLike() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (agentId: string) => {
      if (!user) {
        throw new Error("请先登录");
      }

      const { data, error } = await supabase.rpc("toggle_agent_like", {
        target_agent_id: agentId,
      });

      if (error) throw error;
      return { agentId, isLiked: data as boolean };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["trending-agents"] });
      toast.success(result.isLiked ? "已点赞" : "已取消点赞");
    },
    onError: (error: Error) => {
      toast.error(error.message || "操作失败");
    },
  });
}
