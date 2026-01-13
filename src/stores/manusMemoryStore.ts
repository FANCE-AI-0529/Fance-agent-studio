import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ManusMemoryFile {
  path: string;
  content: string;
  version: number;
  lastModifiedBy: 'user' | 'agent' | 'system';
  updatedAt: string;
}

export interface ErrorRecord {
  id: string;
  message: string;
  context: string;
  timestamp: string;
  resolved: boolean;
}

export interface DecisionRecord {
  id: string;
  decision: string;
  rationale: string;
  timestamp: string;
}

export interface KnowledgeMountLog {
  type: 'mount' | 'query' | 'system' | 'unmount';
  timestamp: string;
  message: string;
  knowledgeBaseId?: string;
  knowledgeBaseName?: string;
}

export interface ManusMemoryState {
  // 当前会话 ID
  sessionId: string | null;
  
  // 核心文件内容
  taskPlan: string;
  findings: string;
  progress: string;
  
  // 解析后的状态
  currentPhase: number;
  totalPhases: number;
  phaseProgress: number;
  findingsCount: number;
  
  // 规则计数器
  actionCount: number; // 用于 2-Action Rule
  browseCount: number; // 浏览操作计数
  errorStrikes: number; // 连续错误计数
  questionCount: number; // 问题计数
  
  // 记录
  errors: ErrorRecord[];
  decisions: DecisionRecord[];
  
  // 知识库状态 (Phase 4)
  mountedKnowledgeBases: string[];
  knowledgeMountLog: KnowledgeMountLog[];
  
  // 状态标志
  isInitialized: boolean;
  needsFindingsUpdate: boolean; // 2-Action Rule 触发
  needsRebootCheck: boolean; // 5-Question Reboot 触发
  
  // 操作
  initializeSession: (sessionId: string) => void;
  updateTaskPlan: (content: string) => void;
  updateFindings: (content: string) => void;
  updateProgress: (content: string) => void;
  
  incrementActionCount: () => void;
  incrementBrowseCount: () => void;
  incrementErrorStrikes: () => void;
  resetErrorStrikes: () => void;
  incrementQuestionCount: () => void;
  
  addError: (error: Omit<ErrorRecord, 'id' | 'timestamp' | 'resolved'>) => void;
  addDecision: (decision: Omit<DecisionRecord, 'id' | 'timestamp'>) => void;
  resolveError: (errorId: string) => void;
  
  setPhaseProgress: (phase: number, total: number, progress: number) => void;
  setFindingsCount: (count: number) => void;
  
  checkTwoActionRule: () => boolean;
  checkThreeStrikeProtocol: () => boolean;
  checkFiveQuestionReboot: () => boolean;
  
  // 知识库操作 (Phase 4)
  addMountedKnowledgeBase: (kbId: string) => void;
  removeMountedKnowledgeBase: (kbId: string) => void;
  addKnowledgeMountLog: (log: Omit<KnowledgeMountLog, 'timestamp'>) => void;
  clearKnowledgeMountLog: () => void;
  
  resetSession: () => void;
}

const initialState = {
  sessionId: null,
  taskPlan: '',
  findings: '',
  progress: '',
  currentPhase: 1,
  totalPhases: 3,
  phaseProgress: 0,
  findingsCount: 0,
  actionCount: 0,
  browseCount: 0,
  errorStrikes: 0,
  questionCount: 0,
  errors: [],
  decisions: [],
  mountedKnowledgeBases: [],
  knowledgeMountLog: [],
  isInitialized: false,
  needsFindingsUpdate: false,
  needsRebootCheck: false,
};

export const useManusMemoryStore = create<ManusMemoryState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      initializeSession: (sessionId: string) => {
        set({
          sessionId,
          isInitialized: true,
          actionCount: 0,
          browseCount: 0,
          errorStrikes: 0,
          questionCount: 0,
          needsFindingsUpdate: false,
          needsRebootCheck: false,
        });
      },
      
      updateTaskPlan: (content: string) => {
        set({ taskPlan: content });
      },
      
      updateFindings: (content: string) => {
        set({ 
          findings: content,
          browseCount: 0, // 更新后重置浏览计数
          needsFindingsUpdate: false 
        });
      },
      
      updateProgress: (content: string) => {
        set({ progress: content });
      },
      
      incrementActionCount: () => {
        set(state => ({ actionCount: state.actionCount + 1 }));
      },
      
      incrementBrowseCount: () => {
        const newCount = get().browseCount + 1;
        set({ 
          browseCount: newCount,
          needsFindingsUpdate: newCount >= 2
        });
      },
      
      incrementErrorStrikes: () => {
        set(state => ({ errorStrikes: state.errorStrikes + 1 }));
      },
      
      resetErrorStrikes: () => {
        set({ errorStrikes: 0 });
      },
      
      incrementQuestionCount: () => {
        const newCount = get().questionCount + 1;
        set({ 
          questionCount: newCount,
          needsRebootCheck: newCount >= 5
        });
      },
      
      addError: (error) => {
        const newError: ErrorRecord = {
          ...error,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          resolved: false,
        };
        set(state => ({ 
          errors: [...state.errors, newError],
          errorStrikes: state.errorStrikes + 1
        }));
      },
      
      addDecision: (decision) => {
        const newDecision: DecisionRecord = {
          ...decision,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        };
        set(state => ({ decisions: [...state.decisions, newDecision] }));
      },
      
      resolveError: (errorId: string) => {
        set(state => ({
          errors: state.errors.map(e => 
            e.id === errorId ? { ...e, resolved: true } : e
          ),
          errorStrikes: Math.max(0, state.errorStrikes - 1)
        }));
      },
      
      setPhaseProgress: (phase: number, total: number, progress: number) => {
        set({ 
          currentPhase: phase,
          totalPhases: total,
          phaseProgress: progress
        });
      },
      
      setFindingsCount: (count: number) => {
        set({ findingsCount: count });
      },
      
      checkTwoActionRule: () => {
        return get().browseCount >= 2;
      },
      
      checkThreeStrikeProtocol: () => {
        return get().errorStrikes >= 3;
      },
      
      checkFiveQuestionReboot: () => {
        return get().questionCount >= 5;
      },
      
      // 知识库操作 (Phase 4)
      addMountedKnowledgeBase: (kbId: string) => {
        set(state => ({
          mountedKnowledgeBases: [...state.mountedKnowledgeBases, kbId],
        }));
      },
      
      removeMountedKnowledgeBase: (kbId: string) => {
        set(state => ({
          mountedKnowledgeBases: state.mountedKnowledgeBases.filter(id => id !== kbId),
        }));
      },
      
      addKnowledgeMountLog: (log) => {
        const newLog: KnowledgeMountLog = {
          ...log,
          timestamp: new Date().toISOString(),
        };
        set(state => ({
          knowledgeMountLog: [...state.knowledgeMountLog, newLog],
        }));
      },
      
      clearKnowledgeMountLog: () => {
        set({ knowledgeMountLog: [] });
      },
      
      resetSession: () => {
        set(initialState);
      },
    }),
    {
      name: 'manus-memory-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        taskPlan: state.taskPlan,
        findings: state.findings,
        progress: state.progress,
        currentPhase: state.currentPhase,
        totalPhases: state.totalPhases,
        errors: state.errors,
        decisions: state.decisions,
        mountedKnowledgeBases: state.mountedKnowledgeBases,
        knowledgeMountLog: state.knowledgeMountLog,
      }),
    }
  )
);
