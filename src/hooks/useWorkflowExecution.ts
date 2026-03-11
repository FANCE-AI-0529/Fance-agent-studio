import { useState, useCallback, useRef } from "react";
import { supabase } from "../integrations/supabase/client.ts";
import type { Node, Edge } from "@xyflow/react";

// ============================
// Types
// ============================

export type NodeExecutionStatus = "idle" | "running" | "success" | "failed" | "skipped";

export interface NodeResult {
  nodeId: string;
  nodeType: string;
  status: "success" | "failed" | "skipped";
  output: Record<string, unknown>;
  duration: number;
  tokensUsed: number;
  error?: string;
}

export interface WorkflowRunState {
  runId: string | null;
  status: "idle" | "running" | "completed" | "failed";
  nodeStatuses: Record<string, NodeExecutionStatus>;
  nodeResults: NodeResult[];
  outputs: Record<string, unknown>;
  totalDuration: number;
  totalTokens: number;
  error?: string;
}

const initialState: WorkflowRunState = {
  runId: null,
  status: "idle",
  nodeStatuses: {},
  nodeResults: [],
  outputs: {},
  totalDuration: 0,
  totalTokens: 0,
};

// ============================
// Hook
// ============================

export function useWorkflowExecution() {
  const [state, setState] = useState<WorkflowRunState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const executeWorkflow = useCallback(
    async (
      workflowId: string,
      nodes: Node[],
      edges: Edge[],
      inputs: Record<string, unknown> = {}
    ) => {
      // Cancel any existing run
      if (abortRef.current) abortRef.current.abort();
      const abortController = new AbortController();
      abortRef.current = abortController;

      // Reset state
      const nodeStatuses: Record<string, NodeExecutionStatus> = {};
      for (const n of nodes) nodeStatuses[n.id] = "idle";

      setState({
        ...initialState,
        status: "running",
        nodeStatuses,
      });

      // Serialize nodes for the edge function
      const serializedNodes = nodes.map((n) => ({
        id: n.id,
        type: n.type || "unknown",
        data: n.data as Record<string, unknown>,
      }));

      const serializedEdges = edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined,
      }));

      try {
        const { data: { session } } = await supabase.auth.getSession();

        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        const url = `https://${projectId}.supabase.co/functions/v1/workflow-executor`;

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            workflowId,
            nodes: serializedNodes,
            edges: serializedEdges,
            inputs,
            mode: "workflow",
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Workflow execution failed: ${errText}`);
        }

        // Parse SSE stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ") && currentEvent) {
              try {
                const data = JSON.parse(line.slice(6));
                handleSSEEvent(currentEvent, data);
              } catch { /* skip malformed */ }
              currentEvent = "";
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          status: "failed",
          error: (error as Error).message,
        }));
      }
    },
    []
  );

  const handleSSEEvent = useCallback((event: string, data: Record<string, unknown>) => {
    switch (event) {
      case "workflow_start":
        setState((prev) => ({
          ...prev,
          runId: data.runId as string,
        }));
        break;

      case "node_start":
        setState((prev) => ({
          ...prev,
          nodeStatuses: {
            ...prev.nodeStatuses,
            [data.nodeId as string]: "running",
          },
        }));
        break;

      case "node_complete": {
        const result = data as unknown as NodeResult;
        setState((prev) => ({
          ...prev,
          nodeStatuses: {
            ...prev.nodeStatuses,
            [result.nodeId]: result.status === "success" ? "success" : "failed",
          },
          nodeResults: [...prev.nodeResults, result],
        }));
        break;
      }

      case "node_skipped":
        setState((prev) => ({
          ...prev,
          nodeStatuses: {
            ...prev.nodeStatuses,
            [data.nodeId as string]: "skipped",
          },
          nodeResults: [...prev.nodeResults, data as unknown as NodeResult],
        }));
        break;

      case "workflow_complete":
        setState((prev) => ({
          ...prev,
          status: (data.status as string) === "completed" ? "completed" : "failed",
          outputs: (data.outputs || {}) as Record<string, unknown>,
          totalDuration: (data.totalDuration as number) || 0,
          totalTokens: (data.totalTokens as number) || 0,
        }));
        break;

      case "workflow_error":
        setState((prev) => ({
          ...prev,
          status: "failed",
          error: data.error as string,
        }));
        break;
    }
  }, []);

  const cancelExecution = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      setState((prev) => ({ ...prev, status: "failed", error: "Cancelled by user" }));
    }
  }, []);

  const resetExecution = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    executeWorkflow,
    cancelExecution,
    resetExecution,
  };
}
