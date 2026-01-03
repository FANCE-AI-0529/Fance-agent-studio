-- Create bundle_purchases table
CREATE TABLE public.bundle_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bundle_id UUID NOT NULL REFERENCES public.skill_bundles(id) ON DELETE CASCADE,
  stripe_payment_id TEXT,
  stripe_session_id TEXT,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  purchased_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bundle_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own purchases
CREATE POLICY "Users can view own purchases"
  ON public.bundle_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own purchases
CREATE POLICY "Users can create purchases"
  ON public.bundle_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_bundle_purchases_user ON public.bundle_purchases(user_id);
CREATE INDEX idx_bundle_purchases_bundle ON public.bundle_purchases(bundle_id);
CREATE INDEX idx_bundle_purchases_stripe_session ON public.bundle_purchases(stripe_session_id);

-- Update existing bundles with real skill_ids
UPDATE public.skill_bundles 
SET skill_ids = ARRAY['38f021db-886d-421b-a829-c28bd8a8a85f', '0980ed47-da05-41b9-8306-273509ab58f2']::uuid[],
    cover_image = 'https://images.unsplash.com/photo-1596524430615-b46475ddff6e?w=800&auto=format&fit=crop'
WHERE name = '智能客服基础包';

UPDATE public.skill_bundles 
SET skill_ids = ARRAY['65cea21d-fc9a-4cbf-9320-43be9a9db91a', '4343fab8-381d-404e-9153-352b0cdbc1a8']::uuid[],
    cover_image = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop'
WHERE name = '数据分析工具包';

UPDATE public.skill_bundles 
SET skill_ids = ARRAY['a9f44979-42ce-4558-9e6f-7c2ef6140766']::uuid[],
    cover_image = 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&auto=format&fit=crop'
WHERE name = '开发者助手包';

UPDATE public.skill_bundles 
SET skill_ids = ARRAY['0980ed47-da05-41b9-8306-273509ab58f2']::uuid[],
    cover_image = 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&auto=format&fit=crop'
WHERE name = '内容创作套件';

UPDATE public.skill_bundles 
SET skill_ids = ARRAY['65cea21d-fc9a-4cbf-9320-43be9a9db91a']::uuid[],
    cover_image = 'https://images.unsplash.com/photo-1518432031352-d6fc5c10da5a?w=800&auto=format&fit=crop'
WHERE name = '自动化流程包';