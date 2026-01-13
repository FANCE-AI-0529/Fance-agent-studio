import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DevToolsTab = 
  | 'trace' 
  | 'context' 
  | 'circuit' 
  | 'collaboration' 
  | 'taskchain' 
  | 'history' 
  | 'rag'
  | 'manus'
  | 'debug';

interface DevToolsState {
  // 面板状态
  isCollapsed: boolean;
  panelHeight: number;
  activeTab: DevToolsTab;
  
  // 警告指示器
  hasCircuitWarning: boolean;
  hasDriftWarning: boolean;
  pendingTaskCount: number;
  
  // 操作
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
  setPanelHeight: (height: number) => void;
  setActiveTab: (tab: DevToolsTab) => void;
  setCircuitWarning: (warning: boolean) => void;
  setDriftWarning: (warning: boolean) => void;
  setPendingTaskCount: (count: number) => void;
}

export const useDevToolsState = create<DevToolsState>()(
  persist(
    (set) => ({
      isCollapsed: false,
      panelHeight: 35,
      activeTab: 'trace',
      hasCircuitWarning: false,
      hasDriftWarning: false,
      pendingTaskCount: 0,
      
      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),
      toggleCollapsed: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      setPanelHeight: (height) => set({ panelHeight: height }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setCircuitWarning: (warning) => set({ hasCircuitWarning: warning }),
      setDriftWarning: (warning) => set({ hasDriftWarning: warning }),
      setPendingTaskCount: (count) => set({ pendingTaskCount: count }),
    }),
    {
      name: 'devtools-state',
      partialize: (state) => ({
        panelHeight: state.panelHeight,
        activeTab: state.activeTab,
        isCollapsed: state.isCollapsed,
      }),
    }
  )
);

// 快捷键映射
export const DEVTOOLS_SHORTCUTS = {
  togglePanel: { key: '`', ctrlKey: true, label: 'Ctrl+`' },
  toggleDevMode: { key: 'd', ctrlKey: true, shiftKey: true, label: 'Ctrl+Shift+D' },
  tabs: {
    trace: { key: '1', ctrlKey: true, label: 'Ctrl+1' },
    context: { key: '2', ctrlKey: true, label: 'Ctrl+2' },
    circuit: { key: '3', ctrlKey: true, label: 'Ctrl+3' },
    collaboration: { key: '4', ctrlKey: true, label: 'Ctrl+4' },
    taskchain: { key: '5', ctrlKey: true, label: 'Ctrl+5' },
    history: { key: '6', ctrlKey: true, label: 'Ctrl+6' },
    rag: { key: '7', ctrlKey: true, label: 'Ctrl+7' },
    manus: { key: '8', ctrlKey: true, label: 'Ctrl+8' },
    debug: { key: '9', ctrlKey: true, label: 'Ctrl+9' },
  },
} as const;

// Tab 配置
export const DEVTOOLS_TABS = [
  { id: 'trace' as const, label: '决策追踪', icon: 'GitBranch' },
  { id: 'context' as const, label: '运行上下文', icon: 'Database' },
  { id: 'circuit' as const, label: '熔断器', icon: 'Zap' },
  { id: 'collaboration' as const, label: '协作', icon: 'Users' },
  { id: 'taskchain' as const, label: '任务链', icon: 'Link' },
  { id: 'history' as const, label: '执行历史', icon: 'History' },
  { id: 'rag' as const, label: 'RAG', icon: 'Search' },
  { id: 'manus' as const, label: 'Manus', icon: 'Brain' },
  { id: 'debug' as const, label: '调试', icon: 'Bug' },
] as const;
