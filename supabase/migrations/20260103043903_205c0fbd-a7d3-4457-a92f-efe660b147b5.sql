-- Extend skills table with market fields
ALTER TABLE public.skills 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS downloads_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ratings_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preview_images TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS changelog TEXT;

-- Create skill_ratings table for reviews
CREATE TABLE public.skill_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(skill_id, user_id)
);

-- Create skill_installs table for tracking installations
CREATE TABLE public.skill_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(skill_id, user_id)
);

-- Create skill_bundles table for ability packs
CREATE TABLE public.skill_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  author_id UUID,
  skill_ids UUID[] DEFAULT '{}',
  price DECIMAL(10,2) DEFAULT 0,
  is_free BOOLEAN DEFAULT true,
  downloads_count INTEGER DEFAULT 0,
  cover_image TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create creator_earnings table for revenue tracking
CREATE TABLE public.creator_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE SET NULL,
  bundle_id UUID REFERENCES public.skill_bundles(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_type TEXT NOT NULL DEFAULT 'sale',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.skill_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_installs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;

-- RLS policies for skill_ratings
CREATE POLICY "Anyone can view skill ratings"
  ON public.skill_ratings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own ratings"
  ON public.skill_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings"
  ON public.skill_ratings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings"
  ON public.skill_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for skill_installs
CREATE POLICY "Users can view their own installs"
  ON public.skill_installs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own installs"
  ON public.skill_installs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own installs"
  ON public.skill_installs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for skill_bundles
CREATE POLICY "Anyone can view bundles"
  ON public.skill_bundles FOR SELECT
  USING (true);

CREATE POLICY "Authors can insert their bundles"
  ON public.skill_bundles FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their bundles"
  ON public.skill_bundles FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their bundles"
  ON public.skill_bundles FOR DELETE
  USING (auth.uid() = author_id);

-- RLS policies for creator_earnings
CREATE POLICY "Creators can view their earnings"
  ON public.creator_earnings FOR SELECT
  USING (auth.uid() = creator_id);

CREATE POLICY "System can insert earnings"
  ON public.creator_earnings FOR INSERT
  WITH CHECK (true);

-- Function to install skill and update download count
CREATE OR REPLACE FUNCTION public.install_skill(p_skill_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert install record (ignore if already exists)
  INSERT INTO skill_installs (skill_id, user_id)
  VALUES (p_skill_id, auth.uid())
  ON CONFLICT (skill_id, user_id) DO NOTHING;
  
  -- Update download count
  UPDATE skills 
  SET downloads_count = downloads_count + 1
  WHERE id = p_skill_id;
END;
$$;

-- Function to submit rating and update skill stats
CREATE OR REPLACE FUNCTION public.submit_skill_rating(
  p_skill_id UUID,
  p_rating INTEGER,
  p_review TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update rating
  INSERT INTO skill_ratings (skill_id, user_id, rating, review)
  VALUES (p_skill_id, auth.uid(), p_rating, p_review)
  ON CONFLICT (skill_id, user_id) 
  DO UPDATE SET rating = p_rating, review = p_review, updated_at = now();
  
  -- Update skill average rating
  UPDATE skills 
  SET 
    rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM skill_ratings WHERE skill_id = p_skill_id),
    ratings_count = (SELECT COUNT(*) FROM skill_ratings WHERE skill_id = p_skill_id)
  WHERE id = p_skill_id;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_ratings_skill_id ON public.skill_ratings(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_installs_skill_id ON public.skill_installs(skill_id);
CREATE INDEX IF NOT EXISTS idx_skill_installs_user_id ON public.skill_installs(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_is_featured ON public.skills(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_skills_downloads ON public.skills(downloads_count DESC);
CREATE INDEX IF NOT EXISTS idx_skills_rating ON public.skills(rating DESC);