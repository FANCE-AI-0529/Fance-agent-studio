-- Create task_chains table for managing multi-step task workflows
CREATE TABLE public.task_chains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  execution_mode TEXT NOT NULL DEFAULT 'sequential',
  source_agent_id UUID REFERENCES public.agents(id),
  collaboration_id UUID REFERENCES public.agent_collaborations(id),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  total_steps INTEGER NOT NULL DEFAULT 0,
  completed_steps INTEGER NOT NULL DEFAULT 0,
  failed_steps INTEGER NOT NULL DEFAULT 0,
  final_result JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_chain_steps table for individual steps in a chain
CREATE TABLE public.task_chain_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id UUID NOT NULL REFERENCES public.task_chains(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  parallel_group INTEGER DEFAULT 0,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'general',
  target_agent_id UUID REFERENCES public.agents(id),
  input_mapping JSONB DEFAULT '{}',
  output_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  task_id UUID REFERENCES public.delegated_tasks(id),
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  timeout_ms INTEGER DEFAULT 60000,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_chain_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_chains
CREATE POLICY "Users can view their own task chains"
  ON public.task_chains FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task chains"
  ON public.task_chains FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task chains"
  ON public.task_chains FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task chains"
  ON public.task_chains FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for task_chain_steps
CREATE POLICY "Users can view steps of their chains"
  ON public.task_chain_steps FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.task_chains
    WHERE task_chains.id = task_chain_steps.chain_id
    AND task_chains.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert steps to their chains"
  ON public.task_chain_steps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.task_chains
    WHERE task_chains.id = task_chain_steps.chain_id
    AND task_chains.user_id = auth.uid()
  ));

CREATE POLICY "Users can update steps of their chains"
  ON public.task_chain_steps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.task_chains
    WHERE task_chains.id = task_chain_steps.chain_id
    AND task_chains.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete steps of their chains"
  ON public.task_chain_steps FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.task_chains
    WHERE task_chains.id = task_chain_steps.chain_id
    AND task_chains.user_id = auth.uid()
  ));

-- Indexes for performance
CREATE INDEX idx_task_chains_user_id ON public.task_chains(user_id);
CREATE INDEX idx_task_chains_status ON public.task_chains(status);
CREATE INDEX idx_task_chain_steps_chain_id ON public.task_chain_steps(chain_id);
CREATE INDEX idx_task_chain_steps_order ON public.task_chain_steps(chain_id, step_order, parallel_group);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_chains;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_chain_steps;

-- Trigger for updated_at
CREATE TRIGGER update_task_chains_updated_at
  BEFORE UPDATE ON public.task_chains
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();