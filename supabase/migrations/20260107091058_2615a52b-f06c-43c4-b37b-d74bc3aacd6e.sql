-- =====================================================
-- 将扩展从 public 模式迁移到专用 extensions 模式
-- =====================================================

-- 1. 创建 extensions 模式（如果不存在）
CREATE SCHEMA IF NOT EXISTS extensions;

-- 2. 授予必要的权限
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- 3. 将 uuid-ossp 扩展迁移到 extensions 模式
-- 注意：需要先删除旧扩展，再在新模式中创建
DROP EXTENSION IF EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- 4. 将 pgcrypto 扩展迁移到 extensions 模式（如果存在）
DROP EXTENSION IF EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- 5. 更新数据库搜索路径，包含 extensions 模式
-- 这样可以直接使用扩展函数而无需指定模式前缀
ALTER DATABASE postgres SET search_path TO public, extensions;