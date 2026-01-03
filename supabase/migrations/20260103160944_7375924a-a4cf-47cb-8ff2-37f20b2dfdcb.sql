-- Create user_activity_log table for tracking active days
CREATE TABLE IF NOT EXISTS public.user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_date)
);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Create policies with IF NOT EXISTS equivalent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_activity_log' AND policyname = 'Users can view their own activity'
  ) THEN
    CREATE POLICY "Users can view their own activity" 
    ON public.user_activity_log 
    FOR SELECT 
    USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_activity_log' AND policyname = 'Users can log their own activity'
  ) THEN
    CREATE POLICY "Users can log their own activity" 
    ON public.user_activity_log 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Function to check and grant achievements for a user
CREATE OR REPLACE FUNCTION public.check_and_grant_achievements(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_count INTEGER;
  likes_count INTEGER;
  usage_count INTEGER;
  clones_count INTEGER;
  active_days INTEGER;
BEGIN
  -- Get agent count
  SELECT COUNT(*) INTO agent_count
  FROM agents WHERE author_id = target_user_id;
  
  -- Get likes count from profile
  SELECT COALESCE(total_likes_received, 0) INTO likes_count
  FROM profiles WHERE id = target_user_id;
  
  -- Get total usage count
  SELECT COALESCE(SUM(agents.usage_count), 0) INTO usage_count
  FROM agents WHERE author_id = target_user_id;
  
  -- Get total clones count
  SELECT COALESCE(SUM(agents.clones_count), 0) INTO clones_count
  FROM agents WHERE author_id = target_user_id;
  
  -- Get active days count
  SELECT COUNT(DISTINCT activity_date) INTO active_days
  FROM user_activity_log WHERE user_id = target_user_id;
  
  -- first_agent achievement
  IF agent_count >= 1 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'first_agent', 1)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  
  -- agent_master achievements
  IF agent_count >= 3 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'agent_master', 1)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  IF agent_count >= 5 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'agent_master', 2)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  IF agent_count >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'agent_master', 3)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  
  -- popular_creator achievements
  IF likes_count >= 10 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'popular_creator', 1)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  IF likes_count >= 50 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'popular_creator', 2)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  IF likes_count >= 100 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'popular_creator', 3)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  
  -- helpful_hero achievements
  IF usage_count >= 50 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'helpful_hero', 1)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  IF usage_count >= 200 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'helpful_hero', 2)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  IF usage_count >= 500 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'helpful_hero', 3)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  
  -- clone_master achievements
  IF clones_count >= 5 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'clone_master', 1)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  IF clones_count >= 20 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'clone_master', 2)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  IF clones_count >= 50 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'clone_master', 3)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  
  -- active_user achievements
  IF active_days >= 7 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'active_user', 1)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  IF active_days >= 30 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'active_user', 2)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
  IF active_days >= 100 THEN
    INSERT INTO user_achievements (user_id, achievement_type, achievement_level)
    VALUES (target_user_id, 'active_user', 3)
    ON CONFLICT (user_id, achievement_type, achievement_level) DO NOTHING;
  END IF;
END;
$$;

-- Trigger function for agents insert/update
CREATE OR REPLACE FUNCTION public.trigger_check_achievements_on_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.author_id IS NOT NULL THEN
    PERFORM check_and_grant_achievements(NEW.author_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for agents table
DROP TRIGGER IF EXISTS on_agent_change_check_achievements ON public.agents;
CREATE TRIGGER on_agent_change_check_achievements
AFTER INSERT OR UPDATE ON public.agents
FOR EACH ROW
EXECUTE FUNCTION trigger_check_achievements_on_agent();

-- Trigger function for agent_likes
CREATE OR REPLACE FUNCTION public.trigger_check_achievements_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_author_id UUID;
BEGIN
  SELECT author_id INTO agent_author_id FROM agents WHERE id = NEW.agent_id;
  IF agent_author_id IS NOT NULL THEN
    PERFORM check_and_grant_achievements(agent_author_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for agent_likes table
DROP TRIGGER IF EXISTS on_like_check_achievements ON public.agent_likes;
CREATE TRIGGER on_like_check_achievements
AFTER INSERT ON public.agent_likes
FOR EACH ROW
EXECUTE FUNCTION trigger_check_achievements_on_like();

-- Trigger function for agent_clones
CREATE OR REPLACE FUNCTION public.trigger_check_achievements_on_clone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agent_author_id UUID;
BEGIN
  SELECT author_id INTO agent_author_id FROM agents WHERE id = NEW.source_agent_id;
  IF agent_author_id IS NOT NULL THEN
    PERFORM check_and_grant_achievements(agent_author_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for agent_clones table
DROP TRIGGER IF EXISTS on_clone_check_achievements ON public.agent_clones;
CREATE TRIGGER on_clone_check_achievements
AFTER INSERT ON public.agent_clones
FOR EACH ROW
EXECUTE FUNCTION trigger_check_achievements_on_clone();

-- Trigger for user activity log
CREATE OR REPLACE FUNCTION public.trigger_check_achievements_on_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_and_grant_achievements(NEW.user_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_activity_check_achievements ON public.user_activity_log;
CREATE TRIGGER on_activity_check_achievements
AFTER INSERT ON public.user_activity_log
FOR EACH ROW
EXECUTE FUNCTION trigger_check_achievements_on_activity();