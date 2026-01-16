-- Add new columns for secure API key storage
ALTER TABLE public.agent_api_keys 
ADD COLUMN IF NOT EXISTS api_key_hash TEXT,
ADD COLUMN IF NOT EXISTS api_key_prefix TEXT;

-- Create index for hash lookups (will replace the plaintext index)
CREATE INDEX IF NOT EXISTS idx_agent_api_keys_hash ON public.agent_api_keys(api_key_hash);

-- Create a function to hash API keys using SHA-256
CREATE OR REPLACE FUNCTION hash_api_key(key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(digest(key, 'sha256'), 'hex');
END;
$$;

-- Create a function to validate API keys by hash
CREATE OR REPLACE FUNCTION validate_api_key(provided_key TEXT)
RETURNS TABLE (
  id UUID,
  agent_id UUID,
  user_id UUID,
  is_active BOOLEAN,
  rate_limit INTEGER,
  expires_at TIMESTAMP WITH TIME ZONE,
  name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_hash TEXT;
BEGIN
  key_hash := encode(digest(provided_key, 'sha256'), 'hex');
  
  RETURN QUERY
  SELECT 
    k.id,
    k.agent_id,
    k.user_id,
    k.is_active,
    k.rate_limit,
    k.expires_at,
    k.name
  FROM public.agent_api_keys k
  WHERE k.api_key_hash = key_hash;
END;
$$;

-- Migrate existing plaintext keys to hashed format
UPDATE public.agent_api_keys
SET 
  api_key_hash = encode(digest(api_key, 'sha256'), 'hex'),
  api_key_prefix = SUBSTRING(api_key, 1, 12) || '...'
WHERE api_key_hash IS NULL AND api_key IS NOT NULL;