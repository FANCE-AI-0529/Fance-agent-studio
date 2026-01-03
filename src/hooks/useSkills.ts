import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Skill = Tables<"skills">;
export type SkillInsert = TablesInsert<"skills">;
export type SkillUpdate = TablesUpdate<"skills">;

// Fetch all published skills (for marketplace)
export function usePublishedSkills() {
  return useQuery({
    queryKey: ["skills", "published"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("is_published", true)
        .order("downloads_count", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Fetch user's own skills (for Foundry)
export function useMySkills() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["skills", "my", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("author_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Create a new skill
export function useCreateSkill() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (skill: Omit<SkillInsert, "author_id">) => {
      if (!user) throw new Error("用户未登录");

      const { data, error } = await supabase
        .from("skills")
        .insert({ ...skill, author_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast({ title: "创建成功", description: "技能已创建" });
    },
    onError: (error) => {
      toast({ title: "创建失败", description: error.message, variant: "destructive" });
    },
  });
}

// Update a skill
export function useUpdateSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SkillUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("skills")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast({ title: "保存成功", description: "技能已更新" });
    },
    onError: (error) => {
      toast({ title: "保存失败", description: error.message, variant: "destructive" });
    },
  });
}

// Publish a skill
export function usePublishSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("skills")
        .update({ is_published: true })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast({ title: "发布成功", description: `${data.name} 已发布到技能市场` });
    },
    onError: (error) => {
      toast({ title: "发布失败", description: error.message, variant: "destructive" });
    },
  });
}

// Delete a skill
export function useDeleteSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("skills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast({ title: "删除成功", description: "技能已删除" });
    },
    onError: (error) => {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    },
  });
}
