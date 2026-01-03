import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

export type SkillRating = Tables<"skill_ratings">;

// Fetch ratings for a skill
export function useSkillRatings(skillId: string) {
  return useQuery({
    queryKey: ["skill_ratings", skillId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_ratings")
        .select("*")
        .eq("skill_id", skillId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!skillId,
  });
}

// Get user's rating for a skill
export function useMySkillRating(skillId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["skill_ratings", "my", skillId, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("skill_ratings")
        .select("*")
        .eq("skill_id", skillId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!skillId,
  });
}

// Submit or update a rating
export function useSubmitRating() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      skillId,
      rating,
      review,
    }: {
      skillId: string;
      rating: number;
      review?: string;
    }) => {
      if (!user) throw new Error("用户未登录");

      const { error } = await supabase.rpc("submit_skill_rating", {
        p_skill_id: skillId,
        p_rating: rating,
        p_review: review || null,
      });

      if (error) throw error;
    },
    onSuccess: (_, { skillId }) => {
      queryClient.invalidateQueries({ queryKey: ["skill_ratings", skillId] });
      queryClient.invalidateQueries({ queryKey: ["skill_ratings", "my", skillId] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast({ title: "评价成功", description: "感谢你的反馈！" });
    },
    onError: (error) => {
      toast({ title: "评价失败", description: error.message, variant: "destructive" });
    },
  });
}

// Delete user's rating
export function useDeleteRating() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (skillId: string) => {
      if (!user) throw new Error("用户未登录");

      const { error } = await supabase
        .from("skill_ratings")
        .delete()
        .eq("skill_id", skillId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: (_, skillId) => {
      queryClient.invalidateQueries({ queryKey: ["skill_ratings", skillId] });
      queryClient.invalidateQueries({ queryKey: ["skill_ratings", "my", skillId] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast({ title: "已删除评价" });
    },
    onError: (error) => {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    },
  });
}
