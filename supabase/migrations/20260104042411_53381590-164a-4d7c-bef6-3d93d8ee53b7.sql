-- Add expires_at column to invitations table
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at);

-- Update the RLS policy to also check expiration
DROP POLICY IF EXISTS "Anyone can check invite code validity" ON public.invitations;

CREATE POLICY "Anyone can check invite code validity"
ON public.invitations FOR SELECT
USING (
  status = 'pending' 
  AND invited_user_id IS NULL
  AND (expires_at IS NULL OR expires_at > now())
);