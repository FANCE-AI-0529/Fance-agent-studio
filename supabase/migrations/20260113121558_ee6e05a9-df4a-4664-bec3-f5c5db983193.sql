-- =====================================================
-- Phase 9: GitOps 版本控制表
-- Agent Snapshots & Version Control Tables
-- =====================================================

-- Agent 快照表 (核心版本控制表)
CREATE TABLE public.agent_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Git 风格元数据
  commit_hash TEXT NOT NULL,
  commit_message TEXT NOT NULL DEFAULT '保存更改',
  parent_snapshot_id UUID REFERENCES public.agent_snapshots(id) ON DELETE SET NULL,
  
  -- 完整状态快照 (JSONB 存储)
  manifest JSONB NOT NULL DEFAULT '{}',
  graph_data JSONB NOT NULL DEFAULT '{"nodes":[],"edges":[]}',
  mounted_skills JSONB NOT NULL DEFAULT '[]',
  system_prompt TEXT,
  mplp_policy TEXT NOT NULL DEFAULT 'default',
  personality_config JSONB,
  
  -- 元数据
  is_auto_save BOOLEAN DEFAULT false,
  trigger_source TEXT DEFAULT 'manual' CHECK (trigger_source IN ('manual', 'auto', 'deploy', 'import', 'rollback')),
  change_stats JSONB,
  
  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 快照标签表 (用于标记重要版本)
CREATE TABLE public.snapshot_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES public.agent_snapshots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(snapshot_id, name)
);

-- 启用 RLS
ALTER TABLE public.agent_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_tags ENABLE ROW LEVEL SECURITY;

-- RLS 策略: 用户只能管理自己的快照
CREATE POLICY "Users can view own snapshots" 
  ON public.agent_snapshots 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own snapshots" 
  ON public.agent_snapshots 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own snapshots" 
  ON public.agent_snapshots 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS 策略: 用户只能管理自己的标签
CREATE POLICY "Users can view own tags" 
  ON public.snapshot_tags 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tags" 
  ON public.snapshot_tags 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tags" 
  ON public.snapshot_tags 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" 
  ON public.snapshot_tags 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- 索引优化
CREATE INDEX idx_agent_snapshots_agent_created ON public.agent_snapshots(agent_id, created_at DESC);
CREATE INDEX idx_agent_snapshots_commit_hash ON public.agent_snapshots(commit_hash);
CREATE INDEX idx_agent_snapshots_user ON public.agent_snapshots(user_id);
CREATE INDEX idx_snapshot_tags_snapshot ON public.snapshot_tags(snapshot_id);
CREATE INDEX idx_snapshot_tags_name ON public.snapshot_tags(name);

-- 生成 commit hash 的函数
CREATE OR REPLACE FUNCTION public.generate_commit_hash()
RETURNS TEXT AS $$
BEGIN
  RETURN substr(md5(random()::text || clock_timestamp()::text), 1, 7);
END;
$$ LANGUAGE plpgsql;

-- 自动填充 commit_hash 的触发器
CREATE OR REPLACE FUNCTION public.set_commit_hash()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.commit_hash IS NULL OR NEW.commit_hash = '' THEN
    NEW.commit_hash := public.generate_commit_hash();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_commit_hash
  BEFORE INSERT ON public.agent_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_commit_hash();