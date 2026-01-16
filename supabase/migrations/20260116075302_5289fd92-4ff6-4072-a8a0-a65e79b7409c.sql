-- Create opencode_sessions table if not exists
CREATE TABLE IF NOT EXISTS public.opencode_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  current_mode TEXT NOT NULL DEFAULT 'plan' CHECK (current_mode IN ('plan', 'build')),
  plan_content TEXT,
  approval_token TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  style_violations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_id, session_id)
);

-- Enable RLS
ALTER TABLE public.opencode_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own opencode sessions" ON public.opencode_sessions;
DROP POLICY IF EXISTS "Users can create their own opencode sessions" ON public.opencode_sessions;
DROP POLICY IF EXISTS "Users can update their own opencode sessions" ON public.opencode_sessions;

-- Create RLS policies
CREATE POLICY "Users can view their own opencode sessions"
ON public.opencode_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own opencode sessions"
ON public.opencode_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opencode sessions"
ON public.opencode_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_opencode_sessions_updated_at ON public.opencode_sessions;
CREATE TRIGGER update_opencode_sessions_updated_at
BEFORE UPDATE ON public.opencode_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();