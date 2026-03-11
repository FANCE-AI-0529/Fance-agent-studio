// Agent Swarms 类型定义 (Agent Swarms Types)

import type { ContainerConfig, IPCMessage } from './runtime.ts';

/**
 * Swarm 协作模式
 */
export type SwarmCommunicationMode = 
  | 'sequential'     // 顺序执行：A → B → C
  | 'parallel'       // 并行执行：A + B + C 同时
  | 'consensus'      // 共识模式：所有成员投票决策
  | 'hierarchical';  // 层级模式：Leader 分配子任务

/**
 * Swarm 成员角色
 */
export type SwarmMemberRole = 
  | 'leader'       // 协调者/决策者
  | 'worker'       // 执行者
  | 'reviewer'     // 审查者
  | 'specialist';  // 专家（特定领域）

/**
 * Swarm 执行状态
 */
export type SwarmExecutionState = 
  | 'idle'
  | 'initializing'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Swarm 成员状态
 */
export type SwarmMemberStatus = 
  | 'idle'
  | 'thinking'
  | 'executing'
  | 'waiting'
  | 'done'
  | 'error';

/**
 * Swarm 定义
 */
export interface SwarmDefinition {
  id: string;
  name: string;
  description: string;
  members: SwarmMember[];
  communicationMode: SwarmCommunicationMode;
  sharedContext: SwarmSharedContext;
  containerConfig?: Partial<ContainerConfig>;
  maxRounds: number;
  timeoutMs: number;
}

/**
 * Swarm 成员定义
 */
export interface SwarmMember {
  id: string;
  agentId: string;
  name: string;
  role: SwarmMemberRole;
  capabilities: string[];
  claudeMdPath?: string;
  systemPrompt?: string;
  priority: number;
  canVeto: boolean;
}

/**
 * Swarm 共享上下文
 */
export interface SwarmSharedContext {
  goal: string;
  constraints: string[];
  sharedMemoryPath?: string;
  allowedCommunicationChannels: string[];
  maxMessagesPerRound: number;
}

/**
 * Swarm 运行时状态
 */
export interface SwarmRuntimeState {
  swarmId: string;
  state: SwarmExecutionState;
  currentRound: number;
  memberStates: SwarmMemberState[];
  messageLog: SwarmMessage[];
  startedAt?: Date;
  completedAt?: Date;
  result?: SwarmResult;
  error?: string;
}

/**
 * 成员运行时状态
 */
export interface SwarmMemberState {
  memberId: string;
  agentId: string;
  name: string;
  status: SwarmMemberStatus;
  currentTask?: string;
  progress: number;
  lastActivityAt: Date;
  tokensUsed: number;
  messagesProcessed: number;
}

/**
 * Swarm 内部消息
 */
export interface SwarmMessage {
  id: string;
  fromMemberId: string;
  toMemberId: string | 'broadcast';
  content: string;
  messageType: 'task' | 'result' | 'question' | 'feedback' | 'consensus_vote';
  timestamp: Date;
  round: number;
  metadata?: Record<string, unknown>;
}

/**
 * Swarm 执行结果
 */
export interface SwarmResult {
  success: boolean;
  output: unknown;
  memberContributions: SwarmMemberContribution[];
  totalRounds: number;
  totalTokensUsed: number;
  totalDurationMs: number;
  consensusReached?: boolean;
}

/**
 * 成员贡献记录
 */
export interface SwarmMemberContribution {
  memberId: string;
  name: string;
  role: SwarmMemberRole;
  tasksSolved: number;
  tokensUsed: number;
  outputSummary: string;
}

/**
 * 画布节点到 Swarm 的映射配置
 */
export interface CanvasToSwarmMapping {
  nodeId: string;
  nodeType: string;
  swarmRole: SwarmMemberRole;
  agentId?: string;
  capabilities: string[];
}

/**
 * Swarm YAML 编译结果
 */
export interface SwarmCompileResult {
  valid: boolean;
  definition?: SwarmDefinition;
  yamlContent?: string;
  errors: SwarmCompileError[];
  warnings: string[];
}

/**
 * Swarm 编译错误
 */
export interface SwarmCompileError {
  nodeId?: string;
  edgeId?: string;
  code: string;
  message: string;
}
