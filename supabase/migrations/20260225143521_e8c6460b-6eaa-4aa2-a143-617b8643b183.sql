
CREATE TABLE public.waiting_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT DEFAULT 'hero_cta',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'registered')),
  created_at TIMESTAMPTZ DEFAULT now(),
  invited_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waiting list"
  ON public.waiting_list FOR INSERT
  WITH CHECK (true);
