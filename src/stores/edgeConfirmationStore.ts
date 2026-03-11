// =====================================================
// 边确认状态管理 - Edge Confirmation Store
// 管理草稿边的确认/拒绝状态
// =====================================================

import { create } from 'zustand';
import type { InputMapping } from '../types/workflowDSL.ts';

// ========== 类型定义 ==========

export type EdgeStatus = 'confirmed' | 'draft' | 'rejected' | 'pending';

export interface EdgeConfirmationData {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceNodeName: string;
  targetNodeName: string;
  mappings: Array<{
    id: string;
    sourceField: string;
    targetField: string;
    confidence: number;
    matchReason: string;
    enabled: boolean;
  }>;
  overallConfidence: number;
  status: EdgeStatus;
  reviewedAt?: Date;
  reviewNotes?: string;
}

interface EdgeConfirmationState {
  // 待确认的边
  pendingEdges: Map<string, EdgeConfirmationData>;
  
  // 已确认的边
  confirmedEdges: Set<string>;
  
  // 已拒绝的边
  rejectedEdges: Set<string>;
  
  // 当前选中的边（用于详情面板）
  selectedEdgeId: string | null;
  
  // 是否显示确认面板
  showConfirmationPanel: boolean;
}

interface EdgeConfirmationActions {
  // 添加待确认边
  addPendingEdge: (edge: EdgeConfirmationData) => void;
  
  // 批量添加待确认边
  addPendingEdges: (edges: EdgeConfirmationData[]) => void;
  
  // 确认边
  confirmEdge: (edgeId: string, notes?: string) => void;
  
  // 拒绝边
  rejectEdge: (edgeId: string, notes?: string) => void;
  
  // 更新边映射
  updateEdgeMapping: (edgeId: string, mappingId: string, enabled: boolean) => void;
  
  // 确认所有边
  confirmAllEdges: () => void;
  
  // 拒绝所有边
  rejectAllEdges: () => void;
  
  // 选中边
  selectEdge: (edgeId: string | null) => void;
  
  // 显示/隐藏确认面板
  setShowConfirmationPanel: (show: boolean) => void;
  
  // 获取边状态
  getEdgeStatus: (edgeId: string) => EdgeStatus;
  
  // 获取待确认边数量
  getPendingCount: () => number;
  
  // 清空所有状态
  clearAll: () => void;
  
  // 重置为初始状态
  reset: () => void;
}

type EdgeConfirmationStore = EdgeConfirmationState & EdgeConfirmationActions;

// ========== Store 实现 ==========

