
-- Workflow runs table for execution history
CREATE TABLE public.workflow_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  mode TEXT NOT NULL DEFAULT 'workflow',
  inputs JSONB DEFAULT '{}'::jsonb,
  outputs JSONB DEFAULT '{}'::jsonb,
  node_results JSONB DEFAULT '[]'::jsonb,
  total_duration_ms INTEGER DEFAULT 0,
  total_tokens_used INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own workflow runs"
ON public.workflow_runs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflow runs"
ON public.workflow_runs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflow runs"
ON public.workflow_runs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflow runs"
ON public.workflow_runs FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookup
CREATE INDEX idx_workflow_runs_workflow_id ON public.workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_user_id ON public.workflow_runs(user_id);
CREATE INDEX idx_workflow_runs_created_at ON public.workflow_runs(created_at DESC);
