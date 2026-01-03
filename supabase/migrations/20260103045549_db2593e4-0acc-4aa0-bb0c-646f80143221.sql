-- Create shared_conversations table for conversation sharing
CREATE TABLE public.shared_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token TEXT UNIQUE NOT NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  preview TEXT,
  agent_name TEXT,
  agent_avatar JSONB,
  message_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  include_user_messages BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create user_memories table for long-term memory
CREATE TABLE public.user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  memory_type TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
  source TEXT DEFAULT 'inferred',
  last_accessed TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create conversation_scenarios table for scenario templates
CREATE TABLE public.conversation_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  scene_background JSONB,
  agent_role TEXT,
  user_role TEXT,
  opening_lines TEXT[],
  suggested_prompts TEXT[],
  is_multi_agent BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  author_id UUID,
  downloads_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Extend sessions table with scenario support
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS scenario_id UUID REFERENCES public.conversation_scenarios(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS scene_config JSONB,
ADD COLUMN IF NOT EXISTS is_roleplay BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.shared_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_scenarios ENABLE ROW LEVEL SECURITY;

-- RLS policies for shared_conversations
CREATE POLICY "Users can view their own shared conversations"
ON public.shared_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public shared conversations"
ON public.shared_conversations FOR SELECT
USING (is_public = true);

CREATE POLICY "Users can create shared conversations"
ON public.shared_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shared conversations"
ON public.shared_conversations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shared conversations"
ON public.shared_conversations FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for user_memories
CREATE POLICY "Users can view their own memories"
ON public.user_memories FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memories"
ON public.user_memories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memories"
ON public.user_memories FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memories"
ON public.user_memories FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for conversation_scenarios
CREATE POLICY "Anyone can view public scenarios"
ON public.conversation_scenarios FOR SELECT
USING (is_public = true OR auth.uid() = author_id);

CREATE POLICY "Users can create scenarios"
ON public.conversation_scenarios FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own scenarios"
ON public.conversation_scenarios FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own scenarios"
ON public.conversation_scenarios FOR DELETE
USING (auth.uid() = author_id);

-- Function to generate share token
CREATE OR REPLACE FUNCTION public.generate_conversation_share_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  token TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    token := encode(gen_random_bytes(8), 'base64');
    token := replace(replace(replace(token, '+', ''), '/', ''), '=', '');
    token := substring(token from 1 for 12);
    
    SELECT EXISTS(SELECT 1 FROM public.shared_conversations WHERE share_token = token) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN token;
    END IF;
  END LOOP;
END;
$$;

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_share_view_count(p_share_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.shared_conversations 
  SET view_count = view_count + 1 
  WHERE share_token = p_share_token;
END;
$$;

-- Indexes for performance
CREATE INDEX idx_shared_conversations_token ON public.shared_conversations(share_token);
CREATE INDEX idx_shared_conversations_user ON public.shared_conversations(user_id);
CREATE INDEX idx_user_memories_user ON public.user_memories(user_id);
CREATE INDEX idx_user_memories_agent ON public.user_memories(agent_id);
CREATE INDEX idx_user_memories_type ON public.user_memories(memory_type);
CREATE INDEX idx_conversation_scenarios_category ON public.conversation_scenarios(category);
CREATE INDEX idx_conversation_scenarios_public ON public.conversation_scenarios(is_public);
CREATE INDEX idx_sessions_scenario ON public.sessions(scenario_id);