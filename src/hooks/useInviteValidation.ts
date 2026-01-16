/**
 * @file useInviteValidation.ts
 * @description 邀请码验证钩子，提供实时邀请码有效性检查和注册时认领功能
 * @module Hooks/Invite
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * 邀请码验证结果接口
 * 
 * 表示邀请码验证的完整结果状态。
 */
interface InviteValidationResult {
  /** 邀请码是否有效 */
  isValid: boolean;
  /** 是否正在验证中 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 邀请记录ID（验证成功时返回） */
  invitationId: string | null;
}

/**
 * 邀请码验证钩子
 * 
 * 提供实时邀请码验证能力，带防抖处理。通过边缘函数安全验证邀请码有效性，
 * 不暴露敏感数据到客户端。
 * 
 * @param {string} inviteCode - 待验证的邀请码
 * @returns {InviteValidationResult} - 验证结果状态
 * 
 * @example
 * ```tsx
 * const { isValid, isLoading, error } = useInviteValidation(inputCode);
 * 
 * if (isValid) {
 *   console.log('邀请码有效');
 * }
 * ```
 */
export function useInviteValidation(inviteCode: string): InviteValidationResult {
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationId, setInvitationId] = useState<string | null>(null);

  useEffect(() => {
    /**
     * 执行邀请码验证
     * 
     * 通过边缘函数验证邀请码，确保安全性。
     */
    const validateCode = async () => {
      // [重置]：清空之前的验证状态
      setIsValid(false);
      setError(null);
      setInvitationId(null);

      // [跳过]：邀请码为空或过短时跳过验证
      if (!inviteCode || inviteCode.trim().length < 4) {
        return;
      }

      setIsLoading(true);

      try {
        // [调用]：通过边缘函数安全验证邀请码
        const { data, error: fnError } = await supabase.functions.invoke(
          'validate-invite-code',
          { body: { code: inviteCode } }
        );

        if (fnError) {
          setError("验证邀请码时出错");
          setIsLoading(false);
          return;
        }

        // [处理]：根据验证结果更新状态
        if (!data.valid) {
          setError(data.error || "邀请码无效");
          setIsLoading(false);
          return;
        }

        // [成功]：邀请码有效
        setIsValid(true);
        setInvitationId(data.invitationId);
        setError(null);
      } catch (err) {
        setError("验证邀请码时出错");
      } finally {
        setIsLoading(false);
      }
    };

    // [防抖]：延迟300ms执行验证，避免频繁请求
    const timer = setTimeout(validateCode, 300);
    return () => clearTimeout(timer);
  }, [inviteCode]);

  return { isValid, isLoading, error, invitationId };
}

/**
 * 注册成功后认领邀请码
 * 
 * 在用户注册成功后调用，将邀请记录与新用户关联。
 * 通过边缘函数安全处理，避免绕过验证直接操作数据库。
 * 
 * @param {string} invitationId - 邀请记录ID
 * @param {string} userId - 新注册用户ID
 * @returns {Promise<{ success: boolean; error?: string }>} - 认领结果
 * 
 * @example
 * ```tsx
 * // 注册成功后
 * const result = await acceptInvitationOnSignup(invitationId, newUserId);
 * if (result.success) {
 *   console.log('邀请已认领');
 * }
 * ```
 */
export async function acceptInvitationOnSignup(
  invitationId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // [调用]：通过边缘函数安全认领邀请码
    const { data, error: fnError } = await supabase.functions.invoke(
      'claim-invite-code',
      { body: { invitationId, userId } }
    );

    if (fnError) {
      return { success: false, error: "处理邀请码时出错" };
    }

    if (!data.success) {
      return { success: false, error: data.error || "邀请码无效" };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "处理邀请码时出错" };
  }
}
