// =====================================================
// 数据快照类型定义 - Data Snapshot Type Definitions
// =====================================================

import type { VariableType } from '../components/builder/variables/variableTypes.ts';

/**
 * 数据字段快照
 */
export interface DataFieldSnapshot {
  path: string;              // 如 "knowledge.context"
  type: VariableType;        // 如 "string", "object"
  value: unknown;            // 实际值或模拟值
  source: 'mock' | 'real';   // 数据来源
  description?: string;      // 字段描述
}

/**
 * 节点数据快照
 */
export interface NodeDataSnapshot {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  inputs: DataFieldSnapshot[];   // 输入数据
  outputs: DataFieldSnapshot[];  // 输出数据
  transformation?: string;       // 数据转换描述
}

/**
 * 路径数据快照集合
 */
export interface PathDataSnapshots {
  pathId: string;
  scenarioId: string;
  snapshots: NodeDataSnapshot[];
}

/**
 * 快照面板位置
 */
export interface SnapshotPosition {
  x: number;
  y: number;
  nodeId: string;
}
