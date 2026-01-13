// =====================================================
// 生成历史记录状态管理 - Generation History Store
// 保存和管理工作流生成历史
// =====================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Node, Edge } from '@xyflow/react';
import type { 
  WorkflowDSL, 
  ComplianceReport, 
  InjectedIntervention,
  GenerationWarning,
  RiskLevel 
} from '@/types/workflowDSL';

// ========== 类型定义 ==========

export interface GenerationRecord {
  id: string;
  timestamp: Date;
  description: string;
  dsl: WorkflowDSL;
  nodes: Node[];
  edges: Edge[];
  complianceReport?: ComplianceReport;
  interventions?: InjectedIntervention[];
  warnings?: GenerationWarning[];
  riskAssessment?: {
    overallRisk: RiskLevel;
    highRiskNodes: string[];
    mediumRiskNodes: string[];
  };
  requiredPermissions?: string[];
  metadata?: {
    mplpPolicy?: string;
    maxNodes?: number;
    includeKnowledge?: boolean;
    generationTimeMs?: number;
  };
}

interface DiffResult {
  addedNodes: string[];
  removedNodes: string[];
  modifiedNodes: string[];
  addedEdges: string[];
  removedEdges: string[];
  dslChanges: string[];
}

interface GenerationHistoryState {
  // 历史记录列表
  history: GenerationRecord[];
  
  // 最大历史记录数
  maxHistory: number;
  
  // 当前选中的记录 ID
  selectedRecordId: string | null;
  
  // 对比模式
  isComparing: boolean;
  compareRecordIds: [string, string] | null;
}

interface GenerationHistoryActions {
  // 添加记录
  addRecord: (record: Omit<GenerationRecord, 'id' | 'timestamp'>) => string;
  
  // 获取记录
  getRecord: (id: string) => GenerationRecord | undefined;
  
  // 删除记录
  deleteRecord: (id: string) => void;
  
  // 清空历史
  clearHistory: () => void;
  
  // 选中记录
  selectRecord: (id: string | null) => void;
  
  // 开始对比
  startCompare: (id1: string, id2: string) => void;
  
  // 停止对比
  stopCompare: () => void;
  
  // 对比两个记录
  compareRecords: (id1: string, id2: string) => DiffResult | null;
  
  // 设置最大历史记录数
  setMaxHistory: (max: number) => void;
  
  // 导出记录
  exportRecord: (id: string) => string | null;
  
  // 导入记录
  importRecord: (json: string) => string | null;
}

type GenerationHistoryStore = GenerationHistoryState & GenerationHistoryActions;

// ========== 生成唯一 ID ==========

