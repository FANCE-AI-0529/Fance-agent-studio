/**
 * @file useIntentDrift.ts
 * @description 意图漂移检测钩子，用于追踪对话过程中用户意图的偏离程度
 * @module Hooks/Intent
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * 意图漂移检测结果接口
 * 
 * 表示单次消息的意图漂移分析结果。
 */
interface IntentDriftResult {
  /** 是否检测到意图漂移 */
  driftDetected: boolean;
  /** 漂移严重程度 */
  severity: "none" | "low" | "medium" | "high" | "critical";
  /** 与原始意图的相似度得分（0-1） */
  deltaScore: number;
  /** 漂移提示消息 */
  message?: string;
}

/**
 * 意图分析结果接口
 * 
 * 表示整个会话的意图漂移历史分析。
 */
interface IntentAnalysis {
  /** 总对话轮次 */
  totalTurns: number;
  /** 发生漂移的次数 */
  driftEvents: number;
  /** 平均偏离得分 */
  avgDeltaScore: number;
  /** 趋势描述 */
  trend: string;
  /** 近期历史记录 */
  recentHistory: Array<{
    /** 轮次编号 */
    turnNumber: number;
    /** 原始意图 */
    originalIntent: string;
    /** 当前意图 */
    currentIntent: string;
    /** 偏离得分 */
    deltaScore: number;
    /** 是否检测到漂移 */
    driftDetected: boolean;
  }>;
}

/**
 * 意图漂移检测钩子
 * 
 * 提供对话意图漂移的实时追踪能力，通过比较当前消息与首条消息（基准意图）的语义相似度，
 * 检测用户是否偏离了原始对话目标。支持严重程度分级和历史分析。
 * 
 * @param {string | undefined} agentId - 智能体标识
 * @returns {Object} - 追踪方法、分析方法及状态
 * 
 * @example
 * ```tsx
 * const { trackIntent, resetSession } = useIntentDrift(agentId);
 * 
 * const result = await trackIntent("我想查询天气");
 * if (result?.driftDetected) {
 *   console.warn(result.message);
 * }
 * ```
 */
export function useIntentDrift(agentId?: string) {
  // [状态]：使用ref保持对话基准意图和轮次计数
  const originalIntentRef = useRef<string | null>(null);
  const turnNumberRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);

  /**
   * 追踪当前消息的意图漂移
   * 
   * 首条消息作为基准意图，后续消息与基准进行比较计算偏离程度。
   * 
   * @param {string} currentMessage - 当前用户消息
   * @param {string} responseContent - 智能体响应内容（可选）
   * @returns {Promise<IntentDriftResult | null>} - 漂移检测结果
   */
  const trackIntent = useCallback(async (
    currentMessage: string,
    responseContent?: string
  ): Promise<IntentDriftResult | null> => {
    // [验证]：无智能体ID时跳过追踪
    if (!agentId) return null;

    // [基准设定]：首条消息成为基准意图
    if (turnNumberRef.current === 0) {
      originalIntentRef.current = currentMessage;
      turnNumberRef.current = 1;
      return { driftDetected: false, severity: "none", deltaScore: 1.0 };
    }

    turnNumberRef.current += 1;

    try {
      // [认证]：获取当前会话令牌
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      // [调用]：请求边缘函数进行漂移分析
      const response = await supabase.functions.invoke("delta-intent", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: "track",
          agentId,
          originalIntent: originalIntentRef.current,
          currentIntent: currentMessage,
          turnNumber: turnNumberRef.current,
          sessionId: sessionIdRef.current,
          messageContent: currentMessage,
          responseContent,
        },
      });

      if (response.error) {
        return null;
      }

      const data = response.data;
      
      // [存储]：保存返回的会话ID
      if (data?.sessionId && !sessionIdRef.current) {
        sessionIdRef.current = data.sessionId;
      }

      // [构建]：组装漂移检测结果
      return {
        driftDetected: data?.driftDetected || false,
        severity: data?.severity || "none",
        deltaScore: data?.deltaScore || 1.0,
        message: data?.driftDetected 
          ? `检测到意图漂移 (${data.severity}): 当前话题与最初意图偏离 ${Math.round((1 - data.deltaScore) * 100)}%` 
          : undefined,
      };
    } catch (error) {
      return null;
    }
  }, [agentId]);

  /**
   * 分析意图历史
   * 
   * 获取当前智能体的完整意图漂移历史分析报告。
   * 
   * @returns {Promise<IntentAnalysis | null>} - 历史分析结果
   */
  const analyzeIntentHistory = useCallback(async (): Promise<IntentAnalysis | null> => {
    if (!agentId) return null;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return null;

      // [调用]：请求历史分析
      const response = await supabase.functions.invoke("delta-intent", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          action: "analyze",
          agentId,
        },
      });

      if (response.error) {
        return null;
      }

      return response.data as IntentAnalysis;
    } catch (error) {
      return null;
    }
  }, [agentId]);

  /**
   * 重置会话状态
   * 
   * 清除当前追踪会话，下一条消息将成为新的基准意图。
   */
  const resetSession = useCallback(() => {
    originalIntentRef.current = null;
    turnNumberRef.current = 0;
    sessionIdRef.current = null;
  }, []);

  return {
    /** 追踪意图漂移 */
    trackIntent,
    /** 分析意图历史 */
    analyzeIntentHistory,
    /** 重置会话 */
    resetSession,
    /** 当前对话轮次 */
    currentTurn: turnNumberRef.current,
    /** 是否已设定基准意图 */
    hasOriginalIntent: !!originalIntentRef.current,
  };
}
