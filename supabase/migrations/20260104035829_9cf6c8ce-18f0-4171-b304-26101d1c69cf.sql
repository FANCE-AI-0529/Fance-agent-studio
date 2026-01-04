-- Allow anyone to check if an invite code is valid (for registration validation)
CREATE POLICY "Anyone can check invite code validity"
ON public.invitations FOR SELECT
USING (status = 'pending' AND invited_user_id IS NULL);