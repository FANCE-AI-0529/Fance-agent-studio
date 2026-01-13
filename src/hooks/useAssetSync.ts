// =====================================================
// 资产语义索引同步 Hook
// Asset Semantic Index Sync Hook
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface SyncResult {
  synced: number;
  errors: number;
  message: string;
}

interface UseAssetSyncReturn {
  syncSkills: () => Promise<SyncResult>;
  syncKnowledgeBases: () => Promise<SyncResult>;
  syncMCPTools: () => Promise<SyncResult>;
  syncAll: () => Promise<SyncResult>;
  isSyncing: boolean;
  lastSyncTime: Date | null;
}

export function useAssetSync(): UseAssetSyncReturn {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const syncSkills = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { synced: 0, errors: 0, message: '用户未登录' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('sync-asset-index', {
        body: {
          userId: user.id,
          assetTypes: ['skill'],
        },
      });

      if (error) throw error;

      return {
        synced: data?.synced?.skills || 0,
        errors: data?.errors || 0,
        message: data?.message || '技能同步完成',
      };
    } catch (err) {
      console.error('Sync skills failed:', err);
      return {
        synced: 0,
        errors: 1,
        message: err instanceof Error ? err.message : '同步失败',
      };
    }
  }, [user]);

  const syncKnowledgeBases = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { synced: 0, errors: 0, message: '用户未登录' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('sync-asset-index', {
        body: {
          userId: user.id,
          assetTypes: ['knowledge_base'],
        },
      });

      if (error) throw error;

      return {
        synced: data?.synced?.knowledgeBases || 0,
        errors: data?.errors || 0,
        message: data?.message || '知识库同步完成',
      };
    } catch (err) {
      console.error('Sync knowledge bases failed:', err);
      return {
        synced: 0,
        errors: 1,
        message: err instanceof Error ? err.message : '同步失败',
      };
    }
  }, [user]);

  const syncMCPTools = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { synced: 0, errors: 0, message: '用户未登录' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('sync-asset-index', {
        body: {
          userId: user.id,
          assetTypes: ['mcp_tool'],
        },
      });

      if (error) throw error;

      return {
        synced: data?.synced?.mcpTools || 0,
        errors: data?.errors || 0,
        message: data?.message || 'MCP工具同步完成',
      };
    } catch (err) {
      console.error('Sync MCP tools failed:', err);
      return {
        synced: 0,
        errors: 1,
        message: err instanceof Error ? err.message : '同步失败',
      };
    }
  }, [user]);

  const syncAll = useCallback(async (): Promise<SyncResult> => {
    if (!user) {
      return { synced: 0, errors: 0, message: '用户未登录' };
    }

    setIsSyncing(true);

    try {
      const { data, error } = await supabase.functions.invoke('sync-asset-index', {
        body: {
          userId: user.id,
          assetTypes: ['skill', 'knowledge_base', 'mcp_tool'],
        },
      });

      if (error) throw error;

      const totalSynced = 
        (data?.synced?.skills || 0) + 
        (data?.synced?.knowledgeBases || 0) + 
        (data?.synced?.mcpTools || 0);

      setLastSyncTime(new Date());

      toast({
        title: '资产索引同步完成',
        description: `已同步 ${totalSynced} 个资产`,
      });

      return {
        synced: totalSynced,
        errors: data?.errors || 0,
        message: data?.message || '所有资产同步完成',
      };
    } catch (err) {
      console.error('Sync all assets failed:', err);
      
      toast({
        title: '同步失败',
        description: err instanceof Error ? err.message : '未知错误',
        variant: 'destructive',
      });

      return {
        synced: 0,
        errors: 1,
        message: err instanceof Error ? err.message : '同步失败',
      };
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  return {
    syncSkills,
    syncKnowledgeBases,
    syncMCPTools,
    syncAll,
    isSyncing,
    lastSyncTime,
  };
}

// ========== 自动同步触发器 ==========

export function useSyncOnChange() {
  const { syncSkills, syncKnowledgeBases, syncMCPTools } = useAssetSync();

  const onSkillChange = useCallback(async () => {
    // 延迟同步，避免频繁触发
    setTimeout(async () => {
      await syncSkills();
    }, 1000);
  }, [syncSkills]);

  const onKnowledgeBaseChange = useCallback(async () => {
    setTimeout(async () => {
      await syncKnowledgeBases();
    }, 1000);
  }, [syncKnowledgeBases]);

  const onMCPToolChange = useCallback(async () => {
    setTimeout(async () => {
      await syncMCPTools();
    }, 1000);
  }, [syncMCPTools]);

  return {
    onSkillChange,
    onKnowledgeBaseChange,
    onMCPToolChange,
  };
}

export default useAssetSync;
