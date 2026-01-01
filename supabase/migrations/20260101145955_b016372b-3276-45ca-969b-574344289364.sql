-- Create table for LLM provider configurations
CREATE TABLE public.llm_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Provider info
  name TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- 'openai', 'anthropic', 'google', 'azure', 'custom'
  display_name TEXT NOT NULL,
  
  -- API configuration
  api_endpoint TEXT NOT NULL,
  api_key_name TEXT NOT NULL, -- Reference to secret name
  
  -- Available models for this provider
  available_models JSONB DEFAULT '[]'::jsonb,
  default_model TEXT,
  
  -- Provider-specific settings
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for model routing configurations per agent/module
CREATE TABLE public.llm_model_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Context: which agent/module this config applies to
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL, -- 'agent_chat', 'skill_generation', 'entity_extraction', 'task_delegation', etc.
  
  -- Model configuration
  provider_id UUID NOT NULL REFERENCES public.llm_providers(id) ON DELETE CASCADE,
  model_name TEXT NOT NULL,
  
  -- Model parameters
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 4096,
  top_p NUMERIC DEFAULT 1.0,
  frequency_penalty NUMERIC DEFAULT 0,
  presence_penalty NUMERIC DEFAULT 0,
  
  -- Additional settings
  system_prompt_override TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0, -- For fallback ordering
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique config per agent/module combination
  UNIQUE(agent_id, module_type)
);

-- Create table for tracking LLM usage and costs
CREATE TABLE public.llm_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.llm_providers(id) ON DELETE SET NULL,
  
  -- Request details
  module_type TEXT NOT NULL,
  model_name TEXT NOT NULL,
  
  -- Usage metrics
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  latency_ms INTEGER,
  
  -- Cost tracking (if available)
  estimated_cost NUMERIC,
  
  -- Status
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.llm_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_model_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for llm_providers
CREATE POLICY "Users can view their own providers"
  ON public.llm_providers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own providers"
  ON public.llm_providers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own providers"
  ON public.llm_providers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own providers"
  ON public.llm_providers FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for llm_model_configs
CREATE POLICY "Users can view their own model configs"
  ON public.llm_model_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own model configs"
  ON public.llm_model_configs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own model configs"
  ON public.llm_model_configs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own model configs"
  ON public.llm_model_configs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for usage logs
CREATE POLICY "Users can view their own usage logs"
  ON public.llm_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own usage logs"
  ON public.llm_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_llm_providers_user_id ON public.llm_providers(user_id);
CREATE INDEX idx_llm_model_configs_agent_id ON public.llm_model_configs(agent_id);
CREATE INDEX idx_llm_model_configs_module_type ON public.llm_model_configs(module_type);
CREATE INDEX idx_llm_usage_logs_created_at ON public.llm_usage_logs(created_at DESC);
CREATE INDEX idx_llm_usage_logs_agent_id ON public.llm_usage_logs(agent_id);

-- Triggers for updated_at
CREATE TRIGGER update_llm_providers_updated_at
  BEFORE UPDATE ON public.llm_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_llm_model_configs_updated_at
  BEFORE UPDATE ON public.llm_model_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();