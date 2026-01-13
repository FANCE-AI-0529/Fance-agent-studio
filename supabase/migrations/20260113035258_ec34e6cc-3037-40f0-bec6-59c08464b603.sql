-- =====================================================
-- 第一阶段: 统一语义资产索引 (Unified Semantic Registry)
-- =====================================================

-- 创建统一资产索引表
CREATE TABLE public.asset_semantic_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_type TEXT NOT NULL CHECK (asset_type IN ('skill', 'mcp_tool', 'knowledge_base')),
  asset_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  capabilities TEXT[] DEFAULT '{}',
  input_schema JSONB DEFAULT '{}'::JSONB,
  output_schema JSONB DEFAULT '{}'::JSONB,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  embedding JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL,
  UNIQUE(asset_type, asset_id, user_id)
);

-- 创建索引
CREATE INDEX idx_asset_semantic_type ON public.asset_semantic_index(asset_type);
CREATE INDEX idx_asset_semantic_user ON public.asset_semantic_index(user_id);
CREATE INDEX idx_asset_semantic_category ON public.asset_semantic_index(category);
CREATE INDEX idx_asset_semantic_capabilities ON public.asset_semantic_index USING GIN(capabilities);

-- 启用 RLS
ALTER TABLE public.asset_semantic_index ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view their own asset index"
ON public.asset_semantic_index FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own asset index"
ON public.asset_semantic_index FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own asset index"
ON public.asset_semantic_index FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own asset index"
ON public.asset_semantic_index FOR DELETE
USING (auth.uid() = user_id);

-- 创建工作流模板表 (用于存储AI生成的工作流DSL)
CREATE TABLE public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  dsl JSONB NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL
);

-- 启用 RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view public templates or their own"
ON public.workflow_templates FOR SELECT
USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
ON public.workflow_templates FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
ON public.workflow_templates FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
ON public.workflow_templates FOR DELETE
USING (auth.uid() = user_id);

-- 创建 updated_at 触发器
CREATE TRIGGER update_asset_semantic_index_updated_at
BEFORE UPDATE ON public.asset_semantic_index
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_templates_updated_at
BEFORE UPDATE ON public.workflow_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();