-- Fix user_activities RLS: restrict SELECT to followers + own data instead of public
DROP POLICY IF EXISTS "Anyone can view activities" ON public.user_activities;

-- Users can view their own activities
CREATE POLICY "Users can view own activities"
  ON public.user_activities FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view activities of people they follow
CREATE POLICY "Users can view followed users activities"
  ON public.user_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_follows
      WHERE follower_id = auth.uid()
        AND following_id = user_activities.user_id
    )
  );

-- Deployed agents' activities are viewable (for public agent profiles)
CREATE POLICY "Public agent activities are viewable"
  ON public.user_activities FOR SELECT
  USING (
    activity_type IN ('agent_deployed', 'agent_shared')
  );