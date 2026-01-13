// =====================================================
// GitOps 版本控制类型定义
// GitOps & Version Control Types - Everything is Code
// =====================================================

// ===== Agent 快照 =====

export interface AgentSnapshot {
  id: string;
  agentId: string;
  userId: string;
  
  // Git 风格元数据
  commitHash: string;
  commitMessage: string;
  parentSnapshotId: string | null;
  
  // 完整状态快照
  manifest: Record<string, unknown>;
  graphData: GraphData;
  mountedSkills: SnapshotSkillRef[];
  systemPrompt: string | null;
  mplpPolicy: string;
  personalityConfig: Record<string, unknown> | null;
  
  // 元数据
  createdAt: string;
  isAutoSave: boolean;
  triggerSource: SnapshotTriggerSource;
  changeStats: ChangeStats | null;
  
  // 关联数据
  tags?: SnapshotTag[];
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  nodeId: string;
  nodeType: string;
  positionX: number;
  positionY: number;
  data: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  edgeId: string;
  edgeType: string | null;
  sourceNode: string;
  targetNode: string;
  data: Record<string, unknown> | null;
}

// 技能版本引用 (不存完整内容，只存版本引用)
export interface SnapshotSkillRef {
  skillId: string;
  skillVersionId: string | null;
  skillName: string;
  versionNumber: number | null;
}

export type SnapshotTriggerSource = 'manual' | 'auto' | 'deploy' | 'import' | 'rollback';

// 变更统计
export interface ChangeStats {
  nodesAdded: number;
  nodesRemoved: number;
  nodesModified: number;
  edgesAdded: number;
  edgesRemoved: number;
  manifestChanged: boolean;
  skillsChanged: boolean;
}

// ===== 快照标签 =====

export interface SnapshotTag {
  id: string;
  snapshotId: string;
  userId: string;
  name: string;
  color: string;
  description: string | null;
  createdAt: string;
}

// 预定义标签类型
export type PredefinedTagType = 'production' | 'staging' | 'release' | 'milestone' | 'backup';

export const PREDEFINED_TAGS: Record<PredefinedTagType, { name: string; color: string; description: string }> = {
  production: { name: 'Production', color: '#22c55e', description: '当前生产环境版本' },
  staging: { name: 'Staging', color: '#f59e0b', description: '预发布环境版本' },
  release: { name: 'Release', color: '#3b82f6', description: '正式发布版本' },
  milestone: { name: 'Milestone', color: '#8b5cf6', description: '重要里程碑' },
  backup: { name: 'Backup', color: '#6b7280', description: '备份快照' },
};

// ===== Diff 结果 =====

export interface SnapshotDiff {
  fromSnapshotId: string;
  toSnapshotId: string;
  
  manifestDiff: JsonDiffItem[];
  nodeDiff: NodeDiffItem[];
  edgeDiff: EdgeDiffItem[];
  skillDiff: SkillDiffItem[];
  
  summary: DiffSummary;
}

export interface DiffSummary {
  totalChanges: number;
  additions: number;
  deletions: number;
  modifications: number;
}

export interface JsonDiffItem {
  path: string;
  type: 'add' | 'remove' | 'modify';
  oldValue?: unknown;
  newValue?: unknown;
}

export interface NodeDiffItem {
  nodeId: string;
  nodeType: string;
  type: 'add' | 'remove' | 'modify';
  changes?: JsonDiffItem[];
  oldPosition?: { x: number; y: number };
  newPosition?: { x: number; y: number };
}

export interface EdgeDiffItem {
  edgeId: string;
  type: 'add' | 'remove' | 'modify';
  source?: string;
  target?: string;
  changes?: JsonDiffItem[];
}

export interface SkillDiffItem {
  skillId: string;
  skillName: string;
  type: 'add' | 'remove' | 'upgrade' | 'downgrade';
  oldVersion?: number;
  newVersion?: number;
}

