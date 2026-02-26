/**
 * @file useUnifiedAgentGraph.ts
 * @description 统一图数据读取 hook - 优先读取 agent_graph_nodes/edges，
 *              如果为空则从 agents.manifest + agent_skills 回退重建
 */

import { useEffect, useMemo, useRef } from 'react';
import { useGlobalAgentStore } from '@/stores/globalAgentStore';
import { useAgent } from '@/hooks/useAgents';
import { syncBuilderGraphToDatabase } from '@/hooks/useGraphSync';
import type { Node, Edge } from '@xyflow/react';

/**
 * 统一图数据源 hook
 * 
 * Builder 和 Consumer 都可以使用此 hook 作为唯一数据来源。
 * 优先读取 agent_graph_nodes/edges 表（通过 globalAgentStore），
 * 如果图表表为空但 agent 有 skills，则自动从 manifest 重建并写入图表表。
 */
export function useUnifiedAgentGraph(agentId: string | null) {
  const storeAgentId = useGlobalAgentStore((s) => s.agentId);
  const setAgentId = useGlobalAgentStore((s) => s.setAgentId);
  const rawNodes = useGlobalAgentStore((s) => s.nodes);
  const rawEdges = useGlobalAgentStore((s) => s.edges);
  const isSyncing = useGlobalAgentStore((s) => s.isSyncing);
  const isSubscribed = useGlobalAgentStore((s) => s.isSubscribed);
  const agentConfig = useGlobalAgentStore((s) => s.agentConfig);

  // Also fetch agent data for fallback reconstruction
  const { data: agentWithSkills } = useAgent(agentId);

  // Track whether we've already attempted reconstruction
  const reconstructedRef = useRef<string | null>(null);

  // Initialize globalAgentStore with agentId
  useEffect(() => {
    if (agentId && storeAgentId !== agentId) {
      setAgentId(agentId);
    }
  }, [agentId, storeAgentId, setAgentId]);

  // Fallback: if graph tables are empty but agent has skills, reconstruct
  useEffect(() => {
    if (
      !agentId ||
      isSyncing ||
      rawNodes.length > 0 ||
      reconstructedRef.current === agentId ||
      !agentWithSkills?.skills?.length
    ) {
      return;
    }

    reconstructedRef.current = agentId;

    // Build nodes and edges from agent skills
    const skills = agentWithSkills.skills;
    const centerX = 400;
    const centerY = 250;
    const radius = 200;

    const nodes: Node[] = skills.map((skill, i) => {
      const angle = (2 * Math.PI * i) / skills.length - Math.PI / 2;
      return {
        id: `skill-${skill.id}`,
        type: 'skill',
        position: {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        },
        data: {
          id: skill.id,
          name: skill.name,
          category: skill.category,
          description: skill.description,
          permissions: skill.permissions,
        },
      };
    });

    const edges: Edge[] = skills.map((skill) => ({
      id: `edge-${skill.id}`,
      source: `skill-${skill.id}`,
      target: 'agent-central',
      type: 'default',
      data: {},
    }));

    // Write reconstructed graph to database (fire and forget)
    syncBuilderGraphToDatabase(agentId, nodes, edges).then((ok) => {
      if (ok) {
        console.log('[UnifiedGraph] Reconstructed graph from skills and synced to DB');
        // Reload from store to pick up the new data via Realtime
        useGlobalAgentStore.getState().loadAgent(agentId);
      }
    });
  }, [agentId, isSyncing, rawNodes.length, agentWithSkills]);

  // Convert to ReactFlow format
  const reactFlowNodes: Node[] = useMemo(() => {
    return rawNodes.map(node => ({
      id: node.node_id,
      type: node.node_type,
      position: { x: Number(node.position_x), y: Number(node.position_y) },
      data: node.data,
    }));
  }, [rawNodes]);

  const reactFlowEdges: Edge[] = useMemo(() => {
    return rawEdges.map(edge => ({
      id: edge.edge_id,
      source: edge.source_node,
      target: edge.target_node,
      type: edge.edge_type || 'default',
      data: edge.data,
    }));
  }, [rawEdges]);

  return {
    nodes: reactFlowNodes,
    edges: reactFlowEdges,
    rawNodes,
    rawEdges,
    isSyncing,
    isSubscribed,
    agentConfig,
    hasGraphData: rawNodes.length > 0,
  };
}
