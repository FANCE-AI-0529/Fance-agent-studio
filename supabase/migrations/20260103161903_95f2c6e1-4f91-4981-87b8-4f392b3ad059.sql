-- Add category column to skill_bundles table
ALTER TABLE public.skill_bundles 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Create function to atomically increment bundle downloads
CREATE OR REPLACE FUNCTION public.increment_bundle_downloads(p_bundle_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.skill_bundles
  SET downloads_count = COALESCE(downloads_count, 0) + 1
  WHERE id = p_bundle_id;
END;
$$;

-- Insert sample skill bundles with featured ones
-- First, we need to get some skill IDs to include in bundles
-- We'll create bundles that reference existing skills if any, or empty arrays

INSERT INTO public.skill_bundles (
  name, 
  description, 
  skill_ids, 
  is_free, 
  price, 
  is_featured, 
  downloads_count,
  category,
  author_id
)
SELECT 
  '智能客服基础包',
  '快速搭建智能客服系统，包含政策查询、FAQ 问答、表单自动生成等核心能力，帮助企业高效处理客户咨询。',
  COALESCE(
    (SELECT ARRAY_AGG(id) FROM (SELECT id FROM public.skills WHERE is_published = true LIMIT 2) sub),
    ARRAY[]::UUID[]
  ),
  true,
  0,
  true,
  128,
  'customer_service',
  auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.skill_bundles (
  name, 
  description, 
  skill_ids, 
  is_free, 
  price, 
  is_featured, 
  downloads_count,
  category,
  author_id
)
SELECT 
  '数据分析工具包',
  '全方位数据处理能力集合，支持 Excel 分析、图表生成、OCR 文字识别，让数据洞察更轻松。',
  COALESCE(
    (SELECT ARRAY_AGG(id) FROM (SELECT id FROM public.skills WHERE is_published = true LIMIT 3) sub),
    ARRAY[]::UUID[]
  ),
  false,
  29.9,
  true,
  256,
  'data_analysis',
  auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.skill_bundles (
  name, 
  description, 
  skill_ids, 
  is_free, 
  price, 
  is_featured, 
  downloads_count,
  category,
  author_id
)
SELECT 
  '开发者助手包',
  '专为开发人员打造的能力包，包含代码审查、重构建议、文档生成等实用工具。',
  COALESCE(
    (SELECT ARRAY_AGG(id) FROM (SELECT id FROM public.skills WHERE is_published = true LIMIT 2) sub),
    ARRAY[]::UUID[]
  ),
  true,
  0,
  false,
  89,
  'development',
  auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.skill_bundles (
  name, 
  description, 
  skill_ids, 
  is_free, 
  price, 
  is_featured, 
  downloads_count,
  category,
  author_id
)
SELECT 
  '内容创作套件',
  '一站式内容创作解决方案，涵盖文案撰写、标题优化、SEO 建议等能力。',
  COALESCE(
    (SELECT ARRAY_AGG(id) FROM (SELECT id FROM public.skills WHERE is_published = true LIMIT 2) sub),
    ARRAY[]::UUID[]
  ),
  false,
  19.9,
  true,
  312,
  'content',
  auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO public.skill_bundles (
  name, 
  description, 
  skill_ids, 
  is_free, 
  price, 
  is_featured, 
  downloads_count,
  category,
  author_id
)
SELECT 
  '自动化流程包',
  '提升工作效率的自动化能力集合，支持邮件处理、日程管理、任务分配等场景。',
  COALESCE(
    (SELECT ARRAY_AGG(id) FROM (SELECT id FROM public.skills WHERE is_published = true LIMIT 3) sub),
    ARRAY[]::UUID[]
  ),
  true,
  0,
  false,
  156,
  'automation',
  auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT DO NOTHING;