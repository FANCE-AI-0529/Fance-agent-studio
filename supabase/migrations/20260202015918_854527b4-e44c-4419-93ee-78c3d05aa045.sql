-- =====================================================
-- Security Migration: RLS Fixes & Function search_path
-- =====================================================

-- The agent_api_keys_safe view already exists and excludes api_key_hash
-- Just need to fix RLS policies and function search_paths

-- 1. Ensure proper RLS on agent_api_keys
DROP POLICY IF EXISTS "Users can view own API keys via safe view" ON public.agent_api_keys;
CREATE POLICY "Users can view own API keys" 
  ON public.agent_api_keys 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- 2. Tighten profiles RLS policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Authenticated users can view all profiles (needed for social features)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Anonymous users can only see verified creators' basic info
DROP POLICY IF EXISTS "Anonymous can view verified profiles" ON public.profiles;
CREATE POLICY "Anonymous can view verified profiles"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (is_verified = true);

-- 3. Update functions with proper search_path for security
ALTER FUNCTION public.clone_agent(uuid) SET search_path = public;
ALTER FUNCTION public.toggle_agent_like(uuid) SET search_path = public;
ALTER FUNCTION public.increment_agent_usage(uuid) SET search_path = public;
ALTER FUNCTION public.update_profile_agent_count() SET search_path = public;
ALTER FUNCTION public.check_and_grant_achievements(uuid) SET search_path = public;
ALTER FUNCTION public.trigger_check_achievements_on_agent() SET search_path = public;
ALTER FUNCTION public.trigger_check_achievements_on_like() SET search_path = public;
ALTER FUNCTION public.trigger_check_achievements_on_clone() SET search_path = public;
ALTER FUNCTION public.trigger_check_achievements_on_activity() SET search_path = public;