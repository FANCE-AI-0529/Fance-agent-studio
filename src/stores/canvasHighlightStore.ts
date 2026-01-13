// =====================================================
// 画布高亮状态管理 Store
// Canvas Highlight Store - Data Flow Animation State
// =====================================================

import { create } from 'zustand';
import type { DataFlowPath } from '@/types/verificationTypes';

export interface CanvasHighlightState {
  // 路径数据
  highlightedPath: string[];        // 节点 ID 序列
  highlightedEdges: string[];       // 边 ID 序列 (source-target 格式)
  currentStep: number;              // 当前步骤 (0-based)
  pathInfo: DataFlowPath | null;    // 完整路径信息
  
  // 动画状态
  isAnimating: boolean;
  isPaused: boolean;
  animationSpeed: number;           // 毫秒
  loopAnimation: boolean;
  
  // 高亮样式配置
  highlightConfig: {
    activeNodeStyle: 'pulse' | 'glow' | 'ring';
    passedNodeStyle: 'dim' | 'checkmark' | 'green-ring';
    edgeFlowStyle: 'particles' | 'dash' | 'pulse';
  };
}

export interface CanvasHighlightActions {
  // 核心动作
  startPathAnimation: (path: DataFlowPath) => void;
  stopAnimation: () => void;
  pauseAnimation: () => void;
  resumeAnimation: () => void;
  
  // 步进控制
  stepForward: () => void;
  stepBackward: () => void;
  jumpToStep: (step: number) => void;
  
  // 配置
  setAnimationSpeed: (speed: number) => void;
  setLoopAnimation: (loop: boolean) => void;
  setHighlightConfig: (config: Partial<CanvasHighlightState['highlightConfig']>) => void;
  
  // 查询
  isNodeHighlighted: (nodeId: string) => 'active' | 'passed' | 'waiting' | null;
  isEdgeHighlighted: (edgeId: string) => 'active' | 'passed' | 'waiting' | null;
  getCurrentNodeId: () => string | null;
  
  // 重置
  reset: () => void;
}

const initialState: CanvasHighlightState = {
  highlightedPath: [],
  highlightedEdges: [],
  currentStep: 0,
  pathInfo: null,
  isAnimating: false,
  isPaused: false,
  animationSpeed: 500,
  loopAnimation: false,
  highlightConfig: {
    activeNodeStyle: 'glow',
    passedNodeStyle: 'green-ring',
    edgeFlowStyle: 'particles',
  },
};

export const useCanvasHighlightStore = create<CanvasHighlightState & CanvasHighlightActions>((set, get) => ({
  ...initialState,
  
  // ========== 核心动作 ==========
  
  startPathAnimation: (path: DataFlowPath) => {
    // 从路径信息中提取节点和边
    const nodeIds = path.nodes;
    const edgeIds = path.edges;
    
    set({
      highlightedPath: nodeIds,
      highlightedEdges: edgeIds,
      currentStep: 0,
      pathInfo: path,
      isAnimating: true,
      isPaused: false,
    });
  },
  
  stopAnimation: () => {
    set({
      isAnimating: false,
      isPaused: false,
      currentStep: 0,
    });
  },
  
  pauseAnimation: () => {
    set({ isPaused: true });
  },
  
  resumeAnimation: () => {
    set({ isPaused: false });
  },
  
  // ========== 步进控制 ==========
  
  stepForward: () => {
    const { currentStep, highlightedPath, loopAnimation } = get();
    
    if (currentStep < highlightedPath.length - 1) {
      set({ currentStep: currentStep + 1 });
    } else if (loopAnimation) {
      set({ currentStep: 0 });
    }
  },
  
  stepBackward: () => {
    const { currentStep } = get();
    
    if (currentStep > 0) {
      set({ currentStep: currentStep - 1 });
    }
  },
  
  jumpToStep: (step: number) => {
    const { highlightedPath } = get();
    
    if (step >= 0 && step < highlightedPath.length) {
      set({ currentStep: step });
    }
  },
  
  // ========== 配置 ==========
  
  setAnimationSpeed: (speed: number) => {
    set({ animationSpeed: speed });
  },
  
  setLoopAnimation: (loop: boolean) => {
    set({ loopAnimation: loop });
  },
  
  setHighlightConfig: (config: Partial<CanvasHighlightState['highlightConfig']>) => {
    set((state) => ({
      highlightConfig: { ...state.highlightConfig, ...config },
    }));
  },
  
  // ========== 查询 ==========
  
  isNodeHighlighted: (nodeId: string) => {
    const { highlightedPath, currentStep, isAnimating } = get();
    
    if (!isAnimating || highlightedPath.length === 0) {
      return null;
    }
    
    const nodeIndex = highlightedPath.indexOf(nodeId);
    
    if (nodeIndex === -1) {
      return null;
    }
    
    if (nodeIndex === currentStep) {
      return 'active';
    } else if (nodeIndex < currentStep) {
      return 'passed';
    } else {
      return 'waiting';
    }
  },
  
  isEdgeHighlighted: (edgeId: string) => {
    const { highlightedEdges, highlightedPath, currentStep, isAnimating } = get();
    
    if (!isAnimating || highlightedEdges.length === 0) {
      return null;
    }
    
    const edgeIndex = highlightedEdges.indexOf(edgeId);
    
    if (edgeIndex === -1) {
      return null;
    }
    
    // 边的状态基于其连接的节点
    // 边 index 对应的是从 node[index] 到 node[index+1] 的连接
    if (edgeIndex < currentStep) {
      return 'passed';
    } else if (edgeIndex === currentStep && currentStep < highlightedPath.length - 1) {
      return 'active';
    } else {
      return 'waiting';
    }
  },
  
  getCurrentNodeId: () => {
    const { highlightedPath, currentStep, isAnimating } = get();
    
    if (!isAnimating || highlightedPath.length === 0) {
      return null;
    }
    
    return highlightedPath[currentStep] || null;
  },
  
  // ========== 重置 ==========
  
  reset: () => {
    set(initialState);
  },
}));
