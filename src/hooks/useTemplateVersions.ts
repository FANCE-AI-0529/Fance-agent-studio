import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { toast } from "sonner";
import type { TemplateStep } from "../components/runtime/TaskChainTemplates.tsx";
import type { Json } from "../integrations/supabase/types.ts";

export interface TemplateVersion {
  id: string;
  template_id: string;
  version_number: number;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  steps: TemplateStep[];
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
}

export function useTemplateVersions(templateId: string | null) {
  return useQuery({
    queryKey: ["template-versions", templateId],
    queryFn: async () => {
      if (!templateId) return [];

      const { data, error } = await supabase
        .from("template_versions")
        .select("*")
        .eq("template_id", templateId)
        .order("version_number", { ascending: false });

      if (error) {
        console.error("Failed to fetch template versions:", error);
        throw error;
      }

      return (data || []).map((item) => ({
        ...item,
        steps: (item.steps as unknown as TemplateStep[]) || [],
      })) as TemplateVersion[];
    },
    enabled: !!templateId,
  });
}

export function useCreateTemplateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      changeSummary,
    }: {
      templateId: string;
      changeSummary?: string;
    }) => {
      // Get current template data
      const { data: template, error: templateError } = await supabase
        .from("task_chain_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (templateError) throw templateError;

      // Get latest version number
      const { data: versions } = await supabase
        .from("template_versions")
        .select("version_number")
        .eq("template_id", templateId)
        .order("version_number", { ascending: false })
        .limit(1);

      const nextVersion = (versions?.[0]?.version_number || 0) + 1;

      // Get current user
      const { data: userData } = await supabase.auth.getUser();

      // Insert new version
      const { data, error } = await supabase
        .from("template_versions")
        .insert({
          template_id: templateId,
          version_number: nextVersion,
          name: template.name,
          description: template.description,
          category: template.category,
          icon: template.icon,
          steps: template.steps,
          change_summary: changeSummary || "手动保存版本",
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["template-versions", variables.templateId] });
      toast.success("版本已保存");
    },
    onError: (error) => {
      console.error("Failed to create version:", error);
      toast.error("保存版本失败");
    },
  });
}

export function useRestoreTemplateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      version,
    }: {
      templateId: string;
      version: TemplateVersion;
    }) => {
      const { data, error } = await supabase
        .from("task_chain_templates")
        .update({
          name: version.name,
          description: version.description as string | null,
          category: version.category as string,
          icon: version.icon as string,
          steps: version.steps as unknown as Json,
        })
        .eq("id", templateId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["custom-templates"] });
      queryClient.invalidateQueries({ queryKey: ["template-versions", variables.templateId] });
      toast.success(`已恢复到版本 ${variables.version.version_number}`);
    },
    onError: (error) => {
      console.error("Failed to restore version:", error);
      toast.error("恢复版本失败");
    },
  });
}

export function useDeleteTemplateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      versionId,
    }: {
      templateId: string;
      versionId: string;
    }) => {
      const { error } = await supabase
        .from("template_versions")
        .delete()
        .eq("id", versionId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["template-versions", variables.templateId] });
      toast.success("版本已删除");
    },
    onError: (error) => {
      console.error("Failed to delete version:", error);
      toast.error("删除版本失败");
    },
  });
}
