-- Create table for user prompt configurations
CREATE TABLE public.user_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Default',
  prompt TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own prompts"
ON public.user_prompts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prompts"
ON public.user_prompts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prompts"
ON public.user_prompts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prompts"
ON public.user_prompts
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_prompts_updated_at
BEFORE UPDATE ON public.user_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint for default prompt per user/agent combination
CREATE UNIQUE INDEX idx_user_prompts_default 
ON public.user_prompts (user_id, agent_id) 
WHERE is_default = true;