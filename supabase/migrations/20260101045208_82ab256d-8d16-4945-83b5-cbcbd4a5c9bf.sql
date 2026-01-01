-- Create table for variable presets
CREATE TABLE public.variable_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  values JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.variable_presets ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own presets"
ON public.variable_presets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presets"
ON public.variable_presets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
ON public.variable_presets
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
ON public.variable_presets
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_variable_presets_updated_at
  BEFORE UPDATE ON public.variable_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();