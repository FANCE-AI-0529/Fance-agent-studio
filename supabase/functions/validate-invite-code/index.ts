import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightIfNeeded } from "../_shared/cors.ts";

serve(async (req) => {
  const preflightResponse = handleCorsPreflightIfNeeded(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { code } = await req.json();

    if (!code || typeof code !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: '邀请码不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedCode = code.trim().toUpperCase();
    
    if (trimmedCode.length < 4 || trimmedCode.length > 20) {
      return new Response(
        JSON.stringify({ valid: false, error: '邀请码格式无效' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .select('id, status, expires_at, invited_user_id')
      .eq('code', trimmedCode)
      .single();

    // M1: Unified error message to prevent invite code enumeration
    const GENERIC_INVALID_MSG = '邀请码无效或已过期';

    if (error || !invitation) {
      return new Response(
        JSON.stringify({ valid: false, error: GENERIC_INVALID_MSG }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.status !== 'pending' || invitation.invited_user_id) {
      return new Response(
        JSON.stringify({ valid: false, error: GENERIC_INVALID_MSG }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ valid: false, error: GENERIC_INVALID_MSG }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true, invitationId: invitation.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[validate-invite-code] Error:', err instanceof Error ? err.message : 'Unknown');
    return new Response(
      JSON.stringify({ valid: false, error: '验证失败，请稍后重试' }),
      { status: 500, headers: { ...getCorsHeaders(req.headers.get("origin")), 'Content-Type': 'application/json' } }
    );
  }
});
