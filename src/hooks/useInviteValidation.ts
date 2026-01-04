import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InviteValidationResult {
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
  inviterInfo: {
    id: string;
  } | null;
}

export function useInviteValidation(inviteCode: string): InviteValidationResult {
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviterInfo, setInviterInfo] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const validateCode = async () => {
      // Reset state
      setIsValid(false);
      setError(null);
      setInviterInfo(null);

      // Skip if code is empty or too short
      if (!inviteCode || inviteCode.length < 6) {
        return;
      }

      setIsLoading(true);

      try {
        const { data, error: queryError } = await supabase
          .from("invitations")
          .select("id, inviter_id, status, invited_user_id, expires_at")
          .eq("invite_code", inviteCode.toUpperCase())
          .maybeSingle();

        if (queryError) {
          setError("验证邀请码时出错");
          setIsLoading(false);
          return;
        }

        if (!data) {
          setError("邀请码不存在或已过期");
          setIsLoading(false);
          return;
        }

        if (data.status !== "pending" || data.invited_user_id !== null) {
          setError("邀请码已被使用");
          setIsLoading(false);
          return;
        }

        // Check expiration (additional client-side check)
        if (data.expires_at && new Date(data.expires_at) < new Date()) {
          setError("邀请码已过期");
          setIsLoading(false);
          return;
        }

        // Valid invite code
        setIsValid(true);
        setInviterInfo({ id: data.inviter_id });
        setError(null);
      } catch (err) {
        setError("验证邀请码时出错");
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce validation
    const timer = setTimeout(validateCode, 300);
    return () => clearTimeout(timer);
  }, [inviteCode]);

  return { isValid, isLoading, error, inviterInfo };
}

// Function to accept invitation after successful registration
export async function acceptInvitationOnSignup(
  inviteCode: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the invitation
    const { data: invitation, error: findError } = await supabase
      .from("invitations")
      .select("*")
      .eq("invite_code", inviteCode.toUpperCase())
      .eq("status", "pending")
      .is("invited_user_id", null)
      .single();

    if (findError || !invitation) {
      return { success: false, error: "邀请码无效或已被使用" };
    }

    // Update invitation
    const { error: updateError } = await supabase
      .from("invitations")
      .update({
        invited_user_id: userId,
        status: "accepted",
        accepted_at: new Date().toISOString(),
        reward_points: 100,
      })
      .eq("id", invitation.id);

    if (updateError) {
      return { success: false, error: "更新邀请状态失败" };
    }

    // Award points to inviter
    await supabase.from("point_transactions").insert({
      user_id: invitation.inviter_id,
      amount: 100,
      transaction_type: "invite_reward",
      description: "邀请好友奖励",
      reference_id: invitation.id,
    });

    // Award points to invitee
    await supabase.from("point_transactions").insert({
      user_id: userId,
      amount: 50,
      transaction_type: "invited_bonus",
      description: "受邀注册奖励",
      reference_id: invitation.id,
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: "处理邀请码时出错" };
  }
}
