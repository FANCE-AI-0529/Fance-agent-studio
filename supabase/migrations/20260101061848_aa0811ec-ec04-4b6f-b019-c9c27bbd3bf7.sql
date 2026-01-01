-- Add circuit breaker state table
CREATE TABLE public.circuit_breaker_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Circuit breaker state
  state TEXT NOT NULL DEFAULT 'closed' CHECK (state IN ('closed', 'open', 'half_open')),
  failure_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  
  -- Thresholds
  failure_threshold INTEGER NOT NULL DEFAULT 5,
  success_threshold INTEGER NOT NULL DEFAULT 3,
  timeout_duration_ms INTEGER NOT NULL DEFAULT 30000,
  
  -- Timestamps
  last_failure_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  half_opened_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(agent_id, user_id)
);

-- Add intent tracking table for Delta Intent
CREATE TABLE public.intent_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  
  -- Intent information
  original_intent TEXT NOT NULL,
  current_intent TEXT NOT NULL,
  intent_embedding JSONB,
  
  -- Delta calculation
  delta_score NUMERIC NOT NULL DEFAULT 0,
  drift_detected BOOLEAN NOT NULL DEFAULT false,
  
  -- Context
  message_content TEXT,
  response_content TEXT,
  turn_number INTEGER NOT NULL DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.circuit_breaker_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intent_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for circuit_breaker_state
CREATE POLICY "Users can view their own circuit breaker state"
  ON public.circuit_breaker_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own circuit breaker state"
  ON public.circuit_breaker_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own circuit breaker state"
  ON public.circuit_breaker_state FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for intent_history
CREATE POLICY "Users can view their own intent history"
  ON public.intent_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own intent history"
  ON public.intent_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_circuit_breaker_agent ON public.circuit_breaker_state(agent_id);
CREATE INDEX idx_circuit_breaker_state ON public.circuit_breaker_state(state);
CREATE INDEX idx_intent_history_agent ON public.intent_history(agent_id);
CREATE INDEX idx_intent_history_session ON public.intent_history(session_id);
CREATE INDEX idx_intent_history_drift ON public.intent_history(drift_detected);

-- Add trigger for updated_at
CREATE TRIGGER update_circuit_breaker_updated_at
  BEFORE UPDATE ON public.circuit_breaker_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for circuit breaker state changes
ALTER PUBLICATION supabase_realtime ADD TABLE public.circuit_breaker_state;