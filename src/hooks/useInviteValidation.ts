import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InviteValidationResult {
  isValid: boolean;
  isLoading: boolean;
  error: string | null;
  invitationId: string | null;
}

export function useInviteValidation(inviteCode: string): InviteValidationResult {
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationId, setInvitationId] = useState<string | null>(null);

  useEffect(() => {
    const validateCode = async () => {
      // Reset state
      setIsValid(false);
      setError(null);
      setInvitationId(null);

      // Skip if code is empty or too short
      if (!inviteCode || inviteCode.trim().length < 4) {
        return;
      }

      setIsLoading(true);

      try {
        // 使用 Edge Function 验证邀请码（安全，不暴露敏感数据）
        const { data, error: fnError } = await supabase.functions.invoke(
          'validate-invite-code',
          { body: { code: inviteCode } }
        );

        if (fnError) {
          console.error('[useInviteValidation] Function error:', fnError);
          setError("验证邀请码时出错");
          setIsLoading(false);
          return;
        }

        if (!data.valid) {
          setError(data.error || "邀请码无效");
          setIsLoading(false);
          return;
        }

        // Valid invite code
        setIsValid(true);
        setInvitationId(data.invitationId);
        setError(null);
      } catch (err) {
        console.error('[useInviteValidation] Error:', err);
        setError("验证邀请码时出错");
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce validation
    const timer = setTimeout(validateCode, 300);
    return () => clearTimeout(timer);
  }, [inviteCode]);

  return { isValid, isLoading, error, invitationId };
}

// Function to accept invitation after successful registration
// 使用 Edge Function 安全认领邀请码
export async function acceptInvitationOnSignup(
  invitationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error: fnError } = await supabase.functions.invoke(
      'claim-invite-code',
      { body: { invitationId, userId } }
    );

    if (fnError) {
      console.error('[acceptInvitationOnSignup] Function error:', fnError);
      return { success: false, error: "处理邀请码时出错" };
    }

    if (!data.success) {
      return { success: false, error: data.error || "邀请码无效" };
    }

    return { success: true };
  } catch (err) {
    console.error('[acceptInvitationOnSignup] Error:', err);
    return { success: false, error: "处理邀请码时出错" };
  }
}
