-- Create table for API alert rules
CREATE TABLE public.api_alert_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT '默认告警规则',
  
  -- Alert conditions
  error_rate_threshold NUMERIC DEFAULT 5, -- Percentage, e.g., 5 means 5%
  latency_threshold_ms INTEGER DEFAULT 3000, -- Milliseconds
  error_count_threshold INTEGER DEFAULT 10, -- Absolute count
  
  -- Time window for evaluation (in minutes)
  time_window_minutes INTEGER DEFAULT 5,
  
  -- Notification settings
  notification_email TEXT NOT NULL,
  notification_enabled BOOLEAN DEFAULT true,
  
  -- Cooldown to prevent alert spam (in minutes)
  cooldown_minutes INTEGER DEFAULT 30,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  
  -- Statistics
  total_alerts_sent INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for alert history
CREATE TABLE public.api_alert_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_rule_id UUID NOT NULL REFERENCES public.api_alert_rules(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  user_id UUID NOT NULL,
  
  -- Alert details
  alert_type TEXT NOT NULL, -- 'error_rate', 'latency', 'error_count'
  threshold_value NUMERIC NOT NULL,
  actual_value NUMERIC NOT NULL,
  
  -- Context
  time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
  sample_size INTEGER DEFAULT 0,
  
  -- Notification status
  notification_sent BOOLEAN DEFAULT false,
  notification_error TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_alert_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for alert rules
CREATE POLICY "Users can view their own alert rules"
  ON public.api_alert_rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alert rules"
  ON public.api_alert_rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alert rules"
  ON public.api_alert_rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alert rules"
  ON public.api_alert_rules FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for alert logs
CREATE POLICY "Users can view their own alert logs"
  ON public.api_alert_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own alert logs"
  ON public.api_alert_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_api_alert_rules_agent_id ON public.api_alert_rules(agent_id);
CREATE INDEX idx_api_alert_rules_user_id ON public.api_alert_rules(user_id);
CREATE INDEX idx_api_alert_logs_alert_rule_id ON public.api_alert_logs(alert_rule_id);
CREATE INDEX idx_api_alert_logs_created_at ON public.api_alert_logs(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_api_alert_rules_updated_at
  BEFORE UPDATE ON public.api_alert_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();