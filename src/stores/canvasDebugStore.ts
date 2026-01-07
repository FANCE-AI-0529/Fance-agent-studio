import { create } from "zustand";

export interface EdgeBreakpoint {
  edgeId: string;
  enabled: boolean;
  hitCount: number;
  condition?: string;
}

export interface VariableSnapshot {
  timestamp: number;
  nodeId: string;
  edgeId?: string;
  variables: Record<string, unknown>;
}

export interface ExecutionLogEntry {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  timestamp: number;
  duration?: number;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  inputData?: unknown;
  outputData?: unknown;
  error?: string;
}

export type SimulationSpeed = "slow" | "normal" | "fast";

interface CanvasDebugState {
  // Debug mode state
  isDebugMode: boolean;
  isRunning: boolean;
  isPaused: boolean;

  // Execution tracking
  currentNodeId: string | null;
  executionPath: string[]; // Ordered list of executed node IDs
  pendingNodeIds: string[]; // Nodes yet to execute
  completedNodeIds: string[]; // Nodes that have been executed

  // Active edges (currently flowing)
  activeEdgeIds: string[];

  // Breakpoints (on edges)
  breakpoints: Record<string, EdgeBreakpoint>;

  // Variable state snapshots at breakpoints
  variableSnapshots: VariableSnapshot[];

  // Execution logs
  executionLogs: ExecutionLogEntry[];

  // Simulation speed
  simulationSpeed: SimulationSpeed;

  // Current step index
  currentStepIndex: number;
}

interface CanvasDebugActions {
  // Mode control
  setDebugMode: (enabled: boolean) => void;
  setRunning: (running: boolean) => void;
  setPaused: (paused: boolean) => void;

  // Execution tracking
  setCurrentNodeId: (nodeId: string | null) => void;
  addToExecutionPath: (nodeId: string) => void;
  setPendingNodeIds: (nodeIds: string[]) => void;
  addCompletedNode: (nodeId: string) => void;
  setActiveEdgeIds: (edgeIds: string[]) => void;

  // Breakpoints
  toggleBreakpoint: (edgeId: string) => void;
  enableBreakpoint: (edgeId: string, enabled: boolean) => void;
  clearAllBreakpoints: () => void;
  incrementBreakpointHit: (edgeId: string) => void;

  // Variable snapshots
  addVariableSnapshot: (snapshot: VariableSnapshot) => void;
  clearSnapshots: () => void;

  // Execution logs
  addExecutionLog: (log: ExecutionLogEntry) => void;
  updateExecutionLog: (id: string, updates: Partial<ExecutionLogEntry>) => void;
  clearExecutionLogs: () => void;

  // Simulation speed
  setSimulationSpeed: (speed: SimulationSpeed) => void;

  // Step control
  setCurrentStepIndex: (index: number) => void;
  incrementStep: () => void;

  // Reset
  resetDebugState: () => void;
}

const initialState: CanvasDebugState = {
  isDebugMode: false,
  isRunning: false,
  isPaused: false,
  currentNodeId: null,
  executionPath: [],
  pendingNodeIds: [],
  completedNodeIds: [],
  activeEdgeIds: [],
  breakpoints: {},
  variableSnapshots: [],
  executionLogs: [],
  simulationSpeed: "normal",
  currentStepIndex: 0,
};

export const useCanvasDebugStore = create<CanvasDebugState & CanvasDebugActions>(
  (set, get) => ({
    ...initialState,

    setDebugMode: (enabled) =>
      set({
        isDebugMode: enabled,
        // Reset execution state when toggling mode
        ...(enabled
          ? {}
          : {
              isRunning: false,
              isPaused: false,
              currentNodeId: null,
              executionPath: [],
              pendingNodeIds: [],
              completedNodeIds: [],
              activeEdgeIds: [],
            }),
      }),

    setRunning: (running) => set({ isRunning: running }),
    setPaused: (paused) => set({ isPaused: paused }),

    setCurrentNodeId: (nodeId) => set({ currentNodeId: nodeId }),

    addToExecutionPath: (nodeId) =>
      set((state) => ({
        executionPath: [...state.executionPath, nodeId],
      })),

    setPendingNodeIds: (nodeIds) => set({ pendingNodeIds: nodeIds }),

    addCompletedNode: (nodeId) =>
      set((state) => ({
        completedNodeIds: [...state.completedNodeIds, nodeId],
        pendingNodeIds: state.pendingNodeIds.filter((id) => id !== nodeId),
      })),

    setActiveEdgeIds: (edgeIds) => set({ activeEdgeIds: edgeIds }),

    toggleBreakpoint: (edgeId) =>
      set((state) => {
        const existing = state.breakpoints[edgeId];
        if (existing) {
          // Remove breakpoint
          const { [edgeId]: _, ...rest } = state.breakpoints;
          return { breakpoints: rest };
        }
        // Add breakpoint
        return {
          breakpoints: {
            ...state.breakpoints,
            [edgeId]: { edgeId, enabled: true, hitCount: 0 },
          },
        };
      }),

    enableBreakpoint: (edgeId, enabled) =>
      set((state) => {
        const existing = state.breakpoints[edgeId];
        if (!existing) return state;
        return {
          breakpoints: {
            ...state.breakpoints,
            [edgeId]: { ...existing, enabled },
          },
        };
      }),

    clearAllBreakpoints: () => set({ breakpoints: {} }),

    incrementBreakpointHit: (edgeId) =>
      set((state) => {
        const existing = state.breakpoints[edgeId];
        if (!existing) return state;
        return {
          breakpoints: {
            ...state.breakpoints,
            [edgeId]: { ...existing, hitCount: existing.hitCount + 1 },
          },
        };
      }),

    addVariableSnapshot: (snapshot) =>
      set((state) => ({
        variableSnapshots: [...state.variableSnapshots, snapshot],
      })),

    clearSnapshots: () => set({ variableSnapshots: [] }),

    addExecutionLog: (log) =>
      set((state) => ({
        executionLogs: [...state.executionLogs, log],
      })),

    updateExecutionLog: (id, updates) =>
      set((state) => ({
        executionLogs: state.executionLogs.map((log) =>
          log.id === id ? { ...log, ...updates } : log
        ),
      })),

    clearExecutionLogs: () => set({ executionLogs: [] }),

    setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

    setCurrentStepIndex: (index) => set({ currentStepIndex: index }),

    incrementStep: () =>
      set((state) => ({ currentStepIndex: state.currentStepIndex + 1 })),

    resetDebugState: () =>
      set({
        isRunning: false,
        isPaused: false,
        currentNodeId: null,
        executionPath: [],
        pendingNodeIds: [],
        completedNodeIds: [],
        activeEdgeIds: [],
        variableSnapshots: [],
        executionLogs: [],
        currentStepIndex: 0,
      }),
  })
);
