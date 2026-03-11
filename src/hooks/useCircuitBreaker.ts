/**
 * @file useCircuitBreaker.ts
 * @description 熔断器与意图漂移管理钩子模块，提供智能体运行时的故障保护和意图追踪功能
 * @module Hooks/CircuitBreaker
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "sonner";
import { useEffect } from "react";

// ============================================================================
// 熔断器类型定义
// ============================================================================

/**
 * 熔断器状态枚举
 * - closed: 关闭状态，正常工作
 * - open: 开启状态，拒绝所有请求
 * - half_open: 半开状态，允许部分请求进行测试
 */
export type CircuitState = "closed" | "open" | "half_open";

/**
 * 熔断器状态数据结构
 * 记录熔断器的完整状态信息
 */
export interface CircuitBreakerState {
  /** 状态记录ID */
  id: string;
  /** 关联的智能体ID */
  agent_id: string;
  /** 所属用户ID */
  user_id: string;
  /** 当前熔断状态 */
  state: CircuitState;
  /** 连续失败次数 */
  failure_count: number;
  /** 连续成功次数（半开状态下使用） */
  success_count: number;
  /** 触发熔断的失败阈值 */
  failure_threshold: number;
  /** 恢复到关闭状态的成功阈值 */
  success_threshold: number;
  /** 熔断超时时间（毫秒） */
  timeout_duration_ms: number;
  /** 最后一次失败时间 */
  last_failure_at: string | null;
  /** 熔断器开启时间 */
  opened_at: string | null;
  /** 进入半开状态时间 */
  half_opened_at: string | null;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

/**
 * 熔断器配置参数
 */
export interface CircuitBreakerConfig {
  /** 触发熔断的连续失败次数阈值 */
  failureThreshold: number;
  /** 从半开状态恢复的连续成功次数阈值 */
  successThreshold: number;
  /** 熔断超时时间（毫秒） */
  timeoutDuration: number;
}

// ============================================================================
// 意图历史类型定义
// ============================================================================

/**
 * 意图历史记录数据结构
 * 记录对话过程中的意图变化
 */
export interface IntentHistory {
  /** 记录ID */
  id: string;
  /** 关联的智能体ID */
  agent_id: string;
  /** 会话ID */
  session_id: string | null;
  /** 用户ID */
  user_id: string;
  /** 原始意图 */
  original_intent: string;
  /** 当前意图 */
  current_intent: string;
  /** 意图变化分数 */
  delta_score: number;
  /** 是否检测到漂移 */
  drift_detected: boolean;
  /** 用户消息内容 */
  message_content: string | null;
  /** 智能体响应内容 */
  response_content: string | null;
  /** 对话轮次编号 */
  turn_number: number;
  /** 创建时间 */
  created_at: string;
}

/**
 * 意图分析结果数据结构
 */
export interface IntentAnalysis {
  /** 总对话轮次 */
  totalTurns: number;
  /** 漂移事件次数 */
  driftEvents: number;
  /** 漂移率 */
  driftRate: string;
  /** 平均意图变化分数 */
  avgDeltaScore: string;
  /** 近期平均变化分数 */
  recentAvgDelta: string;
  /** 变化趋势 */
  trend: "stable" | "increasing" | "decreasing";
  /** 建议措施 */
  recommendation: string;
}

// ============================================================================
// 熔断器钩子函数
// ============================================================================

/**
 * 获取熔断器状态钩子
 * 
 * 该钩子函数查询指定智能体的熔断器当前状态，
 * 每 5 秒自动刷新一次以保持状态同步。
 * 
 * @param {string} agentId - 智能体唯一标识符
 * @returns {UseQueryResult<CircuitBreakerState | null>} 包含熔断器状态的查询结果
 */
export function useCircuitBreakerState(agentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["circuit-breaker", user?.id, agentId],
    queryFn: async () => {
      if (!agentId) return null;
      
      // [调用]：通过 Edge Function 获取熔断器状态
      const response = await supabase.functions.invoke("circuit-breaker", {
        body: { action: "get_state", agentId },
      });

      if (response.error) throw response.error;
      return response.data?.cbState as CircuitBreakerState | null;
    },
    enabled: !!user && !!agentId,
    // [刷新]：每 5 秒自动刷新状态
    refetchInterval: 5000,
  });
}

