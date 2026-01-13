import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// RAG 决策区间类型
export type DecisionZone = 'auto' | 'clarify' | 'empty';

// 决策类型
export type RAGDecision = 'auto_mount' | 'ask_user' | 'suggest_upload';

// 知识库匹配结果
export interface KnowledgeMatchResult {
  knowledgeBase: {
    id: string;
    name: string;
    description: string | null;
    usage_context: string | null;
    intent_tags: string[];
    documents_count: number | null;
    chunks_count: number | null;
  };
  score: number;
  matchReason: string;
  decisionZone: DecisionZone;
}

// 匹配响应
export interface MatchResponse {
  matches: KnowledgeMatchResult[];
  decision: RAGDecision;
  clarifyQuestion?: string;
  debugInfo?: {
    queryIntent: string[];
    totalCandidates: number;
  };
}

// RAG 决策状态
export interface RAGDecisionState {
  decision: RAGDecision;
  matches: KnowledgeMatchResult[];
  clarifyQuestion?: string;
  isDecisionPending: boolean;
  autoMountedKB?: KnowledgeMatchResult;
}

export function useKnowledgeMatching() {
  const { user } = useAuth();
  const [isMatching, setIsMatching] = useState(false);
  const [ragDecision, setRagDecision] = useState<RAGDecisionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 执行知识库匹配
  const matchKnowledgeBases = useCallback(async (
    query: string,
    options?: { autoMount?: boolean; limit?: number }
  ): Promise<MatchResponse | null> => {
    if (!query.trim()) {
      return null;
    }

    setIsMatching(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('match-knowledge-bases', {
        body: {
          query,
          userId: user?.id,
          limit: options?.limit || 5,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      const response = data as MatchResponse;

      // 根据决策类型更新状态
      if (response.decision === 'auto_mount' && options?.autoMount !== false) {
        // 自动区：设置自动挂载状态
        setRagDecision({
          decision: 'auto_mount',
          matches: response.matches,
          isDecisionPending: false,
          autoMountedKB: response.matches[0],
        });
      } else if (response.decision === 'ask_user') {
        // 澄清区：需要用户决策
        setRagDecision({
          decision: 'ask_user',
          matches: response.matches,
          clarifyQuestion: response.clarifyQuestion,
          isDecisionPending: true,
        });
      } else {
        // 空白区：提示上传
        setRagDecision({
          decision: 'suggest_upload',
          matches: response.matches,
          isDecisionPending: true,
        });
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '匹配知识库失败';
      setError(errorMessage);
      console.error('Knowledge matching error:', err);
      return null;
    } finally {
      setIsMatching(false);
    }
  }, [user?.id]);

  // 用户选择知识库
  const confirmSelection = useCallback((selectedIds: string[]) => {
    if (!ragDecision) return [];

    const selected = ragDecision.matches.filter(m => 
      selectedIds.includes(m.knowledgeBase.id)
    );

    setRagDecision(prev => prev ? {
      ...prev,
      isDecisionPending: false,
    } : null);

    return selected;
  }, [ragDecision]);

  // 跳过知识库选择
  const skipSelection = useCallback(() => {
    setRagDecision(prev => prev ? {
      ...prev,
      isDecisionPending: false,
    } : null);
  }, []);

  // 撤销自动挂载
  const undoAutoMount = useCallback(() => {
    setRagDecision(prev => prev ? {
      ...prev,
      autoMountedKB: undefined,
    } : null);
    toast.info('已撤销自动挂载');
  }, []);

  // 重置状态
  const resetDecision = useCallback(() => {
    setRagDecision(null);
    setError(null);
  }, []);

  // 触发知识库自动画像
  const triggerAutoProfile = useCallback(async (knowledgeBaseId: string) => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('kb-auto-profile', {
        body: { knowledgeBaseId },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      return data;
    } catch (err) {
      console.error('Auto profile error:', err);
      throw err;
    }
  }, []);

  return {
    // 状态
    isMatching,
    ragDecision,
    error,
    
    // 方法
    matchKnowledgeBases,
    confirmSelection,
    skipSelection,
    undoAutoMount,
    resetDecision,
    triggerAutoProfile,

    // 便捷判断
    isAutoMount: ragDecision?.decision === 'auto_mount',
    needsUserDecision: ragDecision?.isDecisionPending && ragDecision?.decision === 'ask_user',
    suggestUpload: ragDecision?.decision === 'suggest_upload',
  };
}
