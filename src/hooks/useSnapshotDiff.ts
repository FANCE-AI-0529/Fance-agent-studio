import { useState, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client.ts';
import type { AgentSnapshot, SnapshotDiff, JsonDiffItem, NodeDiffItem, EdgeDiffItem, SkillDiffItem, DiffSummary, SnapshotTriggerSource, ChangeStats, GraphData, SnapshotSkillRef } from '../types/gitops.ts';

export function useSnapshotDiff() {
  const [diff, setDiff] = useState<SnapshotDiff | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const mapDbToSnapshot = (db: any): AgentSnapshot => ({
    id: db.id, agentId: db.agent_id, userId: db.user_id, commitHash: db.commit_hash, commitMessage: db.commit_message, parentSnapshotId: db.parent_snapshot_id,
    manifest: (db.manifest || {}) as Record<string, unknown>,
    graphData: (db.graph_data || { nodes: [], edges: [] }) as GraphData,
    mountedSkills: (db.mounted_skills || []) as SnapshotSkillRef[],
    systemPrompt: db.system_prompt, mplpPolicy: db.mplp_policy, personalityConfig: db.personality_config as Record<string, unknown> | null,
    createdAt: db.created_at, isAutoSave: db.is_auto_save, triggerSource: db.trigger_source as SnapshotTriggerSource, changeStats: db.change_stats as ChangeStats | null,
  });

  const compareSnapshots = useCallback(async (fromSnapshotId: string, toSnapshotId: string): Promise<SnapshotDiff | null> => {
    setIsComparing(true);
    try {
      const [fromResult, toResult] = await Promise.all([
        supabase.from('agent_snapshots').select('*').eq('id', fromSnapshotId).single(),
        supabase.from('agent_snapshots').select('*').eq('id', toSnapshotId).single(),
      ]);
      if (fromResult.error || toResult.error) return null;

      const fromSnapshot = mapDbToSnapshot(fromResult.data);
      const toSnapshot = mapDbToSnapshot(toResult.data);

      const manifestDiff = compareJson(fromSnapshot.manifest, toSnapshot.manifest, '');
      const nodeDiff = compareNodes(fromSnapshot.graphData.nodes, toSnapshot.graphData.nodes);
      const edgeDiff = compareEdges(fromSnapshot.graphData.edges, toSnapshot.graphData.edges);
      const skillDiff = compareSkills(fromSnapshot.mountedSkills, toSnapshot.mountedSkills);

      const summary: DiffSummary = {
        totalChanges: manifestDiff.length + nodeDiff.length + edgeDiff.length + skillDiff.length,
        additions: nodeDiff.filter(n => n.type === 'add').length + edgeDiff.filter(e => e.type === 'add').length + skillDiff.filter(s => s.type === 'add').length,
        deletions: nodeDiff.filter(n => n.type === 'remove').length + edgeDiff.filter(e => e.type === 'remove').length + skillDiff.filter(s => s.type === 'remove').length,
        modifications: nodeDiff.filter(n => n.type === 'modify').length + edgeDiff.filter(e => e.type === 'modify').length + manifestDiff.filter(m => m.type === 'modify').length,
      };

      const result: SnapshotDiff = { fromSnapshotId, toSnapshotId, manifestDiff, nodeDiff, edgeDiff, skillDiff, summary };
      setDiff(result);
      return result;
    } finally {
      setIsComparing(false);
    }
  }, []);

  const compareWithCurrent = useCallback(async (snapshotId: string, agentId: string): Promise<SnapshotDiff | null> => {
    setIsComparing(true);
    try {
      const { data: snapshot, error } = await supabase.from('agent_snapshots').select('*').eq('id', snapshotId).single();
      if (error) return null;

      const [agentResult, nodesResult, edgesResult] = await Promise.all([
        supabase.from('agents').select('*').eq('id', agentId).single(),
        supabase.from('agent_graph_nodes').select('*').eq('agent_id', agentId),
        supabase.from('agent_graph_edges').select('*').eq('agent_id', agentId),
      ]);
      if (agentResult.error) return null;

      const fromSnapshot = mapDbToSnapshot(snapshot);
      const manifest = (agentResult.data.manifest || {}) as Record<string, any>;
      const currentSnapshot: AgentSnapshot = {
        id: 'current', agentId, userId: '', commitHash: 'HEAD', commitMessage: '当前状态', parentSnapshotId: null,
        manifest: manifest as Record<string, unknown>,
        graphData: {
          nodes: (nodesResult.data || []).map((n: any) => ({ id: n.id, nodeId: n.node_id, nodeType: n.node_type, positionX: n.position_x, positionY: n.position_y, data: n.data })),
          edges: (edgesResult.data || []).map((e: any) => ({ id: e.id, edgeId: e.edge_id, edgeType: e.edge_type, sourceNode: e.source_node, targetNode: e.target_node, data: e.data })),
        },
        mountedSkills: [], systemPrompt: manifest.system_prompt || null, mplpPolicy: agentResult.data.mplp_policy || 'default',
        personalityConfig: agentResult.data.personality_config as Record<string, unknown> | null, createdAt: new Date().toISOString(), isAutoSave: false, triggerSource: 'manual', changeStats: null,
      };

      const manifestDiff = compareJson(fromSnapshot.manifest, currentSnapshot.manifest, '');
      const nodeDiff = compareNodes(fromSnapshot.graphData.nodes, currentSnapshot.graphData.nodes);
      const edgeDiff = compareEdges(fromSnapshot.graphData.edges, currentSnapshot.graphData.edges);
      const skillDiff = compareSkills(fromSnapshot.mountedSkills, currentSnapshot.mountedSkills);

      const summary: DiffSummary = {
        totalChanges: manifestDiff.length + nodeDiff.length + edgeDiff.length + skillDiff.length,
        additions: nodeDiff.filter(n => n.type === 'add').length + edgeDiff.filter(e => e.type === 'add').length,
        deletions: nodeDiff.filter(n => n.type === 'remove').length + edgeDiff.filter(e => e.type === 'remove').length,
        modifications: nodeDiff.filter(n => n.type === 'modify').length + edgeDiff.filter(e => e.type === 'modify').length + manifestDiff.filter(m => m.type === 'modify').length,
      };

      const result: SnapshotDiff = { fromSnapshotId: snapshotId, toSnapshotId: 'current', manifestDiff, nodeDiff, edgeDiff, skillDiff, summary };
      setDiff(result);
      return result;
    } finally {
      setIsComparing(false);
    }
  }, []);

  return { diff, isComparing, compareSnapshots, compareWithCurrent, clearDiff: () => setDiff(null) };
}

function compareJson(oldObj: Record<string, unknown>, newObj: Record<string, unknown>, basePath: string): JsonDiffItem[] {
  const diffs: JsonDiffItem[] = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const key of allKeys) {
    const path = basePath ? `${basePath}.${key}` : key;
    const oldVal = oldObj[key]; const newVal = newObj[key];
    if (!(key in oldObj)) { diffs.push({ path, type: 'add', newValue: newVal }); }
    else if (!(key in newObj)) { diffs.push({ path, type: 'remove', oldValue: oldVal }); }
    else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal !== null && newVal !== null && !Array.isArray(oldVal) && !Array.isArray(newVal)) {
        diffs.push(...compareJson(oldVal as Record<string, unknown>, newVal as Record<string, unknown>, path));
      } else { diffs.push({ path, type: 'modify', oldValue: oldVal, newValue: newVal }); }
    }
  }
  return diffs;
}

