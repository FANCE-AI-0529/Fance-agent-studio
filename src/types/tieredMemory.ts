// 分级记忆架构类型定义 (MemGPT-style Tiered Memory)

/**
 * 记忆层级类型
 * - core: 核心记忆，常驻 Context（人设、规则、核心事实）
 * - recall: 召回记忆，按需检索（RAG/GraphRAG）
 * - archival: 归档记忆，长期存储（历史会话摘要）
 */
export type MemoryTier = 'core' | 'recall' | 'archival';

/**
 * 核心记忆分类
 */
export type CoreMemoryCategory = 'persona' | 'rules' | 'core_facts';

/**
 * 核心记忆 - 常驻 Context，只读/低频更新
 */
export interface CoreMemory {
  id: string;
  agentId: string;
  userId: string;
  category: CoreMemoryCategory;
  key: string;
  value: string;
  isReadOnly: boolean;
  tokenCount: number;
  priority: number; // 1-10，决定加载顺序
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 召回记忆来源
 */
export type RecallSource = 'rag' | 'graph' | 'user_memory';

/**
 * 召回记忆 - 按需检索，动态加载
 */
export interface RecallMemory {
  id: string;
  source: RecallSource;
  content: string;
  relevanceScore: number;
  lastAccessedAt: Date;
  accessCount: number;
  metadata: Record<string, unknown>;
}

/**
 * 归档记忆 - 压缩的历史会话
 */
export interface ArchivedMemory {
  id: string;
  userId: string;
  agentId?: string;
  sessionId?: string;
  summary: string;
  keyInsights: string[];
  userPatterns: string[];
  emotionalTone: string;
  topicsDiscussed: string[];
  tokenCount: number;
  originalMessageCount: number;
  compressedAt: Date;
  expiresAt?: Date;
}

/**
 * Dreaming 任务类型
 */
export type DreamingTaskType = 
  | 'compress_progress'    // 压缩 progress.md
  | 'extract_patterns'     // 提取用户模式
  | 'archive_session'      // 归档会话
  | 'update_core_facts'    // 更新核心事实
  | 'cleanup';             // 清理过期数据

/**
 * Dreaming 任务状态
 */
export type DreamingTaskStatus = 'pending' | 'running' | 'completed' | 'failed';

/**
 * Dreaming 任务
 */
export interface DreamingTask {
  id: string;
  userId: string;
  agentId?: string;
  type: DreamingTaskType;
  status: DreamingTaskStatus;
  priority: number;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * 记忆上下文配置
 */
export interface MemoryContextConfig {
  maxCoreTokens: number;      // 核心记忆最大 token (默认 500)
  maxRecallTokens: number;    // 召回记忆最大 token (默认 2000)
  recallThreshold: number;    // 召回相关度阈值 (默认 0.7)
  enableDreaming: boolean;    // 是否启用 Dreaming
  dreamingIdleThreshold: number;   // Dreaming 触发空闲时间 (ms, 默认 5分钟)
  progressLineThreshold: number;   // progress.md 行数阈值 (默认 50)
}

/**
 * 默认配置
 */
export const DEFAULT_MEMORY_CONFIG: MemoryContextConfig = {
  maxCoreTokens: 500,
  maxRecallTokens: 2000,
  recallThreshold: 0.7,
  enableDreaming: true,
  dreamingIdleThreshold: 5 * 60 * 1000, // 5 分钟
  progressLineThreshold: 50,
};

/**
 * 召回查询选项
 */
export interface RecallQueryOptions {
  topK?: number;
  threshold?: number;
  sources?: RecallSource[];
  includeMetadata?: boolean;
}

/**
 * 记忆整合结果 (Dreaming 输出)
 */
export interface ConsolidationResult {
  summary: string;
  keyInsights: string[];
  userPatterns: string[];
  emotionalTone: string;
  topicsDiscussed: string[];
  coreFacts: Array<{
    key: string;
    value: string;
    importance: number; // 1-10
  }>;
}

/**
 * 分级记忆上下文
 */
export interface TieredMemoryContext {
  core: string;       // 核心记忆字符串
  recall: string;     // 召回记忆字符串
  recent: string;     // 最近上下文
  totalTokens: number;
}

/**
 * Dreaming 触发条件
 */
export interface DreamingTriggerCondition {
  progressLineCount: number;
  lastActivityAt: Date;
  questionCount: number;
  sessionDuration: number; // ms
}

/**
 * 归档摘要统计
 */
export interface ArchivesSummary {
  totalArchives: number;
  lastCompressedAt: Date | null;
  totalExperiences: number;
  oldestArchiveAt: Date | null;
}
