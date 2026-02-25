
-- Drop existing safe view first (columns shifted after api_key removal)
DROP VIEW IF EXISTS public.agent_api_keys_safe;

-- Recreate the safe view with correct columns
CREATE VIEW public.agent_api_keys_safe AS
SELECT 
  id, agent_id, user_id, name, 
  api_key_prefix,
  is_active, rate_limit, total_calls,
  last_used_at, expires_at, 
  created_at, updated_at
FROM public.agent_api_keys;

GRANT SELECT ON public.agent_api_keys_safe TO authenticated;
