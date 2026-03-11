// 沙箱状态管理 Store (Sandbox Store)

import { create } from 'zustand';
import type { 
  SandboxConfig, 
  SandboxExecutionResult, 
  ExecutionMetrics,
  NetworkLog,
  ResourceLimits,
  NetworkPolicy,
} from '../types/sandbox.ts';
import { SECURITY_PRESETS, SecurityPresetKey } from '../types/networkPolicy.ts';

interface ExecutionHistoryItem {
  id: string;
  skillId?: string;
  agentId?: string;
  success: boolean;
  metrics: ExecutionMetrics;
  networkLogs: NetworkLog[];
  executedAt: Date;
  error?: { code: string; message: string };
}

interface SandboxState {
  // 当前配置
  config: SandboxConfig;
  currentPreset: SecurityPresetKey;
  
  // 执行状态
  isExecuting: boolean;
  currentExecutionId: string | null;
  lastResult: SandboxExecutionResult | null;
  
  // 执行历史
  executionHistory: ExecutionHistoryItem[];
  
  // 统计
  totalExecutions: number;
  totalBlockedRequests: number;
  totalAllowedRequests: number;
  
  // 操作
  setConfig: (config: Partial<SandboxConfig>) => void;
  setPreset: (preset: SecurityPresetKey) => void;
  setLimits: (limits: Partial<ResourceLimits>) => void;
  setNetworkPolicy: (policy: Partial<NetworkPolicy>) => void;
  
  setExecuting: (executing: boolean, executionId?: string) => void;
  setLastResult: (result: SandboxExecutionResult) => void;
  addToHistory: (item: Omit<ExecutionHistoryItem, 'executedAt'>) => void;
  clearHistory: () => void;
  
  updateStats: (networkLogs: NetworkLog[]) => void;
  reset: () => void;
}

const initialConfig: SandboxConfig = {
  limits: SECURITY_PRESETS.balanced.limits,
  networkPolicy: SECURITY_PRESETS.balanced.networkPolicy,
  runtime: 'deno',
  timeoutMs: 10000,
  auditEnabled: true,
};

export const useSandboxStore = create<SandboxState>((set, get) => ({
  // 初始状态
  config: initialConfig,
  currentPreset: 'balanced',
  isExecuting: false,
  currentExecutionId: null,
  lastResult: null,
  executionHistory: [],
  totalExecutions: 0,
  totalBlockedRequests: 0,
  totalAllowedRequests: 0,

  // 配置操作
  setConfig: (config) => set((state) => ({
    config: { ...state.config, ...config },
  })),

  setPreset: (preset) => {
    const presetConfig = SECURITY_PRESETS[preset];
    set({
      currentPreset: preset,
      config: {
        ...get().config,
        limits: presetConfig.limits,
        networkPolicy: presetConfig.networkPolicy,
      },
    });
  },

  setLimits: (limits) => set((state) => ({
    config: {
      ...state.config,
      limits: { ...state.config.limits, ...limits },
    },
  })),

  setNetworkPolicy: (policy) => set((state) => ({
    config: {
      ...state.config,
      networkPolicy: { ...state.config.networkPolicy, ...policy },
    },
  })),

  // 执行状态操作
  setExecuting: (executing, executionId) => set({
    isExecuting: executing,
    currentExecutionId: executionId || null,
  }),

  setLastResult: (result) => set({ lastResult: result }),

  addToHistory: (item) => set((state) => ({
    executionHistory: [
      { ...item, executedAt: new Date() },
      ...state.executionHistory.slice(0, 49), // 保留最近 50 条
    ],
    totalExecutions: state.totalExecutions + 1,
  })),

  clearHistory: () => set({ executionHistory: [] }),

  // 统计更新
  updateStats: (networkLogs) => {
    const blocked = networkLogs.filter(l => l.status === 'blocked' || l.status === 'rate_limited').length;
    const allowed = networkLogs.filter(l => l.status === 'allowed').length;
    
    set((state) => ({
      totalBlockedRequests: state.totalBlockedRequests + blocked,
      totalAllowedRequests: state.totalAllowedRequests + allowed,
    }));
  },

  // 重置
  reset: () => set({
    config: initialConfig,
    currentPreset: 'balanced',
    isExecuting: false,
    currentExecutionId: null,
    lastResult: null,
    executionHistory: [],
    totalExecutions: 0,
    totalBlockedRequests: 0,
    totalAllowedRequests: 0,
  }),
}));
