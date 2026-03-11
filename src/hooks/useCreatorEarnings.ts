import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import type { Tables } from "../integrations/supabase/types.ts";

export type CreatorEarning = Tables<"creator_earnings">;

// Fetch creator's earnings
export function useMyEarnings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["creator_earnings", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("creator_earnings")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Get earnings statistics
export function useEarningsStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["creator_earnings", "stats", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("creator_earnings")
        .select("amount, transaction_type, created_at")
        .eq("creator_id", user.id);

      if (error) throw error;

      const totalEarnings = data.reduce((sum, e) => sum + Number(e.amount), 0);
      const thisMonth = data.filter((e) => {
        const date = new Date(e.created_at);
        const now = new Date();
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      });
      const monthlyEarnings = thisMonth.reduce((sum, e) => sum + Number(e.amount), 0);

      const byType = data.reduce((acc, e) => {
        acc[e.transaction_type] = (acc[e.transaction_type] || 0) + Number(e.amount);
        return acc;
      }, {} as Record<string, number>);

      return {
        totalEarnings,
        monthlyEarnings,
        transactionCount: data.length,
        byType,
      };
    },
    enabled: !!user,
  });
}

// Get creator's skill stats
export function useCreatorSkillStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["creator_skills", "stats", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: skills, error } = await supabase
        .from("skills")
        .select("id, name, downloads_count, rating, ratings_count, is_published")
        .eq("author_id", user.id);

      if (error) throw error;

      const totalDownloads = skills.reduce((sum, s) => sum + (s.downloads_count || 0), 0);
      const avgRating =
        skills.length > 0
          ? skills.reduce((sum, s) => sum + (s.rating || 0), 0) / skills.length
          : 0;
      const publishedCount = skills.filter((s) => s.is_published).length;

      return {
        totalSkills: skills.length,
        publishedCount,
        totalDownloads,
        avgRating: Math.round(avgRating * 10) / 10,
        skills,
      };
    },
    enabled: !!user,
  });
}
