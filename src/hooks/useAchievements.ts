// P3-05: Achievement tracking hook with database integration
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";

// Re-export types for backward compatibility
export type AchievementCategory = 
  | "creation" 
  | "exploration" 
  | "social" 
  | "mastery" 
  | "special";

export type AchievementTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  tier: AchievementTier;
  requirement: number;
  currentProgress: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  reward?: {
    type: "badge" | "title" | "points" | "feature";
    value: string | number;
  };
}

// Achievement definitions with requirements
export interface AchievementDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  levels: {
    level: number;
    requirement: number;
    description: string;
    tier: AchievementTier;
    reward: { type: "badge" | "title" | "points" | "feature"; value: string | number };
  }[];
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: "first_agent",
    name: "新手上路",
    description: "创建你的第一个 Agent",
    icon: "🎉",
    category: "creation",
    levels: [
      { level: 1, requirement: 1, description: "创建第一个 Agent", tier: "bronze", reward: { type: "points", value: 100 } },
    ],
  },
  {
    type: "agent_master",
    name: "Agent 达人",
    description: "创建多个 Agent",
    icon: "🤖",
    category: "creation",
    levels: [
      { level: 1, requirement: 3, description: "创建 3 个 Agent", tier: "bronze", reward: { type: "points", value: 200 } },
      { level: 2, requirement: 5, description: "创建 5 个 Agent", tier: "silver", reward: { type: "points", value: 300 } },
      { level: 3, requirement: 10, description: "创建 10 个 Agent", tier: "gold", reward: { type: "title", value: "Agent 大师" } },
    ],
  },
  {
    type: "popular_creator",
    name: "人气创作者",
    description: "你的 Agent 获得点赞",
    icon: "⭐",
    category: "social",
    levels: [
      { level: 1, requirement: 10, description: "获得 10 次点赞", tier: "bronze", reward: { type: "points", value: 150 } },
      { level: 2, requirement: 50, description: "获得 50 次点赞", tier: "silver", reward: { type: "points", value: 400 } },
      { level: 3, requirement: 100, description: "获得 100 次点赞", tier: "gold", reward: { type: "badge", value: "star_creator" } },
    ],
  },
  {
    type: "helpful_hero",
    name: "助人为乐",
    description: "你的 Agent 被他人使用",
    icon: "🦸",
    category: "social",
    levels: [
      { level: 1, requirement: 50, description: "被使用 50 次", tier: "bronze", reward: { type: "points", value: 200 } },
      { level: 2, requirement: 200, description: "被使用 200 次", tier: "silver", reward: { type: "points", value: 500 } },
      { level: 3, requirement: 500, description: "被使用 500 次", tier: "gold", reward: { type: "title", value: "社区英雄" } },
    ],
  },
  {
    type: "active_user",
    name: "活跃用户",
    description: "持续使用平台",
    icon: "🔥",
    category: "mastery",
    levels: [
      { level: 1, requirement: 7, description: "连续 7 天使用", tier: "bronze", reward: { type: "points", value: 150 } },
      { level: 2, requirement: 30, description: "连续 30 天使用", tier: "silver", reward: { type: "badge", value: "dedicated" } },
      { level: 3, requirement: 100, description: "累计 100 天使用", tier: "gold", reward: { type: "title", value: "铁杆用户" } },
    ],
  },
  {
    type: "clone_master",
    name: "模仿大师",
    description: "你的 Agent 被复刻",
    icon: "📋",
    category: "social",
    levels: [
      { level: 1, requirement: 5, description: "被复刻 5 次", tier: "bronze", reward: { type: "points", value: 200 } },
      { level: 2, requirement: 20, description: "被复刻 20 次", tier: "silver", reward: { type: "points", value: 400 } },
      { level: 3, requirement: 50, description: "被复刻 50 次", tier: "gold", reward: { type: "badge", value: "influencer" } },
    ],
  },
  {
    type: "skill_collector",
    name: "技能收集者",
    description: "安装不同的技能",
    icon: "🧩",
    category: "exploration",
    levels: [
      { level: 1, requirement: 5, description: "安装 5 个技能", tier: "bronze", reward: { type: "points", value: 100 } },
      { level: 2, requirement: 15, description: "安装 15 个技能", tier: "silver", reward: { type: "points", value: 300 } },
      { level: 3, requirement: 30, description: "安装 30 个技能", tier: "gold", reward: { type: "badge", value: "collector" } },
    ],
  },
  {
    type: "knowledge_builder",
    name: "知识构建者",
    description: "上传知识库文档",
    icon: "📚",
    category: "exploration",
    levels: [
      { level: 1, requirement: 5, description: "上传 5 个文档", tier: "bronze", reward: { type: "points", value: 150 } },
      { level: 2, requirement: 20, description: "上传 20 个文档", tier: "silver", reward: { type: "points", value: 350 } },
      { level: 3, requirement: 50, description: "上传 50 个文档", tier: "gold", reward: { type: "title", value: "知识大师" } },
    ],
  },
];

