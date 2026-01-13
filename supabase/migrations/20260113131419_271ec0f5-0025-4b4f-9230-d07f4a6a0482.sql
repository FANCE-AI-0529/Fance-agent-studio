-- 为 asset_semantic_index 表添加槽位和 IO 规范字段
-- 支持混合编排引擎的功能原子化架构

-- 添加槽位类型字段
ALTER TABLE public.asset_semantic_index 
  ADD COLUMN IF NOT EXISTS slot_type text DEFAULT 'hybrid';

-- 添加标准化 IO 规范字段
ALTER TABLE public.asset_semantic_index 
  ADD COLUMN IF NOT EXISTS io_spec jsonb DEFAULT '{}'::jsonb;

-- 添加功能标签字段
ALTER TABLE public.asset_semantic_index 
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- 添加槽位类型约束
DO $$ BEGIN
  ALTER TABLE public.asset_semantic_index 
    ADD CONSTRAINT valid_slot_type 
    CHECK (slot_type IN ('perception', 'decision', 'action', 'hybrid'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 创建槽位索引以加速按槽位查询
CREATE INDEX IF NOT EXISTS idx_asset_slot_type 
  ON public.asset_semantic_index(slot_type);

-- 创建标签 GIN 索引以支持数组查询
CREATE INDEX IF NOT EXISTS idx_asset_tags 
  ON public.asset_semantic_index USING GIN(tags);

-- 创建复合索引以支持槽位 + 用户组合查询
CREATE INDEX IF NOT EXISTS idx_asset_slot_user 
  ON public.asset_semantic_index(user_id, slot_type);