-- =====================================================
-- MCP Server 配置表 & 执行日志表
-- 用于存储用户的 MCP Server 配置和工具调用历史
-- =====================================================

-- 创建 MCP Server 配置表
CREATE TABLE IF NOT EXISTS public.user_mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  version TEXT DEFAULT '1.0.0',
  description TEXT,
  transport_type TEXT NOT NULL CHECK (transport_type IN ('stdio', 'sse', 'http')),
  transport_url TEXT,
  transport_command TEXT,
  transport_args TEXT[],
  runtime TEXT DEFAULT 'node',
  scope TEXT DEFAULT 'user' CHECK (scope IN ('user', 'agent', 'global')),
  env_vars JSONB DEFAULT '[]'::jsonb,
  last_inspected_at TIMESTAMPTZ,
  inspection_result JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 创建 MCP 执行日志表
CREATE TABLE IF NOT EXISTS public.mcp_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  server_id UUID REFERENCES public.user_mcp_servers(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  arguments JSONB DEFAULT '{}'::jsonb,
  result JSONB,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'error', 'timeout', 'cancelled')),
  error_message TEXT,
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_mcp_servers_user_id ON public.user_mcp_servers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_mcp_servers_active ON public.user_mcp_servers(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_mcp_execution_logs_user_id ON public.mcp_execution_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_execution_logs_server_id ON public.mcp_execution_logs(server_id);
CREATE INDEX IF NOT EXISTS idx_mcp_execution_logs_agent_id ON public.mcp_execution_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_mcp_execution_logs_created_at ON public.mcp_execution_logs(created_at DESC);

-- 启用 RLS
ALTER TABLE public.user_mcp_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcp_execution_logs ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能管理自己的 MCP 服务器
CREATE POLICY "Users can view own MCP servers"
  ON public.user_mcp_servers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own MCP servers"
  ON public.user_mcp_servers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own MCP servers"
  ON public.user_mcp_servers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own MCP servers"
  ON public.user_mcp_servers FOR DELETE
  USING (auth.uid() = user_id);

-- RLS 策略：用户只能查看自己的执行日志
CREATE POLICY "Users can view own MCP logs"
  ON public.mcp_execution_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own MCP logs"
  ON public.mcp_execution_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 更新触发器
CREATE TRIGGER update_user_mcp_servers_updated_at
  BEFORE UPDATE ON public.user_mcp_servers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();