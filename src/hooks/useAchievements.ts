import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Achievement {
  id: string;
  achievement_type: string;
  achievement_level: number;
  earned_at: string;
  metadata: Record<string, unknown>;
}

export interface AchievementDefinition {
  type: string;
  name: string;
  description: string;
  icon: string;
  levels: {
    level: number;
    requirement: number;
    description: string;
  }[];
}

// Achievement definitions
export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    type: "first_agent",
    name: "新手上路",
    description: "创建你的第一个 Agent",
    icon: "🎉",
    levels: [
      { level: 1, requirement: 1, description: "创建第一个 Agent" },
    ],
  },
  {
    type: "agent_master",
    name: "Agent 达人",
    description: "创建多个 Agent",
    icon: "🤖",
    levels: [
      { level: 1, requirement: 3, description: "创建 3 个 Agent" },
      { level: 2, requirement: 5, description: "创建 5 个 Agent" },
      { level: 3, requirement: 10, description: "创建 10 个 Agent" },
    ],
  },
  {
    type: "popular_creator",
    name: "人气创作者",
    description: "你的 Agent 获得点赞",
    icon: "⭐",
    levels: [
      { level: 1, requirement: 10, description: "获得 10 次点赞" },
      { level: 2, requirement: 50, description: "获得 50 次点赞" },
      { level: 3, requirement: 100, description: "获得 100 次点赞" },
    ],
  },
  {
    type: "helpful_hero",
    name: "助人为乐",
    description: "你的 Agent 被他人使用",
    icon: "🦸",
    levels: [
      { level: 1, requirement: 50, description: "被使用 50 次" },
      { level: 2, requirement: 200, description: "被使用 200 次" },
      { level: 3, requirement: 500, description: "被使用 500 次" },
    ],
  },
  {
    type: "active_user",
    name: "活跃用户",
    description: "持续使用平台",
    icon: "🔥",
    levels: [
      { level: 1, requirement: 7, description: "连续 7 天使用" },
      { level: 2, requirement: 30, description: "连续 30 天使用" },
      { level: 3, requirement: 100, description: "累计 100 天使用" },
    ],
  },
  {
    type: "clone_master",
    name: "模仿大师",
    description: "你的 Agent 被复刻",
    icon: "📋",
    levels: [
      { level: 1, requirement: 5, description: "被复刻 5 次" },
      { level: 2, requirement: 20, description: "被复刻 20 次" },
      { level: 3, requirement: 50, description: "被复刻 50 次" },
    ],
  },
];

export function useUserAchievements() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-achievements", user?.id],
    queryFn: async (): Promise<Achievement[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Achievement[];
    },
    enabled: !!user,
  });
}

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

export function getNextAchievement(
  achievements: Achievement[],
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

  const logActivity = async () => {
    if (!user) return;
    
    try {
      await supabase
        .from("user_activity_log")
        .insert({ user_id: user.id })
        .select()
        .single();
    } catch {
      // Ignore duplicate key errors (already logged today)
    }
  };

  return logActivity;
}
