import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LLMProvider {
  id: string;
  user_id: string;
  name: string;
  provider_type: string;
  display_name: string;
  api_endpoint: string;
  api_key_name: string;
  available_models: any[];
  default_model: string | null;
  settings: Record<string, any>;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface LLMModelConfig {
  id: string;
  user_id: string;
  agent_id: string | null;
  module_type: string;
  provider_id: string;
  model_name: string;
  temperature: number;
  max_tokens: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  system_prompt_override: string | null;
  settings: Record<string, any>;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

// Predefined provider templates
export const PROVIDER_TEMPLATES = [
  {
    id: 'lovable',
    name: 'Lovable AI',
    provider_type: 'lovable',
    display_name: 'Lovable AI Gateway',
    api_endpoint: 'https://ai.gateway.lovable.dev/v1/chat/completions',
    api_key_name: 'LOVABLE_API_KEY',
    available_models: [
      { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: '平衡性能与成本' },
      { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: '最强推理能力' },
      { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: '最快速度' },
      { id: 'openai/gpt-5', name: 'GPT-5', description: '强大全能' },
      { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', description: '高性价比' },
      { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', description: '极速响应' },
    ],
    default_model: 'google/gemini-2.5-flash',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    provider_type: 'openai',
    display_name: 'OpenAI API',
    api_endpoint: 'https://api.openai.com/v1/chat/completions',
    api_key_name: 'OPENAI_API_KEY',
    available_models: [
      { id: 'gpt-5-2025-08-07', name: 'GPT-5', description: '旗舰模型' },
      { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini', description: '快速高效' },
      { id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1', description: '稳定可靠' },
      { id: 'gpt-4o', name: 'GPT-4o', description: '多模态' },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '快速便宜' },
    ],
    default_model: 'gpt-5-2025-08-07',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    provider_type: 'anthropic',
    display_name: 'Anthropic Claude',
    api_endpoint: 'https://api.anthropic.com/v1/messages',
    api_key_name: 'ANTHROPIC_API_KEY',
    available_models: [
      { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5', description: '最智能' },
      { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5', description: '高级推理' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: '快速响应' },
    ],
    default_model: 'claude-sonnet-4-5',
  },
  {
    id: 'google',
    name: 'Google AI',
    provider_type: 'google',
    display_name: 'Google AI Studio',
    api_endpoint: 'https://generativelanguage.googleapis.com/v1beta/chat/completions',
    api_key_name: 'GOOGLE_API_KEY',
    available_models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: '最强能力' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: '平衡选择' },
      { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: '最快速度' },
    ],
    default_model: 'gemini-2.5-flash',
  },
  {
    id: 'azure',
    name: 'Azure OpenAI',
    provider_type: 'azure',
    display_name: 'Azure OpenAI Service',
    api_endpoint: '',
    api_key_name: 'AZURE_OPENAI_API_KEY',
    available_models: [],
    default_model: '',
  },
  {
    id: 'custom',
    name: '自定义',
    provider_type: 'custom',
    display_name: '自定义 API',
    api_endpoint: '',
    api_key_name: '',
    available_models: [],
    default_model: '',
  },
];

// Module types for configuration
export const MODULE_TYPES = [
  { id: 'agent_chat', name: '智能体对话', description: '主对话功能' },
  { id: 'skill_generation', name: '技能生成', description: 'AI 生成技能模板' },
  { id: 'entity_extraction', name: '实体抽取', description: '语义图谱实体识别' },
  { id: 'task_delegation', name: '任务委派', description: '智能体任务分配' },
  { id: 'intent_detection', name: '意图检测', description: '用户意图识别' },
  { id: 'drift_detection', name: '漂移检测', description: '对话漂移分析' },
  { id: 'summarization', name: '文本摘要', description: '内容总结' },
  { id: 'translation', name: '翻译', description: '多语言翻译' },
];

// Hook to get all providers
export function useLLMProviders() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["llm-providers"],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("llm_providers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LLMProvider[];
    },
    enabled: !!user,
  });
}

// Hook to create a provider
export function useCreateLLMProvider() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      provider_type: string;
      display_name: string;
      api_endpoint: string;
      api_key_name: string;
      available_models?: any[];
      default_model?: string;
      settings?: Record<string, any>;
      is_default?: boolean;
    }) => {
      if (!user) throw new Error("User not authenticated");

      // If setting as default, unset other defaults first
      if (input.is_default) {
        await supabase
          .from("llm_providers")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      const { data, error } = await supabase
        .from("llm_providers")
        .insert({
          user_id: user.id,
          name: input.name,
          provider_type: input.provider_type,
          display_name: input.display_name,
          api_endpoint: input.api_endpoint,
          api_key_name: input.api_key_name,
          available_models: input.available_models || [],
          default_model: input.default_model || null,
          settings: input.settings || {},
          is_default: input.is_default || false,
        })
        .select()
        .single();

      if (error) throw error;
      return data as LLMProvider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-providers"] });
      toast.success("模型供应商已添加");
    },
    onError: (error) => {
      console.error("Failed to create provider:", error);
      toast.error("添加供应商失败");
    },
  });
}

