-- 为知识库资产添加意图标签和上下文钩子
ALTER TABLE public.asset_semantic_index 
ADD COLUMN IF NOT EXISTS intent_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS context_hook TEXT;

-- 添加索引以支持意图标签搜索
CREATE INDEX IF NOT EXISTS idx_asset_intent_tags 
ON public.asset_semantic_index USING GIN(intent_tags);