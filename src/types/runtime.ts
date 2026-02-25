// 运行时抽象层类型定义 (Runtime Abstraction Layer Types)

/**
 * 运行时模式
 */
export type RuntimeMode = 'cloud' | 'nanoclaw';

/**
 * 运行时连接状态
 */
export type RuntimeConnectionStatus = 
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'reconnecting';

/**
 * 容器状态
 */
export type ContainerStatus = 
  | 'creating'
  | 'running'
  | 'suspended'
  | 'terminated'
  | 'error';

/**
 * 容器隔离级别
 */
export type ContainerIsolationLevel = 'full' | 'network' | 'filesystem';

/**
 * 运行时配置
 */
export interface RuntimeConfig {
  mode: RuntimeMode;
  cloud: CloudRuntimeConfig;
  nanoclaw: NanoClawRuntimeConfig;
}

/**
 * 云端运行时配置
 */
export interface CloudRuntimeConfig {
  edgeFunctionBaseUrl: string;
  projectId: string;
}

/**
 * NanoClaw 运行时配置
 */
export interface NanoClawRuntimeConfig {
  endpoint: string;
  port: number;
  authToken: string;
  wsEndpoint: string;
  healthCheckIntervalMs: number;
  reconnectMaxRetries: number;
  reconnectDelayMs: number;
}

/**
 * 容器挂载点
 */
export interface ContainerMountPoint {
  hostPath: string;
  containerPath: string;
  readOnly: boolean;
  description?: string;
}

/**
 * 容器配置
 */
export interface ContainerConfig {
  groupName: string;
  agentId: string;
  isolationLevel: ContainerIsolationLevel;
  mountPoints: ContainerMountPoint[];
  resourceLimits: ContainerResourceLimits;
  environment: Record<string, string>;
  claudeMdPath?: string;
}

/**
 * 容器资源限制
 */
export interface ContainerResourceLimits {
  maxCpuPercent: number;
  maxMemoryMb: number;
  maxDiskMb: number;
  maxProcesses: number;
  networkEnabled: boolean;
}

/**
 * 容器信息
 */
export interface ContainerInfo {
  id: string;
  groupName: string;
  agentId: string;
  status: ContainerStatus;
  createdAt: Date;
  lastActivityAt: Date;
  metrics: ContainerMetrics;
}

/**
 * 容器指标
 */
export interface ContainerMetrics {
  cpuUsagePercent: number;
  memoryUsageMb: number;
  diskUsageMb: number;
  activeProcesses: number;
  networkBytesIn: number;
  networkBytesOut: number;
  uptimeMs: number;
}

/**
 * IPC 消息类型
 */
export type IPCMessageType =
  | 'command'
  | 'result'
  | 'status'
  | 'error'
  | 'authorization_request'
  | 'authorization_response'
  | 'heartbeat'
  | 'file_change'
  | 'memory_update';

/**
 * IPC 消息
 */
export interface IPCMessage {
  id: string;
  type: IPCMessageType;
  source: string;         // 发送者标识（agent ID 或 'studio'）
  target: string;         // 接收者标识
  timestamp: Date;
  payload: IPCPayload;
  metadata?: Record<string, unknown>;
}

/**
 * IPC 消息负载
 */
export type IPCPayload =
  | IPCCommandPayload
  | IPCResultPayload
  | IPCStatusPayload
  | IPCErrorPayload
  | IPCAuthRequestPayload
  | IPCAuthResponsePayload
  | IPCHeartbeatPayload;

export interface IPCCommandPayload {
  kind: 'command';
  command: string;
  args?: string[];
  workingDirectory?: string;
  requiresAuthorization: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface IPCResultPayload {
  kind: 'result';
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface IPCStatusPayload {
  kind: 'status';
  agentStatus: 'idle' | 'thinking' | 'executing' | 'waiting' | 'done';
  currentTask?: string;
  progress?: number;
}

export interface IPCErrorPayload {
  kind: 'error';
  code: string;
  message: string;
  recoverable: boolean;
}

export interface IPCAuthRequestPayload {
  kind: 'authorization_request';
  operationId: string;
  command: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskDescription: string;
  requiredPermission: string;
  timeoutMs: number;
  context: Record<string, unknown>;
}

export interface IPCAuthResponsePayload {
  kind: 'authorization_response';
  operationId: string;
  approved: boolean;
  permanent: boolean;
  respondedBy: string;
}

export interface IPCHeartbeatPayload {
  kind: 'heartbeat';
  uptimeMs: number;
  activeTasks: number;
}

/**
 * 运行时执行请求
 */
export interface RuntimeExecuteRequest {
  mode: RuntimeMode;
  agentId: string;
  skillCode: string;
  input: unknown;
  grantedPermissions: string[];
  containerId?: string;
}

/**
 * 运行时执行结果
 */
export interface RuntimeExecuteResult {
  success: boolean;
  output?: unknown;
  error?: { code: string; message: string };
  metrics: {
    executionTimeMs: number;
    cpuTimeMs: number;
    memoryPeakMb: number;
  };
  ipcLogs: IPCMessage[];
  containerId?: string;
}

/**
 * 默认运行时配置
 */
export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
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

/**
 * 默认容器资源限制
 */
export const DEFAULT_CONTAINER_LIMITS: ContainerResourceLimits = {
  maxCpuPercent: 50,
  maxMemoryMb: 512,
  maxDiskMb: 1024,
  maxProcesses: 10,
  networkEnabled: false,
};
