/**
 * @file useInvite.ts
 * @description 邀请系统钩子，提供邀请码生成、发送、接受及积分管理功能
 * @module Hooks/Invite
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "./use-toast.ts";

/**
 * 邀请记录接口
 * 
 * 表示一条邀请记录的完整信息。
 */
export interface Invitation {
  /** 邀请记录唯一标识 */
  id: string;
  /** 邀请码 */
  invite_code: string;
  /** 邀请人用户ID */
  inviter_id: string;
  /** 被邀请人邮箱 */
  invited_email: string | null;
  /** 被邀请人用户ID */
  invited_user_id: string | null;
  /** 邀请状态 */
  status: string;
  /** 奖励积分数 */
  reward_points: number;
  /** 创建时间 */
  created_at: string;
  /** 接受时间 */
  accepted_at: string | null;
}

/**
 * 积分交易记录接口
 * 
 * 表示一条积分变动记录。
 */
export interface PointTransaction {
  /** 交易记录唯一标识 */
  id: string;
  /** 用户ID */
  user_id: string;
  /** 变动金额 */
  amount: number;
  /** 交易类型 */
  transaction_type: string;
  /** 交易描述 */
  description: string | null;
  /** 关联引用ID */
  reference_id: string | null;
  /** 创建时间 */
  created_at: string;
}

/**
 * 获取用户邀请码钩子
 * 
 * 查询或生成当前用户的专属邀请码。若不存在则自动创建新邀请码。
 * 
 * @returns {UseQueryResult} - 包含邀请码的查询结果
 */
export function useMyInviteCode() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-invite-code", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // [查询]：检查是否存在未使用的邀请记录
      const { data: existing } = await supabase
        .from("invitations")
        .select("invite_code")
        .eq("inviter_id", user.id)
        .is("invited_user_id", null)
        .limit(1)
        .maybeSingle();

      if (existing) return existing.invite_code;

      // [生成]：创建新邀请码
      const code = generateInviteCode();
      
      const { data, error } = await supabase
        .from("invitations")
        .insert({
          inviter_id: user.id,
          invite_code: code,
          status: "pending",
        })
        .select("invite_code")
        .single();

      if (error) throw error;
      return data.invite_code;
    },
    enabled: !!user?.id,
  });
}

/**
 * 获取已发送邀请列表钩子
 * 
 * 查询当前用户发出的所有邀请记录。
 * 
 * @returns {UseQueryResult} - 包含邀请列表的查询结果
 */
export function useSentInvitations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sent-invitations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("inviter_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!user?.id,
  });
}

/**
 * 获取用户积分余额钩子
 * 
 * 计算当前用户的累计积分余额。
 * 
 * @returns {UseQueryResult} - 包含积分余额的查询结果
 */
export function usePointsBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["points-balance", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;

      // [查询]：获取所有积分交易记录
      const { data, error } = await supabase
        .from("point_transactions")
        .select("amount")
        .eq("user_id", user.id);

      if (error) throw error;
      
      // [计算]：累加所有交易金额
      return data?.reduce((sum, t) => sum + t.amount, 0) || 0;
    },
    enabled: !!user?.id,
  });
}

/**
 * 获取积分交易历史钩子
 * 
 * 查询当前用户最近50条积分变动记录。
 * 
 * @returns {UseQueryResult} - 包含交易历史的查询结果
 */
export function usePointsHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["points-history", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as PointTransaction[];
    },
    enabled: !!user?.id,
  });
}

/**
 * 获取邀请统计数据钩子
 * 
 * 统计当前用户的邀请情况，包括总数、已接受数、待处理数及累计积分。
 * 
 * @returns {UseQueryResult} - 包含统计数据的查询结果
 */
export function useInvitationStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["invitation-stats", user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, accepted: 0, pending: 0, totalPoints: 0 };

      const { data, error } = await supabase
        .from("invitations")
        .select("status, reward_points")
        .eq("inviter_id", user.id);

      if (error) throw error;

      // [统计]：计算各类数据
      const total = data?.length || 0;
      const accepted = data?.filter(i => i.status === "accepted").length || 0;
      const pending = data?.filter(i => i.status === "pending").length || 0;
      const totalPoints = data?.filter(i => i.status === "accepted")
        .reduce((sum, i) => sum + (i.reward_points || 0), 0) || 0;

      return { total, accepted, pending, totalPoints };
    },
    enabled: !!user?.id,
  });
}

/**
 * 接受邀请钩子
 * 
 * 使用邀请码完成邀请接受流程，双方均获得积分奖励。
 * 
 * @returns {UseMutationResult} - 邀请接受变更操作
 */
export function useAcceptInvitation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (inviteCode: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      // [查询]：验证邀请码有效性
      const { data: invitation, error: findError } = await supabase
        .from("invitations")
        .select("*")
        .eq("invite_code", inviteCode)
        .eq("status", "pending")
        .is("invited_user_id", null)
        .single();

      if (findError || !invitation) {
        throw new Error("邀请码无效或已被使用");
      }

      // [验证]：防止自我邀请
      if (invitation.inviter_id === user.id) {
        throw new Error("不能使用自己的邀请码");
      }

      // [更新]：标记邀请已接受
      const { error: updateError } = await supabase
        .from("invitations")
        .update({
          invited_user_id: user.id,
          status: "accepted",
          accepted_at: new Date().toISOString(),
          reward_points: 100,
        })
        .eq("id", invitation.id);

      if (updateError) throw updateError;

      // [奖励]：为邀请人发放积分
      await supabase.from("point_transactions").insert({
        user_id: invitation.inviter_id,
        amount: 100,
        transaction_type: "invite_reward",
        description: "邀请好友奖励",
        reference_id: invitation.id,
      });

      // [奖励]：为被邀请人发放积分
      await supabase.from("point_transactions").insert({
        user_id: user.id,
        amount: 50,
        transaction_type: "invited_bonus",
        description: "受邀注册奖励",
        reference_id: invitation.id,
      });

      return invitation;
    },
    onSuccess: () => {
      // [刷新]：更新相关查询缓存
      queryClient.invalidateQueries({ queryKey: ["points-balance"] });
      queryClient.invalidateQueries({ queryKey: ["points-history"] });
      toast({
        title: "邀请码已使用",
        description: "恭喜获得 50 积分奖励！",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "使用失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * 生成邀请码
 * 
 * 创建8位随机邀请码，使用易辨识字符集避免混淆。
 * 
 * @returns {string} - 8位大写字母数字组合的邀请码
 */
function generateInviteCode(): string {
  // [字符集]：排除易混淆字符（0、O、1、I、L）
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
