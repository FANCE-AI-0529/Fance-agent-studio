-- Drop the foreign key constraint on sessions.agent_id to allow sessions without valid agents
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_agent_id_fkey;

-- Make agent_id nullable so sessions can be created without an agent
ALTER TABLE public.sessions ALTER COLUMN agent_id DROP NOT NULL;