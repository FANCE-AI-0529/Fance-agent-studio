// =====================================================
// 语义资产搜索 Hook
// useSemanticAssetSearch - 统一检索 Skills, MCP, Knowledge
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  SemanticAsset, 
  AssetSearchQuery, 
  AssetSearchResult 
} from '@/types/workflowDSL';

interface UseSemanticAssetSearchReturn {
  searchAssets: (query: AssetSearchQuery) => Promise<AssetSearchResult>;
  syncAssets: (assetType?: 'skill' | 'mcp_tool' | 'knowledge_base' | 'all') => Promise<{ synced: number; errors: string[] }>;
  isSearching: boolean;
  isSyncing: boolean;
  lastResult: AssetSearchResult | null;
  error: string | null;
}

export function useSemanticAssetSearch(): UseSemanticAssetSearchReturn {
  const { user } = useAuth();
  const [isSearching, setIsSearching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<AssetSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchAssets = useCallback(async (query: AssetSearchQuery): Promise<AssetSearchResult> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsSearching(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('semantic-asset-search', {
        body: {
          ...query,
          userId: user.id,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const result: AssetSearchResult = {
        skills: data.skills || [],
        mcpTools: data.mcpTools || [],
        knowledgeBases: data.knowledgeBases || [],
        totalCount: data.totalCount || 0,
      };

      setLastResult(result);
      return result;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      throw err;
    } finally {
      setIsSearching(false);
    }
  }, [user]);

  const syncAssets = useCallback(async (
    assetType: 'skill' | 'mcp_tool' | 'knowledge_base' | 'all' = 'all'
  ): Promise<{ synced: number; errors: string[] }> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsSyncing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('sync-asset-index', {
        body: {
          userId: user.id,
          assetType,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return {
        synced: data.synced || 0,
        errors: data.errors || [],
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  return {
    searchAssets,
    syncAssets,
    isSearching,
    isSyncing,
    lastResult,
    error,
  };
}

// ========== 便捷搜索函数 ==========

export function useQuickAssetSearch() {
  const { searchAssets, isSearching, lastResult } = useSemanticAssetSearch();

  const searchByCapability = useCallback(async (capability: string) => {
    return searchAssets({
      query: capability,
      capabilities: [capability],
      maxResults: 10,
    });
  }, [searchAssets]);

  const searchByCategory = useCallback(async (category: string) => {
    return searchAssets({
      query: '',
      categories: [category],
      maxResults: 20,
    });
  }, [searchAssets]);

  const searchSkillsOnly = useCallback(async (query: string) => {
    return searchAssets({
      query,
      assetTypes: ['skill'],
      maxResults: 15,
    });
  }, [searchAssets]);

  const searchMCPOnly = useCallback(async (query: string) => {
    return searchAssets({
      query,
      assetTypes: ['mcp_tool'],
      maxResults: 15,
    });
  }, [searchAssets]);

  const searchKnowledgeOnly = useCallback(async (query: string) => {
    return searchAssets({
      query,
      assetTypes: ['knowledge_base'],
      maxResults: 10,
    });
  }, [searchAssets]);

  return {
    searchByCapability,
    searchByCategory,
    searchSkillsOnly,
    searchMCPOnly,
    searchKnowledgeOnly,
    isSearching,
    lastResult,
  };
}
