import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SkillVersion {
  id: string;
  skill_id: string;
  version: string;
  version_number: number;
  content: string;
  handler_code: string | null;
  config_yaml: string | null;
  change_summary: string | null;
  change_type: "create" | "update" | "publish" | "rollback";
  metadata: {
    name?: string;
    description?: string;
    permissions?: string[];
    inputs?: unknown[];
    outputs?: unknown[];
    category?: string;
  };
  created_by: string;
  created_at: string;
}

export function useSkillVersions(skillId: string | null) {
  return useQuery({
    queryKey: ["skill-versions", skillId],
    queryFn: async () => {
      if (!skillId) return [];

      const { data, error } = await supabase
        .from("skill_versions")
        .select("*")
        .eq("skill_id", skillId)
        .order("version_number", { ascending: false });

      if (error) {
        console.error("Error fetching skill versions:", error);
        throw error;
      }

      return data as SkillVersion[];
    },
    enabled: !!skillId,
  });
}

export function useRollbackSkill() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      skillId,
      versionId,
    }: {
      skillId: string;
      versionId: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // Get the version to rollback to
      const { data: version, error: versionError } = await supabase
        .from("skill_versions")
        .select("*")
        .eq("id", versionId)
        .single();

      if (versionError) throw versionError;

      // Update the skill with the version content
      const metadata = version.metadata as SkillVersion["metadata"];
      const { error: updateError } = await supabase
        .from("skills")
        .update({
          content: version.content,
          version: version.version,
          name: metadata.name,
          description: metadata.description,
          permissions: (metadata.permissions || []) as string[],
          inputs: metadata.inputs as any,
          outputs: metadata.outputs as any,
        })
        .eq("id", skillId);

      if (updateError) throw updateError;

      // Create a new version entry for the rollback
      const nextVersionNum = await supabase.rpc("get_next_skill_version_number", {
        p_skill_id: skillId,
      });

      const insertData = {
        skill_id: skillId,
        version: version.version,
        version_number: nextVersionNum.data || 1,
        content: version.content,
        handler_code: version.handler_code,
        config_yaml: version.config_yaml,
        metadata: version.metadata,
        change_type: "rollback" as const,
        change_summary: `Rolled back to version ${version.version_number}`,
        created_by: user.id,
      };

      await supabase.from("skill_versions").insert(insertData as any);

      return version;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skill-versions"] });
      queryClient.invalidateQueries({ queryKey: ["my-skills"] });
      toast.success("已回滚到选定版本");
    },
    onError: (error) => {
      toast.error(`回滚失败: ${error.message}`);
    },
  });
}

// Compare two versions and return diff info
export function compareVersions(
  v1: SkillVersion,
  v2: SkillVersion
): {
  contentChanged: boolean;
  metadataChanged: boolean;
  changes: string[];
} {
  const changes: string[] = [];
  
  const contentChanged = v1.content !== v2.content;
  if (contentChanged) {
    changes.push("内容已修改");
  }

  const m1 = v1.metadata;
  const m2 = v2.metadata;
  let metadataChanged = false;

  if (m1.name !== m2.name) {
    changes.push(`名称: ${m1.name} → ${m2.name}`);
    metadataChanged = true;
  }
  if (m1.description !== m2.description) {
    changes.push("描述已修改");
    metadataChanged = true;
  }
  if (JSON.stringify(m1.permissions) !== JSON.stringify(m2.permissions)) {
    changes.push("权限已修改");
    metadataChanged = true;
  }
  if (JSON.stringify(m1.inputs) !== JSON.stringify(m2.inputs)) {
    changes.push("输入参数已修改");
    metadataChanged = true;
  }
  if (JSON.stringify(m1.outputs) !== JSON.stringify(m2.outputs)) {
    changes.push("输出参数已修改");
    metadataChanged = true;
  }

  return { contentChanged, metadataChanged, changes };
}
