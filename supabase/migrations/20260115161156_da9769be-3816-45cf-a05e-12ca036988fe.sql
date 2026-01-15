-- =====================================================
-- Security Fix: Block anonymous access to profiles table
-- =====================================================

-- 1. Revoke SELECT from anon role on profiles table
-- This ensures anonymous users cannot query the table at all
REVOKE SELECT ON public.profiles FROM anon;

-- 2. Drop the existing overly restrictive policy 
-- (it only allows viewing own profile, but we need authenticated users to potentially see other public profiles)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- 3. Create a new policy that allows authenticated users to view profiles
-- For now, we keep it owner-only to protect sensitive notification preferences
CREATE POLICY "Authenticated users can view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 4. Also explicitly ensure only authenticated users can interact with the table
REVOKE INSERT ON public.profiles FROM anon;
REVOKE UPDATE ON public.profiles FROM anon;
REVOKE DELETE ON public.profiles FROM anon;