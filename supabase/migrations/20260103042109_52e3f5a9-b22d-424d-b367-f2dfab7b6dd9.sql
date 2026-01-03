-- =============================================
-- Stage 1: Database Infrastructure for Dashboard Improvement
-- =============================================

-- 1.1 Extend agents table with usage statistics
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS clones_count INTEGER DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 1.2 Create daily_inspiration table for AI usage stories
CREATE TABLE IF NOT EXISTS public.daily_inspiration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  story_content TEXT,
  image_url TEXT,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  category TEXT DEFAULT 'general',
  featured_date DATE,
  view_count INTEGER DEFAULT 0,
  author_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on daily_inspiration
ALTER TABLE public.daily_inspiration ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_inspiration (public read, admin write)
CREATE POLICY "Anyone can view daily inspiration"
  ON public.daily_inspiration FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage daily inspiration"
  ON public.daily_inspiration FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 1.3 Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_level INTEGER DEFAULT 1,
  earned_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_type)
);

-- Enable RLS on user_achievements
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 1.4 Create agent_likes table
CREATE TABLE IF NOT EXISTS public.agent_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, user_id)
);

-- Enable RLS on agent_likes
ALTER TABLE public.agent_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_likes
CREATE POLICY "Users can view all likes"
  ON public.agent_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like agents"
  ON public.agent_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their likes"
  ON public.agent_likes FOR DELETE
  USING (auth.uid() = user_id);

-- 1.5 Create agent_clones table
CREATE TABLE IF NOT EXISTS public.agent_clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  cloned_agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on agent_clones
ALTER TABLE public.agent_clones ENABLE ROW LEVEL SECURITY;

-- RLS policies for agent_clones
CREATE POLICY "Users can view their own clones"
  ON public.agent_clones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create clone records"
  ON public.agent_clones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 1.6 Extend profiles table with creator information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_agents INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_likes_received INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS creator_level INTEGER DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';

-- =============================================
-- Stage 4: Backend Support - Views and Functions
-- =============================================

-- 4.1 Create trending_agents view
DROP VIEW IF EXISTS public.trending_agents;
CREATE VIEW public.trending_agents 
WITH (security_invoker = true)
AS
SELECT 
  a.id,
  a.name,
  a.department,
  a.category,
  a.tags,
  a.usage_count,
  a.likes_count,
  a.clones_count,
  a.rating,
  a.is_featured,
  a.manifest,
  a.created_at,
  p.display_name as author_name,
  p.avatar_url as author_avatar,
  p.id as author_id
FROM public.agents a
LEFT JOIN public.profiles p ON a.author_id = p.id
WHERE a.status = 'deployed'
ORDER BY a.usage_count DESC;

-- Grant access to the trending view
GRANT SELECT ON public.trending_agents TO authenticated;
GRANT SELECT ON public.trending_agents TO anon;

-- 4.2 Create clone_agent function
CREATE OR REPLACE FUNCTION public.clone_agent(source_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_agent_id UUID;
  source_agent public.agents%ROWTYPE;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to clone an agent';
  END IF;

  SELECT * INTO source_agent FROM public.agents WHERE id = source_id AND status = 'deployed';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source agent not found or not available for cloning';
  END IF;
  
  INSERT INTO public.agents (name, department, model, author_id, mplp_policy, manifest, status, category, tags)
  VALUES (
    source_agent.name || ' (复刻)',
    source_agent.department,
    source_agent.model,
    current_user_id,
    source_agent.mplp_policy,
    source_agent.manifest,
    'draft',
    source_agent.category,
    source_agent.tags
  )
  RETURNING id INTO new_agent_id;
  
  -- Record the clone
  INSERT INTO public.agent_clones (source_agent_id, cloned_agent_id, user_id)
  VALUES (source_id, new_agent_id, current_user_id);
  
  -- Update source agent clone count
  UPDATE public.agents SET clones_count = clones_count + 1 WHERE id = source_id;
  
  RETURN new_agent_id;
END;
$$;

-- 4.3 Create toggle_agent_like function
CREATE OR REPLACE FUNCTION public.toggle_agent_like(target_agent_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  existing_like UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to like an agent';
  END IF;

  SELECT id INTO existing_like FROM public.agent_likes 
  WHERE agent_id = target_agent_id AND user_id = current_user_id;
  
  IF existing_like IS NOT NULL THEN
    -- Unlike
    DELETE FROM public.agent_likes WHERE id = existing_like;
    UPDATE public.agents SET likes_count = GREATEST(0, likes_count - 1) WHERE id = target_agent_id;
    RETURN false;
  ELSE
    -- Like
    INSERT INTO public.agent_likes (agent_id, user_id) VALUES (target_agent_id, current_user_id);
    UPDATE public.agents SET likes_count = likes_count + 1 WHERE id = target_agent_id;
    RETURN true;
  END IF;
END;
$$;

-- 4.4 Create function to increment agent usage
CREATE OR REPLACE FUNCTION public.increment_agent_usage(target_agent_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.agents SET usage_count = usage_count + 1 WHERE id = target_agent_id;
END;
$$;

-- 4.5 Create trigger to update profile stats when agent is created
CREATE OR REPLACE FUNCTION public.update_profile_agent_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles SET total_agents = total_agents + 1 WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET total_agents = GREATEST(0, total_agents - 1) WHERE id = OLD.author_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS on_agent_change_update_profile ON public.agents;
CREATE TRIGGER on_agent_change_update_profile
  AFTER INSERT OR DELETE ON public.agents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_agent_count();

-- 4.6 Create community_stats view for dashboard
DROP VIEW IF EXISTS public.community_stats;
CREATE VIEW public.community_stats
WITH (security_invoker = true)
AS
SELECT
  (SELECT COUNT(*) FROM public.agents WHERE status = 'deployed') as total_agents,
  (SELECT COUNT(DISTINCT author_id) FROM public.agents WHERE author_id IS NOT NULL) as total_creators,
  (SELECT COALESCE(SUM(usage_count), 0) FROM public.agents) as total_conversations,
  (SELECT COUNT(*) FROM public.sessions WHERE created_at > now() - interval '24 hours') as daily_active_sessions;

GRANT SELECT ON public.community_stats TO authenticated;
GRANT SELECT ON public.community_stats TO anon;