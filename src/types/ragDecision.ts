// =====================================================
// RAG 决策引擎类型定义
// RAG Decision Engine - Types for Phase 3 & 4
// =====================================================

// ========== 决策状态机类型 ==========

export type RAGDecisionAction = 'AUTO_MOUNT' | 'ASK_USER' | 'REQUEST_UPLOAD' | 'SKIP';

export interface RAGDecisionCandidate {
  id: string;
  name: string;
  description?: string;
  score: number;
  matchReason: string;
  intentTags?: string[];
  contextHook?: string;
}

export interface RAGDecisionResult {
  status: 'continue' | 'clarification_needed';
  reason?: 'auto_mount' | 'multiple_candidates' | 'no_match';
  action?: RAGDecisionAction;
  candidates?: RAGDecisionCandidate[];
  question?: string;
  autoMountedKB?: {
    id: string;
    name: string;
    score: number;
  };
}

// ========== 决策阈值配置 ==========

export interface RAGDecisionThresholds {
  autoMountThreshold: number;    // Default: 0.85 - Auto mount when score > this
  askUserThreshold: number;      // Default: 0.60 - Ask user when score > this but < autoMount
  ambiguityGap: number;          // Default: 0.10 - Ask if top scores are within this gap
}

export const DEFAULT_RAG_THRESHOLDS: RAGDecisionThresholds = {
  autoMountThreshold: 0.85,
  askUserThreshold: 0.60,
  ambiguityGap: 0.10,
};

// ========== Runtime 知识缺口检测 ==========

export interface KnowledgeGapDetectionRequest {
  agentId: string;
  userId: string;
  currentMessage: string;
  mountedKnowledgeBaseIds: string[];
  conversationContext?: string;
}

export interface KnowledgeGapDetectionResult {
  gapDetected: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
  suggestedKnowledgeBase?: {
    id: string;
    name: string;
    description?: string;
    matchScore: number;
    reason: string;
  };
  responseHint?: string;
}

// ========== Runtime 知识库挂载 ==========

export interface KnowledgeMountSuggestion {
  knowledgeBaseId: string;
  knowledgeBaseName: string;
  description?: string;
  matchScore: number;
  reason: string;
}

export interface KnowledgeMountLogEntry {
  type: 'mount' | 'query' | 'system' | 'unmount';
  timestamp: Date;
  message: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
}

// ========== 知识库运行时状态 ==========

export interface RuntimeKnowledgeState {
  mountedKnowledgeBases: Array<{
    id: string;
    name: string;
    mountedAt: Date;
    mountType: 'initial' | 'dynamic';
    queryCount: number;
  }>;
  mountLog: KnowledgeMountLogEntry[];
  pendingSuggestion: KnowledgeMountSuggestion | null;
}
