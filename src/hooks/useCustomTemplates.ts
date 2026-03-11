import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { toast } from "sonner";
import type { TemplateStep } from "../components/runtime/TaskChainTemplates.tsx";
import { Json } from "../integrations/supabase/types.ts";

export interface CustomTemplate {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  steps: TemplateStep[];
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

interface CreateTemplateInput {
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  steps: TemplateStep[];
  isShared?: boolean;
}

interface UpdateTemplateInput {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  steps?: TemplateStep[];
  isShared?: boolean;
}

export function useCustomTemplates() {
  return useQuery({
    queryKey: ["custom-templates"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        return [];
      }

      const { data, error } = await supabase
        .from("task_chain_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch custom templates:", error);
        throw error;
      }

      return (data || []).map((item) => ({
        ...item,
        steps: (item.steps as unknown as TemplateStep[]) || [],
      })) as CustomTemplate[];
    },
  });
}

export function useCreateCustomTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTemplateInput) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("task_chain_templates")
        .insert({
          user_id: userData.user.id,
          name: input.name,
          description: input.description || null,
          category: input.category || "custom",
          icon: input.icon || "FileText",
          steps: input.steps as unknown as Json,
          is_shared: input.isShared || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-templates"] });
      toast.success("模板保存成功");
    },
    onError: (error) => {
      console.error("Failed to create template:", error);
      toast.error("保存模板失败");
    },
  });
}

export function useUpdateCustomTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateTemplateInput) => {
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.icon !== undefined) updateData.icon = input.icon;
      if (input.steps !== undefined) updateData.steps = input.steps;
      if (input.isShared !== undefined) updateData.is_shared = input.isShared;

      const { data, error } = await supabase
        .from("task_chain_templates")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-templates"] });
      toast.success("模板更新成功");
    },
    onError: (error) => {
      console.error("Failed to update template:", error);
      toast.error("更新模板失败");
    },
  });
}

export function useDeleteCustomTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("task_chain_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-templates"] });
      toast.success("模板已删除");
    },
    onError: (error) => {
      console.error("Failed to delete template:", error);
      toast.error("删除模板失败");
    },
  });
}
