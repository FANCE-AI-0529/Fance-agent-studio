import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { Node } from "@xyflow/react";
import type { 
  Breakpoint, 
  DebugVariable, 
  StepExecutionLog, 
  DebugState 
} from "../components/runtime/DebugControlPanel.tsx";

interface UseTaskChainDebugOptions {
  onNodeHighlight?: (nodeId: string | null) => void;
  onExecutionComplete?: (result: unknown) => void;
  onBreakpointHit?: (nodeId: string) => void;
}

export function useTaskChainDebug(options: UseTaskChainDebugOptions = {}) {
  const { onNodeHighlight, onExecutionComplete, onBreakpointHit } = options;
  
  const [isDebugging, setIsDebugging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [breakpoints, setBreakpoints] = useState<Map<string, Breakpoint>>(new Map());
  const [executionLogs, setExecutionLogs] = useState<StepExecutionLog[]>([]);
  const [variables, setVariables] = useState<DebugVariable[]>([]);
  const [callStack, setCallStack] = useState<string[]>([]);
  
  const executionQueueRef = useRef<Node[]>([]);
  const currentIndexRef = useRef(0);
  const contextRef = useRef<Record<string, unknown>>({});
  const pauseResolverRef = useRef<(() => void) | null>(null);
  const isSteppingRef = useRef(false);
  const stepModeRef = useRef<"over" | "into" | null>(null);

  const debugState: DebugState = {
    isDebugging,
    isPaused,
    currentStepId,
    breakpoints,
    executionLogs,
    variables,
    callStack,
  };

  // Toggle breakpoint on a node
  const toggleBreakpoint = useCallback((nodeId: string) => {
    setBreakpoints((prev) => {
      const newBreakpoints = new Map(prev);
      const existing = newBreakpoints.get(nodeId);
      
      if (existing) {
        if (existing.enabled) {
          // Disable breakpoint
          newBreakpoints.set(nodeId, { ...existing, enabled: false });
        } else {
          // Remove breakpoint
          newBreakpoints.delete(nodeId);
        }
      } else {
        // Add new breakpoint
        newBreakpoints.set(nodeId, {
          nodeId,
          enabled: true,
          hitCount: 0,
        });
      }
      
      return newBreakpoints;
    });
  }, []);

  // Clear all breakpoints
  const clearBreakpoints = useCallback(() => {
    setBreakpoints(new Map());
    toast.success("已清除所有断点");
  }, []);

  // Add execution log
  const addExecutionLog = useCallback((log: StepExecutionLog) => {
    setExecutionLogs((prev) => [...prev, log]);
  }, []);

  // Update execution log
  const updateExecutionLog = useCallback((stepId: string, updates: Partial<StepExecutionLog>) => {
    setExecutionLogs((prev) => 
      prev.map((log) => 
        log.stepId === stepId ? { ...log, ...updates } : log
      )
    );
  }, []);

  // Update variables display
  const updateVariables = useCallback((newVars: DebugVariable[]) => {
    setVariables(newVars);
  }, []);

  // Push to call stack
  const pushCallStack = useCallback((frame: string) => {
    setCallStack((prev) => [frame, ...prev]);
  }, []);

  // Pop from call stack
  const popCallStack = useCallback(() => {
    setCallStack((prev) => prev.slice(1));
  }, []);

  // Wait for resume (when paused)
  const waitForResume = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      pauseResolverRef.current = resolve;
    });
  }, []);

  // Check if should pause at breakpoint
  const shouldPauseAtBreakpoint = useCallback((nodeId: string): boolean => {
    const breakpoint = breakpoints.get(nodeId);
    if (breakpoint && breakpoint.enabled) {
      // Increment hit count
      setBreakpoints((prev) => {
        const newBreakpoints = new Map(prev);
        const bp = newBreakpoints.get(nodeId);
        if (bp) {
          newBreakpoints.set(nodeId, { ...bp, hitCount: bp.hitCount + 1 });
        }
        return newBreakpoints;
      });
      return true;
    }
    return false;
  }, [breakpoints]);

  // Execute a single step
  const executeStep = useCallback(async (node: Node): Promise<unknown> => {
    const nodeData = node.data as { name?: string; description?: string; [key: string]: unknown };
    const stepName = (nodeData.name as string) || node.id;
    
    // Add to call stack
    pushCallStack(stepName);
    
    // Create execution log
    const log: StepExecutionLog = {
      stepId: node.id,
      stepName,
      startTime: Date.now(),
      status: "running",
      input: contextRef.current,
    };
    addExecutionLog(log);
    
    // Update current step
    setCurrentStepId(node.id);
    onNodeHighlight?.(node.id);
    
    // Check for breakpoint
    if (shouldPauseAtBreakpoint(node.id) || isSteppingRef.current) {
      setIsPaused(true);
      updateExecutionLog(node.id, { status: "paused" });
      
      toast.info(`已在 "${stepName}" 处暂停`, {
        description: isSteppingRef.current ? "单步执行模式" : "命中断点",
      });
      
      onBreakpointHit?.(node.id);
      
      // Update variables with current context
      const vars: DebugVariable[] = Object.entries(contextRef.current).map(([name, value]) => ({
        name,
        value,
        type: typeof value,
        scope: "context" as const,
      }));
      updateVariables(vars);
      
      // Wait for resume
      await waitForResume();
      setIsPaused(false);
      updateExecutionLog(node.id, { status: "running" });
      
      // Check if we should continue stepping
      if (stepModeRef.current) {
        isSteppingRef.current = true;
        stepModeRef.current = null;
      }
    }
    
    // Simulate step execution
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));
    
    // Generate mock result
    const result = {
      success: true,
      output: `Result from ${stepName}`,
      timestamp: new Date().toISOString(),
    };
    
    // Store result in context
    const outputKey = (nodeData.outputKey as string) || node.id;
    contextRef.current[outputKey] = result;
    
    // Update execution log
    updateExecutionLog(node.id, {
      status: "completed",
      endTime: Date.now(),
      output: result,
    });
    
    // Pop from call stack
    popCallStack();
    
    return result;
  }, [
    shouldPauseAtBreakpoint, 
    addExecutionLog, 
    updateExecutionLog, 
    pushCallStack, 
    popCallStack,
    updateVariables,
    waitForResume,
    onNodeHighlight,
    onBreakpointHit,
  ]);

  // Start debugging
  const startDebug = useCallback((nodes: Node[], initialContext: Record<string, unknown> = {}) => {
    if (nodes.length === 0) {
      toast.error("没有可执行的步骤");
      return;
    }

    // Sort nodes by position (top to bottom)
    const sortedNodes = [...nodes].sort((a, b) => a.position.y - b.position.y);
    
    executionQueueRef.current = sortedNodes;
    currentIndexRef.current = 0;
    contextRef.current = { ...initialContext };
    isSteppingRef.current = false;
    stepModeRef.current = null;
    
    setIsDebugging(true);
    setIsPaused(false);
    setCurrentStepId(null);
    setExecutionLogs([]);
    setCallStack([]);
    setVariables([]);

    toast.success("调试已开始", {
      description: `共 ${sortedNodes.length} 个步骤`,
    });

    // Start execution
    runExecution();
  }, []);

  // Run execution loop
  const runExecution = useCallback(async () => {
    while (currentIndexRef.current < executionQueueRef.current.length) {
      if (!isDebugging) break;
      
      const node = executionQueueRef.current[currentIndexRef.current];
      
      try {
        await executeStep(node);
      } catch (error) {
        updateExecutionLog(node.id, {
          status: "failed",
          endTime: Date.now(),
          error: error instanceof Error ? error.message : "Unknown error",
        });
        toast.error(`步骤 "${(node.data as any).name || node.id}" 执行失败`);
        break;
      }
      
      currentIndexRef.current++;
    }

    if (currentIndexRef.current >= executionQueueRef.current.length) {
      // Execution complete
      setIsDebugging(false);
      setCurrentStepId(null);
      onNodeHighlight?.(null);
      onExecutionComplete?.(contextRef.current);
      toast.success("调试执行完成");
    }
  }, [isDebugging, executeStep, updateExecutionLog, onNodeHighlight, onExecutionComplete]);

  // Pause debugging
  const pauseDebug = useCallback(() => {
    if (isDebugging && !isPaused) {
      isSteppingRef.current = true;
      toast.info("将在下一步暂停");
    }
  }, [isDebugging, isPaused]);

  // Resume debugging
  const resumeDebug = useCallback(() => {
    if (isPaused && pauseResolverRef.current) {
      isSteppingRef.current = false;
      pauseResolverRef.current();
      pauseResolverRef.current = null;
    }
  }, [isPaused]);

  // Stop debugging
  const stopDebug = useCallback(() => {
    setIsDebugging(false);
    setIsPaused(false);
    setCurrentStepId(null);
    setCallStack([]);
    executionQueueRef.current = [];
    currentIndexRef.current = 0;
    
    if (pauseResolverRef.current) {
      pauseResolverRef.current();
      pauseResolverRef.current = null;
    }
    
    onNodeHighlight?.(null);
    toast.info("调试已停止");
  }, [onNodeHighlight]);

  // Step over (execute current step and pause at next)
  const stepOver = useCallback(() => {
    if (isPaused && pauseResolverRef.current) {
      stepModeRef.current = "over";
      isSteppingRef.current = true;
      pauseResolverRef.current();
      pauseResolverRef.current = null;
    }
  }, [isPaused]);

  // Step into (for nested structures like loops)
  const stepInto = useCallback(() => {
    if (isPaused && pauseResolverRef.current) {
      stepModeRef.current = "into";
      isSteppingRef.current = true;
      pauseResolverRef.current();
      pauseResolverRef.current = null;
    }
  }, [isPaused]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if debugging
      if (!isDebugging && e.key !== "F5") return;
      
      switch (e.key) {
        case "F5":
          e.preventDefault();
          if (!isDebugging) {
            // Will be handled by the component that has the nodes
          } else if (isPaused) {
            resumeDebug();
          }
          break;
        case "F6":
          e.preventDefault();
          if (isDebugging && !isPaused) {
            pauseDebug();
          }
          break;
        case "F10":
          e.preventDefault();
          if (isPaused) {
            stepOver();
          }
          break;
        case "F11":
          e.preventDefault();
          if (isPaused) {
            stepInto();
          }
          break;
        case "F9":
          // Toggle breakpoint - handled by the component
          break;
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [isDebugging, isPaused, resumeDebug, pauseDebug, stepOver, stepInto]);

  return {
    debugState,
    startDebug,
    pauseDebug,
    resumeDebug,
    stopDebug,
    stepOver,
    stepInto,
    toggleBreakpoint,
    clearBreakpoints,
    addExecutionLog,
    updateVariables,
  };
}

export default useTaskChainDebug;
