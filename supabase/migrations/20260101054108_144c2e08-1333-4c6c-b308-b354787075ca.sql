-- Task Queue table for priority-based scheduling
CREATE TABLE public.task_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Task classification
  priority TEXT NOT NULL DEFAULT 'srt' CHECK (priority IN ('hrt', 'srt', 'dt')),
  task_type TEXT NOT NULL, -- compliance_check, ui_render, memory_update, etc.
  
  -- Timing constraints
  deadline TIMESTAMP WITH TIME ZONE,
  max_latency_ms INTEGER, -- Max acceptable latency in milliseconds
  
  -- Task data
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timeout')),
  error_message TEXT,
  
  -- Metrics
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER
);

-- Enable RLS
ALTER TABLE public.task_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own tasks"
ON public.task_queue
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
ON public.task_queue
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
ON public.task_queue
FOR UPDATE
USING (auth.uid() = user_id);

-- Index for priority-based queue processing
CREATE INDEX idx_task_queue_priority_status ON public.task_queue(priority, status, created_at);
CREATE INDEX idx_task_queue_session ON public.task_queue(session_id);

-- Model Routing Rules table
CREATE TABLE public.model_routing_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  
  -- Rule definition
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 100, -- Lower number = higher priority
  
  -- Matching conditions (JSONB for flexibility)
  conditions JSONB NOT NULL DEFAULT '{}',
  -- Example: {"task_type": "translation", "skill_category": "nlp", "input_tokens_lt": 1000}
  
  -- Target model
  target_model TEXT NOT NULL,
  -- Example: "google/gemini-2.5-flash-lite"
  
  -- Fallback model if primary fails
  fallback_model TEXT,
  
  -- Cost optimization
  max_tokens INTEGER,
  temperature DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.model_routing_rules ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own routing rules"
ON public.model_routing_rules
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own routing rules"
ON public.model_routing_rules
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own routing rules"
ON public.model_routing_rules
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own routing rules"
ON public.model_routing_rules
FOR DELETE
USING (auth.uid() = user_id);

-- Index for rule lookup
CREATE INDEX idx_model_routing_rules_agent ON public.model_routing_rules(agent_id, is_active, priority);
CREATE INDEX idx_model_routing_rules_user ON public.model_routing_rules(user_id, is_active);

-- Trigger for updated_at
CREATE TRIGGER update_model_routing_rules_updated_at
BEFORE UPDATE ON public.model_routing_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Scheduler Metrics table for monitoring
CREATE TABLE public.scheduler_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Time bucket (for aggregation)
  time_bucket TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Task metrics
  priority TEXT NOT NULL,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  failed_tasks INTEGER NOT NULL DEFAULT 0,
  timeout_tasks INTEGER NOT NULL DEFAULT 0,
  
  -- Latency metrics (in ms)
  avg_latency_ms INTEGER,
  p95_latency_ms INTEGER,
  p99_latency_ms INTEGER,
  
  -- Model usage
  model_used TEXT,
  tokens_used INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (admin only for metrics)
ALTER TABLE public.scheduler_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can view metrics
CREATE POLICY "Admins can view scheduler metrics"
ON public.scheduler_metrics
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));