// Database achievement record
export interface UserAchievement {
  id: string;
  achievement_type: string;
  achievement_level: number;
  earned_at: string;
  metadata: Record<string, unknown>;
}

// Fetch user achievements
export function useUserAchievements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-achievements", user?.id],
    queryFn: async (): Promise<UserAchievement[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return (data || []) as UserAchievement[];
    },
    enabled: !!user,
  });
}

// Fetch achievement progress data
export function useAchievementProgress() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["achievement-progress", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get user's profile stats
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_agents, total_likes_received")
        .eq("id", user.id)
        .single();

      // Get total usage of user's agents
      const { data: agents } = await supabase
        .from("agents")
        .select("usage_count, clones_count")
        .eq("author_id", user.id);

      const totalUsage = agents?.reduce((sum, a) => sum + (a.usage_count || 0), 0) || 0;
      const totalClones = agents?.reduce((sum, a) => sum + (a.clones_count || 0), 0) || 0;

      // Get active days count
      const { count: activeDays } = await supabase
        .from("user_activity_log")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      return {
        totalAgents: profile?.total_agents || 0,
        totalLikes: profile?.total_likes_received || 0,
        totalUsage,
        totalClones,
        activeDays: activeDays || 0,
      };
    },
    enabled: !!user,
  });
}

// Get next achievable achievement
export function getNextAchievement(
  achievements: UserAchievement[],
  progress: { totalAgents: number; totalLikes: number; totalUsage: number; totalClones: number; activeDays?: number } | null
): { definition: AchievementDefinition; nextLevel: number; current: number; required: number } | null {
  if (!progress) return null;

  const earnedTypes = new Set(achievements.map(a => `${a.achievement_type}-${a.achievement_level}`));

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    for (const level of def.levels) {
      const key = `${def.type}-${level.level}`;
      if (earnedTypes.has(key)) continue;

      let current = 0;
      switch (def.type) {
        case "first_agent":
        case "agent_master":
          current = progress.totalAgents;
          break;
        case "popular_creator":
          current = progress.totalLikes;
          break;
        case "helpful_hero":
          current = progress.totalUsage;
          break;
        case "clone_master":
          current = progress.totalClones;
          break;
        case "active_user":
          current = progress.activeDays || 0;
          break;
        default:
          current = 0;
      }

      if (current < level.requirement) {
        return {
          definition: def,
          nextLevel: level.level,
          current,
          required: level.requirement,
        };
      }
    }
  }

  return null;
}

// Hook to log user activity
export function useLogActivity() {
  const { user } = useAuth();
  const hasLoggedRef = { current: false };

  const logActivity = async () => {
    if (!user || hasLoggedRef.current) return;
    hasLoggedRef.current = true;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from("user_activity_log")
        .upsert(
          { user_id: user.id, activity_date: today },
          { onConflict: 'user_id,activity_date', ignoreDuplicates: true }
        );
    } catch (error) {
      console.error('Activity log failed:', error);
      hasLoggedRef.current = false; // Allow retry on error
    }
  };

  return logActivity;
}

// Convert to Achievement format for display
export function formatAchievementsForDisplay(
  definitions: AchievementDefinition[],
  userAchievements: UserAchievement[],
  progress: { totalAgents: number; totalLikes: number; totalUsage: number; totalClones: number; activeDays?: number } | null
): Achievement[] {
  const earnedMap = new Map(
    userAchievements.map(a => [`${a.achievement_type}-${a.achievement_level}`, a])
  );

  const result: Achievement[] = [];

  for (const def of definitions) {
    for (const level of def.levels) {
      const key = `${def.type}-${level.level}`;
      const earned = earnedMap.get(key);

      let currentProgress = 0;
      if (progress) {
        switch (def.type) {
          case "first_agent":
          case "agent_master":
            currentProgress = progress.totalAgents;
            break;
          case "popular_creator":
            currentProgress = progress.totalLikes;
            break;
          case "helpful_hero":
            currentProgress = progress.totalUsage;
            break;
          case "clone_master":
            currentProgress = progress.totalClones;
            break;
          case "active_user":
            currentProgress = progress.activeDays || 0;
            break;
        }
      }

      result.push({
        id: key,
        name: `${def.name} ${level.level > 1 ? `Lv.${level.level}` : ""}`.trim(),
        description: level.description,
        icon: def.icon,
        category: def.category,
        tier: level.tier,
        requirement: level.requirement,
        currentProgress: Math.min(currentProgress, level.requirement),
        isUnlocked: !!earned,
        unlockedAt: earned ? new Date(earned.earned_at) : undefined,
        reward: level.reward,
      });
    }
  }

  return result;
}
