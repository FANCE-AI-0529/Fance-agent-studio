import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useGlobalAgentStore, selectRemoteEvents } from '@/stores/globalAgentStore';
import type { SyncEvent } from '@/stores/globalAgentStore';
import type { Node, Edge } from '@xyflow/react';

// Re-export SyncEvent for consumers
export type { SyncEvent };

/**
 * Hook to synchronize an agent with the global store and Realtime
 * Use this in both Consumer and Studio to ensure they share the same state
 */
export function useAgentSync(agentId: string | null) {
  // ✅ Use precise selectors to avoid re-renders on unrelated store changes
  const storeAgentId = useGlobalAgentStore((s) => s.agentId);
  const setAgentId = useGlobalAgentStore((s) => s.setAgentId);
  const loadAgent = useGlobalAgentStore((s) => s.loadAgent);
  const clearAgent = useGlobalAgentStore((s) => s.clearAgent);
  const subscribe = useGlobalAgentStore((s) => s.subscribe);
  const unsubscribe = useGlobalAgentStore((s) => s.unsubscribe);
  const isSubscribed = useGlobalAgentStore((s) => s.isSubscribed);
  const isSyncing = useGlobalAgentStore((s) => s.isSyncing);
  const syncError = useGlobalAgentStore((s) => s.syncError);
  const lastSyncedAt = useGlobalAgentStore((s) => s.lastSyncedAt);
  const agentConfig = useGlobalAgentStore((s) => s.agentConfig);
  const rawNodes = useGlobalAgentStore((s) => s.nodes);
  const rawEdges = useGlobalAgentStore((s) => s.edges);

  // Initialize agent when ID changes
  useEffect(() => {
    if (agentId) {
      // Only set if different to avoid re-subscription
      if (storeAgentId !== agentId) {
        setAgentId(agentId);
      }
    }
    
    return () => {
      // Don't clear on unmount - let the store persist
      // clearAgent();
    };
  }, [agentId, setAgentId, storeAgentId]);

  // Convert DB nodes to ReactFlow format
  const reactFlowNodes: Node[] = useMemo(() => {
    return rawNodes.map(node => ({
      id: node.node_id,
      type: node.node_type,
      position: { x: Number(node.position_x), y: Number(node.position_y) },
      data: node.data,
    }));
  }, [rawNodes]);

  // Convert DB edges to ReactFlow format
  const reactFlowEdges: Edge[] = useMemo(() => {
    return rawEdges.map(edge => ({
      id: edge.edge_id,
      source: edge.source_node,
      target: edge.target_node,
      type: edge.edge_type,
      data: edge.data,
    }));
  }, [rawEdges]);

  // Force reload data
  const reload = useCallback(async () => {
    if (agentId) {
      return loadAgent(agentId);
    }
    return false;
  }, [agentId, loadAgent]);

  return {
    // Status
    isSubscribed,
    isSyncing,
    syncError,
    lastSyncedAt,
    
    // Data (ReactFlow format)
    nodes: reactFlowNodes,
    edges: reactFlowEdges,
    agentConfig,
    
    // Raw data
    rawNodes,
    rawEdges,
    
    // Actions
    reload,
    subscribe,
    unsubscribe,
    clearAgent,
    loadAgent,
  };
}

/**
 * Hook to listen for remote sync events
 * Useful for triggering animations when remote changes occur
 */
export function useRemoteSyncEvents(
  onEvent?: (event: SyncEvent) => void
) {
  const remoteEvents = useGlobalAgentStore(selectRemoteEvents);
  const lastEventRef = useRef<SyncEvent | null>(null);
  const onEventRef = useRef(onEvent);
  
  // Keep callback ref updated
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    if (remoteEvents.length > 0) {
      const latestEvent = remoteEvents[remoteEvents.length - 1];
      
      // Only trigger for new events
      if (
        lastEventRef.current?.timestamp.getTime() !== latestEvent.timestamp.getTime()
      ) {
        lastEventRef.current = latestEvent;
        onEventRef.current?.(latestEvent);
      }
    }
  }, [remoteEvents]);

  return remoteEvents;
}

/**
 * Hook for graph node operations
 */
export function useGraphNodeOperations() {
  // ✅ Use precise selectors for actions
  const addNode = useGlobalAgentStore((s) => s.addNode);
  const updateNode = useGlobalAgentStore((s) => s.updateNode);
  const updateNodePosition = useGlobalAgentStore((s) => s.updateNodePosition);
  const removeNode = useGlobalAgentStore((s) => s.removeNode);

  const addReactFlowNode = useCallback(async (
    nodeId: string,
    nodeType: string,
    position: { x: number; y: number },
    data: Record<string, any> = {}
  ) => {
    const agentId = useGlobalAgentStore.getState().agentId;
    if (!agentId) return null;
    
    return addNode({
      agent_id: agentId,
      node_id: nodeId,
      node_type: nodeType,
      position_x: position.x,
      position_y: position.y,
      data,
    });
  }, [addNode]);

  const updateReactFlowNodePosition = useCallback(async (
    nodeId: string,
    position: { x: number; y: number }
  ) => {
    return updateNodePosition(nodeId, position.x, position.y);
  }, [updateNodePosition]);

  const updateReactFlowNodeData = useCallback(async (
    nodeId: string,
    data: Record<string, any>
  ) => {
    return updateNode(nodeId, { data });
  }, [updateNode]);

  return {
    addNode: addReactFlowNode,
    updateNodePosition: updateReactFlowNodePosition,
    updateNodeData: updateReactFlowNodeData,
    removeNode,
  };
}

/**
 * Hook for graph edge operations
 */
export function useGraphEdgeOperations() {
  // ✅ Use precise selectors for actions
  const addEdge = useGlobalAgentStore((s) => s.addEdge);
  const updateEdge = useGlobalAgentStore((s) => s.updateEdge);
  const removeEdge = useGlobalAgentStore((s) => s.removeEdge);

  const addReactFlowEdge = useCallback(async (
    edgeId: string,
    source: string,
    target: string,
    edgeType: string = 'default',
    data: Record<string, any> = {}
  ) => {
    const agentId = useGlobalAgentStore.getState().agentId;
    if (!agentId) return null;
    
    return addEdge({
      agent_id: agentId,
      edge_id: edgeId,
      source_node: source,
      target_node: target,
      edge_type: edgeType,
      data,
    });
  }, [addEdge]);

  return {
    addEdge: addReactFlowEdge,
    updateEdge,
    removeEdge,
  };
}
