-- Recreate view with SECURITY INVOKER (default, not definer)
DROP VIEW IF EXISTS public.public_agents;

CREATE VIEW public.public_agents 
WITH (security_invoker = true)
AS
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

-- Grant access to the view
GRANT SELECT ON public.public_agents TO authenticated;
GRANT SELECT ON public.public_agents TO anon;