// 运行时状态 Store (Runtime State Store)

import { create } from 'zustand';
import type {
  RuntimeMode,
  RuntimeConfig,
  RuntimeConnectionStatus,
  ContainerInfo,
  IPCMessage,
  DEFAULT_RUNTIME_CONFIG,
} from '@/types/runtime';

interface RuntimeState {
  // 运行时模式
  mode: RuntimeMode;
  config: RuntimeConfig;
  
  // NanoClaw 连接状态
  connectionStatus: RuntimeConnectionStatus;
  lastHealthCheck: Date | null;
  nanoclawVersion: string | null;
  
  // 活跃容器
  containers: ContainerInfo[];
  activeContainerId: string | null;
  
  // IPC 消息队列
  ipcMessages: IPCMessage[];
  pendingAuthorizations: IPCMessage[];
  
  // 统计
  totalIPCMessages: number;
  totalBlockedOperations: number;
  
  // 操作
  setMode: (mode: RuntimeMode) => void;
  setConfig: (config: Partial<RuntimeConfig>) => void;
  setConnectionStatus: (status: RuntimeConnectionStatus) => void;
  setNanoclawVersion: (version: string) => void;
  
  addContainer: (container: ContainerInfo) => void;
  updateContainer: (id: string, updates: Partial<ContainerInfo>) => void;
  removeContainer: (id: string) => void;
  setActiveContainer: (id: string | null) => void;
  
  addIPCMessage: (message: IPCMessage) => void;
  addPendingAuthorization: (message: IPCMessage) => void;
  removePendingAuthorization: (operationId: string) => void;
  clearIPCMessages: () => void;
  
  incrementBlockedOps: () => void;
  reset: () => void;
}

const initialConfig: RuntimeConfig = {
  mode: 'cloud',
  cloud: {
    edgeFunctionBaseUrl: '',
    projectId: '',
  },
  nanoclaw: {
    endpoint: 'http://localhost',
    port: 3100,
    authToken: '',
    wsEndpoint: 'ws://localhost:3100/ws',
    healthCheckIntervalMs: 30000,
    reconnectMaxRetries: 5,
    reconnectDelayMs: 2000,
  },
};

export const useRuntimeStore = create<RuntimeState>((set) => ({
  mode: 'cloud',
  config: initialConfig,
  connectionStatus: 'disconnected',
  lastHealthCheck: null,
  nanoclawVersion: null,
  containers: [],
  activeContainerId: null,
  ipcMessages: [],
  pendingAuthorizations: [],
  totalIPCMessages: 0,
  totalBlockedOperations: 0,

  setMode: (mode) => set({ mode }),

  setConfig: (config) => set((state) => ({
    config: { ...state.config, ...config },
  })),

  setConnectionStatus: (status) => set({ 
    connectionStatus: status,
    lastHealthCheck: status === 'connected' ? new Date() : undefined,
  }),

  setNanoclawVersion: (version) => set({ nanoclawVersion: version }),

  addContainer: (container) => set((state) => ({
    containers: [...state.containers, container],
  })),

  updateContainer: (id, updates) => set((state) => ({
    containers: state.containers.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ),
  })),

  removeContainer: (id) => set((state) => ({
    containers: state.containers.filter(c => c.id !== id),
    activeContainerId: state.activeContainerId === id ? null : state.activeContainerId,
  })),

  setActiveContainer: (id) => set({ activeContainerId: id }),

  addIPCMessage: (message) => set((state) => ({
    ipcMessages: [message, ...state.ipcMessages].slice(0, 200),
    totalIPCMessages: state.totalIPCMessages + 1,
  })),

  addPendingAuthorization: (message) => set((state) => ({
    pendingAuthorizations: [...state.pendingAuthorizations, message],
  })),

  removePendingAuthorization: (operationId) => set((state) => ({
    pendingAuthorizations: state.pendingAuthorizations.filter(
      m => m.id !== operationId
    ),
  })),

  clearIPCMessages: () => set({ ipcMessages: [] }),

  incrementBlockedOps: () => set((state) => ({
    totalBlockedOperations: state.totalBlockedOperations + 1,
  })),

  reset: () => set({
    mode: 'cloud',
    config: initialConfig,
    connectionStatus: 'disconnected',
    lastHealthCheck: null,
    nanoclawVersion: null,
    containers: [],
    activeContainerId: null,
    ipcMessages: [],
    pendingAuthorizations: [],
    totalIPCMessages: 0,
    totalBlockedOperations: 0,
  }),
}));
