import { useEffect, useCallback, useMemo } from 'react';
import { useGlobalAgentStore, selectNodes, selectEdges, selectAgentConfig, selectRemoteEvents, type SyncEvent } from '@/stores/globalAgentStore';
import type { Node, Edge } from '@xyflow/react';

/**
 * Hook to synchronize an agent with the global store and Realtime
 * Use this in both Consumer and Studio to ensure they share the same state
 */
export function useAgentSync(agentId: string | null) {
  const store = useGlobalAgentStore();
  const {
    setAgentId,
    loadAgent,
    clearAgent,
    subscribe,
    unsubscribe,
    isSubscribed,
    isSyncing,
    syncError,
    lastSyncedAt,
    agentConfig,
    nodes: rawNodes,
    edges: rawEdges,
  } = store;

  // Initialize agent when ID changes
  useEffect(() => {
    if (agentId) {
      // Only set if different to avoid re-subscription
      if (store.agentId !== agentId) {
        setAgentId(agentId);
      }
    }
    
    return () => {
      // Don't clear on unmount - let the store persist
      // clearAgent();
    };
  }, [agentId, setAgentId, store.agentId]);

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
    
    // Store reference for direct actions
    store,
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
  const lastEventRef = { current: null as SyncEvent | null };

  useEffect(() => {
    if (remoteEvents.length > 0) {
      const latestEvent = remoteEvents[remoteEvents.length - 1];
      
      // Only trigger for new events
      if (
        lastEventRef.current?.timestamp.getTime() !== latestEvent.timestamp.getTime()
      ) {
        lastEventRef.current = latestEvent;
        onEvent?.(latestEvent);
      }
    }
  }, [remoteEvents, onEvent]);

  return remoteEvents;
}

/**
 * Hook for graph node operations
 */
export function useGraphNodeOperations() {
  const { addNode, updateNode, updateNodePosition, removeNode } = useGlobalAgentStore();

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
  const { addEdge, updateEdge, removeEdge } = useGlobalAgentStore();

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
