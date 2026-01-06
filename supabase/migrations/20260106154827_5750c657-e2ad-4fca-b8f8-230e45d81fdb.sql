-- Drop the security definer view and recreate as regular view
DROP VIEW IF EXISTS public.invitation_daily_stats;

-- Create view without SECURITY DEFINER (uses invoker's permissions)
CREATE VIEW public.invitation_daily_stats 
WITH (security_invoker = true) AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as generated_count,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
  COUNT(*) FILTER (WHERE email_sent_at IS NOT NULL) as email_sent_count
FROM public.invitations
GROUP BY DATE(created_at)
ORDER BY date DESC;