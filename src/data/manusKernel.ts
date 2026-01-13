// Manus Kernel 核心定义
// 基于 "Planning with Files" (Manus-style) 的文件规划系统

export const TASK_PLAN_TEMPLATE = `# Task Plan

## Objective
[Describe the main goal here]

## Phases
- [ ] Phase 1: Initial Analysis
- [ ] Phase 2: Implementation
- [ ] Phase 3: Verification

## Current Status
**Active Phase**: 1
**Progress**: 0%

## Dependencies
- None identified yet

## Notes
- Created: {{timestamp}}
`;

export const FINDINGS_TEMPLATE = `# Findings

## Key Discoveries

| # | Finding | Source | Timestamp |
|---|---------|--------|----------|

## Important Notes


## Patterns Observed


---
*Last updated: {{timestamp}}*
`;

export const PROGRESS_TEMPLATE = `# Progress Log

## Session Timeline

| Time | Action | Result | Notes |
|------|--------|--------|-------|

## Errors Encountered

| Error | Context | Resolution |
|-------|---------|------------|

## Decisions Made

| Decision | Rationale | Timestamp |
|----------|-----------|-----------|

---
*Session started: {{timestamp}}*
`;

export interface ManusHook {
  type: 'SessionStart' | 'PreToolUse' | 'PostToolUse' | 'Stop';
  matcher?: string;
  action: string;
  description?: string;
}

export interface ManusRules {
  twoActionRule: boolean;
  threeStrikeProtocol: boolean;
  fiveQuestionReboot: boolean;
}

export interface ManusKernelConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  fileTemplates: {
    'task_plan.md': string;
    'findings.md': string;
    'progress.md': string;
  };
  hooks: {
    SessionStart: ManusHook;
    PreToolUse: ManusHook;
    PostToolUse: ManusHook;
    Stop: ManusHook;
  };
  rules: ManusRules;
}

export const MANUS_KERNEL: ManusKernelConfig = {
  id: 'core-manus-planning',
  name: 'Planning with Files',
  version: '2.1.2',
  description: 'Manus-style 文件规划系统，为每个 Agent 提供自我规划、知识沉淀和进度追踪能力',
  
  fileTemplates: {
    'task_plan.md': TASK_PLAN_TEMPLATE,
    'findings.md': FINDINGS_TEMPLATE,
    'progress.md': PROGRESS_TEMPLATE,
  },
  
  hooks: {
    SessionStart: {
      type: 'SessionStart',
      action: 'INITIALIZE memory files',
      description: '会话启动时初始化 Manus 内存文件'
    },
    PreToolUse: {
      type: 'PreToolUse',
      matcher: 'Write|Edit|MCP',
      action: 'READ /memory/task_plan.md',
      description: '执行工具前读取任务规划'
    },
    PostToolUse: {
      type: 'PostToolUse',
      matcher: 'Write|Edit',
      action: 'REMIND update task_plan.md if phase completed',
      description: '执行工具后提醒更新进度'
    },
    Stop: {
      type: 'Stop',
      action: 'CHECK all phases complete',
      description: '停止前检查所有阶段是否完成'
    }
  },
  
  rules: {
    twoActionRule: true,      // 每 2 次浏览操作必须更新 findings.md
    threeStrikeProtocol: true, // 3 次失败后升级策略
    fiveQuestionReboot: true,  // 5 问题后恢复检查
  }
};

// 文件路径常量
export const MANUS_FILE_PATHS = {
  TASK_PLAN: '/memory/task_plan.md',
  FINDINGS: '/memory/findings.md',
  PROGRESS: '/memory/progress.md',
} as const;

// 默认文件内容生成
export function generateDefaultContent(filePath: string): string {
  const timestamp = new Date().toISOString();
  
  switch (filePath) {
    case MANUS_FILE_PATHS.TASK_PLAN:
      return TASK_PLAN_TEMPLATE.replace('{{timestamp}}', timestamp);
    case MANUS_FILE_PATHS.FINDINGS:
      return FINDINGS_TEMPLATE.replace('{{timestamp}}', timestamp);
    case MANUS_FILE_PATHS.PROGRESS:
      return PROGRESS_TEMPLATE.replace('{{timestamp}}', timestamp);
    default:
      return '';
  }
}

// 解析 Task Plan 获取当前阶段
export function parseTaskPlanPhases(content: string): {
  phases: { name: string; completed: boolean }[];
  activePhase: number;
  progress: number;
} {
  const phases: { name: string; completed: boolean }[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const phaseMatch = line.match(/^- \[([ x])\] Phase (\d+): (.+)$/);
    if (phaseMatch) {
      phases.push({
        name: phaseMatch[3],
        completed: phaseMatch[1] === 'x'
      });
    }
  }
  
  const activePhaseMatch = content.match(/\*\*Active Phase\*\*: (\d+)/);
  const progressMatch = content.match(/\*\*Progress\*\*: (\d+)%/);
  
  const completedCount = phases.filter(p => p.completed).length;
  const calculatedProgress = phases.length > 0 
    ? Math.round((completedCount / phases.length) * 100)
    : 0;
  
  return {
    phases,
    activePhase: activePhaseMatch ? parseInt(activePhaseMatch[1]) : 1,
    progress: progressMatch ? parseInt(progressMatch[1]) : calculatedProgress
  };
}

// 解析 Findings 获取发现数量
export function parseFindingsCount(content: string): number {
  const tableRows = content.match(/^\| \d+ \|/gm);
  return tableRows ? tableRows.length : 0;
}

// 解析 Progress 获取操作数量
export function parseProgressActions(content: string): {
  actionsCount: number;
  errorsCount: number;
  decisionsCount: number;
} {
  const timelineRows = content.match(/^\| \d{2}:\d{2}/gm);
  const errorRows = content.match(/^\| .+ \| .+ \| .+ \|$/gm);
  const decisionRows = content.match(/^\| .+ \| .+ \| \d{4}/gm);
  
  return {
    actionsCount: timelineRows ? timelineRows.length : 0,
    errorsCount: 0, // 简化计算
    decisionsCount: decisionRows ? decisionRows.length : 0
  };
}
