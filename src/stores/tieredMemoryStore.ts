import { create } from 'zustand';
import type {
  CoreMemory,
  RecallMemory,
  ArchivesSummary,
  MemoryContextConfig,
  DreamingTaskStatus,
  DEFAULT_MEMORY_CONFIG,
} from '@/types/tieredMemory';

interface TieredMemoryState {
  // 核心记忆 (常驻)
  coreMemories: CoreMemory[];
  coreTokenCount: number;
  isCoreLoaded: boolean;
  
  // 召回记忆 (动态)
  recallMemories: RecallMemory[];
  recallTokenCount: number;
  
  // 归档记忆摘要
  archivesSummary: ArchivesSummary;
  
  // Dreaming 状态
  dreamingStatus: DreamingTaskStatus | 'idle';
  pendingDreamingTasks: number;
  lastDreamingAt: Date | null;
  lastActivityAt: Date;
  
  // 配置
  config: MemoryContextConfig;
  
  // 操作
  setCoreMemories: (memories: CoreMemory[]) => void;
  addCoreMemory: (memory: CoreMemory) => void;
  updateCoreMemory: (id: string, value: string) => void;
  removeCoreMemory: (id: string) => void;
  
  setRecallMemories: (memories: RecallMemory[]) => void;
  addRecallMemory: (memory: RecallMemory) => void;
  clearRecallMemories: () => void;
  
  setArchivesSummary: (summary: ArchivesSummary) => void;
  
  setDreamingStatus: (status: DreamingTaskStatus | 'idle') => void;
  setPendingDreamingTasks: (count: number) => void;
  setLastDreamingAt: (date: Date) => void;
  updateLastActivity: () => void;
  
  setConfig: (config: Partial<MemoryContextConfig>) => void;
  
  // 上下文生成
  generateCoreContextString: () => string;
  generateRecallContextString: () => string;
  
  // 重置
  reset: () => void;
}

// 估算 token 数量 (简单估算: 1 token ≈ 4 字符)
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

const initialState = {
  coreMemories: [],
  coreTokenCount: 0,
  isCoreLoaded: false,
  recallMemories: [],
  recallTokenCount: 0,
  archivesSummary: {
    totalArchives: 0,
    lastCompressedAt: null,
    totalExperiences: 0,
    oldestArchiveAt: null,
  },
  dreamingStatus: 'idle' as const,
  pendingDreamingTasks: 0,
  lastDreamingAt: null,
  lastActivityAt: new Date(),
  config: {
    maxCoreTokens: 500,
    maxRecallTokens: 2000,
    recallThreshold: 0.7,
    enableDreaming: true,
    dreamingIdleThreshold: 5 * 60 * 1000,
    progressLineThreshold: 50,
  },
};

