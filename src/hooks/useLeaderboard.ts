import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "all";
export type LeaderboardType = "usage" | "likes" | "followers" | "agents";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  value: number;
  agentCount?: number;
  trend?: "up" | "down" | "same";
}

function getPeriodFilter(period: LeaderboardPeriod): string | null {
  const now = new Date();
  switch (period) {
    case "daily":
      now.setDate(now.getDate() - 1);
      return now.toISOString();
    case "weekly":
      now.setDate(now.getDate() - 7);
      return now.toISOString();
    case "monthly":
      now.setMonth(now.getMonth() - 1);
      return now.toISOString();
    case "all":
    default:
      return null;
  }
}

export function useCreatorLeaderboard(
  period: LeaderboardPeriod = "weekly",
  type: LeaderboardType = "usage",
  limit: number = 50
) {
  return useQuery({
    queryKey: ["leaderboard", "creators", period, type, limit],
    queryFn: async () => {
      const periodFilter = getPeriodFilter(period);
      
      // Get aggregated stats from agents
      let query = supabase
        .from("agents")
        .select(`
          author_id,
          usage_count,
          likes_count,
          profiles!agents_author_id_fkey (
            id,
            display_name,
            avatar_url,
            is_verified,
            followers_count,
            total_agents
          )
        `)
        .eq("status", "deployed")
        .not("author_id", "is", null);

      if (periodFilter) {
        query = query.gte("created_at", periodFilter);
      }

      const { data: agents, error } = await query;
      
      if (error) throw error;
      
      // Aggregate by author
      const authorStats = new Map<string, {
        userId: string;
        displayName: string | null;
        avatarUrl: string | null;
        isVerified: boolean;
        totalUsage: number;
        totalLikes: number;
        followers: number;
        agentCount: number;
      }>();
      
      agents?.forEach(agent => {
        if (!agent.author_id || !agent.profiles) return;
        
        const profile = agent.profiles as any;
        const existing = authorStats.get(agent.author_id);
        
        if (existing) {
          existing.totalUsage += agent.usage_count || 0;
          existing.totalLikes += agent.likes_count || 0;
          existing.agentCount += 1;
        } else {
          authorStats.set(agent.author_id, {
            userId: agent.author_id,
            displayName: profile.display_name,
            avatarUrl: profile.avatar_url,
            isVerified: profile.is_verified || false,
            totalUsage: agent.usage_count || 0,
            totalLikes: agent.likes_count || 0,
            followers: profile.followers_count || 0,
            agentCount: 1,
          });
        }
      });
      
      // Convert to array and sort
      let entries = Array.from(authorStats.values());
      
      switch (type) {
        case "usage":
          entries.sort((a, b) => b.totalUsage - a.totalUsage);
          break;
        case "likes":
          entries.sort((a, b) => b.totalLikes - a.totalLikes);
          break;
        case "followers":
          entries.sort((a, b) => b.followers - a.followers);
          break;
        case "agents":
          entries.sort((a, b) => b.agentCount - a.agentCount);
          break;
      }
      
      // Take top entries and add rank
      const result: LeaderboardEntry[] = entries.slice(0, limit).map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        displayName: entry.displayName,
        avatarUrl: entry.avatarUrl,
        isVerified: entry.isVerified,
        value: type === "usage" ? entry.totalUsage :
               type === "likes" ? entry.totalLikes :
               type === "followers" ? entry.followers :
               entry.agentCount,
        agentCount: entry.agentCount,
        trend: "same" as const, // Could compare with previous period
      }));
      
      return result;
    },
  });
}

export function useAgentLeaderboard(
  period: LeaderboardPeriod = "weekly",
  category?: string,
  limit: number = 50
) {
  return useQuery({
    queryKey: ["leaderboard", "agents", period, category, limit],
    queryFn: async () => {
      const periodFilter = getPeriodFilter(period);
      
      let query = supabase
        .from("agents")
        .select(`
          id,
          name,
          usage_count,
          likes_count,
          category,
          author_id,
          manifest,
          profiles!agents_author_id_fkey (
            display_name,
            avatar_url,
            is_verified
          )
        `)
        .eq("status", "deployed")
        .order("usage_count", { ascending: false })
        .limit(limit);

      if (periodFilter) {
        query = query.gte("created_at", periodFilter);
      }
      
      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      return data?.map((agent, index) => ({
        rank: index + 1,
        agentId: agent.id,
        name: agent.name,
        usageCount: agent.usage_count || 0,
        likesCount: agent.likes_count || 0,
        category: agent.category,
        authorId: agent.author_id,
        authorName: (agent.profiles as any)?.display_name,
        authorAvatar: (agent.profiles as any)?.avatar_url,
        manifest: agent.manifest,
      })) || [];
    },
  });
}
