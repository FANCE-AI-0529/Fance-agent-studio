// 沙箱安全执行类型定义 (Sandbox Security Types)

/**
 * 沙箱执行配置
 */
export interface SandboxConfig {
  // 资源限制
  limits: ResourceLimits;
  // 网络策略
  networkPolicy: NetworkPolicy;
  // 执行环境
  runtime: SandboxRuntime;
  // 超时设置 (ms)
  timeoutMs: number;
  // 是否启用审计
  auditEnabled: boolean;
}

/**
 * 运行时类型
 */
export type SandboxRuntime = 'deno' | 'wasm' | 'quickjs' | 'container';

/**
 * 容器挂载点（沙箱层面）
 */
export interface ContainerMountPoint {
  hostPath: string;
  containerPath: string;
  readOnly: boolean;
  description?: string;
}

/**
 * 容器隔离级别
 */
export type ContainerIsolationLevel = 'full' | 'network' | 'filesystem';

/**
 * 资源限制
 */
export interface ResourceLimits {
  maxCpuMs: number;           // 最大 CPU 时间 (ms)
  maxMemoryMb: number;        // 最大内存 (MB)
  maxExecutionMs: number;     // 最大执行时间 (ms)
  maxNetworkRequests: number; // 最大网络请求数
  maxOutputSizeKb: number;    // 最大输出大小 (KB)
}

/**
 * 网络策略
 */
export interface NetworkPolicy {
  mode: NetworkPolicyMode;
  whitelist: DomainRule[];
  mplpBindings: MPLPNetworkBinding[];
}

/**
 * 网络策略模式
 */
export type NetworkPolicyMode = 'deny_all' | 'allow_whitelist' | 'mplp_controlled';

/**
 * 域名规则
 */
export interface DomainRule {
  pattern: string;                              // 域名模式 (支持通配符)
  protocols: ('http' | 'https' | 'ws' | 'wss')[];
  ports?: number[];
  methods?: string[];                           // GET, POST, etc.
  rateLimit?: number;                           // 请求/分钟
  description?: string;
}

/**
 * MPLP 权限与网络域名绑定
 */
export interface MPLPNetworkBinding {
  permission: string;       // MPLP 权限名
  domains: string[];        // 允许的域名
  description: string;
}

/**
 * 沙箱执行结果
 */
export interface SandboxExecutionResult {
  success: boolean;
  output?: unknown;
  error?: SandboxError;
  metrics: ExecutionMetrics;
  auditId?: string;
  networkLogs: NetworkLog[];
}

/**
 * 执行指标
 */
export interface ExecutionMetrics {
  cpuTimeMs: number;
  memoryPeakMb: number;
  executionTimeMs: number;
  networkRequestsCount: number;
  networkBytesIn: number;
  networkBytesOut: number;
}

/**
 * 沙箱错误
 */
export interface SandboxError {
  code: SandboxErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * 沙箱错误代码
 */
export type SandboxErrorCode =
  | 'CPU_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'TIMEOUT'
  | 'NETWORK_BLOCKED'
  | 'NETWORK_RATE_LIMITED'
  | 'PERMISSION_DENIED'
  | 'RUNTIME_ERROR'
  | 'VALIDATION_ERROR'
  | 'OUTPUT_SIZE_EXCEEDED';

/**
 * 执行审计记录
 */
export interface ExecutionAudit {
  id: string;
  userId: string;
  agentId?: string;
  skillId: string;
  executionToken: string;
  config: SandboxConfig;
  input: unknown;
  result: SandboxExecutionResult;
  networkLogs: NetworkLog[];
  startedAt: Date;
  completedAt: Date;
}

/**
 * 网络日志
 */
export interface NetworkLog {
  timestamp: Date;
  method: string;
  url: string;
  domain: string;
  status: NetworkLogStatus;
  responseStatus?: number;
  durationMs?: number;
  bytesIn?: number;
  bytesOut?: number;
  blockReason?: string;
}

/**
 * 网络日志状态
 */
export type NetworkLogStatus = 'allowed' | 'blocked' | 'rate_limited';

/**
 * 沙箱执行请求
 */
export interface SandboxExecuteRequest {
  skillCode: string;
  input: unknown;
  config: SandboxConfig;
  mplpToken: string;
  skillId?: string;
  agentId?: string;
}

/**
 * MPLP 令牌验证结果
 */
export interface MPLPTokenValidation {
  valid: boolean;
  permissions: string[];
  userId?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * 默认资源限制
 */
export const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxCpuMs: 100,
  maxMemoryMb: 64,
  maxExecutionMs: 10000,
  maxNetworkRequests: 20,
  maxOutputSizeKb: 500,
};

/**
 * 默认沙箱配置
 */
export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  limits: DEFAULT_RESOURCE_LIMITS,
  networkPolicy: {
    mode: 'mplp_controlled',
    whitelist: [],
    mplpBindings: [],
  },
  runtime: 'deno',
  timeoutMs: 10000,
  auditEnabled: true,
};
