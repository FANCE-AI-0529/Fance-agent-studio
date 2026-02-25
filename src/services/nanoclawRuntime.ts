// NanoClaw 运行时适配器 (NanoClaw Runtime Adapter)

import { supabase } from '@/integrations/supabase/client';
import type {
  NanoClawRuntimeConfig,
  ContainerConfig,
  ContainerInfo,
  ContainerStatus,
  IPCMessage,
  RuntimeExecuteRequest,
  RuntimeExecuteResult,
  RuntimeConnectionStatus,
} from '@/types/runtime';

type IPCMessageHandler = (message: IPCMessage) => void;

/**
 * NanoClaw 客户端 - 封装与自托管 NanoClaw 实例的通信
 */
export class NanoClawClient {
  private config: NanoClawRuntimeConfig;
  private ws: WebSocket | null = null;
  private connectionStatus: RuntimeConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private ipcHandlers: Map<string, IPCMessageHandler[]> = new Map();
  private statusListeners: Set<(status: RuntimeConnectionStatus) => void> = new Set();
  private pendingAuthResponses: Map<string, (approved: boolean) => void> = new Map();

  constructor(config: NanoClawRuntimeConfig) {
    this.config = config;
  }

  // ─── 连接管理 ───

  async connect(): Promise<void> {
    this.setStatus('connecting');
    
    try {
      // 通过网关 Edge Function 建立 WebSocket 连接
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('User not authenticated');

      const wsUrl = `${this.config.wsEndpoint}?token=${this.config.authToken}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.setStatus('connected');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: IPCMessage = JSON.parse(event.data);
          this.handleIPCMessage(message);
        } catch {
          console.error('[NanoClaw] Failed to parse IPC message');
        }
      };

      this.ws.onclose = () => {
        this.setStatus('disconnected');
        this.stopHeartbeat();
        this.attemptReconnect();
      };

      this.ws.onerror = () => {
        this.setStatus('error');
      };
    } catch (error) {
      this.setStatus('error');
      throw error;
    }
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.config.reconnectMaxRetries) {
      this.setStatus('error');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;
    
    const delay = this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      await this.connect();
    } catch {
      // Will retry via onclose handler
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendIPCMessage({
        id: crypto.randomUUID(),
        type: 'heartbeat',
        source: 'studio',
        target: 'nanoclaw',
        timestamp: new Date(),
        payload: { kind: 'heartbeat', uptimeMs: 0, activeTasks: 0 },
      });
    }, this.config.healthCheckIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ─── 容器管理 ───

  async createContainer(config: ContainerConfig): Promise<ContainerInfo> {
    const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
      body: {
        action: 'create_container',
        config,
        nanoclawEndpoint: `${this.config.endpoint}:${this.config.port}`,
        authToken: this.config.authToken,
      },
    });

    if (error) throw new Error(`Failed to create container: ${error.message}`);
    return data as ContainerInfo;
  }

  async terminateContainer(containerId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('nanoclaw-gateway', {
      body: {
        action: 'terminate_container',
        containerId,
        nanoclawEndpoint: `${this.config.endpoint}:${this.config.port}`,
        authToken: this.config.authToken,
      },
    });

    if (error) throw new Error(`Failed to terminate container: ${error.message}`);
  }

  async getContainerStatus(containerId: string): Promise<ContainerStatus> {
    const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
      body: {
        action: 'container_status',
        containerId,
        nanoclawEndpoint: `${this.config.endpoint}:${this.config.port}`,
        authToken: this.config.authToken,
      },
    });

    if (error) throw new Error(`Failed to get container status: ${error.message}`);
    return data.status as ContainerStatus;
  }

  async listContainers(): Promise<ContainerInfo[]> {
    const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
      body: {
        action: 'list_containers',
        nanoclawEndpoint: `${this.config.endpoint}:${this.config.port}`,
        authToken: this.config.authToken,
      },
    });

    if (error) throw new Error(`Failed to list containers: ${error.message}`);
    return (data.containers || []) as ContainerInfo[];
  }

  // ─── 执行 ───

  async executeInContainer(request: RuntimeExecuteRequest): Promise<RuntimeExecuteResult> {
    const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
      body: {
        action: 'execute',
        request,
        nanoclawEndpoint: `${this.config.endpoint}:${this.config.port}`,
        authToken: this.config.authToken,
      },
    });

    if (error) throw new Error(`Container execution failed: ${error.message}`);
    return data as RuntimeExecuteResult;
  }

  // ─── IPC 通信 ───

  sendIPCMessage(message: IPCMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[NanoClaw] Cannot send IPC message: not connected');
      return;
    }
    this.ws.send(JSON.stringify(message));
  }

  onIPCMessage(type: string, handler: IPCMessageHandler): () => void {
    if (!this.ipcHandlers.has(type)) {
      this.ipcHandlers.set(type, []);
    }
    this.ipcHandlers.get(type)!.push(handler);

    return () => {
      const handlers = this.ipcHandlers.get(type);
      if (handlers) {
        const idx = handlers.indexOf(handler);
        if (idx !== -1) handlers.splice(idx, 1);
      }
    };
  }

  private handleIPCMessage(message: IPCMessage): void {
    // 分发到具体类型处理器
    const handlers = this.ipcHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(h => h(message));
    }

    // 分发到通配符处理器
    const allHandlers = this.ipcHandlers.get('*');
    if (allHandlers) {
      allHandlers.forEach(h => h(message));
    }

    // 处理授权请求
    if (message.type === 'authorization_request') {
      // 由 IPC 中间件层处理
    }
  }

  // ─── 授权管理 ───

  respondToAuthorization(operationId: string, approved: boolean, permanent = false): void {
    const response: IPCMessage = {
      id: crypto.randomUUID(),
      type: 'authorization_response',
      source: 'studio',
      target: 'nanoclaw',
      timestamp: new Date(),
      payload: {
        kind: 'authorization_response',
        operationId,
        approved,
        permanent,
        respondedBy: 'human',
      },
    };
    this.sendIPCMessage(response);

    // 释放挂起的回调
    const resolver = this.pendingAuthResponses.get(operationId);
    if (resolver) {
      resolver(approved);
      this.pendingAuthResponses.delete(operationId);
    }
  }

  // ─── 健康检查 ───

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number; version?: string }> {
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
        body: {
          action: 'health',
          nanoclawEndpoint: `${this.config.endpoint}:${this.config.port}`,
          authToken: this.config.authToken,
        },
      });

      if (error) return { healthy: false, latencyMs: Date.now() - start };
      return {
        healthy: true,
        latencyMs: Date.now() - start,
        version: data.version,
      };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }

  // ─── 状态监听 ───

  onStatusChange(listener: (status: RuntimeConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private setStatus(status: RuntimeConnectionStatus): void {
    this.connectionStatus = status;
    this.statusListeners.forEach(l => l(status));
  }

  getStatus(): RuntimeConnectionStatus {
    return this.connectionStatus;
  }

  updateConfig(config: Partial<NanoClawRuntimeConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * 创建 NanoClaw 客户端实例
 */
export function createNanoClawClient(config: NanoClawRuntimeConfig): NanoClawClient {
  return new NanoClawClient(config);
}