// ===== 时间旅行 =====

export interface TimeTravelQuery {
  agentId: string;
  targetDate?: Date;
  targetSnapshotId?: string;
  previewOnly?: boolean;
}

export interface TimeTravelResult {
  snapshot: AgentSnapshot;
  restoredAt: string;
  previousSnapshotId: string;
}

// ===== 快照创建请求 =====

export interface CreateSnapshotRequest {
  agentId: string;
  message: string;
  isAutoSave?: boolean;
  triggerSource?: SnapshotTriggerSource;
  tags?: string[];
}

export interface RestoreSnapshotRequest {
  snapshotId: string;
  agentId: string;
  createBackup?: boolean;
}

// ===== 版本比较 =====

export interface CompareVersionsRequest {
  fromSnapshotId: string;
  toSnapshotId: string;
}

// ===== 快照搜索 =====

export interface SnapshotSearchParams {
  agentId: string;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  triggerSource?: SnapshotTriggerSource;
  limit?: number;
  offset?: number;
}

// ===== 时间线视图 =====

export interface TimelineSnapshot {
  id: string;
  commitHash: string;
  commitMessage: string;
  createdAt: string;
  isAutoSave: boolean;
  triggerSource: SnapshotTriggerSource;
  changeStats: ChangeStats | null;
  tags: SnapshotTag[];
}

// ===== 工具函数 =====

export function generateCommitHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 7; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

export function formatCommitHash(hash: string): string {
  return hash.slice(0, 7);
}

export function createEmptyChangeStats(): ChangeStats {
  return {
    nodesAdded: 0,
    nodesRemoved: 0,
    nodesModified: 0,
    edgesAdded: 0,
    edgesRemoved: 0,
    manifestChanged: false,
    skillsChanged: false,
  };
}

// 计算两个快照之间的变更
export function calculateChangeStats(
  oldSnapshot: Partial<AgentSnapshot> | null,
  newGraphData: GraphData,
  newManifest: Record<string, unknown>
): ChangeStats {
  const stats = createEmptyChangeStats();
  
  if (!oldSnapshot) {
    stats.nodesAdded = newGraphData.nodes.length;
    stats.edgesAdded = newGraphData.edges.length;
    return stats;
  }
  
  const oldNodes = new Set(oldSnapshot.graphData?.nodes?.map(n => n.nodeId) || []);
  const newNodes = new Set(newGraphData.nodes.map(n => n.nodeId));
  
  const oldEdges = new Set(oldSnapshot.graphData?.edges?.map(e => e.edgeId) || []);
  const newEdges = new Set(newGraphData.edges.map(e => e.edgeId));
  
  // 节点变更
  for (const nodeId of newNodes) {
    if (!oldNodes.has(nodeId)) {
      stats.nodesAdded++;
    }
  }
  for (const nodeId of oldNodes) {
    if (!newNodes.has(nodeId)) {
      stats.nodesRemoved++;
    }
  }
  
  // 边变更
  for (const edgeId of newEdges) {
    if (!oldEdges.has(edgeId)) {
      stats.edgesAdded++;
    }
  }
  for (const edgeId of oldEdges) {
    if (!newEdges.has(edgeId)) {
      stats.edgesRemoved++;
    }
  }
  
  // Manifest 变更检测
  stats.manifestChanged = JSON.stringify(oldSnapshot.manifest) !== JSON.stringify(newManifest);
  
  // 技能变更检测
  const oldSkillIds = new Set(oldSnapshot.mountedSkills?.map(s => s.skillId) || []);
  const newSkillIds = new Set(newGraphData.nodes
    .filter(n => n.nodeType === 'skill')
    .map(n => (n.data as { skillId?: string }).skillId)
    .filter(Boolean));
  
  stats.skillsChanged = 
    oldSkillIds.size !== newSkillIds.size ||
    [...oldSkillIds].some(id => !newSkillIds.has(id));
  
  return stats;
}
