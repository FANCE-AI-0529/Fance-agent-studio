import { useCallback, useRef, useEffect } from "react";
import { Node, Edge } from "@xyflow/react";
import { useCanvasDebugStore, ExecutionLogEntry, SimulationSpeed } from "@/stores/canvasDebugStore";
import { useVariableStore } from "@/stores/variableStore";

interface UseCanvasDebugOptions {
  nodes: Node[];
  edges: Edge[];
  onNodeUpdate?: (nodeId: string, data: Record<string, unknown>) => void;
  onEdgeUpdate?: (edgeId: string, data: Record<string, unknown>) => void;
}

// Speed multipliers for simulation
const speedDelays: Record<SimulationSpeed, number> = {
  slow: 2000,
  normal: 1000,
  fast: 400,
};

export function useCanvasDebug({
  nodes,
  edges,
  onNodeUpdate,
  onEdgeUpdate,
}: UseCanvasDebugOptions) {
  const store = useCanvasDebugStore();
  const variableStore = useVariableStore();
  
  const executionQueueRef = useRef<Node[]>([]);
  const pauseResolverRef = useRef<(() => void) | null>(null);
  const isSteppingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Build adjacency map from edges
  const buildAdjacencyMap = useCallback(() => {
    const adjacency = new Map<string, { edgeId: string; targetId: string; sourceHandle?: string }[]>();
    edges.forEach((edge) => {
      const sources = adjacency.get(edge.source) || [];
      sources.push({
        edgeId: edge.id,
        targetId: edge.target,
        sourceHandle: edge.sourceHandle || undefined,
      });
      adjacency.set(edge.source, sources);
    });
    return adjacency;
  }, [edges]);

  // Find entry nodes (trigger nodes or nodes with no incoming edges)
  const findEntryNodes = useCallback(() => {
    const hasIncoming = new Set<string>();
    edges.forEach((edge) => hasIncoming.add(edge.target));
    
    // Prioritize trigger nodes
    const triggerNodes = nodes.filter((n) => n.type === "trigger");
    if (triggerNodes.length > 0) return triggerNodes;
    
    // Otherwise, find nodes without incoming edges
    return nodes.filter((n) => !hasIncoming.has(n.id));
  }, [nodes, edges]);

  // Get simulation delay based on speed
  const getDelay = useCallback(() => {
    return speedDelays[store.simulationSpeed];
  }, [store.simulationSpeed]);

  // Wait for resume (used when paused at breakpoint)
  const waitForResume = useCallback(() => {
    return new Promise<void>((resolve) => {
      pauseResolverRef.current = resolve;
    });
  }, []);

  // Generate mock output based on node type
  const generateNodeOutput = useCallback((node: Node): unknown => {
    const mockData = variableStore.mockData[node.id];
    if (mockData) return mockData;

    switch (node.type) {
      case "trigger":
        return { message: "测试消息", user_id: "usr_12345", timestamp: Date.now() };
      case "agent":
        return { response: "Agent 处理结果", confidence: 0.85 };
      case "intentRouter":
        const routes = (node.data as any)?.routes || [];
        const matched = routes[0]?.name || "默认路由";
        return { matched_intent: matched, confidence: 0.92 };
      case "condition":
        return { result: Math.random() > 0.5, branch: "true" };
      case "parallel":
        return { completed_branches: ["branch_1", "branch_2"] };
      case "intervention":
        return { approved: true, user_input: null };
      case "mcpAction":
        return { success: true, result: {}, execution_time_ms: 234 };
      case "skill":
        return { output: "技能执行结果", status: "success" };
      case "knowledge":
        return { chunks: [], relevance_score: 0.87 };
      case "output":
        return { delivered: true };
      default:
        return { status: "completed" };
    }
  }, [variableStore.mockData]);

  // Execute a single node
  const executeNode = useCallback(
    async (node: Node, signal: AbortSignal): Promise<boolean> => {
      if (signal.aborted) return false;

      const startTime = Date.now();
      const logId = `log-${node.id}-${startTime}`;

      // Add execution log
      const log: ExecutionLogEntry = {
        id: logId,
        nodeId: node.id,
        nodeName: (node.data as any)?.name || node.type || "Unknown",
        nodeType: node.type || "unknown",
        timestamp: startTime,
        status: "running",
      };
      store.addExecutionLog(log);

      // Update node as running
      store.setCurrentNodeId(node.id);
      onNodeUpdate?.(node.id, { debugStatus: "running" });

      // Simulate execution delay
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, getDelay());
        signal.addEventListener("abort", () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      if (signal.aborted) return false;

      // Generate output
      const output = generateNodeOutput(node);

      // Update variable store with node output
      variableStore.setMockData(node.id, output);

      // Update log as completed
      store.updateExecutionLog(logId, {
        status: "completed",
        duration: Date.now() - startTime,
        outputData: output,
      });

      // Mark node as completed
      store.addCompletedNode(node.id);
      store.addToExecutionPath(node.id);
      onNodeUpdate?.(node.id, { debugStatus: "completed" });

      return true;
    },
    [store, getDelay, generateNodeOutput, onNodeUpdate, variableStore]
  );

  // Check if should pause at breakpoint
  const shouldPauseAtBreakpoint = useCallback(
    (edgeId: string): boolean => {
      const bp = store.breakpoints[edgeId];
      return bp?.enabled === true;
    },
    [store.breakpoints]
  );

  // Run simulation
  const runSimulation = useCallback(async () => {
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    store.setRunning(true);
    store.setPaused(false);

    const adjacency = buildAdjacencyMap();
    const entryNodes = findEntryNodes();

    if (entryNodes.length === 0) {
      store.setRunning(false);
      return;
    }

    // Initialize pending nodes
    const allNodeIds = nodes.map((n) => n.id);
    store.setPendingNodeIds(allNodeIds);

    // BFS execution
    const queue = [...entryNodes];
    const visited = new Set<string>();

    while (queue.length > 0 && !signal.aborted) {
      const currentNode = queue.shift()!;
      
      if (visited.has(currentNode.id)) continue;
      visited.add(currentNode.id);

      // Execute node
      const success = await executeNode(currentNode, signal);
      if (!success || signal.aborted) break;

      // Get outgoing edges
      const outgoing = adjacency.get(currentNode.id) || [];

      for (const { edgeId, targetId } of outgoing) {
        if (signal.aborted) break;

        // Highlight edge
        store.setActiveEdgeIds([edgeId]);
        onEdgeUpdate?.(edgeId, { debugStatus: "active" });

        // Check for breakpoint
        if (shouldPauseAtBreakpoint(edgeId)) {
          store.setPaused(true);
          store.incrementBreakpointHit(edgeId);

          // Capture variable snapshot
          store.addVariableSnapshot({
            timestamp: Date.now(),
            nodeId: currentNode.id,
            edgeId,
            variables: { ...variableStore.mockData },
          });

          // Wait for resume
          await waitForResume();
          store.setPaused(false);
        }

        // Small delay for edge animation
        await new Promise((r) => setTimeout(r, 200));

        // Clear edge highlight
        onEdgeUpdate?.(edgeId, { debugStatus: "completed" });

        // Add target to queue
        const targetNode = nodes.find((n) => n.id === targetId);
        if (targetNode && !visited.has(targetId)) {
          queue.push(targetNode);
        }
      }

      store.setActiveEdgeIds([]);

      // Check for stepping mode
      if (isSteppingRef.current) {
        isSteppingRef.current = false;
        store.setPaused(true);
        await waitForResume();
        store.setPaused(false);
      }
    }

    store.setRunning(false);
    store.setCurrentNodeId(null);
  }, [
    store,
    nodes,
    edges,
    buildAdjacencyMap,
    findEntryNodes,
    executeNode,
    shouldPauseAtBreakpoint,
    waitForResume,
    onEdgeUpdate,
    variableStore.mockData,
  ]);

  // Start simulation
  const startSimulation = useCallback(() => {
    store.resetDebugState();
    // Reset all node visuals
    nodes.forEach((node) => {
      onNodeUpdate?.(node.id, { debugStatus: "pending" });
    });
    runSimulation();
  }, [store, nodes, onNodeUpdate, runSimulation]);

  // Pause simulation
  const pauseSimulation = useCallback(() => {
    store.setPaused(true);
  }, [store]);

  // Resume simulation
  const resumeSimulation = useCallback(() => {
    if (pauseResolverRef.current) {
      pauseResolverRef.current();
      pauseResolverRef.current = null;
    }
    store.setPaused(false);
  }, [store]);

  // Stop simulation
  const stopSimulation = useCallback(() => {
    abortControllerRef.current?.abort();
    store.resetDebugState();
    // Reset all node visuals
    nodes.forEach((node) => {
      onNodeUpdate?.(node.id, { debugStatus: undefined });
    });
    edges.forEach((edge) => {
      onEdgeUpdate?.(edge.id, { debugStatus: undefined });
    });
  }, [store, nodes, edges, onNodeUpdate, onEdgeUpdate]);

  // Step over (execute next node then pause)
  const stepOver = useCallback(() => {
    isSteppingRef.current = true;
    if (store.isPaused) {
      resumeSimulation();
    } else if (!store.isRunning) {
      startSimulation();
    }
  }, [store.isPaused, store.isRunning, resumeSimulation, startSimulation]);

  // Toggle breakpoint on edge
  const toggleBreakpoint = useCallback(
    (edgeId: string) => {
      store.toggleBreakpoint(edgeId);
    },
    [store]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!store.isDebugMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // F5 - Start/Resume
      if (e.key === "F5") {
        e.preventDefault();
        if (store.isPaused) {
          resumeSimulation();
        } else if (!store.isRunning) {
          startSimulation();
        }
      }
      // F6 - Pause
      if (e.key === "F6") {
        e.preventDefault();
        pauseSimulation();
      }
      // Shift+F5 - Stop
      if (e.key === "F5" && e.shiftKey) {
        e.preventDefault();
        stopSimulation();
      }
      // F10 - Step Over
      if (e.key === "F10") {
        e.preventDefault();
        stepOver();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    store.isDebugMode,
    store.isPaused,
    store.isRunning,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    stepOver,
  ]);

  return {
    // State
    isDebugMode: store.isDebugMode,
    isRunning: store.isRunning,
    isPaused: store.isPaused,
    currentNodeId: store.currentNodeId,
    executionPath: store.executionPath,
    completedNodeIds: store.completedNodeIds,
    activeEdgeIds: store.activeEdgeIds,
    breakpoints: store.breakpoints,
    executionLogs: store.executionLogs,
    variableSnapshots: store.variableSnapshots,
    simulationSpeed: store.simulationSpeed,

    // Actions
    setDebugMode: store.setDebugMode,
    setSimulationSpeed: store.setSimulationSpeed,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    stepOver,
    toggleBreakpoint,
    clearAllBreakpoints: store.clearAllBreakpoints,
  };
}
