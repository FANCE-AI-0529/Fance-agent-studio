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
    const { invitationId, userId } = await req.json();

    // 输入验证
    if (!invitationId || typeof invitationId !== 'string') {
      console.log('[claim-invite-code] Missing or invalid invitationId');
      return new Response(
        JSON.stringify({ success: false, error: '邀请ID不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId || typeof userId !== 'string') {
      console.log('[claim-invite-code] Missing or invalid userId');
      return new Response(
        JSON.stringify({ success: false, error: '用户ID不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 使用 service_role 创建客户端，绕过 RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('[claim-invite-code] Claiming invitation:', invitationId, 'for user:', userId);

    // 查询邀请码
    const { data: invitation, error: findError } = await supabaseAdmin
      .from('invitations')
      .select('id, inviter_id, status, invited_user_id, expires_at')
      .eq('id', invitationId)
      .single();

    if (findError || !invitation) {
      console.log('[claim-invite-code] Invitation not found:', invitationId);
      return new Response(
        JSON.stringify({ success: false, error: '邀请码不存在' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查状态
    if (invitation.status !== 'pending') {
      console.log('[claim-invite-code] Invitation already used:', invitationId);
      return new Response(
        JSON.stringify({ success: false, error: '邀请码已被使用' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查是否已被认领
    if (invitation.invited_user_id) {
      console.log('[claim-invite-code] Invitation already claimed:', invitationId);
      return new Response(
        JSON.stringify({ success: false, error: '邀请码已被认领' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 检查过期时间
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      console.log('[claim-invite-code] Invitation expired:', invitationId);
      return new Response(
        JSON.stringify({ success: false, error: '邀请码已过期' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 防止自己邀请自己
    if (invitation.inviter_id === userId) {
      console.log('[claim-invite-code] Self-invite attempt:', userId);
      return new Response(
        JSON.stringify({ success: false, error: '不能使用自己的邀请码' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 更新邀请状态
    const { error: updateError } = await supabaseAdmin
      .from('invitations')
      .update({
        invited_user_id: userId,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        reward_points: 100,
      })
      .eq('id', invitation.id);

    if (updateError) {
      console.error('[claim-invite-code] Update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: '更新邀请状态失败' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 给邀请者发放积分
    const { error: inviterPointsError } = await supabaseAdmin
      .from('point_transactions')
      .insert({
        user_id: invitation.inviter_id,
        amount: 100,
        transaction_type: 'invite_reward',
        description: '邀请好友奖励',
        reference_id: invitation.id,
      });

    if (inviterPointsError) {
      console.error('[claim-invite-code] Inviter points error:', inviterPointsError);
    }

    // 给被邀请者发放积分
    const { error: inviteePointsError } = await supabaseAdmin
      .from('point_transactions')
      .insert({
        user_id: userId,
        amount: 50,
        transaction_type: 'invited_bonus',
        description: '受邀注册奖励',
        reference_id: invitation.id,
      });

    if (inviteePointsError) {
      console.error('[claim-invite-code] Invitee points error:', inviteePointsError);
    }

    console.log('[claim-invite-code] Successfully claimed:', invitationId);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[claim-invite-code] Error:', err);
    return new Response(
      JSON.stringify({ success: false, error: '处理邀请码时出错' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
