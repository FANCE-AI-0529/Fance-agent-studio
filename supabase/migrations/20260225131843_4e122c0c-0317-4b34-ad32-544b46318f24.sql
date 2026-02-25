
-- Fix: Restrict eval_test_templates to authenticated users only
-- This prevents anonymous users from seeing security test patterns

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view system templates" ON public.eval_test_templates;

-- Create policy requiring authentication
CREATE POLICY "Authenticated users can view templates"
  ON public.eval_test_templates FOR SELECT
  TO authenticated
  USING (is_system = TRUE OR auth.uid() = user_id);

-- Revoke anonymous access
REVOKE SELECT ON public.eval_test_templates FROM anon;
