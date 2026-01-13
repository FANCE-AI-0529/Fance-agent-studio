-- Phase 7.1: 分级记忆架构数据库表

-- 1. 核心记忆表 (Core Memory)
-- 存储 Agent 人设、规则、用户核心事实
CREATE TABLE public.core_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('persona', 'rules', 'core_facts')),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  is_read_only BOOLEAN DEFAULT true,
  token_count INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, user_id, category, key)
);

-- 2. 归档记忆表 (Archival Memory)
-- 存储压缩的会话摘要、用户模式、经验抽象
CREATE TABLE public.memory_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  session_id TEXT,
  summary TEXT NOT NULL,
  key_insights JSONB DEFAULT '[]',
  user_patterns JSONB DEFAULT '[]',
  emotional_tone TEXT,
  topics_discussed JSONB DEFAULT '[]',
  token_count INTEGER DEFAULT 0,
  original_message_count INTEGER DEFAULT 0,
  compressed_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- 3. Dreaming 任务队列表
-- 管理后台记忆整理任务
CREATE TABLE public.dreaming_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN (
    'compress_progress', 
    'extract_patterns', 
    'archive_session', 
    'update_core_facts',
    'cleanup'
  )),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  input JSONB DEFAULT '{}',
  output JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 启用 RLS
ALTER TABLE public.core_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dreaming_tasks ENABLE ROW LEVEL SECURITY;

-- RLS 策略: 用户只能访问自己的记忆

-- core_memories 策略
CREATE POLICY "Users can view own core memories"
  ON public.core_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own core memories"
  ON public.core_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own core memories"
  ON public.core_memories FOR UPDATE
  USING (auth.uid() = user_id AND is_read_only = false);

CREATE POLICY "Users can delete own core memories"
  ON public.core_memories FOR DELETE
  USING (auth.uid() = user_id AND is_read_only = false);

-- memory_archives 策略
CREATE POLICY "Users can view own archives"
  ON public.memory_archives FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own archives"
  ON public.memory_archives FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own archives"
  ON public.memory_archives FOR DELETE
  USING (auth.uid() = user_id);

-- dreaming_tasks 策略
CREATE POLICY "Users can view own dreaming tasks"
  ON public.dreaming_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dreaming tasks"
  ON public.dreaming_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dreaming tasks"
  ON public.dreaming_tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- 索引优化
CREATE INDEX idx_core_memories_agent_user ON public.core_memories(agent_id, user_id);
CREATE INDEX idx_core_memories_category ON public.core_memories(category, priority DESC);
CREATE INDEX idx_memory_archives_user ON public.memory_archives(user_id, compressed_at DESC);
CREATE INDEX idx_memory_archives_agent ON public.memory_archives(agent_id, compressed_at DESC);
CREATE INDEX idx_dreaming_tasks_status ON public.dreaming_tasks(status, priority DESC);
CREATE INDEX idx_dreaming_tasks_user ON public.dreaming_tasks(user_id, created_at DESC);

-- 更新时间触发器
CREATE TRIGGER update_core_memories_updated_at
  BEFORE UPDATE ON public.core_memories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();