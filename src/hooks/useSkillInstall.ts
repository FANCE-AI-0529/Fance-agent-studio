import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

export type SkillInstall = Tables<"skill_installs">;

// Fetch user's installed skills
export function useMyInstalledSkills() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["skill_installs", "my", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("skill_installs")
        .select(`
          *,
          skill:skills(*)
        `)
        .eq("user_id", user.id)
        .order("installed_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Check if user has installed a specific skill
export function useIsSkillInstalled(skillId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["skill_installs", "check", skillId, user?.id],
    queryFn: async () => {
      if (!user) return false;

      const { data, error } = await supabase
        .from("skill_installs")
        .select("id")
        .eq("skill_id", skillId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!skillId,
  });
}

// Install a skill
export function useInstallSkill() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (skillId: string) => {
      if (!user) throw new Error("用户未登录");

      const { error } = await supabase.rpc("install_skill", {
        p_skill_id: skillId,
      });

      if (error) throw error;
    },
    onSuccess: (_, skillId) => {
      queryClient.invalidateQueries({ queryKey: ["skill_installs"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      toast({ title: "安装成功", description: "技能已添加到你的工具箱" });
    },
    onError: (error) => {
      toast({ title: "安装失败", description: error.message, variant: "destructive" });
    },
  });
}

// Uninstall a skill
export function useUninstallSkill() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (skillId: string) => {
      if (!user) throw new Error("用户未登录");

      const { error } = await supabase
        .from("skill_installs")
        .delete()
        .eq("skill_id", skillId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill_installs"] });
      toast({ title: "已卸载", description: "技能已从你的工具箱移除" });
    },
    onError: (error) => {
      toast({ title: "卸载失败", description: error.message, variant: "destructive" });
    },
  });
}
