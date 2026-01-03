import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CommunityStats {
  total_agents: number;
  total_creators: number;
  total_conversations: number;
  daily_active_sessions: number;
}

export function useCommunityStats() {
  return useQuery({
    queryKey: ["community-stats"],
    queryFn: async (): Promise<CommunityStats> => {
      const { data, error } = await supabase
        .from("community_stats")
        .select("*")
        .single();

      if (error) {
        // Return default stats if view is empty
        return {
          total_agents: 0,
          total_creators: 0,
          total_conversations: 0,
          daily_active_sessions: 0,
        };
      }

      return {
        total_agents: Number(data?.total_agents) || 0,
        total_creators: Number(data?.total_creators) || 0,
        total_conversations: Number(data?.total_conversations) || 0,
        daily_active_sessions: Number(data?.daily_active_sessions) || 0,
      };
    },
    // Refresh every 5 minutes
    staleTime: 5 * 60 * 1000,
  });
}
