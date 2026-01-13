// =====================================================
// 生成式编排层 - 工作流 DSL 类型定义
// Generative Orchestration Layer - Workflow DSL Types
// =====================================================

// ========== 基础类型 ==========

export type NodeType = 
  | 'trigger' 
  | 'agent' 
  | 'skill' 
  | 'mcp_action' 
  | 'knowledge' 
  | 'condition' 
  | 'parallel' 
  | 'loop'
  | 'intervention'
  | 'output';

export type StageType = 'sequential' | 'parallel' | 'conditional' | 'loop';

export type RiskLevel = 'low' | 'medium' | 'high';

export type MPLPPolicy = 'permissive' | 'default' | 'strict';

// ========== 触发器规格 ==========

export interface TriggerSpec {
  type: 'user_message' | 'webhook' | 'schedule' | 'event';
  config?: {
    webhookPath?: string;
    cronExpression?: string;
    eventType?: string;
  };
}

// ========== 输入映射 ==========

export interface InputMapping {
  targetField: string;           // 目标字段路径 e.g., "context.weather"
  sourceExpression: string;      // 源表达式 e.g., "{{weather_skill.output.data}}"
  transform?: TransformSpec;     // 可选的数据转换
}

export interface TransformSpec {
  type: 'extract' | 'format' | 'join' | 'filter' | 'map' | 'custom';
  config: Record<string, unknown>;
}

// ========== 节点规格 ==========

export interface NodeSpec {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  
  // 资产引用 (对于 skill, mcp_action, knowledge 类型)
  assetId?: string;
  assetType?: 'skill' | 'mcp_tool' | 'knowledge_base';
  
  // 配置
  config: NodeConfig;
  
  // 输入输出映射
  inputMappings: InputMapping[];
  outputKey: string;             // 输出变量名 e.g., "weather_result"
  
  // 风险与治理
  riskLevel?: RiskLevel;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface NodeConfig {
  // Agent 节点配置
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  
  // Skill/MCP 节点配置
  parameters?: Record<string, unknown>;
  timeout?: number;
  retryCount?: number;
  
  // Knowledge 节点配置
  retrievalMode?: 'vector' | 'graph' | 'hybrid';
  topK?: number;
  
  // Condition 节点配置
  condition?: string;            // 条件表达式
  
  // Loop 节点配置
  maxIterations?: number;
  breakCondition?: string;
  
  // Intervention 节点配置
  interventionType?: 'confirm' | 'approve' | 'edit' | 'preview';
  
  // 通用配置
  [key: string]: unknown;
}

// ========== 分支规格 ==========

export interface BranchSpec {
  id: string;
  name: string;
  condition: string;             // 条件表达式 e.g., "{{result.confidence}} > 0.8"
  nodes: NodeSpec[];
  isDefault?: boolean;           // 默认分支（else）
}

// ========== 阶段规格 ==========

export interface StageSpec {
  id: string;
  name: string;
  type: StageType;
  description?: string;
  
  // 顺序执行的节点
  nodes: NodeSpec[];
  
  // 条件分支 (仅 type === 'conditional')
  branches?: BranchSpec[];
  
  // 循环配置 (仅 type === 'loop')
  loopConfig?: {
    iteratorVariable: string;    // 迭代变量名
    collectionExpression: string; // 集合表达式
    maxIterations?: number;
  };
  
  // 并行配置 (仅 type === 'parallel')
  parallelConfig?: {
    waitAll: boolean;            // 是否等待所有完成
    failFast: boolean;           // 快速失败
  };
}

// ========== 错误处理 ==========

export interface ErrorHandlingSpec {
  strategy: 'fail' | 'retry' | 'fallback' | 'ignore';
  retryConfig?: {
    maxRetries: number;
    backoffMs: number;
  };
  fallbackNodeId?: string;
  onError?: string;              // 错误处理表达式
}

// ========== 工作流 DSL 主结构 ==========

export interface WorkflowDSL {
  version: '1.0';
  name: string;
  description?: string;
  
  // 触发器
  trigger: TriggerSpec;
  
  // 执行阶段
  stages: StageSpec[];
  
  // 全局变量
  globalVariables?: GlobalVariableSpec[];
  
  // 错误处理
  errorHandling?: ErrorHandlingSpec;
  
  // 治理策略
  governance?: GovernanceSpec;
  
  // 元数据
  metadata?: WorkflowMetadata;
}

export interface GlobalVariableSpec {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  defaultValue?: unknown;
  isSecret?: boolean;
}

export interface GovernanceSpec {
  mplpPolicy: MPLPPolicy;
  requiredApprovals?: string[];  // 需要审批的操作类型
  auditLogging: boolean;
  maxExecutionTimeMs?: number;
}

export interface WorkflowMetadata {
  author?: string;
  version?: string;
  tags?: string[];
  category?: string;
  estimatedDurationMs?: number;
}

// ========== 语义资产类型 ==========

export interface SemanticAsset {
  id: string;
  assetType: 'skill' | 'mcp_tool' | 'knowledge_base';
  assetId: string;
  name: string;
  description?: string;
  category?: string;
  capabilities: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  riskLevel: RiskLevel;
  similarity?: number;           // 语义相似度得分
}

// ========== 合规报告类型 ==========

export interface ComplianceReport {
  isCompliant: boolean;
  totalRiskyOperations: number;
  protectedOperations: number;
  unprotectedOperations: string[];
  autoFixedOperations: string[];
  permissionsDeclared: string[];
  recommendations: string[];
}

// ========== 生成结果类型 ==========

export interface GeneratedWorkflow {
  dsl: WorkflowDSL;
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
  variableMappings: GeneratedVariableMapping[];
  injectedInterventions: InjectedIntervention[];
  warnings: GenerationWarning[];
  suggestions: GenerationSuggestion[];
  complianceReport?: ComplianceReport;
  requiredPermissions?: string[];
}

export interface GeneratedNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface GeneratedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
  data?: Record<string, unknown>;
  style?: {
    stroke?: string;
    strokeDasharray?: string;
    strokeWidth?: number;
  };
}

export interface GeneratedVariableMapping {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  mappings: Array<{
    id: string;
    source: string;              // e.g., "{{weather.output.temp}}"
    target: string;              // e.g., "{{agent.input.context}}"
    enabled: boolean;
  }>;
}

export interface InjectedIntervention {
  nodeId: string;
  beforeNodeId: string;
  type: 'confirm' | 'approve' | 'edit' | 'preview';
  reason: string;
  riskLevel: RiskLevel;
}

export interface GenerationWarning {
  code: string;
  message: string;
  nodeId?: string;
  severity: 'info' | 'warning' | 'error';
}

export interface GenerationSuggestion {
  type: 'optimization' | 'security' | 'best_practice';
  message: string;
  nodeId?: string;
  suggestedAction?: string;
}

// ========== 资产搜索类型 ==========

export interface AssetSearchQuery {
  query: string;
  assetTypes?: ('skill' | 'mcp_tool' | 'knowledge_base')[];
  categories?: string[];
  capabilities?: string[];
  maxResults?: number;
  minSimilarity?: number;
}

export interface AssetSearchResult {
  skills: SemanticAsset[];
  mcpTools: SemanticAsset[];
  knowledgeBases: SemanticAsset[];
  totalCount: number;
}
