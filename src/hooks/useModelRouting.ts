import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ModelRoutingRule {
  id: string;
  user_id: string;
  agent_id: string | null;
  name: string;
  description: string | null;
  is_active: boolean;
  priority: number;
  conditions: {
    task_type?: string;
    skill_category?: string;
    input_tokens_lt?: number;
    input_tokens_gt?: number;
    risk_level?: "low" | "medium" | "high";
    keywords?: string[];
  };
  target_model: string;
  fallback_model: string | null;
  max_tokens: number | null;
  temperature: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRoutingRuleInput {
  agent_id?: string | null;
  name: string;
  description?: string;
  is_active?: boolean;
  priority?: number;
  conditions: Record<string, unknown>;
  target_model: string;
  fallback_model?: string | null;
  max_tokens?: number | null;
  temperature?: number | null;
}

// Available models for routing
export const routingModels = [
  {
    id: "google/gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "最快最便宜，适合简单任务",
    costTier: "low",
    speedTier: "fastest",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "平衡速度和质量",
    costTier: "low",
    speedTier: "fast",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "高质量多模态推理",
    costTier: "medium",
    speedTier: "medium",
  },
  {
    id: "google/gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    description: "下一代最强推理",
    costTier: "high",
    speedTier: "medium",
  },
  {
    id: "openai/gpt-5-nano",
    name: "GPT-5 Nano",
    description: "快速轻量任务",
    costTier: "low",
    speedTier: "fastest",
  },
  {
    id: "openai/gpt-5-mini",
    name: "GPT-5 Mini",
    description: "性价比首选",
    costTier: "medium",
    speedTier: "fast",
  },
  {
    id: "openai/gpt-5",
    name: "GPT-5",
    description: "最强通用能力",
    costTier: "high",
    speedTier: "slow",
  },
];

// Preset routing templates
export const routingTemplates = [
  {
    name: "翻译任务 → 轻量模型",
    description: "将翻译任务路由到最快的模型",
    conditions: { task_type: "translation" },
    target_model: "google/gemini-2.5-flash-lite",
  },
  {
    name: "代码生成 → 高性能模型",
    description: "代码任务使用强推理模型",
    conditions: { task_type: "code_generation" },
    target_model: "google/gemini-2.5-pro",
  },
  {
    name: "简单查询 → Nano模型",
    description: "短输入使用最快模型",
    conditions: { input_tokens_lt: 100 },
    target_model: "openai/gpt-5-nano",
  },
  {
    name: "高风险操作 → Pro模型",
    description: "敏感操作使用最强模型确保准确",
    conditions: { risk_level: "high" },
    target_model: "openai/gpt-5",
    fallback_model: "google/gemini-2.5-pro",
  },
];

export function useModelRoutingRules(agentId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["model-routing-rules", user?.id, agentId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("model_routing_rules")
        .select("*")
        .eq("user_id", user.id)
        .order("priority", { ascending: true });

      if (agentId) {
        query = query.or(`agent_id.eq.${agentId},agent_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching routing rules:", error);
        throw error;
      }

      return data as ModelRoutingRule[];
    },
    enabled: !!user,
  });
}

export function useCreateRoutingRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateRoutingRuleInput) => {
      if (!user) throw new Error("User not authenticated");

      const insertData = {
        user_id: user.id,
        agent_id: input.agent_id || null,
        name: input.name,
        description: input.description || null,
        is_active: input.is_active ?? true,
        priority: input.priority ?? 100,
        conditions: input.conditions,
        target_model: input.target_model,
        fallback_model: input.fallback_model || null,
        max_tokens: input.max_tokens || null,
        temperature: input.temperature || null,
      };

      const { data, error } = await supabase
        .from("model_routing_rules")
        .insert(insertData as any)
        .select()
        .single();

      if (error) throw error;
      return data as ModelRoutingRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-routing-rules"] });
      toast.success("路由规则已创建");
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });
}

export function useUpdateRoutingRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ModelRoutingRule> & { id: string }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("model_routing_rules")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as ModelRoutingRule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-routing-rules"] });
      toast.success("路由规则已更新");
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });
}

export function useDeleteRoutingRule() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("model_routing_rules")
        .delete()
        .eq("id", ruleId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["model-routing-rules"] });
      toast.success("路由规则已删除");
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
}

// Evaluate routing rules to determine which model to use
export function evaluateRoutingRules(
  rules: ModelRoutingRule[],
  context: {
    taskType?: string;
    skillCategory?: string;
    inputTokens?: number;
    riskLevel?: "low" | "medium" | "high";
    content?: string;
  }
): { model: string; fallback?: string; rule?: ModelRoutingRule } {
  const activeRules = rules.filter(r => r.is_active).sort((a, b) => a.priority - b.priority);

  for (const rule of activeRules) {
    const conditions = rule.conditions;
    let matches = true;

    // Check task type
    if (conditions.task_type && context.taskType !== conditions.task_type) {
      matches = false;
    }

    // Check skill category
    if (conditions.skill_category && context.skillCategory !== conditions.skill_category) {
      matches = false;
    }

    // Check input tokens
    if (conditions.input_tokens_lt && (context.inputTokens || 0) >= conditions.input_tokens_lt) {
      matches = false;
    }
    if (conditions.input_tokens_gt && (context.inputTokens || 0) <= conditions.input_tokens_gt) {
      matches = false;
    }

    // Check risk level
    if (conditions.risk_level && context.riskLevel !== conditions.risk_level) {
      matches = false;
    }

    // Check keywords
    if (conditions.keywords?.length && context.content) {
      const hasKeyword = conditions.keywords.some(kw => 
        context.content!.toLowerCase().includes(kw.toLowerCase())
      );
      if (!hasKeyword) {
        matches = false;
      }
    }

    if (matches) {
      return {
        model: rule.target_model,
        fallback: rule.fallback_model || undefined,
        rule,
      };
    }
  }

  // Default model if no rules match
  return { model: "google/gemini-2.5-flash" };
}
