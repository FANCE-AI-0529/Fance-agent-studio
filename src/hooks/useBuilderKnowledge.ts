import { useState, useCallback } from "react";

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

  const addKnowledgeBase = useCallback((kb: Omit<MountedKnowledgeBase, 'config'>) => {
    setMountedKnowledgeBases((prev) => {
      // Prevent duplicates
      if (prev.some((item) => item.id === kb.id)) {
        return prev;
      }
      return [...prev, { ...kb, config: { ...defaultConfig } }];
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
    mountedKnowledgeBases,
    addKnowledgeBase,
    removeKnowledgeBase,
    updateConfig,
    getKnowledgeBase,
    getConfig,
    generateKnowledgeManifest,
    generateGovernancePolicies,
    hasLongTermMemory,
  };
}
