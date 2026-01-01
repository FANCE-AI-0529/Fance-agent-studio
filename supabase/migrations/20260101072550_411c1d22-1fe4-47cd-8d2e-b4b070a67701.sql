-- Create task chain execution history table
CREATE TABLE public.task_chain_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id UUID NOT NULL REFERENCES public.task_chains(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  chain_name TEXT NOT NULL,
  chain_description TEXT,
  execution_mode TEXT NOT NULL DEFAULT 'sequential',
  status TEXT NOT NULL DEFAULT 'running',
  total_steps INTEGER NOT NULL DEFAULT 0,
  completed_steps INTEGER NOT NULL DEFAULT 0,
  failed_steps INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  final_result JSONB,
  error_message TEXT,
  step_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  variables_used JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_chain_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own executions"
ON public.task_chain_executions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own executions"
ON public.task_chain_executions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own executions"
ON public.task_chain_executions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own executions"
ON public.task_chain_executions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_task_chain_executions_chain_id ON public.task_chain_executions(chain_id);
CREATE INDEX idx_task_chain_executions_user_id ON public.task_chain_executions(user_id);
CREATE INDEX idx_task_chain_executions_started_at ON public.task_chain_executions(started_at DESC);