/**
 * 实时熔断器状态监听钩子
 * 
 * 该钩子函数订阅熔断器状态的实时变更，
 * 当状态发生变化时触发回调函数。
 * 
 * @param {string | null} agentId - 智能体ID
 * @param {Function} onStateChange - 状态变更回调函数
 */
export function useRealtimeCircuitBreaker(
  agentId: string | null,
  onStateChange: (state: CircuitBreakerState) => void
) {
  const { user } = useAuth();

  useEffect(() => {
    // [校验]：确保参数有效
    if (!agentId || !user) return;

    // [订阅]：建立实时通道监听状态变更
    const channel = supabase
      .channel(`circuit-breaker-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "circuit_breaker_state",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          // [回调]：状态变更时触发回调
          if (payload.new) {
            onStateChange(payload.new as CircuitBreakerState);
          }
        }
      )
      .subscribe();

    // [清理]：组件卸载时移除订阅
    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId, user, onStateChange]);
}

/**
 * 检查熔断器状态钩子
 * 
 * 用于在发起请求前检查熔断器是否允许通过
 * 
 * @returns {UseMutationResult} 包含检查操作的变更结果
 */
export function useCheckCircuit() {
  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await supabase.functions.invoke("circuit-breaker", {
        body: { action: "check", agentId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
  });
}

/**
 * 记录成功请求钩子
 * 
 * 当请求成功时调用，用于更新熔断器的成功计数，
 * 在半开状态下达到阈值时会自动恢复到关闭状态。
 * 
 * @returns {UseMutationResult} 包含记录操作的变更结果
 */
export function useRecordSuccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await supabase.functions.invoke("circuit-breaker", {
        body: { action: "record_success", agentId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      // [刷新]：使缓存失效
      queryClient.invalidateQueries({ queryKey: ["circuit-breaker"] });
      
      // [通知]：从半开状态恢复时显示提示
      if (data.previousState === "half_open" && data.newState === "closed") {
        toast.success("熔断器已恢复", { description: "Agent重新上线" });
      }
    },
  });
}

/**
 * 记录失败请求钩子
 * 
 * 当请求失败时调用，用于更新熔断器的失败计数，
 * 达到阈值时会自动触发熔断。
 * 
 * @returns {UseMutationResult} 包含记录操作的变更结果
 */
export function useRecordFailure() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await supabase.functions.invoke("circuit-breaker", {
        body: { action: "record_failure", agentId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["circuit-breaker"] });
      
      // [警告]：熔断器开启时显示警告
      if (data.newState === "open") {
        toast.error("熔断器已触发", {
          description: `Agent暂停服务 ${data.cbState.timeout_duration_ms / 1000}秒`,
        });
      }
    },
  });
}

/**
 * 重置熔断器钩子
 * 
 * 手动将熔断器重置为关闭状态，清除所有计数器
 * 
 * @returns {UseMutationResult} 包含重置操作的变更结果
 */
export function useResetCircuit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await supabase.functions.invoke("circuit-breaker", {
        body: { action: "reset", agentId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit-breaker"] });
      toast.success("熔断器已重置");
    },
    onError: (error) => {
      toast.error(`重置失败: ${error.message}`);
    },
  });
}

/**
 * 配置熔断器参数钩子
 * 
 * 更新熔断器的配置参数，如阈值和超时时间
 * 
 * @returns {UseMutationResult} 包含配置操作的变更结果
 */
export function useConfigureCircuit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { agentId: string; config: CircuitBreakerConfig }) => {
      const response = await supabase.functions.invoke("circuit-breaker", {
        body: { action: "configure", agentId: params.agentId, config: params.config },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circuit-breaker"] });
      toast.success("熔断器配置已更新");
    },
    onError: (error) => {
      toast.error(`配置失败: ${error.message}`);
    },
  });
}

// ============================================================================
// 意图漂移追踪钩子函数
// ============================================================================

/**
 * 追踪意图变化钩子
 * 
 * 该钩子函数用于在对话过程中追踪用户意图的变化，
 * 当检测到显著漂移时会触发警告。
 * 
 * @returns {UseMutationResult} 包含追踪操作的变更结果
 */
export function useTrackIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      /** 智能体ID */
      agentId: string;
      /** 会话ID */
      sessionId?: string;
      /** 原始意图 */
      originalIntent: string;
      /** 当前消息内容 */
      currentMessage: string;
      /** 响应内容 */
      responseContent?: string;
      /** 对话轮次 */
      turnNumber?: number;
    }) => {
      // [调用]：通过 Edge Function 进行意图追踪
      const response = await supabase.functions.invoke("delta-intent", {
        body: { action: "track", ...params },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["intent-analysis"] });
      
      // [警告]：根据严重程度显示不同级别的提示
      if (data.severity === "critical") {
        toast.error("严重意图偏移", { description: data.recommendation });
      } else if (data.severity === "high") {
        toast.warning("意图偏移警告", { description: data.recommendation });
      }
    },
  });
}

/**
 * 获取意图分析结果钩子
 * 
 * 查询指定智能体或会话的意图分析统计数据
 * 
 * @param {string} agentId - 智能体ID
 * @param {string} sessionId - 会话ID（可选）
 * @returns {UseQueryResult} 包含分析结果的查询对象
 */
export function useIntentAnalysis(agentId?: string, sessionId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["intent-analysis", user?.id, agentId, sessionId],
    queryFn: async () => {
      if (!agentId) return null;
      
      const response = await supabase.functions.invoke("delta-intent", {
        body: { action: "analyze", agentId, sessionId },
      });

      if (response.error) throw response.error;
      return response.data as {
        success: boolean;
        analysis: IntentAnalysis;
        history: IntentHistory[];
      };
    },
    enabled: !!user && !!agentId,
  });
}

/**
 * 获取意图历史记录钩子
 * 
 * 查询指定智能体或会话的意图变化历史
 * 
 * @param {string} agentId - 智能体ID
 * @param {string} sessionId - 会话ID（可选）
 * @returns {UseQueryResult<IntentHistory[]>} 包含历史记录的查询对象
 */
export function useIntentHistory(agentId?: string, sessionId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["intent-history", user?.id, agentId, sessionId],
    queryFn: async () => {
      if (!agentId) return [];
      
      const response = await supabase.functions.invoke("delta-intent", {
        body: { action: "get_history", agentId, sessionId },
      });

      if (response.error) throw response.error;
      return (response.data?.history || []) as IntentHistory[];
    },
    enabled: !!user && !!agentId,
  });
}

// ============================================================================
// 状态显示配置
// ============================================================================

/**
 * 熔断器状态对应的颜色配置
 * 用于 UI 中的状态指示
 */
export const circuitStateColors: Record<CircuitState, string> = {
  closed: "#4CAF50",    // 绿色 - 正常
  open: "#F44336",      // 红色 - 熔断中
  half_open: "#FF9800", // 橙色 - 测试中
};

/**
 * 熔断器状态对应的中文标签
 */
export const circuitStateLabels: Record<CircuitState, string> = {
  closed: "关闭 (正常)",
  open: "开启 (熔断中)",
  half_open: "半开 (测试中)",
};

/**
 * 意图漂移严重程度对应的颜色配置
 */
export const intentSeverityColors: Record<string, string> = {
  none: "#4CAF50",      // 绿色 - 无漂移
  low: "#8BC34A",       // 浅绿 - 轻微
  medium: "#FFC107",    // 黄色 - 中等
  high: "#FF9800",      // 橙色 - 高
  critical: "#F44336",  // 红色 - 严重
};
