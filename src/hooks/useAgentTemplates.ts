import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export interface AgentTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  icon_id: string;
  color: string;
  bg_gradient: string | null;
  department: string | null;
  system_prompt: string;
  model: string;
  suggested_skill_categories: string[];
  personality_config: Record<string, unknown>;
  mplp_policy: string;
  usage_count: number;
  rating: number;
  is_featured: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Fetch all active templates
export function useAgentTemplates() {
  return useQuery({
    queryKey: ["agent-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_templates")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data as AgentTemplate[];
    },
  });
}

// Fetch featured templates only
export function useFeaturedTemplates(limit = 8) {
  return useQuery({
    queryKey: ["agent-templates", "featured", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_templates")
        .select("*")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("usage_count", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AgentTemplate[];
    },
  });
}

// Fetch templates by category
export function useTemplatesByCategory(category: string) {
  return useQuery({
    queryKey: ["agent-templates", "category", category],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_templates")
        .select("*")
        .eq("is_active", true)
        .eq("category", category)
        .order("usage_count", { ascending: false });

      if (error) throw error;
      return data as AgentTemplate[];
    },
    enabled: !!category,
  });
}

// Get all unique categories
export function useTemplateCategories() {
  return useQuery({
    queryKey: ["agent-templates", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_templates")
        .select("category")
        .eq("is_active", true);

      if (error) throw error;

      const categories = [...new Set(data.map((t) => t.category))];
      return categories;
    },
  });
}

// Clone template to create a new agent
export function useCloneTemplate() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({
      templateId,
      templateKey,
    }: {
      templateId?: string;
      templateKey?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "clone-template-agent",
        {
          body: { templateId, templateKey },
        }
      );

      if (error) throw error;
      return data as { success: boolean; agentId: string; agentName: string; message: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["my-agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent-templates"] });
      toast.success(data.message || "智能体创建成功！");
    },
    onError: (error: Error) => {
      console.error("Clone template error:", error);
      toast.error("创建失败，请重试");
    },
  });
}

// Hook for using template and navigating to chat
export function useQuickStartTemplate() {
  const cloneMutation = useCloneTemplate();
  const navigate = useNavigate();

  const startFromTemplate = async (template: AgentTemplate) => {
    try {
      const result = await cloneMutation.mutateAsync({
        templateId: template.id,
      });
      
      if (result.success && result.agentId) {
        // Navigate to chat with the new agent
        navigate(`/chat/${result.agentId}`);
      }
    } catch (error) {
      console.error("Failed to start from template:", error);
    }
  };

  return {
    startFromTemplate,
    isLoading: cloneMutation.isPending,
  };
}
