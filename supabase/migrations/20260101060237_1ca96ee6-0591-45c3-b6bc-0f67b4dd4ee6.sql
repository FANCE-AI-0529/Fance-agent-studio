-- Agent协作表：存储Agent之间的协作关系
CREATE TABLE public.agent_collaborations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  initiator_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  target_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, connected, disconnected, rejected
  handshake_token TEXT,
  protocol_version TEXT NOT NULL DEFAULT '1.0',
  capabilities JSONB DEFAULT '[]'::jsonb, -- 共享能力列表
  trust_level NUMERIC DEFAULT 0.5, -- 信任度 0-1
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(initiator_agent_id, target_agent_id)
);

-- 协作消息表：Agent间的通信记录
CREATE TABLE public.collaboration_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaboration_id UUID NOT NULL REFERENCES public.agent_collaborations(id) ON DELETE CASCADE,
  sender_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  receiver_agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL, -- handshake_request, handshake_response, task_delegation, task_result, heartbeat, drift_alert
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'sent', -- sent, delivered, processed, failed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 漂移检测日志表
CREATE TABLE public.drift_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  drift_type TEXT NOT NULL, -- behavior_drift, output_drift, latency_drift, confidence_drift
  severity TEXT NOT NULL DEFAULT 'low', -- low, medium, high, critical
  baseline_value JSONB, -- 基线值
  current_value JSONB, -- 当前值
  deviation_score NUMERIC, -- 偏离分数 0-1
  context JSONB DEFAULT '{}'::jsonb, -- 上下文信息
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 启用 RLS
ALTER TABLE public.agent_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drift_logs ENABLE ROW LEVEL SECURITY;

-- agent_collaborations 表策略
CREATE POLICY "Users can view their own collaborations"
  ON public.agent_collaborations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collaborations"
  ON public.agent_collaborations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collaborations"
  ON public.agent_collaborations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collaborations"
  ON public.agent_collaborations FOR DELETE
  USING (auth.uid() = user_id);

-- collaboration_messages 表策略
CREATE POLICY "Users can view messages for their collaborations"
  ON public.collaboration_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.agent_collaborations ac
      WHERE ac.id = collaboration_messages.collaboration_id
      AND ac.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages for their collaborations"
  ON public.collaboration_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agent_collaborations ac
      WHERE ac.id = collaboration_messages.collaboration_id
      AND ac.user_id = auth.uid()
    )
  );

-- drift_logs 表策略
CREATE POLICY "Users can view their own drift logs"
  ON public.drift_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drift logs"
  ON public.drift_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drift logs"
  ON public.drift_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- 索引优化
CREATE INDEX idx_collaborations_user ON public.agent_collaborations(user_id);
CREATE INDEX idx_collaborations_initiator ON public.agent_collaborations(initiator_agent_id);
CREATE INDEX idx_collaborations_target ON public.agent_collaborations(target_agent_id);
CREATE INDEX idx_collaborations_status ON public.agent_collaborations(status);
CREATE INDEX idx_collab_messages_collaboration ON public.collaboration_messages(collaboration_id);
CREATE INDEX idx_collab_messages_type ON public.collaboration_messages(message_type);
CREATE INDEX idx_drift_logs_agent ON public.drift_logs(agent_id);
CREATE INDEX idx_drift_logs_severity ON public.drift_logs(severity);
CREATE INDEX idx_drift_logs_resolved ON public.drift_logs(resolved);

-- 更新时间触发器
CREATE TRIGGER update_collaborations_updated_at
  BEFORE UPDATE ON public.agent_collaborations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 启用实时更新
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drift_logs;