import { useState, useCallback } from "react";
import { supabase } from "../integrations/supabase/client.ts";

interface RecommendedSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  matchScore: number;
  reason: string;
  popularityNote?: string;
}

interface UseSkillRecommendationsReturn {
  recommendations: RecommendedSkill[];
  isLoading: boolean;
  error: string | null;
  getRecommendations: (description: string, existingSkillIds?: string[]) => Promise<void>;
  clearRecommendations: () => void;
}

// Category keywords for matching
const categoryKeywords: Record<string, string[]> = {
  "文案写作": ["写作", "文案", "文章", "内容", "创作", "编辑", "小红书", "公众号", "文字", "博客", "广告"],
  "数据分析": ["数据", "分析", "统计", "报表", "Excel", "图表", "洞察", "指标", "趋势"],
  "代码开发": ["代码", "编程", "开发", "程序", "技术", "API", "软件", "编码", "debug"],
  "客服支持": ["客服", "支持", "服务", "回复", "咨询", "答疑", "帮助", "问题"],
  "翻译语言": ["翻译", "语言", "英语", "中文", "多语言", "本地化", "转换"],
  "营销推广": ["营销", "推广", "广告", "市场", "品牌", "SEO", "流量", "转化"],
  "教育辅导": ["教育", "学习", "辅导", "教学", "培训", "课程", "知识", "解答"],
  "创意设计": ["设计", "创意", "UI", "视觉", "美工", "图片", "配色", "排版"]
};

// Popularity data (simulated)
const skillPopularity: Record<string, number> = {
  "文案助手": 85,
  "数据分析": 72,
  "代码审查": 68,
  "客服回复": 80,
  "翻译助手": 75
};

export function useSkillRecommendations(): UseSkillRecommendationsReturn {
  const [recommendations, setRecommendations] = useState<RecommendedSkill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecommendations = useCallback(async (
    description: string,
    existingSkillIds: string[] = []
  ) => {
    if (!description.trim()) {
      setRecommendations([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch available skills from database
      const { data: skills, error: fetchError } = await supabase
        .from("skills")
        .select("id, name, description, category")
        .eq("is_published", true)
        .not("id", "in", `(${existingSkillIds.join(",")})`)
        .limit(50);

      if (fetchError) throw fetchError;

      if (!skills || skills.length === 0) {
        setRecommendations([]);
        return;
      }

      // Calculate match scores based on description
      const descLower = description.toLowerCase();
      const scored = skills.map(skill => {
        let score = 0;
        const reasons: string[] = [];

        // Check category keywords
        const category = skill.category || "其他";
        const keywords = categoryKeywords[category] || [];
        const matchedKeywords = keywords.filter(kw => descLower.includes(kw));
        
        if (matchedKeywords.length > 0) {
          score += matchedKeywords.length * 20;
          reasons.push(`匹配关键词: ${matchedKeywords.slice(0, 2).join("、")}`);
        }

        // Check skill name match
        if (descLower.includes(skill.name.toLowerCase())) {
          score += 30;
          reasons.push("名称直接匹配");
        }

        // Check skill description overlap
        const skillDescLower = (skill.description || "").toLowerCase();
        const descWords = descLower.split(/\s+/).filter(w => w.length > 1);
        const overlapCount = descWords.filter(w => skillDescLower.includes(w)).length;
        if (overlapCount > 0) {
          score += overlapCount * 5;
        }

        // Add popularity note
        const popularity = skillPopularity[skill.name];
        const popularityNote = popularity 
          ? `${popularity}% 相似 Agent 都安装了这个技能` 
          : undefined;

        return {
          id: skill.id,
          name: skill.name,
          description: skill.description || "",
          category: category,
          matchScore: Math.min(score, 100),
          reason: reasons.length > 0 ? reasons.join("，") : "可能对你有帮助",
          popularityNote
        };
      });

      // Sort by score and take top recommendations
      const topRecommendations = scored
        .filter(s => s.matchScore > 10)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);

      setRecommendations(topRecommendations);
    } catch (err) {
      console.error("Error getting skill recommendations:", err);
      setError("获取技能推荐失败");
      setRecommendations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearRecommendations = useCallback(() => {
    setRecommendations([]);
    setError(null);
  }, []);

  return {
    recommendations,
    isLoading,
    error,
    getRecommendations,
    clearRecommendations
  };
}
