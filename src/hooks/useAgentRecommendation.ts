import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RecommendedAgent {
  id: string;
  name: string;
  category: string | null;
  department: string | null;
  tags: string[] | null;
  rating: number | null;
  usage_count: number | null;
  matchScore: number;
  reason: string;
  recentlyUsed?: boolean;
  popularInCategory?: boolean;
}

interface UseAgentRecommendationReturn {
  recommendations: RecommendedAgent[];
  isLoading: boolean;
  error: string | null;
  fetchRecommendations: () => Promise<void>;
  getPersonalizedRecommendations: (userContext?: string) => Promise<void>;
}

// Category affinity weights based on user behavior
const categoryWeights: Record<string, string[]> = {
  "文案写作": ["营销推广", "创意设计"],
  "数据分析": ["代码开发", "教育辅导"],
  "代码开发": ["数据分析", "教育辅导"],
  "客服支持": ["营销推广", "翻译语言"],
  "翻译语言": ["客服支持", "文案写作"],
  "营销推广": ["文案写作", "创意设计"],
  "教育辅导": ["数据分析", "翻译语言"],
  "创意设计": ["文案写作", "营销推广"],
};

export function useAgentRecommendation(): UseAgentRecommendationReturn {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendedAgent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's usage history from agent_likes as a proxy for engagement
  const fetchUserHistory = useCallback(async () => {
    if (!user) return { recentAgentIds: [] as string[], categoryPreferences: {} as Record<string, number> };

    try {
      // Get liked agents as a proxy for user preferences
      const { data: likes } = await supabase
        .from("agent_likes")
        .select("agent_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const recentAgentIds = likes?.map(l => l.agent_id).filter(Boolean) as string[] || [];
      
      // Calculate category preferences from history
      if (recentAgentIds.length === 0) {
        return { recentAgentIds: [], categoryPreferences: {} as Record<string, number> };
      }

      const { data: agents } = await supabase
        .from("agents")
        .select("id, category")
        .in("id", recentAgentIds);

      const categoryPreferences: Record<string, number> = {};
      agents?.forEach(agent => {
        if (agent.category) {
          categoryPreferences[agent.category] = (categoryPreferences[agent.category] || 0) + 1;
        }
      });

      return { recentAgentIds, categoryPreferences };
    } catch (err) {
      console.error("Error fetching user history:", err);
      return { recentAgentIds: [] as string[], categoryPreferences: {} as Record<string, number> };
    }
  }, [user]);

  // Main recommendation algorithm
  const fetchRecommendations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { recentAgentIds, categoryPreferences } = await fetchUserHistory();

      // Fetch all published agents (using public_agents view)
      const { data: agents, error: fetchError } = await supabase
        .from("agents")
        .select("id, name, category, department, tags, rating, usage_count")
        .eq("status", "published")
        .order("usage_count", { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;
      if (!agents) {
        setRecommendations([]);
        return;
      }

      // Calculate recommendation scores
      const scored = agents.map(agent => {
        let score = 0;
        const reasons: string[] = [];

        // Base popularity score (0-20 points)
        const popularityScore = Math.min(20, (agent.usage_count || 0) / 50);
        score += popularityScore;

        // Rating bonus (0-15 points)
        if (agent.rating) {
          score += agent.rating * 3;
          if (agent.rating >= 4.5) {
            reasons.push("高评分");
          }
        }

        // Category preference match (0-30 points)
        if (agent.category && categoryPreferences[agent.category]) {
          const prefScore = Math.min(30, categoryPreferences[agent.category] * 10);
          score += prefScore;
          reasons.push("符合你的使用偏好");
        }

        // Related category bonus (0-15 points)
        const topCategories = Object.entries(categoryPreferences)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 2)
          .map(([cat]) => cat);

        for (const topCat of topCategories) {
          const relatedCats = categoryWeights[topCat] || [];
          if (agent.category && relatedCats.includes(agent.category)) {
            score += 15;
            reasons.push("与你常用类别相关");
            break;
          }
        }

        // Recently used penalty (avoid recommending same agents)
        const recentlyUsed = recentAgentIds.includes(agent.id);
        if (recentlyUsed) {
          score -= 10;
        }

        // Popular in same department bonus
        const popularInCategory = (agent.usage_count || 0) > 100;
        if (popularInCategory) {
          reasons.push("热门推荐");
        }

        return {
          ...agent,
          matchScore: Math.max(0, Math.round(score)),
          reason: reasons.length > 0 ? reasons.join("，") : "智能推荐",
          recentlyUsed,
          popularInCategory,
        };
      });

      // Sort by score and filter out recently used
      const topRecommendations = scored
        .filter(a => !a.recentlyUsed)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 8);

      setRecommendations(topRecommendations);
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError("获取推荐失败");
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserHistory]);

  // Context-aware recommendations (e.g., based on current task description)
  const getPersonalizedRecommendations = useCallback(async (userContext?: string) => {
    if (!userContext) {
      return fetchRecommendations();
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: agents, error: fetchError } = await supabase
        .from("agents")
        .select("id, name, category, department, tags, rating, usage_count")
        .eq("status", "published")
        .limit(100);

      if (fetchError) throw fetchError;
      if (!agents) {
        setRecommendations([]);
        return;
      }

      const contextLower = userContext.toLowerCase();

      // Score based on context matching
      const scored = agents.map(agent => {
        let score = 0;
        const reasons: string[] = [];

        // Name match (highest priority)
        if (agent.name.toLowerCase().includes(contextLower) || 
            contextLower.includes(agent.name.toLowerCase())) {
          score += 50;
          reasons.push("名称匹配");
        }

        // Category match
        if (agent.category && contextLower.includes(agent.category.toLowerCase())) {
          score += 30;
          reasons.push("类别匹配");
        }

        // Tags match
        if (agent.tags) {
          const matchedTags = agent.tags.filter(tag => 
            contextLower.includes(tag.toLowerCase())
          );
          if (matchedTags.length > 0) {
            score += matchedTags.length * 15;
            reasons.push(`标签匹配: ${matchedTags.slice(0, 2).join("、")}`);
          }
        }

        // Popularity bonus
        score += Math.min(10, (agent.usage_count || 0) / 100);

        return {
          ...agent,
          matchScore: Math.round(score),
          reason: reasons.length > 0 ? reasons.join("，") : "可能相关",
          recentlyUsed: false,
          popularInCategory: (agent.usage_count || 0) > 100,
        };
      });

      const contextualRecommendations = scored
        .filter(a => a.matchScore > 10)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 6);

      setRecommendations(contextualRecommendations);
    } catch (err) {
      console.error("Error fetching personalized recommendations:", err);
      setError("获取推荐失败");
    } finally {
      setIsLoading(false);
    }
  }, [fetchRecommendations]);

  return {
    recommendations,
    isLoading,
    error,
    fetchRecommendations,
    getPersonalizedRecommendations,
  };
}
