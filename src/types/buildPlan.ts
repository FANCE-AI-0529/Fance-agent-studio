// =====================================================
// 构建计划类型定义
// Build Plan Types - Builder's Self-Planning System
// =====================================================

import type { AgentScore, RedTeamResults, TestRunResult } from './agentEvals.ts';

// 构建计划阶段状态
export type BuildPhaseStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

// 构建计划子任务
export interface BuildPlanSubTask {
  id: string;
  name: string;
  status: BuildPhaseStatus;
  result?: string;
  details?: string;
}

// 构建计划阶段
export interface BuildPlanPhase {
  id: string;
  name: string;
  status: BuildPhaseStatus;
  startedAt?: string;
  completedAt?: string;
  duration?: number; // ms
  details?: string;
  subTasks?: BuildPlanSubTask[];
  error?: string;
}

// 提取的意图信息
export interface ExtractedIntent {
  role: string;
  actions: string[];
  requiredCapabilities: string[];
  riskLevel: 'low' | 'medium' | 'high';
  category?: string;
}

// 资产匹配结果
export interface AssetMatch {
  type: 'skill' | 'mcp' | 'rag' | 'knowledge_base';
  id: string;
  name: string;
  score: number;
  action: 'use' | 'generate' | 'skip';
  reason?: string;
}

// 资产检查结果
export interface AssetCheckResult {
  matchedAssets: AssetMatch[];
  missingCapabilities: string[];
  needsGeneration: boolean;
  coverageScore: number;
}

// 生成的技能规格
export interface GeneratedSkillSpec {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  templateContent?: string;
  generatedAt: string;
  isGenerated: true;
}

// 知识库挂载建议
export interface KnowledgeBaseSuggestion {
  id: string;
  name: string;
  description?: string;
  intentTags: string[];
  contextHook?: string;
  matchScore: number;
  isAutoMounted?: boolean;
}

// 评估结果
export interface EvaluationResult {
  score: AgentScore;
  testRuns: TestRunResult[];
  redTeamResults: RedTeamResults;
  passed: boolean;
  duration: number;
  completedAt: string;
}

// 完整构建计划
export interface BuildPlan {
  id: string;
  createdAt: string;
  description: string;
  
  // 阶段
  phases: {
    intentAnalysis: BuildPlanPhase;
    assetCheck: BuildPlanPhase;
    gapAnalysis: BuildPlanPhase;
    skillGeneration: BuildPlanPhase;
    assembly: BuildPlanPhase;
    validation: BuildPlanPhase;
    evaluation: BuildPlanPhase;  // 新增：智能体评估阶段
  };
  
  // 分析结果
  extractedIntent?: ExtractedIntent;
  
  // 资产检查结果
  assetCheckResult?: AssetCheckResult;
  
  // 生成的技能
  generatedSkills?: GeneratedSkillSpec[];
  
  // 自动挂载的知识库
  autoMountedKBs?: KnowledgeBaseSuggestion[];
  
  // 最终输出
  output?: {
    nodes: unknown[];
    edges: unknown[];
    agentConfig: unknown;
    dsl: unknown;
  };
  
  // 验证结果
  validationResult?: {
    passed: boolean;
    testRuns: Array<{
      testId: string;
      input: string;
      output?: string;
      error?: string;
      duration: number;
    }>;
    retryCount: number;
  };
  
  // 评估结果 (新增)
  evaluationResult?: EvaluationResult;
}

// 构建计划事件
export interface BuildPlanEvent {
  phase: keyof BuildPlan['phases'];
  status: BuildPhaseStatus;
  details?: string;
  timestamp: string;
  data?: unknown;
}

// 创建初始构建计划
export function createInitialBuildPlan(description: string): BuildPlan {
  const now = new Date().toISOString();
  return {
    id: `plan-${Date.now()}`,
    createdAt: now,
    description,
    phases: {
      intentAnalysis: {
        id: 'intent-analysis',
        name: '意图分析',
        status: 'pending',
      },
      assetCheck: {
        id: 'asset-check',
        name: '资产检查',
        status: 'pending',
      },
      gapAnalysis: {
        id: 'gap-analysis',
        name: '缺口分析',
        status: 'pending',
      },
      skillGeneration: {
        id: 'skill-generation',
        name: '技能生成',
        status: 'pending',
      },
      assembly: {
        id: 'assembly',
        name: '组装工作流',
        status: 'pending',
      },
      validation: {
        id: 'validation',
        name: '沙箱验证',
        status: 'pending',
      },
      evaluation: {
        id: 'evaluation',
        name: '智能体质检',
        status: 'pending',
      },
    },
  };
}
