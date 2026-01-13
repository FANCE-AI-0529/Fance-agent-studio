-- 修复 Function Search Path Mutable 警告
-- 为新创建的函数设置 search_path

ALTER FUNCTION public.generate_commit_hash() SET search_path = public;
ALTER FUNCTION public.set_commit_hash() SET search_path = public;