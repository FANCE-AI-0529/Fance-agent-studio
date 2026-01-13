// =====================================================
// 运行时知识库热挂载 Hook
// Runtime Knowledge Hot-Mount - Phase 4
// =====================================================

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  KnowledgeMountSuggestion,
  KnowledgeMountLogEntry,
  KnowledgeGapDetectionResult,
} from '@/types/ragDecision';

interface UseRuntimeKnowledgeMountOptions {
  agentId: string;
  initialKnowledgeBaseIds: string[];
  onMountSuccess?: (kbId: string, kbName: string) => void;
}

interface UseRuntimeKnowledgeMountReturn {
  // State
  mountSuggestion: KnowledgeMountSuggestion | null;
  isMounting: boolean;
  isChecking: boolean;
  mountedInSession: string[];
  mountLog: KnowledgeMountLogEntry[];
  
  // Actions
  checkForKnowledgeGap: (message: string) => Promise<KnowledgeGapDetectionResult | null>;
  acceptMountSuggestion: () => Promise<boolean>;
  dismissMountSuggestion: () => void;
  addMountLog: (entry: Omit<KnowledgeMountLogEntry, 'timestamp'>) => void;
  clearMountLog: () => void;
  
  // Computed
  currentKnowledgeBaseIds: string[];
}

export function useRuntimeKnowledgeMount({
  agentId,
  initialKnowledgeBaseIds,
  onMountSuccess,
}: UseRuntimeKnowledgeMountOptions): UseRuntimeKnowledgeMountReturn {
  const { user } = useAuth();
  
  const [mountSuggestion, setMountSuggestion] = useState<KnowledgeMountSuggestion | null>(null);
  const [isMounting, setIsMounting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [mountedInSession, setMountedInSession] = useState<string[]>([]);
  const [mountLog, setMountLog] = useState<KnowledgeMountLogEntry[]>([]);
  
  // Track all currently mounted KBs
  const currentKnowledgeBaseIds = [
    ...initialKnowledgeBaseIds,
    ...mountedInSession,
  ];
  
  const lastCheckRef = useRef<string>('');

  const addMountLog = useCallback((entry: Omit<KnowledgeMountLogEntry, 'timestamp'>) => {
    setMountLog(prev => [
      ...prev,
      { ...entry, timestamp: new Date() },
    ]);
  }, []);

  const clearMountLog = useCallback(() => {
    setMountLog([]);
  }, []);

  const checkForKnowledgeGap = useCallback(async (
    message: string
  ): Promise<KnowledgeGapDetectionResult | null> => {
    if (!user || !agentId) return null;
    
    // Debounce: don't check same message twice
    if (message === lastCheckRef.current) return null;
    lastCheckRef.current = message;

    setIsChecking(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('knowledge-gap-detect', {
        body: {
          agentId,
          userId: user.id,
          currentMessage: message,
          mountedKnowledgeBaseIds: currentKnowledgeBaseIds,
        },
      });

      if (error) {
        console.error('Knowledge gap detection error:', error);
        return null;
      }

      const result = data as KnowledgeGapDetectionResult;

      // If gap detected with suggestion, set the suggestion
      if (result.gapDetected && result.suggestedKnowledgeBase) {
        const suggestion: KnowledgeMountSuggestion = {
          knowledgeBaseId: result.suggestedKnowledgeBase.id,
          knowledgeBaseName: result.suggestedKnowledgeBase.name,
          description: result.suggestedKnowledgeBase.description,
          matchScore: result.suggestedKnowledgeBase.matchScore,
          reason: result.suggestedKnowledgeBase.reason,
        };
        setMountSuggestion(suggestion);
        
        // Log the detection
        addMountLog({
          type: 'system',
          message: `检测到知识缺口: 建议挂载「${suggestion.knowledgeBaseName}」(匹配度: ${Math.round(suggestion.matchScore * 100)}%)`,
          knowledgeBaseId: suggestion.knowledgeBaseId,
          knowledgeBaseName: suggestion.knowledgeBaseName,
        });
      }

      return result;
    } catch (err) {
      console.error('Knowledge gap check failed:', err);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [user, agentId, currentKnowledgeBaseIds, addMountLog]);

  const acceptMountSuggestion = useCallback(async (): Promise<boolean> => {
    if (!mountSuggestion || !agentId) return false;

    setIsMounting(true);

    try {
      // 1. Update agent's manifest to include new KB
      const { data: agent, error: fetchError } = await supabase
        .from('agents')
        .select('manifest')
        .eq('id', agentId)
        .single();

      if (fetchError) throw fetchError;

      const currentManifest = (agent?.manifest as Record<string, unknown>) || {};
      const currentKBs = (currentManifest.knowledgeBases as string[]) || [];
      
      const updatedKBs = [...new Set([...currentKBs, mountSuggestion.knowledgeBaseId])];

      const { error: updateError } = await supabase
        .from('agents')
        .update({
          manifest: {
            ...currentManifest,
            knowledgeBases: updatedKBs,
          },
        })
        .eq('id', agentId);

      if (updateError) throw updateError;

      // 2. Update local state
      setMountedInSession(prev => [...prev, mountSuggestion.knowledgeBaseId]);
      
      // 3. Log the mount
      addMountLog({
        type: 'mount',
        message: `[System] Knowledge Base '${mountSuggestion.knowledgeBaseName}' mounted successfully.`,
        knowledgeBaseId: mountSuggestion.knowledgeBaseId,
        knowledgeBaseName: mountSuggestion.knowledgeBaseName,
      });

      // 4. Notify parent
      onMountSuccess?.(mountSuggestion.knowledgeBaseId, mountSuggestion.knowledgeBaseName);

      // 5. Show toast
      toast.success(`已挂载知识库「${mountSuggestion.knowledgeBaseName}」`);

      // 6. Clear suggestion
      setMountSuggestion(null);

      return true;
    } catch (err) {
      console.error('Mount failed:', err);
      toast.error('知识库挂载失败');
      
      addMountLog({
        type: 'system',
        message: `[Error] 挂载知识库「${mountSuggestion.knowledgeBaseName}」失败`,
        knowledgeBaseId: mountSuggestion.knowledgeBaseId,
        knowledgeBaseName: mountSuggestion.knowledgeBaseName,
      });

      return false;
    } finally {
      setIsMounting(false);
    }
  }, [mountSuggestion, agentId, addMountLog, onMountSuccess]);

  const dismissMountSuggestion = useCallback(() => {
    if (mountSuggestion) {
      addMountLog({
        type: 'system',
        message: `用户跳过挂载建议: 「${mountSuggestion.knowledgeBaseName}」`,
        knowledgeBaseId: mountSuggestion.knowledgeBaseId,
        knowledgeBaseName: mountSuggestion.knowledgeBaseName,
      });
    }
    setMountSuggestion(null);
  }, [mountSuggestion, addMountLog]);

  return {
    mountSuggestion,
    isMounting,
    isChecking,
    mountedInSession,
    mountLog,
    checkForKnowledgeGap,
    acceptMountSuggestion,
    dismissMountSuggestion,
    addMountLog,
    clearMountLog,
    currentKnowledgeBaseIds,
  };
}
