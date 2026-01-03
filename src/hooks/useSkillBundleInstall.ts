import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// Install all skills from a bundle
export function useInstallBundle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      bundleId,
      skillIds,
    }: {
      bundleId: string;
      skillIds: string[];
    }) => {
      if (!user) throw new Error("用户未登录");

      // Get existing installations to avoid duplicates
      const { data: existing } = await supabase
        .from("skill_installs")
        .select("skill_id")
        .eq("user_id", user.id)
        .in("skill_id", skillIds);

      const existingIds = new Set(existing?.map((e) => e.skill_id) || []);
      const newSkillIds = skillIds.filter((id) => !existingIds.has(id));

      if (newSkillIds.length > 0) {
        // Install new skills
        const installs = newSkillIds.map((skillId) => ({
          user_id: user.id,
          skill_id: skillId,
        }));

        const { error: installError } = await supabase
          .from("skill_installs")
          .insert(installs);

        if (installError) throw installError;
      }

      // Increment bundle download count using atomic RPC
      const { error: updateError } = await supabase.rpc(
        "increment_bundle_downloads",
        { p_bundle_id: bundleId }
      );

      if (updateError) {
        console.warn("Failed to increment downloads:", updateError);
      }

      return {
        installed: newSkillIds.length,
        skipped: skillIds.length - newSkillIds.length,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["skill_installs"] });
      queryClient.invalidateQueries({ queryKey: ["skill_bundles"] });

      if (result.skipped > 0 && result.installed > 0) {
        toast({
          title: "安装完成",
          description: `已安装 ${result.installed} 个能力，${result.skipped} 个已存在`,
        });
      } else if (result.installed > 0) {
        toast({
          title: "安装成功",
          description: `已安装 ${result.installed} 个能力`,
        });
      } else {
        toast({
          title: "所有能力已安装",
          description: "这些能力你都已经拥有了",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "安装失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