function compareNodes(oldNodes: AgentSnapshot['graphData']['nodes'], newNodes: AgentSnapshot['graphData']['nodes']): NodeDiffItem[] {
  const diffs: NodeDiffItem[] = [];
  const oldMap = new Map(oldNodes.map(n => [n.nodeId, n])); const newMap = new Map(newNodes.map(n => [n.nodeId, n]));
  for (const [nodeId, node] of newMap) { if (!oldMap.has(nodeId)) diffs.push({ nodeId, nodeType: node.nodeType, type: 'add', newPosition: { x: node.positionX, y: node.positionY } }); }
  for (const [nodeId, node] of oldMap) { if (!newMap.has(nodeId)) diffs.push({ nodeId, nodeType: node.nodeType, type: 'remove', oldPosition: { x: node.positionX, y: node.positionY } }); }
  for (const [nodeId, newNode] of newMap) {
    const oldNode = oldMap.get(nodeId);
    if (oldNode) {
      const dataChanges = compareJson(oldNode.data as Record<string, unknown>, newNode.data as Record<string, unknown>, '');
      if (dataChanges.length > 0 || oldNode.positionX !== newNode.positionX || oldNode.positionY !== newNode.positionY) {
        diffs.push({ nodeId, nodeType: newNode.nodeType, type: 'modify', changes: dataChanges, oldPosition: { x: oldNode.positionX, y: oldNode.positionY }, newPosition: { x: newNode.positionX, y: newNode.positionY } });
      }
    }
  }
  return diffs;
}

function compareEdges(oldEdges: AgentSnapshot['graphData']['edges'], newEdges: AgentSnapshot['graphData']['edges']): EdgeDiffItem[] {
  const diffs: EdgeDiffItem[] = [];
  const oldMap = new Map(oldEdges.map(e => [e.edgeId, e])); const newMap = new Map(newEdges.map(e => [e.edgeId, e]));
  for (const [edgeId, edge] of newMap) { if (!oldMap.has(edgeId)) diffs.push({ edgeId, type: 'add', source: edge.sourceNode, target: edge.targetNode }); }
  for (const [edgeId, edge] of oldMap) { if (!newMap.has(edgeId)) diffs.push({ edgeId, type: 'remove', source: edge.sourceNode, target: edge.targetNode }); }
  return diffs;
}

function compareSkills(oldSkills: AgentSnapshot['mountedSkills'], newSkills: AgentSnapshot['mountedSkills']): SkillDiffItem[] {
  const diffs: SkillDiffItem[] = [];
  const oldMap = new Map(oldSkills.map(s => [s.skillId, s])); const newMap = new Map(newSkills.map(s => [s.skillId, s]));
  for (const [skillId, skill] of newMap) {
    const oldSkill = oldMap.get(skillId);
    if (!oldSkill) { diffs.push({ skillId, skillName: skill.skillName, type: 'add', newVersion: skill.versionNumber || undefined }); }
    else if (oldSkill.versionNumber !== skill.versionNumber) {
      diffs.push({ skillId, skillName: skill.skillName, type: (skill.versionNumber || 0) > (oldSkill.versionNumber || 0) ? 'upgrade' : 'downgrade', oldVersion: oldSkill.versionNumber || undefined, newVersion: skill.versionNumber || undefined });
    }
  }
  for (const [skillId, skill] of oldMap) { if (!newMap.has(skillId)) diffs.push({ skillId, skillName: skill.skillName, type: 'remove', oldVersion: skill.versionNumber || undefined }); }
  return diffs;
}
