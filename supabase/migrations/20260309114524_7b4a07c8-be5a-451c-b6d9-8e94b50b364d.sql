
-- Drop the plaintext api_key column from agent_api_keys
-- All validation now uses api_key_hash via validate_api_key() function
-- The api_key column is no longer populated on insert (uses 'as any' cast)

-- First update the safe view to not reference api_key
DROP VIEW IF EXISTS public.agent_api_keys_safe;

-- Drop the plaintext column
ALTER TABLE public.agent_api_keys DROP COLUMN IF EXISTS api_key;

-- Recreate the safe view without api_key
CREATE VIEW public.agent_api_keys_safe
WITH (security_invoker = true)
AS
SELECT
  id,
  agent_id,
  user_id,
  name,
  api_key_prefix,
  is_active,
  rate_limit,
  total_calls,
  last_used_at,
  expires_at,
  created_at,
  updated_at
FROM public.agent_api_keys;
