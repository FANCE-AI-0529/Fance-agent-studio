-- =====================================================
-- 将 vector 扩展从 public 模式迁移到 extensions 模式
-- =====================================================

-- 迁移 vector 扩展到 extensions 模式
-- 注意：pgvector 扩展可能被表使用，需要小心处理
ALTER EXTENSION vector SET SCHEMA extensions;