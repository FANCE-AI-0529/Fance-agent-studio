-- 知识库语义增强字段
-- 为 knowledge_bases 表添加语义元数据，支持 RAG 决策引擎

-- 添加语义字段
ALTER TABLE public.knowledge_bases
ADD COLUMN IF NOT EXISTS summary_embedding vector(1536),
ADD COLUMN IF NOT EXISTS usage_context text,
ADD COLUMN IF NOT EXISTS intent_tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS auto_profile_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_profiled_at timestamptz;

-- 创建向量索引以加速语义搜索
CREATE INDEX IF NOT EXISTS idx_kb_summary_embedding 
ON public.knowledge_bases USING ivfflat (summary_embedding vector_cosine_ops)
WITH (lists = 100);

-- 添加 auto_profile_status 的检查约束
ALTER TABLE public.knowledge_bases
ADD CONSTRAINT chk_auto_profile_status 
CHECK (auto_profile_status IN ('pending', 'processing', 'ready', 'failed'));

-- 添加注释
COMMENT ON COLUMN public.knowledge_bases.summary_embedding IS '知识库内容的摘要向量，用于语义搜索';
COMMENT ON COLUMN public.knowledge_bases.usage_context IS '知识库使用场景描述（约50字）';
COMMENT ON COLUMN public.knowledge_bases.intent_tags IS '意图标签数组，如 ["hr", "policy", "reimbursement"]';
COMMENT ON COLUMN public.knowledge_bases.auto_profile_status IS '自动画像生成状态：pending/processing/ready/failed';
COMMENT ON COLUMN public.knowledge_bases.last_profiled_at IS '最后一次生成画像的时间';