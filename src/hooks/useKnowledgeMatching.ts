/**
 * @file useKnowledgeMatching.ts
 * @description 知识库匹配钩子，提供基于RAG的知识库自动匹配和用户决策支持
 * @module Hooks/Knowledge
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * 决策区间类型
 * 
 * 定义匹配结果落入的决策区间。
 * - auto: 自动区，高置信度可自动处理
 * - clarify: 澄清区，需要用户确认
 * - empty: 空白区，无匹配结果
 */
export type DecisionZone = 'auto' | 'clarify' | 'empty';

/**
 * RAG决策类型
 * 
 * 定义系统推荐的处理决策。
 */
export type RAGDecision = 'auto_mount' | 'ask_user' | 'suggest_upload';

/**
 * 知识库匹配结果接口
 * 
 * 表示单个知识库的匹配详情。
 */
export interface KnowledgeMatchResult {
  /** 知识库信息 */
  knowledgeBase: {
    /** 知识库ID */
    id: string;
    /** 知识库名称 */
    name: string;
    /** 知识库描述 */
    description: string | null;
    /** 使用场景说明 */
    usage_context: string | null;
    /** 意图标签列表 */
    intent_tags: string[];
    /** 文档数量 */
    documents_count: number | null;
    /** 分块数量 */
    chunks_count: number | null;
  };
  /** 匹配得分（0-1） */
  score: number;
  /** 匹配原因说明 */
  matchReason: string;
  /** 所属决策区间 */
  decisionZone: DecisionZone;
}

/**
 * 匹配响应接口
 * 
 * 边缘函数返回的完整匹配结果。
 */
export interface MatchResponse {
  /** 匹配结果列表 */
  matches: KnowledgeMatchResult[];
  /** 推荐决策 */
  decision: RAGDecision;
  /** 澄清问题（当需要用户确认时） */
  clarifyQuestion?: string;
  /** 调试信息 */
  debugInfo?: {
    /** 解析的查询意图 */
    queryIntent: string[];
    /** 候选知识库总数 */
    totalCandidates: number;
  };
}

/**
 * RAG决策状态接口
 * 
 * 内部状态管理的决策信息结构。
 */
export interface RAGDecisionState {
  /** 当前决策类型 */
  decision: RAGDecision;
  /** 匹配结果列表 */
  matches: KnowledgeMatchResult[];
  /** 澄清问题 */
  clarifyQuestion?: string;
  /** 是否等待用户决策 */
  isDecisionPending: boolean;
  /** 自动挂载的知识库 */
  autoMountedKB?: KnowledgeMatchResult;
}

/**
 * 知识库匹配钩子
 * 
 * 提供基于用户查询的知识库自动匹配能力，支持三区决策机制：
 * 1. 自动区（auto_mount）：高置信度匹配，自动挂载最佳知识库
 * 2. 澄清区（ask_user）：中置信度匹配，需用户从候选中选择
 * 3. 空白区（suggest_upload）：无匹配，建议用户上传相关资料
 * 
 * @returns {Object} - 匹配方法、状态及用户交互处理函数
 * 
 * @example
 * ```tsx
 * const { matchKnowledgeBases, ragDecision, needsUserDecision } = useKnowledgeMatching();
 * 
 * const result = await matchKnowledgeBases("帮我分析销售报表");
 * if (result?.decision === 'auto_mount') {
 *   console.log('已自动挂载:', result.matches[0].knowledgeBase.name);
 * }
 * ```
 */
