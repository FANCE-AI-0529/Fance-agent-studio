/**
 * @file useGraphSync.ts
 * @description Builder 保存后同步画布数据到 agent_graph_nodes/edges 表
 */

import { supabase } from '@/integrations/supabase/client';
import type { Node, Edge } from '@xyflow/react';

/**
 * 将 Builder 画布的节点和边批量同步到 agent_graph_nodes / agent_graph_edges 表。
 * 先删除旧数据再写入新数据（全量替换）。
 */
export async function syncBuilderGraphToDatabase(
  agentId: string,
  nodes: Node[],
  edges: Edge[]
): Promise<boolean> {
  try {
    // Step 1: Delete existing graph data for this agent
    const { error: delNodesErr } = await supabase
      .from('agent_graph_nodes')
      .delete()
      .eq('agent_id', agentId);
    if (delNodesErr) {
      console.error('[GraphSync] Failed to delete old nodes:', delNodesErr);
      // Continue even if delete fails (table might be empty)
    }

    const { error: delEdgesErr } = await supabase
      .from('agent_graph_edges')
      .delete()
      .eq('agent_id', agentId);
    if (delEdgesErr) {
      console.error('[GraphSync] Failed to delete old edges:', delEdgesErr);
    }

    // Step 2: Insert current nodes (filter out the central agent node which is decorative)
    const graphNodes = nodes
      .filter(n => n.id !== 'agent-central') // Skip decorative central node
      .map(n => ({
        agent_id: agentId,
        node_id: n.id,
        node_type: n.type || 'default',
        position_x: n.position.x,
        position_y: n.position.y,
        data: (n.data || {}) as Record<string, any>,
      }));

    if (graphNodes.length > 0) {
      const { error: insertNodesErr } = await supabase
        .from('agent_graph_nodes')
        .insert(graphNodes);
      if (insertNodesErr) {
        console.error('[GraphSync] Failed to insert nodes:', insertNodesErr);
        return false;
      }
    }

    // Step 3: Insert current edges
    const graphEdges = edges.map(e => ({
      agent_id: agentId,
      edge_id: e.id,
      source_node: e.source,
      target_node: e.target,
      edge_type: e.type || 'default',
      data: (e.data || {}) as Record<string, any>,
    }));

    if (graphEdges.length > 0) {
      const { error: insertEdgesErr } = await supabase
        .from('agent_graph_edges')
        .insert(graphEdges);
      if (insertEdgesErr) {
        console.error('[GraphSync] Failed to insert edges:', insertEdgesErr);
        return false;
      }
    }

    console.log(`[GraphSync] Synced ${graphNodes.length} nodes and ${graphEdges.length} edges for agent ${agentId}`);
    return true;
  } catch (error) {
    console.error('[GraphSync] Unexpected error:', error);
    return false;
  }
}
