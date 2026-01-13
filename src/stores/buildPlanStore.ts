// =====================================================
// 构建计划状态管理 Store
// Build Plan State Management - Zustand Store
// =====================================================

import { create } from 'zustand';
import {
  BuildPlan,
  BuildPlanPhase,
  BuildPhaseStatus,
  ExtractedIntent,
  AssetCheckResult,
  GeneratedSkillSpec,
  KnowledgeBaseSuggestion,
  createInitialBuildPlan,
} from '@/types/buildPlan';

interface BuildPlanState {
  // 当前构建计划
  currentPlan: BuildPlan | null;
  
  // 构建状态
  isBuilding: boolean;
  currentPhase: keyof BuildPlan['phases'] | null;
  
  // 事件日志
  events: Array<{
    timestamp: string;
    phase: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
  
  // Actions
  initializePlan: (description: string) => void;
  
  updatePhase: (
    phaseKey: keyof BuildPlan['phases'],
    update: Partial<BuildPlanPhase>
  ) => void;
  
  startPhase: (phaseKey: keyof BuildPlan['phases']) => void;
  
  completePhase: (
    phaseKey: keyof BuildPlan['phases'],
    details?: string
  ) => void;
  
  failPhase: (
    phaseKey: keyof BuildPlan['phases'],
    error: string
  ) => void;
  
  skipPhase: (
    phaseKey: keyof BuildPlan['phases'],
    reason?: string
  ) => void;
  
  setExtractedIntent: (intent: ExtractedIntent) => void;
  
  setAssetCheckResult: (result: AssetCheckResult) => void;
  
  addGeneratedSkill: (skill: GeneratedSkillSpec) => void;
  
  setAutoMountedKBs: (kbs: KnowledgeBaseSuggestion[]) => void;
  
  setOutput: (output: BuildPlan['output']) => void;
  
  setValidationResult: (result: BuildPlan['validationResult']) => void;
  
  addEvent: (
    phase: string,
    message: string,
    type?: 'info' | 'success' | 'warning' | 'error'
  ) => void;
  
  reset: () => void;
}

export const useBuildPlanStore = create<BuildPlanState>((set, get) => ({
  currentPlan: null,
  isBuilding: false,
  currentPhase: null,
  events: [],

  initializePlan: (description: string) => {
    const plan = createInitialBuildPlan(description);
    set({
      currentPlan: plan,
      isBuilding: true,
      currentPhase: null,
      events: [{
        timestamp: new Date().toISOString(),
        phase: 'init',
        message: `开始构建计划: ${description.slice(0, 50)}...`,
        type: 'info',
      }],
    });
  },

  updatePhase: (phaseKey, update) => {
    set((state) => {
      if (!state.currentPlan) return state;
      
      return {
        currentPlan: {
          ...state.currentPlan,
          phases: {
            ...state.currentPlan.phases,
            [phaseKey]: {
              ...state.currentPlan.phases[phaseKey],
              ...update,
            },
          },
        },
      };
    });
  },

  startPhase: (phaseKey) => {
    const now = new Date().toISOString();
    set((state) => {
      if (!state.currentPlan) return state;
      
      return {
        currentPhase: phaseKey,
        currentPlan: {
          ...state.currentPlan,
          phases: {
            ...state.currentPlan.phases,
            [phaseKey]: {
              ...state.currentPlan.phases[phaseKey],
              status: 'running' as BuildPhaseStatus,
              startedAt: now,
            },
          },
        },
        events: [
          ...state.events,
          {
            timestamp: now,
            phase: phaseKey,
            message: `开始 ${state.currentPlan.phases[phaseKey].name}`,
            type: 'info' as const,
          },
        ],
      };
    });
  },

  completePhase: (phaseKey, details) => {
    const now = new Date().toISOString();
    set((state) => {
      if (!state.currentPlan) return state;
      
      const phase = state.currentPlan.phases[phaseKey];
      const duration = phase.startedAt 
        ? new Date(now).getTime() - new Date(phase.startedAt).getTime()
        : 0;
      
      return {
        currentPlan: {
          ...state.currentPlan,
          phases: {
            ...state.currentPlan.phases,
            [phaseKey]: {
              ...phase,
              status: 'completed' as BuildPhaseStatus,
              completedAt: now,
              duration,
              details,
            },
          },
        },
        events: [
          ...state.events,
          {
            timestamp: now,
            phase: phaseKey,
            message: details || `${phase.name} 完成`,
            type: 'success' as const,
          },
        ],
      };
    });
  },

  failPhase: (phaseKey, error) => {
    const now = new Date().toISOString();
    set((state) => {
      if (!state.currentPlan) return state;
      
      const phase = state.currentPlan.phases[phaseKey];
      
      return {
        currentPlan: {
          ...state.currentPlan,
          phases: {
            ...state.currentPlan.phases,
            [phaseKey]: {
              ...phase,
              status: 'failed' as BuildPhaseStatus,
              completedAt: now,
              error,
            },
          },
        },
        events: [
          ...state.events,
          {
            timestamp: now,
            phase: phaseKey,
            message: `${phase.name} 失败: ${error}`,
            type: 'error' as const,
          },
        ],
      };
    });
  },

  skipPhase: (phaseKey, reason) => {
    const now = new Date().toISOString();
    set((state) => {
      if (!state.currentPlan) return state;
      
      const phase = state.currentPlan.phases[phaseKey];
      
      return {
        currentPlan: {
          ...state.currentPlan,
          phases: {
            ...state.currentPlan.phases,
            [phaseKey]: {
              ...phase,
              status: 'skipped' as BuildPhaseStatus,
              completedAt: now,
              details: reason,
            },
          },
        },
        events: [
          ...state.events,
          {
            timestamp: now,
            phase: phaseKey,
            message: reason || `${phase.name} 已跳过`,
            type: 'warning' as const,
          },
        ],
      };
    });
  },

  setExtractedIntent: (intent) => {
    set((state) => {
      if (!state.currentPlan) return state;
      return {
        currentPlan: {
          ...state.currentPlan,
          extractedIntent: intent,
        },
      };
    });
  },

  setAssetCheckResult: (result) => {
    set((state) => {
      if (!state.currentPlan) return state;
      return {
        currentPlan: {
          ...state.currentPlan,
          assetCheckResult: result,
        },
      };
    });
  },

  addGeneratedSkill: (skill) => {
    set((state) => {
      if (!state.currentPlan) return state;
      return {
        currentPlan: {
          ...state.currentPlan,
          generatedSkills: [
            ...(state.currentPlan.generatedSkills || []),
            skill,
          ],
        },
      };
    });
  },

  setAutoMountedKBs: (kbs) => {
    set((state) => {
      if (!state.currentPlan) return state;
      return {
        currentPlan: {
          ...state.currentPlan,
          autoMountedKBs: kbs,
        },
      };
    });
  },

  setOutput: (output) => {
    set((state) => {
      if (!state.currentPlan) return state;
      return {
        currentPlan: {
          ...state.currentPlan,
          output,
        },
        isBuilding: false,
      };
    });
  },

  setValidationResult: (result) => {
    set((state) => {
      if (!state.currentPlan) return state;
      return {
        currentPlan: {
          ...state.currentPlan,
          validationResult: result,
        },
      };
    });
  },

  addEvent: (phase, message, type = 'info') => {
    set((state) => ({
      events: [
        ...state.events,
        {
          timestamp: new Date().toISOString(),
          phase,
          message,
          type,
        },
      ],
    }));
  },

  reset: () => {
    set({
      currentPlan: null,
      isBuilding: false,
      currentPhase: null,
      events: [],
    });
  },
}));