export const useTieredMemoryStore = create<TieredMemoryState>((set, get) => ({
  ...initialState,

  // === 核心记忆操作 ===
  setCoreMemories: (memories) => {
    const totalTokens = memories.reduce((sum, m) => sum + m.tokenCount, 0);
    set({ 
      coreMemories: memories.sort((a, b) => b.priority - a.priority),
      coreTokenCount: totalTokens,
      isCoreLoaded: true,
    });
  },

  addCoreMemory: (memory) => {
    const state = get();
    const exists = state.coreMemories.some(
      m => m.category === memory.category && m.key === memory.key
    );
    if (exists) return;
    
    const newMemories = [...state.coreMemories, memory].sort(
      (a, b) => b.priority - a.priority
    );
    const totalTokens = newMemories.reduce((sum, m) => sum + m.tokenCount, 0);
    set({ coreMemories: newMemories, coreTokenCount: totalTokens });
  },

  updateCoreMemory: (id, value) => {
    const state = get();
    const newMemories = state.coreMemories.map(m => 
      m.id === id 
        ? { ...m, value, tokenCount: estimateTokens(value), updatedAt: new Date() }
        : m
    );
    const totalTokens = newMemories.reduce((sum, m) => sum + m.tokenCount, 0);
    set({ coreMemories: newMemories, coreTokenCount: totalTokens });
  },

  removeCoreMemory: (id) => {
    const state = get();
    const newMemories = state.coreMemories.filter(m => m.id !== id);
    const totalTokens = newMemories.reduce((sum, m) => sum + m.tokenCount, 0);
    set({ coreMemories: newMemories, coreTokenCount: totalTokens });
  },

  // === 召回记忆操作 ===
  setRecallMemories: (memories) => {
    const totalTokens = memories.reduce(
      (sum, m) => sum + estimateTokens(m.content), 
      0
    );
    set({ 
      recallMemories: memories.sort((a, b) => b.relevanceScore - a.relevanceScore),
      recallTokenCount: totalTokens,
    });
  },

  addRecallMemory: (memory) => {
    const state = get();
    const exists = state.recallMemories.some(m => m.id === memory.id);
    if (exists) return;
    
    const newMemories = [...state.recallMemories, memory].sort(
      (a, b) => b.relevanceScore - a.relevanceScore
    );
    const totalTokens = newMemories.reduce(
      (sum, m) => sum + estimateTokens(m.content), 
      0
    );
    set({ recallMemories: newMemories, recallTokenCount: totalTokens });
  },

  clearRecallMemories: () => {
    set({ recallMemories: [], recallTokenCount: 0 });
  },

  // === 归档摘要 ===
  setArchivesSummary: (summary) => {
    set({ archivesSummary: summary });
  },

  // === Dreaming 状态 ===
  setDreamingStatus: (status) => {
    set({ dreamingStatus: status });
  },

  setPendingDreamingTasks: (count) => {
    set({ pendingDreamingTasks: count });
  },

  setLastDreamingAt: (date) => {
    set({ lastDreamingAt: date });
  },

  updateLastActivity: () => {
    set({ lastActivityAt: new Date() });
  },

  // === 配置 ===
  setConfig: (config) => {
    const state = get();
    set({ config: { ...state.config, ...config } });
  },

  // === 上下文生成 ===
  generateCoreContextString: () => {
    const state = get();
    const { coreMemories, config } = state;
    
    // 按优先级排序，按 category 分组
    const personaMemories = coreMemories.filter(m => m.category === 'persona');
    const rulesMemories = coreMemories.filter(m => m.category === 'rules');
    const factsMemories = coreMemories.filter(m => m.category === 'core_facts');
    
    const sections: string[] = [];
    
    if (personaMemories.length > 0) {
      sections.push('## 人设\n' + personaMemories.map(m => `- ${m.key}: ${m.value}`).join('\n'));
    }
    
    if (rulesMemories.length > 0) {
      sections.push('## 规则\n' + rulesMemories.map(m => `- ${m.value}`).join('\n'));
    }
    
    if (factsMemories.length > 0) {
      sections.push('## 关于用户\n' + factsMemories.map(m => `- ${m.key}: ${m.value}`).join('\n'));
    }
    
    let context = sections.join('\n\n');
    
    // 如果超出 token 限制，截断低优先级内容
    while (estimateTokens(context) > config.maxCoreTokens && factsMemories.length > 0) {
      factsMemories.pop();
      sections[2] = '## 关于用户\n' + factsMemories.map(m => `- ${m.key}: ${m.value}`).join('\n');
      context = sections.join('\n\n');
    }
    
    return context;
  },

  generateRecallContextString: () => {
    const state = get();
    const { recallMemories, config } = state;
    
    if (recallMemories.length === 0) return '';
    
    const relevantMemories = recallMemories.filter(
      m => m.relevanceScore >= config.recallThreshold
    );
    
    if (relevantMemories.length === 0) return '';
    
    let context = '## 相关记忆\n' + relevantMemories.map(m => {
      const sourceLabel = m.source === 'rag' ? '知识库' : m.source === 'graph' ? '关系' : '用户记忆';
      return `[${sourceLabel}] ${m.content}`;
    }).join('\n\n');
    
    // 截断至 token 限制
    const tokens = estimateTokens(context);
    if (tokens > config.maxRecallTokens) {
      const ratio = config.maxRecallTokens / tokens;
      context = context.slice(0, Math.floor(context.length * ratio));
    }
    
    return context;
  },

  // === 重置 ===
  reset: () => {
    set(initialState);
  },
}));
