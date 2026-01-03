-- Drop the existing policy that exposes author_id to public
DROP POLICY IF EXISTS "Users can view deployed agents" ON public.agents;

-- Create a new policy: Users can only view their own agents
CREATE POLICY "Users can view own agents"
ON public.agents
FOR SELECT
USING (auth.uid() = author_id);

-- Create a secure view for public agent browsing (deployed agents without author_id)
CREATE OR REPLACE VIEW public.public_agents AS
SELECT 
  id,
  name,
  department,
  model,
  mplp_policy,
  status,
  manifest,
  created_at,
  updated_at
FROM public.agents
WHERE status = 'deployed';

-- Grant access to the view for authenticated and anon users
GRANT SELECT ON public.public_agents TO authenticated;
GRANT SELECT ON public.public_agents TO anon;