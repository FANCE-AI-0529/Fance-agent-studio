-- Create delegated_tasks table for task delegation between agents
CREATE TABLE public.delegated_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaboration_id UUID REFERENCES public.agent_collaborations(id) ON DELETE CASCADE,
  source_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  target_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  task_type TEXT NOT NULL DEFAULT 'general' CHECK (task_type IN ('general', 'analysis', 'generation', 'query', 'validation')),
  
  -- Handoff context (context handoff packet)
  handoff_context JSONB DEFAULT '{}'::jsonb,
  -- Contains: session_summary, key_entities, user_preferences, constraints, etc.
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'rejected', 'failed', 'cancelled')),
  
  -- Results
  result JSONB,
  error_message TEXT,
  
  -- Performance metrics
  estimated_duration_ms INTEGER,
  actual_duration_ms INTEGER,
  tokens_used INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  deadline TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.delegated_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own delegated tasks"
  ON public.delegated_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own delegated tasks"
  ON public.delegated_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own delegated tasks"
  ON public.delegated_tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own delegated tasks"
  ON public.delegated_tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_delegated_tasks_source_agent ON public.delegated_tasks(source_agent_id);
CREATE INDEX idx_delegated_tasks_target_agent ON public.delegated_tasks(target_agent_id);
CREATE INDEX idx_delegated_tasks_status ON public.delegated_tasks(status);
CREATE INDEX idx_delegated_tasks_collaboration ON public.delegated_tasks(collaboration_id);
CREATE INDEX idx_delegated_tasks_user ON public.delegated_tasks(user_id);

-- Enable realtime for delegated_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.delegated_tasks;