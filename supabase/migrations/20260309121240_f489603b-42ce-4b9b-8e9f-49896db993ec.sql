-- Fix social graph RLS: restrict SELECT to authenticated users only

-- 1. user_follows
DROP POLICY IF EXISTS "Anyone can view follows" ON public.user_follows;
CREATE POLICY "Authenticated users can view follows"
  ON public.user_follows FOR SELECT
  TO authenticated
  USING (true);

-- 2. agent_likes
DROP POLICY IF EXISTS "Users can view all likes" ON public.agent_likes;
CREATE POLICY "Authenticated users can view likes"
  ON public.agent_likes FOR SELECT
  TO authenticated
  USING (true);

-- 3. challenge_votes
DROP POLICY IF EXISTS "Anyone can view votes" ON public.challenge_votes;
CREATE POLICY "Authenticated users can view votes"
  ON public.challenge_votes FOR SELECT
  TO authenticated
  USING (true);

-- 4. skill_ratings
DROP POLICY IF EXISTS "Anyone can view skill ratings" ON public.skill_ratings;
CREATE POLICY "Authenticated users can view ratings"
  ON public.skill_ratings FOR SELECT
  TO authenticated
  USING (true);