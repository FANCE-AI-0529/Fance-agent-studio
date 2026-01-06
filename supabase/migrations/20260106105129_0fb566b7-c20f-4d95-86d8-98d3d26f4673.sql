-- Add unique constraint for llm_model_configs upsert to work properly
-- This constraint ensures (user_id, agent_id, module_type) is unique
-- Using NULLS NOT DISTINCT to handle NULL agent_id values correctly

CREATE UNIQUE INDEX IF NOT EXISTS llm_model_configs_user_agent_module_unique 
ON public.llm_model_configs (user_id, COALESCE(agent_id, '00000000-0000-0000-0000-000000000000'::uuid), module_type);