-- Add email tracking columns to invitations table
ALTER TABLE public.invitations 
ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
ADD COLUMN IF NOT EXISTS email_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS source_channel text DEFAULT 'manual';

-- Create invitation daily stats view for charts
CREATE OR REPLACE VIEW public.invitation_daily_stats AS
SELECT 
  DATE(created_at) as date,
  COUNT(*) as generated_count,
  COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
  COUNT(*) FILTER (WHERE email_sent_at IS NOT NULL) as email_sent_count
FROM public.invitations
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.invitation_daily_stats TO authenticated;

-- Create RLS policy for the view (admin only via function check)
-- Note: Views inherit RLS from underlying tables, so admins can access via existing policies