export function useKnowledgeMatching() {
  const { user } = useAuth();
  const [isMatching, setIsMatching] = useState(false);
  const [ragDecision, setRagDecision] = useState<RAGDecisionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 执行知识库匹配
   * 
   * 根据用户查询调用语义匹配服务，返回最相关的知识库列表。
   * 
   * @param {string} query - 用户查询文本
   * @param {Object} options - 匹配选项
   * @returns {Promise<MatchResponse | null>} - 匹配结果
   */
  const matchKnowledgeBases = useCallback(async (
    query: string,
    options?: { autoMount?: boolean; limit?: number }
  ): Promise<MatchResponse | null> => {
    // [验证]：空查询直接返回
    if (!query.trim()) {
      return null;
    }

    setIsMatching(true);
    setError(null);

    try {
      // [调用]：请求知识库匹配边缘函数
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

      // [决策处理]：根据返回的决策类型更新状态
      if (response.decision === 'auto_mount' && options?.autoMount !== false) {
        // [自动区]：设置自动挂载状态
        setRagDecision({
          decision: 'auto_mount',
          matches: response.matches,
          isDecisionPending: false,
          autoMountedKB: response.matches[0],
        });
      } else if (response.decision === 'ask_user') {
        // [澄清区]：需要用户决策
        setRagDecision({
          decision: 'ask_user',
          matches: response.matches,
          clarifyQuestion: response.clarifyQuestion,
          isDecisionPending: true,
        });
      } else {
        // [空白区]：提示上传
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
      return null;
    } finally {
      setIsMatching(false);
    }
  }, [user?.id]);

  /**
   * 用户确认选择知识库
   * 
   * 处理用户从候选列表中选择知识库的操作。
   * 
   * @param {string[]} selectedIds - 选中的知识库ID列表
   * @returns {KnowledgeMatchResult[]} - 选中的知识库详情
   */
  const confirmSelection = useCallback((selectedIds: string[]) => {
    if (!ragDecision) return [];

    const selected = ragDecision.matches.filter(m => 
      selectedIds.includes(m.knowledgeBase.id)
    );

    // [更新]：标记决策已完成
    setRagDecision(prev => prev ? {
      ...prev,
      isDecisionPending: false,
    } : null);

    return selected;
  }, [ragDecision]);

  /**
   * 跳过知识库选择
   * 
   * 用户选择不使用任何知识库。
   */
  const skipSelection = useCallback(() => {
    setRagDecision(prev => prev ? {
      ...prev,
      isDecisionPending: false,
    } : null);
  }, []);

  /**
   * 撤销自动挂载
   * 
   * 用户取消系统自动挂载的知识库。
   */
  const undoAutoMount = useCallback(() => {
    setRagDecision(prev => prev ? {
      ...prev,
      autoMountedKB: undefined,
    } : null);
    toast.info('已撤销自动挂载');
  }, []);

  /**
   * 重置决策状态
   * 
   * 清除当前的匹配状态和决策信息。
   */
  const resetDecision = useCallback(() => {
    setRagDecision(null);
    setError(null);
  }, []);

  /**
   * 触发知识库自动画像
   * 
   * 调用边缘函数为知识库生成使用场景和意图标签。
   * 
   * @param {string} knowledgeBaseId - 知识库ID
   * @returns {Promise<unknown>} - 画像结果
   */
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
      throw err;
    }
  }, []);

  return {
    // [状态]
    /** 是否正在匹配中 */
    isMatching,
    /** RAG决策状态 */
    ragDecision,
    /** 错误信息 */
    error,
    
    // [方法]
    /** 执行知识库匹配 */
    matchKnowledgeBases,
    /** 确认知识库选择 */
    confirmSelection,
    /** 跳过选择 */
    skipSelection,
    /** 撤销自动挂载 */
    undoAutoMount,
    /** 重置决策状态 */
    resetDecision,
    /** 触发自动画像 */
    triggerAutoProfile,

    // [便捷判断]
    /** 是否为自动挂载决策 */
    isAutoMount: ragDecision?.decision === 'auto_mount',
    /** 是否需要用户决策 */
    needsUserDecision: ragDecision?.isDecisionPending && ragDecision?.decision === 'ask_user',
    /** 是否建议上传 */
    suggestUpload: ragDecision?.decision === 'suggest_upload',
  };
}
