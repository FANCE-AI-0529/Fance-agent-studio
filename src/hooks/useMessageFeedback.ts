/**
 * @file useMessageFeedback.ts
 * @description 消息反馈钩子，提供对智能体消息的点赞/点踩功能
 * @module Hooks/Feedback
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useState, useEffect } from "react";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";

/**
 * 反馈类型
 * 
 * 定义消息反馈的可能值。
 */
type FeedbackType = "like" | "dislike" | null;

/**
 * 消息反馈钩子
 * 
 * 提供对特定消息的点赞/点踩功能，支持切换和取消操作。
 * 自动获取用户对该消息的现有反馈状态。
 * 
 * @param {string} messageId - 消息唯一标识
 * @returns {Object} - 反馈状态和操作方法
 * 
 * @example
 * ```tsx
 * const { isLiked, isDisliked, submitFeedback, isLoading } = useMessageFeedback(messageId);
 * 
 * return (
 *   <div>
 *     <button onClick={() => submitFeedback('like')} disabled={isLoading}>
 *       {isLiked ? '👍' : '👍🏻'}
 *     </button>
 *     <button onClick={() => submitFeedback('dislike')} disabled={isLoading}>
 *       {isDisliked ? '👎' : '👎🏻'}
 *     </button>
 *   </div>
 * );
 * ```
 */
export function useMessageFeedback(messageId: string) {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackType>(null);
  const [isLoading, setIsLoading] = useState(false);

  // [初始化]：组件挂载时获取用户对该消息的现有反馈
  useEffect(() => {
    if (!user || !messageId) return;

    /**
     * 获取现有反馈状态
     */
    const fetchFeedback = async () => {
      const { data } = await supabase
        .from("message_feedback")
        .select("feedback_type")
        .eq("message_id", messageId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setFeedback(data.feedback_type as FeedbackType);
      }
    };

    fetchFeedback();
  }, [messageId, user]);

  /**
   * 提交反馈
   * 
   * 处理用户的点赞/点踩操作，支持切换和取消。
   * 
   * @param {FeedbackType} type - 反馈类型
   */
  const submitFeedback = async (type: FeedbackType) => {
    // [验证]：检查前置条件
    if (!user || !messageId || isLoading) return;

    setIsLoading(true);

    try {
      if (type === null) {
        // [移除]：用户明确要求移除反馈
        await supabase
          .from("message_feedback")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id);
        setFeedback(null);
      } else if (feedback === type) {
        // [切换关闭]：再次点击相同类型则取消反馈
        await supabase
          .from("message_feedback")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id);
        setFeedback(null);
      } else {
        // [更新/创建]：使用upsert确保记录存在
        await supabase
          .from("message_feedback")
          .upsert(
            {
              message_id: messageId,
              user_id: user.id,
              feedback_type: type,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "message_id,user_id" }
          );
        setFeedback(type);
      }
    } catch (error) {
      // [静默处理]：反馈操作失败不影响用户体验
    } finally {
      setIsLoading(false);
    }
  };

  return {
    /** 当前反馈状态 */
    feedback,
    /** 是否正在提交中 */
    isLoading,
    /** 提交反馈方法 */
    submitFeedback,
    /** 是否已点赞 */
    isLiked: feedback === "like",
    /** 是否已点踩 */
    isDisliked: feedback === "dislike",
  };
}
