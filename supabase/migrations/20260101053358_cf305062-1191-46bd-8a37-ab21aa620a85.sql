-- Add share_token column to user_prompts table for sharing
ALTER TABLE public.user_prompts 
ADD COLUMN share_token TEXT UNIQUE,
ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN share_count INTEGER NOT NULL DEFAULT 0;

-- Create index for faster share token lookups
CREATE INDEX idx_user_prompts_share_token ON public.user_prompts(share_token) WHERE share_token IS NOT NULL;

-- Create policy to allow anyone to read shared prompts
CREATE POLICY "Anyone can view shared prompts"
ON public.user_prompts
FOR SELECT
USING (is_shared = true AND share_token IS NOT NULL);

-- Function to generate unique share token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  token TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8 character token
    token := encode(gen_random_bytes(6), 'base64');
    token := replace(replace(token, '+', ''), '/', '');
    token := substring(token from 1 for 8);
    
    -- Check if token already exists
    SELECT EXISTS(SELECT 1 FROM public.user_prompts WHERE share_token = token) INTO exists_check;
    
    IF NOT exists_check THEN
      RETURN token;
    END IF;
  END LOOP;
END;
$$;