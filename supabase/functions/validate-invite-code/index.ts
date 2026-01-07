import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code } = await req.json();

    // 输入验证
    if (!code || typeof code !== 'string') {
      console.log('[validate-invite-code] Missing or invalid code');
      return new Response(
        JSON.stringify({ valid: false, error: '邀请码不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmedCode = code.trim().toUpperCase();
    
    if (trimmedCode.length < 4 || trimmedCode.length > 20) {
      console.log('[validate-invite-code] Code length invalid:', trimmedCode.length);
      return new Response(
        JSON.stringify({ valid: false, error: '邀请码格式无效' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 使用 service_role 创建客户端，绕过 RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('[validate-invite-code] Validating code:', trimmedCode);

    // 查询邀请码
    const { data: invitation, error } = await supabaseAdmin
      .from('invitations')
      .select('id, status, expires_at, invited_user_id')
      .eq('code', trimmedCode)
      .single();

    if (error || !invitation) {
      console.log('[validate-invite-code] Code not found:', trimmedCode);
      return new Response(
        JSON.stringify({ valid: false, error: '邀请码不存在' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查状态
    if (invitation.status !== 'pending') {
      console.log('[validate-invite-code] Code already used:', trimmedCode, invitation.status);
      return new Response(
        JSON.stringify({ valid: false, error: '邀请码已被使用' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查是否已被认领
    if (invitation.invited_user_id) {
      console.log('[validate-invite-code] Code already claimed:', trimmedCode);
      return new Response(
        JSON.stringify({ valid: false, error: '邀请码已被认领' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查过期时间
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      console.log('[validate-invite-code] Code expired:', trimmedCode);
      return new Response(
        JSON.stringify({ valid: false, error: '邀请码已过期' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[validate-invite-code] Code is valid:', trimmedCode);
    
    // 返回有效状态（不暴露敏感信息如邮箱）
    return new Response(
      JSON.stringify({ 
        valid: true, 
        invitationId: invitation.id 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[validate-invite-code] Error:', err);
    return new Response(
      JSON.stringify({ valid: false, error: '验证失败，请稍后重试' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
