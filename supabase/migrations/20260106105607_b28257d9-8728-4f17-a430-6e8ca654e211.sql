-- Fix deployment failure: check_and_grant_achievements() uses ON CONFLICT
-- Ensure the conflict target exists by adding a UNIQUE constraint on user_achievements

CREATE UNIQUE INDEX IF NOT EXISTS user_achievements_user_type_level_unique
ON public.user_achievements (user_id, achievement_type, achievement_level);
