-- 沙箱执行记录表
CREATE TABLE sandbox_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  execution_token TEXT UNIQUE NOT NULL,
  
  -- 配置
  config JSONB NOT NULL,
  input JSONB,
  
  -- 结果
  success BOOLEAN NOT NULL,
  output JSONB,
  error JSONB,
  
  -- 指标
  cpu_time_ms INTEGER,
  memory_peak_mb REAL,
  execution_time_ms INTEGER NOT NULL,
  network_requests_count INTEGER DEFAULT 0,
  network_bytes_in BIGINT DEFAULT 0,
  network_bytes_out BIGINT DEFAULT 0,
  
  -- 时间戳
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 网络策略表
CREATE TABLE network_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- 策略配置
  mode TEXT NOT NULL CHECK (mode IN ('deny_all', 'allow_whitelist', 'mplp_controlled')),
  whitelist JSONB DEFAULT '[]',
  mplp_bindings JSONB DEFAULT '[]',
  
  -- 元数据
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, name)
);

-- 网络访问日志表
CREATE TABLE network_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES sandbox_executions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- 请求信息
  method TEXT NOT NULL,
  url TEXT NOT NULL,
  domain TEXT NOT NULL,
  
  -- 状态
  status TEXT NOT NULL CHECK (status IN ('allowed', 'blocked', 'rate_limited')),
  block_reason TEXT,
  
  -- 响应信息
  response_status INTEGER,
  duration_ms INTEGER,
  bytes_in BIGINT,
  bytes_out BIGINT,
  
  -- 时间戳
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- RLS 策略
ALTER TABLE sandbox_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_access_logs ENABLE ROW LEVEL SECURITY;

-- sandbox_executions RLS
CREATE POLICY "Users can view own executions" ON sandbox_executions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own executions" ON sandbox_executions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- network_policies RLS
CREATE POLICY "Users can view own policies" ON network_policies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own policies" ON network_policies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own policies" ON network_policies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own policies" ON network_policies
  FOR DELETE USING (auth.uid() = user_id);

-- network_access_logs RLS
CREATE POLICY "Users can view own network logs" ON network_access_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own network logs" ON network_access_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 索引优化
CREATE INDEX idx_sandbox_executions_user ON sandbox_executions(user_id, created_at DESC);
CREATE INDEX idx_sandbox_executions_skill ON sandbox_executions(skill_id, created_at DESC);
CREATE INDEX idx_sandbox_executions_token ON sandbox_executions(execution_token);
CREATE INDEX idx_network_policies_user ON network_policies(user_id);
CREATE INDEX idx_network_access_logs_execution ON network_access_logs(execution_id);
CREATE INDEX idx_network_access_logs_domain ON network_access_logs(domain, timestamp DESC);
CREATE INDEX idx_network_access_logs_user ON network_access_logs(user_id, timestamp DESC);