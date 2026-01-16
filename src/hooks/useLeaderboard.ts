/**
 * @file useLeaderboard.ts
 * @description 排行榜钩子，提供创作者和智能体的多维度排名数据查询
 * @module Hooks/Leaderboard
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * 排行榜时间周期类型
 */
export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "all";

/**
 * 排行榜排序维度类型
 */
export type LeaderboardType = "usage" | "likes" | "followers" | "agents";

/**
 * 排行榜条目接口
 * 
 * 定义排行榜中单个条目的数据结构。
 */
export interface LeaderboardEntry {
  /** 排名位次 */
  rank: number;
  /** 用户ID */
  userId: string;
  /** 用户显示名称 */
  displayName: string | null;
  /** 用户头像URL */
  avatarUrl: string | null;
  /** 是否已认证 */
  isVerified: boolean;
  /** 排名数值 */
  value: number;
  /** 智能体数量 */
  agentCount?: number;
  /** 排名趋势 */
  trend?: "up" | "down" | "same";
}

/**
 * 获取时间周期过滤条件
 * 
 * 根据周期类型计算起始时间戳。
 * 
 * @param {LeaderboardPeriod} period - 时间周期
 * @returns {string | null} - ISO格式的起始时间戳，"all"返回null
 */
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

/**
 * 创作者排行榜钩子
 * 
 * 查询创作者的多维度排名数据，支持按使用量、点赞数、粉丝数或作品数排序。
 * 
 * @param {LeaderboardPeriod} period - 时间周期，默认"weekly"
 * @param {LeaderboardType} type - 排序维度，默认"usage"
 * @param {number} limit - 返回条目数，默认50
 * @returns {UseQueryResult} - 包含排行榜数据的查询结果
 * 
 * @example
 * ```tsx
 * const { data: leaderboard, isLoading } = useCreatorLeaderboard('weekly', 'likes', 20);
 * ```
 */
export function useCreatorLeaderboard(
  period: LeaderboardPeriod = "weekly",
  type: LeaderboardType = "usage",
  limit: number = 50
) {
  return useQuery({
    queryKey: ["leaderboard", "creators", period, type, limit],
    queryFn: async () => {
      const periodFilter = getPeriodFilter(period);
      
      // [查询]：获取已部署智能体及其作者信息
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

      // [时间过滤]：应用周期条件
      if (periodFilter) {
        query = query.gte("created_at", periodFilter);
      }

      const { data: agents, error } = await query;
      
      if (error) throw error;
      
      // [聚合统计]：按作者ID汇总各项指标
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
        const existing = authorStats.get(agent.author_id);
        
        const profile = agent.profiles as unknown as Record<string, unknown>;
        if (existing) {
          // [累加]：更新已存在作者的统计
          existing.totalUsage += agent.usage_count || 0;
          existing.totalLikes += agent.likes_count || 0;
          existing.agentCount += 1;
        } else {
          // [新建]：创建作者统计记录
          authorStats.set(agent.author_id, {
            userId: agent.author_id,
            displayName: profile.display_name as string | null,
            avatarUrl: profile.avatar_url as string | null,
            isVerified: (profile.is_verified as boolean) || false,
            totalUsage: agent.usage_count || 0,
            totalLikes: agent.likes_count || 0,
            followers: (profile.followers_count as number) || 0,
            agentCount: 1,
          });
        }
      });
      
      // [转换排序]：按指定维度排序
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
      
      // [构建结果]：截取并添加排名
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
        trend: "same" as const,
      }));
      
      return result;
    },
  });
}

/**
 * 智能体排行榜钩子
 * 
 * 查询智能体的使用量排名，支持按分类筛选。
 * 
 * @param {LeaderboardPeriod} period - 时间周期，默认"weekly"
 * @param {string} category - 分类筛选（可选）
 * @param {number} limit - 返回条目数，默认50
 * @returns {UseQueryResult} - 包含智能体排行数据的查询结果
 * 
 * @example
 * ```tsx
 * const { data: agentRanking } = useAgentLeaderboard('monthly', 'productivity', 30);
 * ```
 */
export function useAgentLeaderboard(
  period: LeaderboardPeriod = "weekly",
  category?: string,
  limit: number = 50
) {
  return useQuery({
    queryKey: ["leaderboard", "agents", period, category, limit],
    queryFn: async () => {
      const periodFilter = getPeriodFilter(period);
      
      // [查询]：获取已部署智能体列表
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

      // [时间过滤]：应用周期条件
      if (periodFilter) {
        query = query.gte("created_at", periodFilter);
      }
      
      // [分类过滤]：应用分类条件
      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // [构建结果]：转换为排行榜格式
      return data?.map((agent, index) => {
        const profile = agent.profiles as unknown as Record<string, unknown> | null;
        return {
        rank: index + 1,
        agentId: agent.id,
        name: agent.name,
        usageCount: agent.usage_count || 0,
        likesCount: agent.likes_count || 0,
        category: agent.category,
        authorId: agent.author_id,
        authorName: profile?.display_name as string | undefined,
        authorAvatar: profile?.avatar_url as string | undefined,
        manifest: agent.manifest,
      }}) || [];
    },
  });
}
