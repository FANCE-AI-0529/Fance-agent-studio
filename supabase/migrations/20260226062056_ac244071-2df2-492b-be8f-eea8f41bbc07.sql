
-- Phase 5: Published Workflow APIs table
CREATE TABLE public.workflow_published_apis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  auth_type TEXT NOT NULL DEFAULT 'api_key',
  rate_limit INTEGER NOT NULL DEFAULT 60,
  allowed_origins TEXT[] DEFAULT '{}',
  input_schema JSONB DEFAULT '{}',
  output_schema JSONB DEFAULT '{}',
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  total_calls INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms INTEGER DEFAULT 0,
  error_rate NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

ALTER TABLE public.workflow_published_apis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own published APIs"
  ON public.workflow_published_apis FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_workflow_published_apis_slug ON public.workflow_published_apis(slug);
CREATE INDEX idx_workflow_published_apis_user ON public.workflow_published_apis(user_id);

CREATE TRIGGER update_workflow_published_apis_updated_at
  BEFORE UPDATE ON public.workflow_published_apis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Phase 6: Add flow_type to agents table for chatflow/workflow distinction
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS flow_type TEXT NOT NULL DEFAULT 'chatflow';
