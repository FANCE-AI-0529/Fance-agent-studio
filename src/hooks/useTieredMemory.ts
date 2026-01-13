import { useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTieredMemoryStore } from '@/stores/tieredMemoryStore';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  CoreMemory, 
  RecallMemory, 
  RecallQueryOptions,
  TieredMemoryContext,
  CoreMemoryCategory,
} from '@/types/tieredMemory';
import type { Json } from '@/integrations/supabase/types';

// 估算 token 数量
const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export function useTieredMemory(agentId?: string) {
  const { user } = useAuth();
  const store = useTieredMemoryStore();

  // === 加载核心记忆 ===
  const loadCoreMemories = useCallback(async () => {
    if (!user || !agentId) return;

    try {
      const { data, error } = await supabase
        .from('core_memories')
        .select('*')
        .eq('agent_id', agentId)
        .eq('user_id', user.id)
        .order('priority', { ascending: false });

      if (error) throw error;

      const memories: CoreMemory[] = (data || []).map(row => ({
        id: row.id,
        agentId: row.agent_id,
        userId: row.user_id,
        category: row.category as CoreMemoryCategory,
        key: row.key,
        value: row.value,
        isReadOnly: row.is_read_only,
        tokenCount: row.token_count,
        priority: row.priority,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));

      store.setCoreMemories(memories);
    } catch (err) {
      console.error('Failed to load core memories:', err);
    }
  }, [user, agentId, store]);

  // === 添加核心记忆 ===
  const addCoreMemory = useCallback(async (
    category: CoreMemoryCategory,
    key: string,
    value: string,
    options?: { isReadOnly?: boolean; priority?: number }
  ): Promise<string | null> => {
    if (!user || !agentId) return null;

    try {
      const tokenCount = estimateTokens(value);
      
      const { data, error } = await supabase
        .from('core_memories')
        .upsert({
          agent_id: agentId,
          user_id: user.id,
          category,
          key,
          value,
          is_read_only: options?.isReadOnly ?? true,
          token_count: tokenCount,
          priority: options?.priority ?? 5,
        }, {
          onConflict: 'agent_id,user_id,category,key',
        })
        .select('id')
        .single();

      if (error) throw error;

      // 更新本地状态
      await loadCoreMemories();
      
      return data.id;
    } catch (err) {
      console.error('Failed to add core memory:', err);
      return null;
    }
  }, [user, agentId, loadCoreMemories]);

  // === 更新核心记忆 ===
  const updateCoreMemory = useCallback(async (
    id: string,
    value: string
  ): Promise<boolean> => {
    if (!user) return false;

    try {
      const tokenCount = estimateTokens(value);
      
      const { error } = await supabase
        .from('core_memories')
        .update({
          value,
          token_count: tokenCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('is_read_only', false);

      if (error) throw error;

      store.updateCoreMemory(id, value);
      return true;
    } catch (err) {
      console.error('Failed to update core memory:', err);
      return false;
    }
  }, [user, store]);

  // === 删除核心记忆 ===
  const deleteCoreMemory = useCallback(async (id: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('core_memories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)
        .eq('is_read_only', false);

      if (error) throw error;

      store.removeCoreMemory(id);
      return true;
    } catch (err) {
      console.error('Failed to delete core memory:', err);
      return false;
    }
  }, [user, store]);

  // === 智能召回记忆 ===
  const recallMemories = useCallback(async (
    query: string,
    options?: RecallQueryOptions
  ): Promise<RecallMemory[]> => {
    if (!user) return [];

    const results: RecallMemory[] = [];
    const topK = options?.topK ?? 5;
    const threshold = options?.threshold ?? store.config.recallThreshold;
    const sources = options?.sources ?? ['rag', 'graph', 'user_memory'];

    try {
      // 1. RAG 语义检索
      if (sources.includes('rag')) {
        try {
          const { data: ragData } = await supabase.functions.invoke('rag-query', {
            body: { query, topK, threshold },
          });
          
          if (ragData?.results) {
            results.push(...ragData.results.map((r: { id: string; content: string; score: number; metadata?: Record<string, unknown> }) => ({
              id: `rag-${r.id}`,
              source: 'rag' as const,
              content: r.content,
              relevanceScore: r.score,
              lastAccessedAt: new Date(),
              accessCount: 1,
              metadata: r.metadata || {},
            })));
          }
        } catch (err) {
          console.warn('RAG query failed:', err);
        }
      }

      // 2. GraphRAG 关系检索
      if (sources.includes('graph')) {
        try {
          const { data: graphData } = await supabase.functions.invoke('graph-search', {
            body: { query, topK: Math.ceil(topK / 2) },
          });
          
          if (graphData?.results) {
            results.push(...graphData.results.map((r: { id: string; content: string; score: number; metadata?: Record<string, unknown> }) => ({
              id: `graph-${r.id}`,
              source: 'graph' as const,
              content: r.content,
              relevanceScore: r.score,
              lastAccessedAt: new Date(),
              accessCount: 1,
              metadata: r.metadata || {},
            })));
          }
        } catch (err) {
          console.warn('Graph search failed:', err);
        }
      }

      // 3. 用户记忆检索
      if (sources.includes('user_memory')) {
        try {
          const { data: memoryData } = await supabase
            .from('user_memories')
            .select('*')
            .eq('user_id', user.id)
            .textSearch('value', query)
            .limit(topK);
          
          if (memoryData) {
            results.push(...memoryData.map((m) => ({
              id: `memory-${m.id}`,
              source: 'user_memory' as const,
              content: m.value || '',
              relevanceScore: (m.importance || 5) / 10,
              lastAccessedAt: new Date(),
              accessCount: 1,
              metadata: {},
            })));
          }
        } catch (err) {
          console.warn('User memory search failed:', err);
        }
      }

      // 按相关度排序并去重
      const uniqueResults = results
        .filter(r => r.relevanceScore >= threshold)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, topK);

      store.setRecallMemories(uniqueResults);
      store.updateLastActivity();

      return uniqueResults;
    } catch (err) {
      console.error('Failed to recall memories:', err);
      return [];
    }
  }, [user, store]);

  // === 加载归档摘要 ===
  const loadArchivesSummary = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('memory_archives')
        .select('id, compressed_at')
        .eq('user_id', user.id)
        .order('compressed_at', { ascending: false });

      if (error) throw error;

      const archives = data || [];
      store.setArchivesSummary({
        totalArchives: archives.length,
        lastCompressedAt: archives[0]?.compressed_at ? new Date(archives[0].compressed_at) : null,
        totalExperiences: archives.length,
        oldestArchiveAt: archives[archives.length - 1]?.compressed_at 
          ? new Date(archives[archives.length - 1].compressed_at) 
          : null,
      });
    } catch (err) {
      console.error('Failed to load archives summary:', err);
    }
  }, [user, store]);

  // === 生成完整上下文 ===
  const getFullContext = useCallback((recentContext?: string): TieredMemoryContext => {
    const coreContext = store.generateCoreContextString();
    const recallContext = store.generateRecallContextString();
    const recent = recentContext || '';

    const totalTokens = 
      estimateTokens(coreContext) + 
      estimateTokens(recallContext) + 
      estimateTokens(recent);

    return {
      core: coreContext,
      recall: recallContext,
      recent,
      totalTokens,
    };
  }, [store]);

  // === 初始化 ===
  useEffect(() => {
    if (agentId && user && !store.isCoreLoaded) {
      loadCoreMemories();
      loadArchivesSummary();
    }
  }, [agentId, user, store.isCoreLoaded, loadCoreMemories, loadArchivesSummary]);

  return {
    // 核心记忆
    coreMemories: store.coreMemories,
    coreTokenCount: store.coreTokenCount,
    isCoreLoaded: store.isCoreLoaded,
    loadCoreMemories,
    addCoreMemory,
    updateCoreMemory,
    deleteCoreMemory,
    
    // 召回记忆
    recallMemoriesData: store.recallMemories,
    recallTokenCount: store.recallTokenCount,
    queryRecallMemories: recallMemories,
    clearRecallMemories: store.clearRecallMemories,
    
    // 归档
    archivesSummary: store.archivesSummary,
    loadArchivesSummary,
    
    // 上下文
    getFullContext,
    
    // 配置
    config: store.config,
    setConfig: store.setConfig,
    
    // 状态
    dreamingStatus: store.dreamingStatus,
    lastDreamingAt: store.lastDreamingAt,
  };
}
