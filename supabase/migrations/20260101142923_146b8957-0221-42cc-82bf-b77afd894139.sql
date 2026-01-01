-- Create agent API keys table
CREATE TABLE public.agent_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default API Key',
  api_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  rate_limit INTEGER NOT NULL DEFAULT 100, -- requests per minute
  total_calls INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_api_keys ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own API keys"
  ON public.agent_api_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys"
  ON public.agent_api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys"
  ON public.agent_api_keys FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys"
  ON public.agent_api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_agent_api_keys_api_key ON public.agent_api_keys(api_key);
CREATE INDEX idx_agent_api_keys_agent_id ON public.agent_api_keys(agent_id);

-- Create agent API call logs table for analytics
CREATE TABLE public.agent_api_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID NOT NULL REFERENCES public.agent_api_keys(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  request_body JSONB,
  response_body JSONB,
  status_code INTEGER NOT NULL DEFAULT 200,
  latency_ms INTEGER,
  tokens_used INTEGER,
  error_message TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_api_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own API logs"
  ON public.agent_api_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert API logs"
  ON public.agent_api_logs FOR INSERT
  WITH CHECK (true);

-- Index for analytics
CREATE INDEX idx_agent_api_logs_api_key_id ON public.agent_api_logs(api_key_id);
CREATE INDEX idx_agent_api_logs_created_at ON public.agent_api_logs(created_at DESC);

-- Function to generate API key
CREATE OR REPLACE FUNCTION public.generate_agent_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  key TEXT;
BEGIN
  -- Generate a secure API key with prefix
  key := 'agos_' || encode(gen_random_bytes(24), 'base64');
  -- Remove special characters
  key := replace(replace(replace(key, '+', ''), '/', ''), '=', '');
  RETURN key;
END;
$$;

-- Trigger to update total_calls
CREATE OR REPLACE FUNCTION public.increment_api_key_calls()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.agent_api_keys 
  SET total_calls = total_calls + 1,
      last_used_at = now(),
      updated_at = now()
  WHERE id = NEW.api_key_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_api_log_insert
  AFTER INSERT ON public.agent_api_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_api_key_calls();