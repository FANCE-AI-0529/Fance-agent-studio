import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "./use-toast.ts";
import type { Tables, TablesInsert } from "../integrations/supabase/types.ts";

export type SkillBundle = Tables<"skill_bundles">;
export type SkillBundleInsert = TablesInsert<"skill_bundles">;

// Fetch all bundles
export function useSkillBundles() {
  return useQuery({
    queryKey: ["skill_bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_bundles")
        .select("*")
        .order("downloads_count", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

// Fetch featured bundles
export function useFeaturedBundles(limit = 4) {
  return useQuery({
    queryKey: ["skill_bundles", "featured", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skill_bundles")
        .select("*")
        .eq("is_featured", true)
        .order("downloads_count", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    },
  });
}

// Fetch user's bundles
export function useMyBundles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["skill_bundles", "my", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("skill_bundles")
        .select("*")
        .eq("author_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Create a bundle
export function useCreateBundle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (bundle: Omit<SkillBundleInsert, "author_id">) => {
      if (!user) throw new Error("用户未登录");

      const { data, error } = await supabase
        .from("skill_bundles")
        .insert({ ...bundle, author_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill_bundles"] });
      toast({ title: "创建成功", description: "能力包已创建" });
    },
    onError: (error) => {
      toast({ title: "创建失败", description: error.message, variant: "destructive" });
    },
  });
}

// Update a bundle
export function useUpdateBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SkillBundle> & { id: string }) => {
      const { data, error } = await supabase
        .from("skill_bundles")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill_bundles"] });
      toast({ title: "更新成功", description: "能力包已更新" });
    },
    onError: (error) => {
      toast({ title: "更新失败", description: error.message, variant: "destructive" });
    },
  });
}

// Delete a bundle
export function useDeleteBundle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("skill_bundles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill_bundles"] });
      toast({ title: "删除成功", description: "能力包已删除" });
    },
    onError: (error) => {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    },
  });
}
