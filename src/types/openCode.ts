/**
 * OpenCode Integration Types
 * Type definitions for the OpenCode programming engine integration
 */

export type OpenCodeMode = 'plan' | 'build';

export interface OpenCodeSession {
  id: string;
  agentId: string;
  sessionId: string;
  userId: string;
  currentMode: OpenCodeMode;
  planContent?: string;
  approvalToken?: string;
  approvedAt?: string;
  styleViolations: StyleViolation[];
  createdAt: string;
  updatedAt: string;
}

export type StyleRule = 
  | 'no-let' 
  | 'no-else' 
  | 'single-word' 
  | 'no-destructure' 
  | 'no-any' 
  | 'no-try-catch'
  | 'prefer-bun-api'
  | 'no-nested-ternary';

export interface StyleViolation {
  rule: StyleRule;
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  autoFix?: string;
  original?: string;
}

export interface SelfCheckResult {
  passed: boolean;
  questions: {
    usedLet: boolean;
    usedElse: boolean;
    usedAny: boolean;
    usedDestructuring: boolean;
    usedTryCatch: boolean;
  };
  violations: StyleViolation[];
  refactoredCode?: string;
  report: string;
}

export interface OpenCodeKernelRules {
  planFirst: boolean;
  requireApprovalForBuild: boolean;
  styleCheckOnWrite: boolean;
  selfRefactorOnViolation: boolean;
  noLetStatements: boolean;
  noElseStatements: boolean;
  noAnyType: boolean;
  singleWordNaming: boolean;
  avoidDestructuring: boolean;
  avoidTryCatch: boolean;
  preferBunAPIs: boolean;
}

export interface StyleCheckResult {
  violations: StyleViolation[];
  passed: boolean;
  score: number;
  summary: string;
}

export interface OpenCodeRequest {
  agentId: string;
  sessionId: string;
  operation: 'list' | 'read' | 'write' | 'edit' | 'bash' | 'search';
  params: Record<string, unknown>;
  requestMode?: OpenCodeMode;
  approvalToken?: string;
}

export interface OpenCodeResponse {
  success: boolean;
  mode: OpenCodeMode;
  result?: unknown;
  styleViolations?: StyleViolation[];
  modeBlockReason?: string;
  planGenerated?: string;
  error?: string;
}

export interface OpenCodePlan {
  id: string;
  description: string;
  files: OpenCodePlanFile[];
  riskAssessment: {
    breakingChanges: boolean;
    newDependencies: boolean;
    securityImplications: boolean;
  };
  approvalRequired: boolean;
}

export interface OpenCodePlanFile {
  path: string;
  action: 'create' | 'modify' | 'delete';
  description: string;
  changes?: string;
}

// ========== Terminal TUI Types ==========

/**
 * Terminal command tracking for TUI display
 */
export interface TerminalCommand {
  id: string;
  command: string;
  output: string;
  status: 'running' | 'success' | 'error';
  timestamp: Date;
  exitCode?: number;
  cwd?: string;
}

/**
 * File diff for code changes visualization
 */
export interface FileDiff {
  id: string;
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  language: string;
  action: 'create' | 'modify' | 'delete';
  timestamp: Date;
  accepted?: boolean;
}

/**
 * OpenCode runtime state for TUI
 */
export interface OpenCodeRuntimeState {
  isActive: boolean;
  currentMode: OpenCodeMode;
  terminalCommands: TerminalCommand[];
  pendingDiffs: FileDiff[];
  currentFile?: string;
  styleCheckPassed: boolean;
  styleViolationsCount: number;
}

export interface KernelSkill {
  id: string;
  skillId: string;
  name: string;
  version: string;
  description?: string;
  content: string;
  fileTemplates: Record<string, string>;
  hooks: KernelSkillHooks;
  rules: KernelSkillRules;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KernelSkillHooks {
  SessionStart?: { action: string };
  PreToolUse?: { matcher: string; action: string };
  PostToolUse?: { matcher: string; action: string };
  ModeSwitch?: { from: string; to: string; require: string };
}

export interface KernelSkillRules {
  planFirst?: boolean;
  requireApprovalForBuild?: boolean;
  styleCheckOnWrite?: boolean;
  noLetStatements?: boolean;
  noElseStatements?: boolean;
  singleWordNaming?: boolean;
  avoidDestructuring?: boolean;
}

/**
 * OpenCode Blueprint for workflow generator
 */
export const OPENCODE_BLUEPRINT = {
  id: 'opencode-coding',
  name: 'OpenCode Programming',
  description: 'OpenCode-style dual-mode programming workflow',
  category: 'development',
  structure: {
    trigger: { type: 'user_message' },
    slots: [
      { 
        id: 'plan', 
        name: 'Planning Phase', 
        slotType: 'perception', 
        required: true, 
        description: 'Browse files and generate modification plan', 
        acceptedAtomTypes: ['KERNEL_SKILL'], 
        kernelSkillId: 'core-opencode',
        modeRestriction: 'plan',
        position: { rank: 1 } 
      },
      { 
        id: 'approval', 
        name: 'User Approval', 
        slotType: 'decision', 
        required: true, 
        description: 'MPLP approval or user confirmation', 
        acceptedAtomTypes: ['INTERVENTION'], 
        position: { rank: 2 } 
      },
      { 
        id: 'build', 
        name: 'Execution Phase', 
        slotType: 'action', 
        required: true, 
        description: 'Execute approved code changes', 
        acceptedAtomTypes: ['KERNEL_SKILL'], 
        kernelSkillId: 'core-opencode',
        modeRestriction: 'build',
        position: { rank: 3 } 
      },
      { 
        id: 'style_check', 
        name: 'Style Validation', 
        slotType: 'perception', 
        required: false, 
        description: 'Validate code against Style Guide', 
        acceptedAtomTypes: ['NATIVE_SKILL'], 
        position: { rank: 4 } 
      },
    ],
    edges: [
      { from: 'trigger', to: 'plan' },
      { from: 'plan', to: 'approval' },
      { from: 'approval', to: 'build', condition: 'approved' },
      { from: 'build', to: 'style_check' },
    ],
  },
  matchKeywords: ['编程', '代码', '修改文件', '写代码', 'coding', 'programming', 'implement', 'develop'],
  matchPatterns: [
    /(?:修改|编辑|创建|删除).*(?:文件|代码)/i,
    /(?:实现|开发|编写).*功能/i,
    /(?:create|modify|edit|delete).*(?:file|code)/i,
  ],
} as const;
