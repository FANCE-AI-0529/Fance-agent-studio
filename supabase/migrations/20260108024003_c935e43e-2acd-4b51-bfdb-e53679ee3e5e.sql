-- Create security audit logs table
CREATE TABLE public.security_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL DEFAULT 'general',
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX idx_security_audit_logs_event_type ON public.security_audit_logs(event_type);
CREATE INDEX idx_security_audit_logs_event_category ON public.security_audit_logs(event_category);
CREATE INDEX idx_security_audit_logs_created_at ON public.security_audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own logs (admins can view all via service role)
CREATE POLICY "Users can view their own audit logs"
ON public.security_audit_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Allow insert from authenticated users and anonymous (for failed login attempts)
CREATE POLICY "Allow insert audit logs"
ON public.security_audit_logs
FOR INSERT
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.security_audit_logs IS 'Security audit logs for tracking sensitive operations';