export const useEdgeConfirmationStore = create<EdgeConfirmationStore>((set, get) => ({
  // 初始状态
  pendingEdges: new Map(),
  confirmedEdges: new Set(),
  rejectedEdges: new Set(),
  selectedEdgeId: null,
  showConfirmationPanel: false,
  
  // 添加待确认边
  addPendingEdge: (edge) => set((state) => {
    const newPending = new Map(state.pendingEdges);
    newPending.set(edge.edgeId, { ...edge, status: 'pending' });
    return { 
      pendingEdges: newPending,
      showConfirmationPanel: true,
    };
  }),
  
  // 批量添加待确认边
  addPendingEdges: (edges) => set((state) => {
    const newPending = new Map(state.pendingEdges);
    edges.forEach((edge) => {
      newPending.set(edge.edgeId, { ...edge, status: 'pending' });
    });
    return { 
      pendingEdges: newPending,
      showConfirmationPanel: edges.length > 0,
    };
  }),
  
  // 确认边
  confirmEdge: (edgeId, notes) => set((state) => {
    const newPending = new Map(state.pendingEdges);
    const edge = newPending.get(edgeId);
    
    if (edge) {
      edge.status = 'confirmed';
      edge.reviewedAt = new Date();
      edge.reviewNotes = notes;
      newPending.set(edgeId, edge);
    }
    
    const newConfirmed = new Set(state.confirmedEdges);
    newConfirmed.add(edgeId);
    
    const newRejected = new Set(state.rejectedEdges);
    newRejected.delete(edgeId);
    
    return {
      pendingEdges: newPending,
      confirmedEdges: newConfirmed,
      rejectedEdges: newRejected,
    };
  }),
  
  // 拒绝边
  rejectEdge: (edgeId, notes) => set((state) => {
    const newPending = new Map(state.pendingEdges);
    const edge = newPending.get(edgeId);
    
    if (edge) {
      edge.status = 'rejected';
      edge.reviewedAt = new Date();
      edge.reviewNotes = notes;
      newPending.set(edgeId, edge);
    }
    
    const newRejected = new Set(state.rejectedEdges);
    newRejected.add(edgeId);
    
    const newConfirmed = new Set(state.confirmedEdges);
    newConfirmed.delete(edgeId);
    
    return {
      pendingEdges: newPending,
      confirmedEdges: newConfirmed,
      rejectedEdges: newRejected,
    };
  }),
  
  // 更新边映射
  updateEdgeMapping: (edgeId, mappingId, enabled) => set((state) => {
    const newPending = new Map(state.pendingEdges);
    const edge = newPending.get(edgeId);
    
    if (edge) {
      const updatedMappings = edge.mappings.map((m) =>
        m.id === mappingId ? { ...m, enabled } : m
      );
      newPending.set(edgeId, { ...edge, mappings: updatedMappings });
    }
    
    return { pendingEdges: newPending };
  }),
  
  // 确认所有边
  confirmAllEdges: () => set((state) => {
    const newPending = new Map(state.pendingEdges);
    const newConfirmed = new Set(state.confirmedEdges);
    
    newPending.forEach((edge, id) => {
      if (edge.status === 'pending' || edge.status === 'draft') {
        edge.status = 'confirmed';
        edge.reviewedAt = new Date();
        newConfirmed.add(id);
      }
    });
    
    return {
      pendingEdges: newPending,
      confirmedEdges: newConfirmed,
      showConfirmationPanel: false,
    };
  }),
  
  // 拒绝所有边
  rejectAllEdges: () => set((state) => {
    const newPending = new Map(state.pendingEdges);
    const newRejected = new Set(state.rejectedEdges);
    
    newPending.forEach((edge, id) => {
      if (edge.status === 'pending' || edge.status === 'draft') {
        edge.status = 'rejected';
        edge.reviewedAt = new Date();
        newRejected.add(id);
      }
    });
    
    return {
      pendingEdges: newPending,
      rejectedEdges: newRejected,
      showConfirmationPanel: false,
    };
  }),
  
  // 选中边
  selectEdge: (edgeId) => set({ selectedEdgeId: edgeId }),
  
  // 显示/隐藏确认面板
  setShowConfirmationPanel: (show) => set({ showConfirmationPanel: show }),
  
  // 获取边状态
  getEdgeStatus: (edgeId) => {
    const state = get();
    if (state.confirmedEdges.has(edgeId)) return 'confirmed';
    if (state.rejectedEdges.has(edgeId)) return 'rejected';
    const edge = state.pendingEdges.get(edgeId);
    return edge?.status || 'pending';
  },
  
  // 获取待确认边数量
  getPendingCount: () => {
    const state = get();
    let count = 0;
    state.pendingEdges.forEach((edge) => {
      if (edge.status === 'pending' || edge.status === 'draft') {
        count++;
      }
    });
    return count;
  },
  
  // 清空所有状态
  clearAll: () => set({
    pendingEdges: new Map(),
    confirmedEdges: new Set(),
    rejectedEdges: new Set(),
    selectedEdgeId: null,
    showConfirmationPanel: false,
  }),
  
  // 重置为初始状态
  reset: () => set({
    pendingEdges: new Map(),
    confirmedEdges: new Set(),
    rejectedEdges: new Set(),
    selectedEdgeId: null,
    showConfirmationPanel: false,
  }),
}));

// ========== 辅助函数 ==========

export function convertWiringToConfirmationData(
  edgeId: string,
  sourceNodeId: string,
  targetNodeId: string,
  sourceNodeName: string,
  targetNodeName: string,
  wiringResults: Array<{
    mapping: InputMapping;
    confidence: number;
    status: 'confirmed' | 'draft';
    matchReason: string;
  }>
): EdgeConfirmationData {
  const mappings = wiringResults.map((result, index) => ({
    id: `${edgeId}-mapping-${index}`,
    sourceField: result.mapping.sourceExpression,
    targetField: result.mapping.targetField,
    confidence: result.confidence,
    matchReason: result.matchReason,
    enabled: true,
  }));
  
  const overallConfidence = mappings.length > 0
    ? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length
    : 0.5;
  
  const hasDraft = wiringResults.some((r) => r.status === 'draft');
  
  return {
    edgeId,
    sourceNodeId,
    targetNodeId,
    sourceNodeName,
    targetNodeName,
    mappings,
    overallConfidence,
    status: hasDraft ? 'draft' : 'confirmed',
  };
}
