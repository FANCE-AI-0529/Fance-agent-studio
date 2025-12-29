-- 创建用户角色枚举
CREATE TYPE public.app_role AS ENUM ('admin', 'architect', 'engineer', 'operator');

-- 创建用户配置表 (profiles)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 创建用户角色表
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'operator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- 创建技能定义表
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  description TEXT,
  category TEXT NOT NULL DEFAULT 'nlp',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  inputs JSONB DEFAULT '[]',
  outputs JSONB DEFAULT '[]',
  content TEXT, -- SKILL.md 完整内容
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 创建 Agent 配置表
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT,
  model TEXT NOT NULL DEFAULT 'claude-3.5',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  mplp_policy TEXT NOT NULL DEFAULT 'default',
  manifest JSONB, -- 完整的 agent_manifest.json
  status TEXT NOT NULL DEFAULT 'draft', -- draft, deployed, archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 创建 Agent 技能关联表 (多对多)
CREATE TABLE public.agent_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, skill_id)
);

-- 创建对话会话表
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 创建对话消息表
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  skill_used TEXT, -- 使用的技能名称
  mplp_status TEXT, -- planning, confirm, executing, idle
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 创建 MPLP 追踪日志表
CREATE TABLE public.trace_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- skill_activated, confirm_required, execution_complete, intent_drift
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 启用 RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trace_logs ENABLE ROW LEVEL SECURITY;

-- 角色检查函数
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles RLS
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- User Roles RLS (只有管理员可以管理角色)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Skills RLS
CREATE POLICY "Published skills are viewable by everyone"
  ON public.skills FOR SELECT
  USING (is_published = true OR auth.uid() = author_id);

CREATE POLICY "Authors can insert skills"
  ON public.skills FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their skills"
  ON public.skills FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their skills"
  ON public.skills FOR DELETE
  USING (auth.uid() = author_id);

-- Agents RLS
CREATE POLICY "Users can view deployed agents"
  ON public.agents FOR SELECT
  USING (status = 'deployed' OR auth.uid() = author_id);

CREATE POLICY "Authors can insert agents"
  ON public.agents FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their agents"
  ON public.agents FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their agents"
  ON public.agents FOR DELETE
  USING (auth.uid() = author_id);

-- Agent Skills RLS
CREATE POLICY "Users can view agent skills for visible agents"
  ON public.agent_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agents 
      WHERE id = agent_id 
      AND (status = 'deployed' OR author_id = auth.uid())
    )
  );

CREATE POLICY "Authors can manage agent skills"
  ON public.agent_skills FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agents 
      WHERE id = agent_id 
      AND author_id = auth.uid()
    )
  );

-- Sessions RLS
CREATE POLICY "Users can view their own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Messages RLS
CREATE POLICY "Users can view messages in their sessions"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE id = session_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their sessions"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE id = session_id 
      AND user_id = auth.uid()
    )
  );

-- Trace Logs RLS
CREATE POLICY "Users can view trace logs for their sessions"
  ON public.trace_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE id = session_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert trace logs"
  ON public.trace_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions 
      WHERE id = session_id 
      AND user_id = auth.uid()
    )
  );

-- 创建自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加 updated_at 触发器
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_skills_updated_at
  BEFORE UPDATE ON public.skills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 创建新用户自动创建 profile 的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  
  -- 默认赋予 operator 角色
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operator');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 启用实时更新 (用于消息)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;