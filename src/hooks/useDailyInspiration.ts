import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";

export interface DailyInspiration {
  id: string;
  title: string;
  description: string | null;
  story_content: string | null;
  image_url: string | null;
  agent_id: string | null;
  category: string;
  featured_date: string | null;
  view_count: number;
  created_at: string;
}

// Default inspiration content for when database is empty
const defaultInspirations: DailyInspiration[] = [
  {
    id: "default-1",
    title: "用 AI 助手自动整理会议纪要",
    description: "一位产品经理分享了如何用 AI 助手将 2 小时的会议录音变成结构化的任务清单",
    story_content: "「以前每次开完会都要花 1 小时整理笔记，现在 AI 助手 5 分钟就搞定了，还能自动分配任务给对应的同事。」",
    image_url: null,
    agent_id: null,
    category: "效率提升",
    featured_date: new Date().toISOString().split("T")[0],
    view_count: 1234,
    created_at: new Date().toISOString(),
  },
  {
    id: "default-2",
    title: "让 AI 成为你的私人健身教练",
    description: "健身爱好者创建了一个能根据身体状态调整训练计划的 AI 教练",
    story_content: "「它不仅记住我所有的训练数据，还能根据我今天的状态推荐最适合的训练强度。」",
    image_url: null,
    agent_id: null,
    category: "生活助手",
    featured_date: new Date().toISOString().split("T")[0],
    view_count: 892,
    created_at: new Date().toISOString(),
  },
  {
    id: "default-3",
    title: "用 AI 助手学习新语言",
    description: "语言学习者用 AI 创建了一个 24/7 在线的口语练习伙伴",
    story_content: "「不用担心说错，AI 会耐心纠正我的发音和语法，比真人老师还有耐心。」",
    image_url: null,
    agent_id: null,
    category: "学习成长",
    featured_date: new Date().toISOString().split("T")[0],
    view_count: 756,
    created_at: new Date().toISOString(),
  },
];

export function useDailyInspiration(limit: number = 3) {
  return useQuery({
    queryKey: ["daily-inspiration", limit],
    queryFn: async (): Promise<DailyInspiration[]> => {
      try {
        const today = new Date().toISOString().split("T")[0];
        
        // Try to get today's featured content first
        const { data: featured, error: featuredError } = await supabase
          .from("daily_inspiration")
          .select("*")
          .eq("featured_date", today)
          .limit(limit);

        if (!featuredError && featured && featured.length > 0) {
          return featured as DailyInspiration[];
        }

        // Fall back to most recent content
        const { data: recent, error: recentError } = await supabase
          .from("daily_inspiration")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (!recentError && recent && recent.length > 0) {
          return recent as DailyInspiration[];
        }

        // Return default content if database is empty
        return defaultInspirations.slice(0, limit);
      } catch (error) {
        console.error('Failed to fetch inspiration:', error);
        // Always return default content on error
        return defaultInspirations.slice(0, limit);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export function useIncrementInspirationView() {
  return async (inspirationId: string) => {
    // Don't increment for default content
    if (inspirationId.startsWith("default-")) return;
    
    // Increment view count using raw SQL increment
    const { data } = await supabase
      .from("daily_inspiration")
      .select("view_count")
      .eq("id", inspirationId)
      .single();
    
    if (data) {
      await supabase
        .from("daily_inspiration")
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq("id", inspirationId);
    }
  };
}
