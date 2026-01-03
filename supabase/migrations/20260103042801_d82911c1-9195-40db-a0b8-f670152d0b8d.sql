-- Add personality_config column to agents table for personality settings
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS personality_config JSONB DEFAULT NULL;

-- Add comment explaining the structure
COMMENT ON COLUMN public.agents.personality_config IS 'Personality configuration: {professional: 0-1, detailed: 0-1, humor: 0-1, creative: 0-1, preset: string}';

-- Create index for faster queries on preset field
CREATE INDEX IF NOT EXISTS idx_agents_personality_preset ON public.agents ((personality_config->>'preset')) WHERE personality_config IS NOT NULL;