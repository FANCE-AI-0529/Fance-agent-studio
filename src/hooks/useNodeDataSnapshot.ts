// =====================================================
// 节点数据快照 Hook - Node Data Snapshot Hook
// =====================================================

import { useCallback, useMemo } from 'react';
import { useCanvasHighlightStore } from '../stores/canvasHighlightStore.ts';
import { generateNodeSnapshot, extractOutputData } from '../utils/mockDataGenerator.ts';
import type { NodeDataSnapshot, PathDataSnapshots } from '../types/dataSnapshotTypes.ts';
import type { Node } from '@xyflow/react';

interface NodeSpec {
  id: string;
  type?: string;
  data?: {
    label?: string;
    name?: string;
    [key: string]: unknown;
  };
}

export function useNodeDataSnapshot() {
  const { 
    currentStep, 
    highlightedPath, 
    pathInfo,
    showDataSnapshot,
    dataSnapshots,
    setDataSnapshots,
  } = useCanvasHighlightStore();

  /**
   * 获取当前节点的快照
   */
  const currentSnapshot = useMemo((): NodeDataSnapshot | null => {
    if (!showDataSnapshot || !dataSnapshots || highlightedPath.length === 0) {
      return null;
    }
    
    const currentNodeId = highlightedPath[currentStep];
    return dataSnapshots.snapshots.find(s => s.nodeId === currentNodeId) || null;
  }, [showDataSnapshot, dataSnapshots, highlightedPath, currentStep]);

  /**
   * 获取上一个节点的快照（用于显示数据流向）
   */
  const previousSnapshot = useMemo((): NodeDataSnapshot | null => {
    if (!showDataSnapshot || !dataSnapshots || currentStep === 0) {
      return null;
    }
    
    const prevNodeId = highlightedPath[currentStep - 1];
    return dataSnapshots.snapshots.find(s => s.nodeId === prevNodeId) || null;
  }, [showDataSnapshot, dataSnapshots, highlightedPath, currentStep]);

  /**
   * 获取下一个节点的快照（用于预览）
   */
  const nextSnapshot = useMemo((): NodeDataSnapshot | null => {
    if (!showDataSnapshot || !dataSnapshots || currentStep >= highlightedPath.length - 1) {
      return null;
    }
    
    const nextNodeId = highlightedPath[currentStep + 1];
    return dataSnapshots.snapshots.find(s => s.nodeId === nextNodeId) || null;
  }, [showDataSnapshot, dataSnapshots, highlightedPath, currentStep]);

  /**
   * 生成路径的完整快照
   */
  const generatePathSnapshots = useCallback((
    scenarioId: string, 
    nodes: Node[] | NodeSpec[]
  ): PathDataSnapshots => {
    const snapshots: NodeDataSnapshot[] = [];
    let previousNodeOutputs: Record<string, unknown> = {};

    for (let i = 0; i < highlightedPath.length; i++) {
      const nodeId = highlightedPath[i];
      const node = nodes.find(n => n.id === nodeId);
      
      if (!node) continue;

      const nodeName = (node.data?.label as string) || 
                       (node.data?.name as string) || 
                       nodeId;
      const nodeType = node.type || 'skill';

      const snapshot = generateNodeSnapshot(
        nodeId,
        nodeType,
        nodeName,
        scenarioId,
        previousNodeOutputs
      );

      snapshots.push(snapshot);
      
      // 提取输出数据供下一个节点使用
      previousNodeOutputs = {
        ...previousNodeOutputs,
        ...extractOutputData(snapshot),
      };
    }

    const pathSnapshots: PathDataSnapshots = {
      pathId: pathInfo?.id || `path-${Date.now()}`,
      scenarioId,
      snapshots,
    };

    // 更新 store
    setDataSnapshots(pathSnapshots);

    return pathSnapshots;
  }, [highlightedPath, pathInfo, setDataSnapshots]);

  /**
   * 清除快照数据
   */
  const clearSnapshots = useCallback(() => {
    setDataSnapshots(null);
  }, [setDataSnapshots]);

  return {
    currentSnapshot,
    previousSnapshot,
    nextSnapshot,
    showDataSnapshot,
    dataSnapshots,
    generatePathSnapshots,
    clearSnapshots,
    currentStep,
    totalSteps: highlightedPath.length,
  };
}
