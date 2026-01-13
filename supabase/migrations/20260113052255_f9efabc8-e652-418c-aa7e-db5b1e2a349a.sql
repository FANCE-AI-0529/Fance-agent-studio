-- Manus Kernel: 虚拟文件系统 (VFS) 和内核技能注册

-- 1. 创建 agent_memory_files 表 - 存储 Agent 的内存文件
CREATE TABLE public.agent_memory_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  session_id UUID,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'markdown',
  content TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  last_modified_by TEXT DEFAULT 'system',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(agent_id, session_id, file_path)
);

-- 2. 创建 kernel_skills 表 - 系统级内核技能
CREATE TABLE public.kernel_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  file_templates JSONB NOT NULL DEFAULT '{}',
  hooks JSONB NOT NULL DEFAULT '{}',
  rules JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 修改 skills 表添加内核标识
ALTER TABLE public.skills 
ADD COLUMN IF NOT EXISTS is_kernel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS kernel_hooks JSONB DEFAULT '{}';

-- 4. 启用 RLS
ALTER TABLE public.agent_memory_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kernel_skills ENABLE ROW LEVEL SECURITY;

-- 5. agent_memory_files RLS 策略
CREATE POLICY "Users can view their agent memory files"
  ON public.agent_memory_files FOR SELECT
  USING (agent_id IN (SELECT id FROM public.agents WHERE author_id = auth.uid()));

CREATE POLICY "Users can create memory files for their agents"
  ON public.agent_memory_files FOR INSERT
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE author_id = auth.uid()));

CREATE POLICY "Users can update their agent memory files"
  ON public.agent_memory_files FOR UPDATE
  USING (agent_id IN (SELECT id FROM public.agents WHERE author_id = auth.uid()));

CREATE POLICY "Users can delete their agent memory files"
  ON public.agent_memory_files FOR DELETE
  USING (agent_id IN (SELECT id FROM public.agents WHERE author_id = auth.uid()));

-- 6. kernel_skills RLS 策略 (所有人可读)
CREATE POLICY "Everyone can read kernel skills"
  ON public.kernel_skills FOR SELECT
  USING (true);

-- 7. 创建更新时间戳触发器
CREATE TRIGGER update_agent_memory_files_updated_at
  BEFORE UPDATE ON public.agent_memory_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kernel_skills_updated_at
  BEFORE UPDATE ON public.kernel_skills
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. 创建索引优化查询
CREATE INDEX idx_agent_memory_files_agent_id ON public.agent_memory_files(agent_id);
CREATE INDEX idx_agent_memory_files_session_id ON public.agent_memory_files(session_id);
CREATE INDEX idx_agent_memory_files_file_path ON public.agent_memory_files(file_path);
CREATE INDEX idx_kernel_skills_skill_id ON public.kernel_skills(skill_id);

-- 9. 插入 Manus Planning 核心内核技能
INSERT INTO public.kernel_skills (skill_id, name, version, description, content, file_templates, hooks, rules)
VALUES (
  'core-manus-planning',
  'Planning with Files',
  '2.1.2',
  'Manus-style 文件规划系统，为每个 Agent 提供自我规划、知识沉淀和进度追踪能力',
  '# Planning with Files

## Overview
This kernel provides every Agent with self-planning capabilities through a structured file-based approach.

## Core Files
1. **task_plan.md** - Task planning board with phases and checkboxes
2. **findings.md** - Knowledge discovery repository  
3. **progress.md** - Progress tracker with timestamps

## Rules
- 2-Action Rule: Update findings.md after every 2 browsing actions
- 3-Strike Protocol: Escalate after 3 consecutive failures
- 5-Question Reboot: Context recovery check after 5 questions',
  
  '{
    "task_plan.md": "# Task Plan\n\n## Objective\n[Describe the main goal]\n\n## Phases\n- [ ] Phase 1: [Description]\n- [ ] Phase 2: [Description]\n- [ ] Phase 3: [Description]\n\n## Current Status\n**Active Phase**: 1\n**Progress**: 0%",
    "findings.md": "# Findings\n\n## Key Discoveries\n\n| # | Finding | Source | Timestamp |\n|---|---------|--------|----------|\n\n## Important Notes\n\n---\n*Last updated: [timestamp]*",
    "progress.md": "# Progress Log\n\n## Session Timeline\n\n| Time | Action | Result | Notes |\n|------|--------|--------|-------|\n\n## Errors Encountered\n\n## Decisions Made"
  }'::jsonb,
  
  '{
    "SessionStart": {"action": "INITIALIZE memory files"},
    "PreToolUse": {"matcher": "Write|Edit|MCP", "action": "READ /memory/task_plan.md"},
    "PostToolUse": {"matcher": "Write|Edit", "action": "REMIND update task_plan.md if phase completed"},
    "Stop": {"action": "CHECK all phases complete"}
  }'::jsonb,
  
  '{
    "twoActionRule": true,
    "threeStrikeProtocol": true,
    "fiveQuestionReboot": true
  }'::jsonb
);