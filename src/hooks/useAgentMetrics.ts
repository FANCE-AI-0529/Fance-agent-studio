/**
 * @file useAgentMetrics.ts
 * @description 聚合 Agent 监控指标的 Hook
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useLLMUsageStats } from './useLLMUsageStats.ts';
import { useApiAlertRules, useApiAlertLogs } from './useApiAlerts.ts';
import { useAgentApiStats } from './useAgentApi.ts';

export interface AgentHealthStatus {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
}

export interface RealtimeMetric {
  timestamp: string;
  calls: number;
  errors: number;
  avgLatency: number;
}

export interface AgentMetrics {
  // 核心 KPI
  activeSessions: number;
  successRate: number;
  avgResponseTime: number;
  totalCalls: number;
  
  // 错误统计
  errorCount: number;
  errorRate: number;
  
  // LLM 使用
  totalTokens: number;
  estimatedCost: number;
  
  // 健康状态
  healthStatus: AgentHealthStatus;
  
  // 实时数据（最近24小时）
  realtimeData: RealtimeMetric[];
  
  // 告警统计
  activeAlerts: number;
  recentAlerts: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
  }>;
  
  // 加载状态
  isLoading: boolean;
  error: Error | null;
}

export function useAgentMetrics(agentId: string | null): AgentMetrics {
  const { user } = useAuth();
  
  // LLM 使用统计
  const { data: llmStats, isLoading: llmLoading } = useLLMUsageStats(7);
  
  // API 统计
  const { data: apiStats, isLoading: apiLoading } = useAgentApiStats(agentId);
  
  // 告警规则
  const { data: alertRules = [] } = useApiAlertRules(agentId);
  
  // 获取 Agent API 调用日志统计
  const { data: callMetrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['agent-call-metrics', agentId],
    queryFn: async () => {
      if (!agentId || !user) return null;
      
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // 获取最近24小时的调用日志
      const { data: logs, error } = await supabase
        .from('agent_api_logs')
        .select('id, status_code, latency_ms, created_at, error_message')
        .eq('agent_id', agentId)
        .gte('created_at', dayAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);
      
      if (error) throw error;
      
      if (!logs || logs.length === 0) {
        return {
          totalCalls: 0,
          successCalls: 0,
          errorCalls: 0,
          avgLatency: 0,
          hourlyData: [],
        };
      }
      
      const successCalls = logs.filter(l => l.status_code >= 200 && l.status_code < 300).length;
      const errorCalls = logs.filter(l => l.status_code >= 400 || l.error_message).length;
      const latencies = logs.filter(l => l.latency_ms).map(l => l.latency_ms as number);
      const avgLatency = latencies.length > 0 
        ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
        : 0;
      
      // 按小时聚合
      const hourlyMap = new Map<string, { calls: number; errors: number; totalLatency: number; count: number }>();
      
      logs.forEach(log => {
        const hour = new Date(log.created_at).toISOString().slice(0, 13) + ':00:00Z';
        const existing = hourlyMap.get(hour) || { calls: 0, errors: 0, totalLatency: 0, count: 0 };
        existing.calls++;
        if (log.status_code >= 400 || log.error_message) {
          existing.errors++;
        }
        if (log.latency_ms) {
          existing.totalLatency += log.latency_ms;
          existing.count++;
        }
        hourlyMap.set(hour, existing);
      });
      
      const hourlyData = Array.from(hourlyMap.entries())
        .map(([timestamp, data]) => ({
          timestamp,
          calls: data.calls,
          errors: data.errors,
          avgLatency: data.count > 0 ? Math.round(data.totalLatency / data.count) : 0,
        }))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      
      return {
        totalCalls: logs.length,
        successCalls,
        errorCalls,
        avgLatency: Math.round(avgLatency),
        hourlyData,
      };
    },
    enabled: !!agentId && !!user,
    refetchInterval: 60000, // 每分钟刷新
  });
  
  // 获取告警日志
  const { data: alertLogs = [] } = useQuery({
    queryKey: ['agent-alert-logs', agentId],
    queryFn: async () => {
      if (!agentId || !user) return [];
      
      const { data, error } = await supabase
        .from('api_alert_logs')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!agentId && !!user,
  });
  
  // 计算健康状态
  const getHealthStatus = (): AgentHealthStatus => {
    if (!callMetrics) {
      return { status: 'unknown', message: '暂无监控数据' };
    }
    
    const errorRate = callMetrics.totalCalls > 0 
      ? (callMetrics.errorCalls / callMetrics.totalCalls) * 100 
      : 0;
    
    if (errorRate > 10 || callMetrics.avgLatency > 5000) {
      return { status: 'critical', message: '服务异常，需要立即处理' };
    }
    
    if (errorRate > 5 || callMetrics.avgLatency > 3000) {
      return { status: 'warning', message: '存在性能问题，建议关注' };
    }
    
    return { status: 'healthy', message: '服务运行正常' };
  };
  
  const isLoading = llmLoading || apiLoading || metricsLoading;
  
  return {
    // 核心 KPI
    activeSessions: 0, // TODO: 实现会话追踪
    successRate: callMetrics?.totalCalls 
      ? Math.round((callMetrics.successCalls / callMetrics.totalCalls) * 100) 
      : 100,
    avgResponseTime: callMetrics?.avgLatency || 0,
    totalCalls: apiStats?.totalCalls || callMetrics?.totalCalls || 0,
    
    // 错误统计
    errorCount: callMetrics?.errorCalls || 0,
    errorRate: callMetrics?.totalCalls 
      ? Math.round((callMetrics.errorCalls / callMetrics.totalCalls) * 100) 
      : 0,
    
    // LLM 使用
    totalTokens: llmStats?.totalTokens || 0,
    estimatedCost: llmStats?.estimatedCost || 0,
    
    // 健康状态
    healthStatus: getHealthStatus(),
    
    // 实时数据
    realtimeData: callMetrics?.hourlyData || [],
    
    // 告警统计
    activeAlerts: alertRules.filter(r => r.is_active).length,
    recentAlerts: alertLogs.map(log => ({
      id: log.id,
      type: log.alert_type,
      message: `${log.alert_type}: 实际值 ${log.actual_value} 超过阈值 ${log.threshold_value}`,
      timestamp: log.created_at,
    })),
    
    // 加载状态
    isLoading,
    error: metricsError as Error | null,
  };
}
