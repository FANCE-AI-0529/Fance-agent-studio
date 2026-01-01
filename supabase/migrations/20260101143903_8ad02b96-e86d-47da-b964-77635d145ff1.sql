-- Create webhooks table
CREATE TABLE public.agent_webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default Webhook',
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] NOT NULL DEFAULT ARRAY['task.completed'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  retry_count INTEGER NOT NULL DEFAULT 3,
  timeout_ms INTEGER NOT NULL DEFAULT 30000,
  headers JSONB DEFAULT '{}',
  last_triggered_at TIMESTAMPTZ,
  total_triggers INTEGER NOT NULL DEFAULT 0,
  successful_triggers INTEGER NOT NULL DEFAULT 0,
  failed_triggers INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create webhook logs table
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.agent_webhooks(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  latency_ms INTEGER,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhooks
CREATE POLICY "Users can view their own webhooks" ON public.agent_webhooks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhooks" ON public.agent_webhooks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks" ON public.agent_webhooks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks" ON public.agent_webhooks
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for webhook logs
CREATE POLICY "Users can view their own webhook logs" ON public.webhook_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert webhook logs" ON public.webhook_logs
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_webhooks_agent_id ON public.agent_webhooks(agent_id);
CREATE INDEX idx_webhooks_user_id ON public.agent_webhooks(user_id);
CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_webhooks_updated_at
  BEFORE UPDATE ON public.agent_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();