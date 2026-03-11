import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useKnowledgeMatching, type KnowledgeMatchResult, type RAGDecisionState } from "./useKnowledgeMatching.ts";

export interface KnowledgeConfig {
  retrieval_mode: 'vector' | 'graph' | 'hybrid';
  top_k: number;
  graph_depth: number;
  source_traceability: boolean;
  auto_inject_context: boolean;
}

export interface MountedKnowledgeBase {
  id: string;
  name: string;
  description?: string;
  documents_count: number;
  chunks_count: number;
  nodes_count?: number;
  edges_count?: number;
  index_status: string;
  graph_enabled: boolean;
  config: KnowledgeConfig;
  // RAG 决策新增字段
  usage_context?: string;
  intent_tags?: string[];
  matchScore?: number;
  matchReason?: string;
}

const defaultConfig: KnowledgeConfig = {
  retrieval_mode: 'hybrid',
  top_k: 5,
  graph_depth: 2,
  source_traceability: true,
  auto_inject_context: true,
};

export function useBuilderKnowledge() {
  const [mountedKnowledgeBases, setMountedKnowledgeBases] = useState<MountedKnowledgeBase[]>([]);
  
  // 集成 RAG 决策引擎
  const {
    isMatching,
    ragDecision,
    matchKnowledgeBases,
    confirmSelection,
    skipSelection,
    undoAutoMount,
    resetDecision,
    triggerAutoProfile,
  } = useKnowledgeMatching();

  const addKnowledgeBase = useCallback((kb: Omit<MountedKnowledgeBase, 'config'>) => {
    setMountedKnowledgeBases((prev) => {
      // Prevent duplicates
      if (prev.some((item) => item.id === kb.id)) {
        return prev;
      }
      return [...prev, { ...kb, config: { ...defaultConfig } }];
    });
  }, []);

  // 从 RAG 匹配结果添加知识库
  const addFromMatch = useCallback((match: KnowledgeMatchResult) => {
    const kb = match.knowledgeBase;
    setMountedKnowledgeBases((prev) => {
      if (prev.some((item) => item.id === kb.id)) {
        return prev;
      }
      return [...prev, {
        id: kb.id,
        name: kb.name,
        description: kb.description || undefined,
        documents_count: kb.documents_count || 0,
        chunks_count: kb.chunks_count || 0,
        index_status: 'ready',
        graph_enabled: false,
        usage_context: kb.usage_context || undefined,
        intent_tags: kb.intent_tags,
        matchScore: match.score,
        matchReason: match.matchReason,
        config: { ...defaultConfig },
      }];
    });
  }, []);

  const removeKnowledgeBase = useCallback((id: string) => {
    setMountedKnowledgeBases((prev) => prev.filter((kb) => kb.id !== id));
  }, []);

  const updateConfig = useCallback((id: string, config: Partial<KnowledgeConfig>) => {
    setMountedKnowledgeBases((prev) =>
      prev.map((kb) =>
        kb.id === id
          ? { ...kb, config: { ...kb.config, ...config } }
          : kb
      )
    );
  }, []);

  const getKnowledgeBase = useCallback((id: string) => {
    return mountedKnowledgeBases.find((kb) => kb.id === id);
  }, [mountedKnowledgeBases]);

  const getConfig = useCallback((id: string): KnowledgeConfig => {
    const kb = mountedKnowledgeBases.find((item) => item.id === id);
    return kb?.config || defaultConfig;
  }, [mountedKnowledgeBases]);

  // 分析用户需求，触发知识库匹配
  const analyzeForKnowledge = useCallback(async (description: string) => {
    const result = await matchKnowledgeBases(description, { autoMount: true });
    
    if (!result) return null;

    if (result.decision === 'auto_mount' && result.matches[0]) {
      // 自动区：自动挂载并显示 toast
      addFromMatch(result.matches[0]);
      toast.success(`已自动挂载「${result.matches[0].knowledgeBase.name}」知识库`, {
        description: `匹配度 ${Math.round(result.matches[0].score * 100)}%`,
        action: {
          label: '撤销',
          onClick: () => {
            removeKnowledgeBase(result.matches[0].knowledgeBase.id);
            undoAutoMount();
          },
        },
      });
    }

    return result;
  }, [matchKnowledgeBases, addFromMatch, removeKnowledgeBase, undoAutoMount]);

  // 用户确认选择
  const handleUserSelection = useCallback((selectedIds: string[]) => {
    const selected = confirmSelection(selectedIds);
    selected.forEach(match => {
      addFromMatch(match);
    });
    return selected;
  }, [confirmSelection, addFromMatch]);

  // 跳过知识库选择
  const handleSkipKnowledge = useCallback(() => {
    skipSelection();
    toast.info('将不使用知识库');
  }, [skipSelection]);

  // Generate manifest knowledge section
  const generateKnowledgeManifest = useCallback(() => {
    if (mountedKnowledgeBases.length === 0) {
      return { enabled: false, bases: [] };
    }

    return {
      enabled: true,
      bases: mountedKnowledgeBases.map((kb) => ({
        id: kb.id,
        name: kb.name,
        retrieval_mode: kb.config.retrieval_mode,
        top_k: kb.config.top_k,
        graph_depth: kb.config.graph_depth,
        source_traceability: kb.config.source_traceability,
        auto_inject_context: kb.config.auto_inject_context,
        // RAG 决策信息
        usage_context: kb.usage_context,
        intent_tags: kb.intent_tags,
        match_score: kb.matchScore,
      })),
    };
  }, [mountedKnowledgeBases]);

  // Generate MPLP governance policies
  const generateGovernancePolicies = useCallback(() => {
    const policies: Array<{
      id: string;
      name: string;
      description: string;
      enabled: boolean;
      rule: string;
    }> = [];

    // Add source traceability policy if any KB has it enabled
    const hasTraceability = mountedKnowledgeBases.some(
      (kb) => kb.config.source_traceability
    );

    if (hasTraceability) {
      policies.push({
        id: "source_traceability",
        name: "来源溯源策略",
        description: "所有基于知识库的回复必须附带来源引用",
        enabled: true,
        rule: "all_responses_must_cite_sources",
      });
    }

    return policies;
  }, [mountedKnowledgeBases]);

  // Check if long-term memory should be enabled
  const hasLongTermMemory = mountedKnowledgeBases.length > 0;

  return {
    // 现有功能
    mountedKnowledgeBases,
    addKnowledgeBase,
    removeKnowledgeBase,
    updateConfig,
    getKnowledgeBase,
    getConfig,
    generateKnowledgeManifest,
    generateGovernancePolicies,
    hasLongTermMemory,
    
    // RAG 决策引擎
    isMatching,
    ragDecision,
    analyzeForKnowledge,
    handleUserSelection,
    handleSkipKnowledge,
    resetDecision,
    triggerAutoProfile,
    addFromMatch,
    
    // 便捷判断
    isAutoMount: ragDecision?.decision === 'auto_mount',
    needsUserDecision: ragDecision?.isDecisionPending && ragDecision?.decision === 'ask_user',
    suggestUpload: ragDecision?.decision === 'suggest_upload',
  };
}