function generateId(): string {
  return `gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ========== Store 实现 ==========

export const useGenerationHistoryStore = create<GenerationHistoryStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      history: [],
      maxHistory: 20,
      selectedRecordId: null,
      isComparing: false,
      compareRecordIds: null,
      
      // 添加记录
      addRecord: (record) => {
        const id = generateId();
        const newRecord: GenerationRecord = {
          ...record,
          id,
          timestamp: new Date(),
        };
        
        set((state) => {
          const newHistory = [newRecord, ...state.history];
          // 限制历史记录数量
          if (newHistory.length > state.maxHistory) {
            newHistory.pop();
          }
          return { history: newHistory };
        });
        
        return id;
      },
      
      // 获取记录
      getRecord: (id) => {
        return get().history.find((r) => r.id === id);
      },
      
      // 删除记录
      deleteRecord: (id) => set((state) => ({
        history: state.history.filter((r) => r.id !== id),
        selectedRecordId: state.selectedRecordId === id ? null : state.selectedRecordId,
      })),
      
      // 清空历史
      clearHistory: () => set({
        history: [],
        selectedRecordId: null,
        isComparing: false,
        compareRecordIds: null,
      }),
      
      // 选中记录
      selectRecord: (id) => set({ selectedRecordId: id }),
      
      // 开始对比
      startCompare: (id1, id2) => set({
        isComparing: true,
        compareRecordIds: [id1, id2],
      }),
      
      // 停止对比
      stopCompare: () => set({
        isComparing: false,
        compareRecordIds: null,
      }),
      
      // 对比两个记录
      compareRecords: (id1, id2) => {
        const state = get();
        const record1 = state.history.find((r) => r.id === id1);
        const record2 = state.history.find((r) => r.id === id2);
        
        if (!record1 || !record2) return null;
        
        // 对比节点
        const nodeIds1 = new Set(record1.nodes.map((n) => n.id));
        const nodeIds2 = new Set(record2.nodes.map((n) => n.id));
        
        const addedNodes = [...nodeIds2].filter((id) => !nodeIds1.has(id));
        const removedNodes = [...nodeIds1].filter((id) => !nodeIds2.has(id));
        const modifiedNodes: string[] = [];
        
        // 检查共有节点是否有修改
        nodeIds1.forEach((id) => {
          if (nodeIds2.has(id)) {
            const node1 = record1.nodes.find((n) => n.id === id);
            const node2 = record2.nodes.find((n) => n.id === id);
            if (JSON.stringify(node1?.data) !== JSON.stringify(node2?.data)) {
              modifiedNodes.push(id);
            }
          }
        });
        
        // 对比边
        const edgeIds1 = new Set(record1.edges.map((e) => e.id));
        const edgeIds2 = new Set(record2.edges.map((e) => e.id));
        
        const addedEdges = [...edgeIds2].filter((id) => !edgeIds1.has(id));
        const removedEdges = [...edgeIds1].filter((id) => !edgeIds2.has(id));
        
        // 对比 DSL
        const dslChanges: string[] = [];
        if (record1.dsl.name !== record2.dsl.name) {
          dslChanges.push(`名称: "${record1.dsl.name}" → "${record2.dsl.name}"`);
        }
        if (record1.dsl.stages.length !== record2.dsl.stages.length) {
          dslChanges.push(`阶段数: ${record1.dsl.stages.length} → ${record2.dsl.stages.length}`);
        }
        if (record1.dsl.governance?.mplpPolicy !== record2.dsl.governance?.mplpPolicy) {
          dslChanges.push(`治理策略: ${record1.dsl.governance?.mplpPolicy} → ${record2.dsl.governance?.mplpPolicy}`);
        }
        
        return {
          addedNodes,
          removedNodes,
          modifiedNodes,
          addedEdges,
          removedEdges,
          dslChanges,
        };
      },
      
      // 设置最大历史记录数
      setMaxHistory: (max) => set((state) => {
        const newHistory = state.history.slice(0, max);
        return { maxHistory: max, history: newHistory };
      }),
      
      // 导出记录
      exportRecord: (id) => {
        const record = get().getRecord(id);
        if (!record) return null;
        
        return JSON.stringify(record, null, 2);
      },
      
      // 导入记录
      importRecord: (json) => {
        try {
          const record = JSON.parse(json) as GenerationRecord;
          
          // 验证基本结构
          if (!record.dsl || !record.nodes || !record.edges) {
            console.error('Invalid record structure');
            return null;
          }
          
          // 生成新 ID 并添加
          const newId = generateId();
          const newRecord: GenerationRecord = {
            ...record,
            id: newId,
            timestamp: new Date(),
            description: `[导入] ${record.description}`,
          };
          
          set((state) => ({
            history: [newRecord, ...state.history].slice(0, state.maxHistory),
          }));
          
          return newId;
        } catch (error) {
          console.error('Failed to import record:', error);
          return null;
        }
      },
    }),
    {
      name: 'generation-history',
      partialize: (state) => ({
        history: state.history.slice(0, 10), // 只持久化最近 10 条
        maxHistory: state.maxHistory,
      }),
    }
  )
);

// ========== 辅助 Hook ==========

export function useLatestGeneration() {
  return useGenerationHistoryStore((state) => state.history[0] || null);
}

export function useGenerationCount() {
  return useGenerationHistoryStore((state) => state.history.length);
}
