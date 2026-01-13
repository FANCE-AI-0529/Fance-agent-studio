-- Add RLS policies for agent_memory_files based on session ownership
CREATE POLICY "Users can create files for their sessions"
ON public.agent_memory_files FOR INSERT
WITH CHECK (
  session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  OR agent_id IN (SELECT id FROM agents WHERE author_id = auth.uid())
);

CREATE POLICY "Users can view files for their sessions"
ON public.agent_memory_files FOR SELECT
USING (
  session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  OR agent_id IN (SELECT id FROM agents WHERE author_id = auth.uid())
);

CREATE POLICY "Users can update files for their sessions"
ON public.agent_memory_files FOR UPDATE
USING (
  session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  OR agent_id IN (SELECT id FROM agents WHERE author_id = auth.uid())
);

CREATE POLICY "Users can delete files for their sessions"
ON public.agent_memory_files FOR DELETE
USING (
  session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  OR agent_id IN (SELECT id FROM agents WHERE author_id = auth.uid())
);

-- Add DELETE policy for sessions table
CREATE POLICY "Users can delete their own sessions"
ON public.sessions FOR DELETE
USING (auth.uid() = user_id);