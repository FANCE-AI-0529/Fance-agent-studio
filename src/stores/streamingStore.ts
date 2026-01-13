import { create } from 'zustand';
import { 
  StreamingState, 
  StreamingNode, 
  StreamingEdge, 
  ThinkingEvent,
  GenerationPhase,
  CompletionSummary,
  createInitialStreamingState,
  generateStreamingId,
} from '@/types/streaming';

interface StreamingActions {
  // 会话管理
  startSession: (description: string) => string;
  endSession: () => void;
  resetSession: () => void;
  
  // 阶段管理
  setPhase: (phase: GenerationPhase) => void;
  
  // 节点操作
  addNode: (node: StreamingNode) => void;
  updateNode: (nodeId: string, updates: Partial<StreamingNode>) => void;
  finalizeNode: (nodeId: string) => void;
  materializeNode: (nodeId: string) => void;
  
  // 连线操作
  addEdge: (edge: StreamingEdge) => void;
  updateEdge: (edgeId: string, updates: Partial<StreamingEdge>) => void;
  finalizeEdge: (edgeId: string) => void;
  
  // 思考过程
  addThought: (thought: ThinkingEvent) => void;
  setCurrentThought: (thought: string) => void;
  clearThoughts: () => void;
  
  // 进度更新
  updateProgress: (progress: number, step?: string, estimatedRemaining?: number) => void;
  
  // 完成处理
  complete: (agentConfig: Record<string, unknown>, summary: CompletionSummary) => void;
  
  // 错误处理
  setError: (message: string, recoverable?: boolean) => void;
  clearError: () => void;
  
  // 辅助方法
  getNodesArray: () => StreamingNode[];
  getEdgesArray: () => StreamingEdge[];
  getNodeById: (id: string) => StreamingNode | undefined;
  getEdgeById: (id: string) => StreamingEdge | undefined;
  getGhostNodes: () => StreamingNode[];
  getSolidNodes: () => StreamingNode[];
}

type StreamingStore = StreamingState & StreamingActions;

export const useStreamingStore = create<StreamingStore>((set, get) => ({
  // 初始状态
  ...createInitialStreamingState(),
  
  // ========== 会话管理 ==========
  startSession: (description: string) => {
    const sessionId = generateStreamingId('session');
    set({
      isStreaming: true,
      sessionId,
      startTime: Date.now(),
      phase: 'analyzing',
      nodes: new Map(),
      edges: new Map(),
      thoughts: [],
      currentThought: '',
      progress: 0,
      currentStep: 'analyzing',
      estimatedRemaining: null,
      agentConfig: null,
      summary: null,
      error: null,
      errorRecoverable: false,
    });
    return sessionId;
  },
  
  endSession: () => {
    set({
      isStreaming: false,
      phase: 'completed',
    });
  },
  
  resetSession: () => {
    set(createInitialStreamingState());
  },
  
  // ========== 阶段管理 ==========
  setPhase: (phase: GenerationPhase) => {
    set({ phase });
  },
  
  // ========== 节点操作 ==========
  addNode: (node: StreamingNode) => {
    set((state) => {
      const nodes = new Map(state.nodes);
      nodes.set(node.id, {
        ...node,
        createdAt: Date.now(),
      });
      return { nodes };
    });
  },
  
  updateNode: (nodeId: string, updates: Partial<StreamingNode>) => {
    set((state) => {
      const nodes = new Map(state.nodes);
      const existing = nodes.get(nodeId);
      if (existing) {
        nodes.set(nodeId, { ...existing, ...updates });
      }
      return { nodes };
    });
  },
  
  finalizeNode: (nodeId: string) => {
    get().updateNode(nodeId, { status: 'solid' });
  },
  
  materializeNode: (nodeId: string) => {
    get().updateNode(nodeId, { status: 'materializing' });
  },
  
  // ========== 连线操作 ==========
  addEdge: (edge: StreamingEdge) => {
    set((state) => {
      const edges = new Map(state.edges);
      edges.set(edge.id, {
        ...edge,
        createdAt: Date.now(),
      });
      return { edges };
    });
  },
  
  updateEdge: (edgeId: string, updates: Partial<StreamingEdge>) => {
    set((state) => {
      const edges = new Map(state.edges);
      const existing = edges.get(edgeId);
      if (existing) {
        edges.set(edgeId, { ...existing, ...updates });
      }
      return { edges };
    });
  },
  
  finalizeEdge: (edgeId: string) => {
    get().updateEdge(edgeId, { status: 'solid' });
  },
  
  // ========== 思考过程 ==========
  addThought: (thought: ThinkingEvent) => {
    set((state) => ({
      thoughts: [...state.thoughts, { ...thought, timestamp: Date.now() }],
      currentThought: thought.thought,
    }));
  },
  
  setCurrentThought: (thought: string) => {
    set({ currentThought: thought });
  },
  
  clearThoughts: () => {
    set({ thoughts: [], currentThought: '' });
  },
  
  // ========== 进度更新 ==========
  updateProgress: (progress: number, step?: string, estimatedRemaining?: number) => {
    set((state) => ({
      progress: Math.min(100, Math.max(0, progress)),
      currentStep: step ?? state.currentStep,
      estimatedRemaining: estimatedRemaining ?? state.estimatedRemaining,
    }));
  },
  
  // ========== 完成处理 ==========
  complete: (agentConfig: Record<string, unknown>, summary: CompletionSummary) => {
    set({
      isStreaming: false,
      phase: 'completed',
      progress: 100,
      agentConfig,
      summary,
    });
  },
  
  // ========== 错误处理 ==========
  setError: (message: string, recoverable = false) => {
    set({
      isStreaming: false,
      phase: 'error',
      error: message,
      errorRecoverable: recoverable,
    });
  },
  
  clearError: () => {
    set({
      error: null,
      errorRecoverable: false,
      phase: 'idle',
    });
  },
  
  // ========== 辅助方法 ==========
  getNodesArray: () => {
    return Array.from(get().nodes.values());
  },
  
  getEdgesArray: () => {
    return Array.from(get().edges.values());
  },
  
  getNodeById: (id: string) => {
    return get().nodes.get(id);
  },
  
  getEdgeById: (id: string) => {
    return get().edges.get(id);
  },
  
  getGhostNodes: () => {
    return get().getNodesArray().filter(n => n.status === 'ghost');
  },
  
  getSolidNodes: () => {
    return get().getNodesArray().filter(n => n.status === 'solid');
  },
}));

// 选择器 hooks
export const useStreamingNodes = () => useStreamingStore((state) => Array.from(state.nodes.values()));
export const useStreamingEdges = () => useStreamingStore((state) => Array.from(state.edges.values()));
export const useStreamingThoughts = () => useStreamingStore((state) => state.thoughts);
export const useStreamingProgress = () => useStreamingStore((state) => ({
  progress: state.progress,
  step: state.currentStep,
  remaining: state.estimatedRemaining,
}));
export const useStreamingPhase = () => useStreamingStore((state) => state.phase);
export const useIsStreaming = () => useStreamingStore((state) => state.isStreaming);
export const useStreamingError = () => useStreamingStore((state) => ({
  error: state.error,
  recoverable: state.errorRecoverable,
}));