// Hook to update a provider
export function useUpdateLLMProvider() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<LLMProvider> & { id: string }) => {
      // If setting as default, unset other defaults first
      if (input.is_default && user) {
        await supabase
          .from("llm_providers")
          .update({ is_default: false })
          .eq("user_id", user.id)
          .neq("id", input.id);
      }

      const { data, error } = await supabase
        .from("llm_providers")
        .update(input)
        .eq("id", input.id)
        .select()
        .single();

      if (error) throw error;
      return data as LLMProvider;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-providers"] });
      toast.success("供应商已更新");
    },
    onError: (error) => {
      console.error("Failed to update provider:", error);
      toast.error("更新供应商失败");
    },
  });
}

// Hook to delete a provider
export function useDeleteLLMProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("llm_providers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-providers"] });
      toast.success("供应商已删除");
    },
    onError: (error) => {
      console.error("Failed to delete provider:", error);
      toast.error("删除供应商失败");
    },
  });
}

// Hook to get model configs for an agent
export function useLLMModelConfigs(agentId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["llm-model-configs", agentId],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("llm_model_configs")
        .select("*, llm_providers(*)")
        .eq("user_id", user.id);

      if (agentId) {
        query = query.eq("agent_id", agentId);
      }

      const { data, error } = await query.order("module_type");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

// Hook to create/update model config
export function useUpsertLLMModelConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      agent_id: string | null;
      module_type: string;
      provider_id: string;
      model_name: string;
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      frequency_penalty?: number;
      presence_penalty?: number;
      system_prompt_override?: string;
      settings?: Record<string, any>;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("llm_model_configs")
        .upsert({
          user_id: user.id,
          agent_id: input.agent_id,
          module_type: input.module_type,
          provider_id: input.provider_id,
          model_name: input.model_name,
          temperature: input.temperature ?? 0.7,
          max_tokens: input.max_tokens ?? 4096,
          top_p: input.top_p ?? 1.0,
          frequency_penalty: input.frequency_penalty ?? 0,
          presence_penalty: input.presence_penalty ?? 0,
          system_prompt_override: input.system_prompt_override || null,
          settings: input.settings || {},
        }, {
          onConflict: 'agent_id,module_type',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["llm-model-configs", variables.agent_id] });
      toast.success("模型配置已保存");
    },
    onError: (error) => {
      console.error("Failed to save model config:", error);
      toast.error("保存配置失败");
    },
  });
}

// Hook to delete model config
export function useDeleteLLMModelConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId: string | null }) => {
      const { error } = await supabase
        .from("llm_model_configs")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, agentId };
    },
    onSuccess: ({ agentId }) => {
      queryClient.invalidateQueries({ queryKey: ["llm-model-configs", agentId] });
      toast.success("配置已删除");
    },
    onError: (error) => {
      console.error("Failed to delete config:", error);
      toast.error("删除配置失败");
    },
  });
}

// Hook to call LLM via gateway
export function useLLMCompletion() {
  return useMutation({
    mutationFn: async (input: {
      messages: Array<{ role: string; content: string }>;
      provider_id?: string;
      agent_id?: string;
      module_type?: string;
      model?: string;
      temperature?: number;
      max_tokens?: number;
      stream?: boolean;
      system_prompt?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("llm-gateway", {
        body: input,
      });

      if (error) throw error;
      return data;
    },
  });
}
