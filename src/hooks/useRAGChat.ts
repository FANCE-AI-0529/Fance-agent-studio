import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Citation } from "@/components/runtime/CitationCard";
import type { TraceEventType, TraceEventData } from "@/components/runtime/trace/traceTypes";

export type RAGRetrievalMode = "vector" | "graph" | "hybrid";

export interface RAGChatOptions {
  knowledgeBaseIds: string[];
  retrievalMode: RAGRetrievalMode;
  topK: number;
  graphDepth: number;
}

export interface RAGSearchResult {
  citations: Citation[];
  enrichedContext: string;
  traceEvents: { type: TraceEventType; data: TraceEventData }[];
  stats: {
    chunksFound: number;
    entitiesMatched: number;
    edgesTraversed: number;
  };
}

interface GraphSearchResponse {
  vectorResults: Array<{
    id: string;
    content: string;
    similarity: number;
    document_id: string;
    metadata?: {
      page?: number;
      document_name?: string;
    };
  }>;
  graphContext: {
    anchorNodes: Array<{
      id: string;
      name: string;
      node_type: string;
      description?: string;
      chunk_id?: string;
    }>;
    expandedNodes: Array<{
      node_id: string;
      node_name: string;
      node_type: string;
      relation_path: string;
      depth: number;
    }>;
    edges: Array<{
      id: string;
      source_node_id: string;
      target_node_id: string;
      relation_type: string;
      source_name?: string;
      target_name?: string;
    }>;
  };
  enrichedContext: string;
  stats: {
    chunksFound: number;
    anchorNodesFound: number;
    expandedNodesFound: number;
    edgesFound: number;
  };
}

export function useRAGChat() {
  const [isSearching, setIsSearching] = useState(false);
  const [lastResult, setLastResult] = useState<RAGSearchResult | null>(null);

  /**
   * Perform RAG search before sending a message
   */
  const searchRAG = useCallback(
    async (
      query: string,
      options: RAGChatOptions,
      knowledgeBaseName?: string
    ): Promise<RAGSearchResult | null> => {
      if (options.knowledgeBaseIds.length === 0) {
        return null;
      }

      setIsSearching(true);
      const traceEvents: { type: TraceEventType; data: TraceEventData }[] = [];
      let allCitations: Citation[] = [];
      let combinedContext = "";
      let totalStats = { chunksFound: 0, entitiesMatched: 0, edgesTraversed: 0 };

      try {
        // Search each knowledge base
        for (const kbId of options.knowledgeBaseIds) {
          // Add trace event for vector search start
          traceEvents.push({
            type: "rag_vector_search",
            data: {
              ragKnowledgeBaseId: kbId,
              ragKnowledgeBaseName: knowledgeBaseName,
              message: `Searching knowledge base...`,
            },
          });

          const { data, error } = await supabase.functions.invoke<GraphSearchResponse>(
            "graph-search",
            {
              body: {
                query,
                knowledgeBaseId: kbId,
                topK: options.topK,
                graphDepth: options.retrievalMode === "vector" ? 0 : options.graphDepth,
              },
            }
          );

          if (error) {
            console.error("RAG search error:", error);
            continue;
          }

          if (!data) continue;

          // Map vector results to citations
          const citations: Citation[] = data.vectorResults.map((chunk) => ({
            id: chunk.id,
            chunkId: chunk.id,
            content: chunk.content.slice(0, 300) + (chunk.content.length > 300 ? "..." : ""),
            similarity: chunk.similarity,
            documentId: chunk.document_id,
            documentName: chunk.metadata?.document_name || "未知文档",
            pageNumber: chunk.metadata?.page,
            knowledgeBaseName: knowledgeBaseName || "知识库",
            relatedNodes: data.graphContext.anchorNodes
              .filter((n) => n.chunk_id === chunk.id)
              .map((n) => ({
                id: n.id,
                name: n.name,
                type: n.node_type,
              })),
          }));

          allCitations = [...allCitations, ...citations];
          combinedContext += data.enrichedContext + "\n\n";

          // Update stats
          totalStats.chunksFound += data.stats.chunksFound;
          totalStats.entitiesMatched += data.stats.anchorNodesFound;
          totalStats.edgesTraversed += data.stats.edgesFound;

          // Add trace events for found chunks
          if (data.vectorResults.length > 0) {
            traceEvents.push({
              type: "rag_source_found",
              data: {
                ragChunksCount: data.vectorResults.length,
                message: `Found ${data.vectorResults.length} relevant chunks`,
              },
            });
          }

          // Add entity match events
          data.graphContext.anchorNodes.forEach((node) => {
            traceEvents.push({
              type: "rag_entity_match",
              data: {
                ragNodeId: node.id,
                ragNodeName: node.name,
                ragNodeType: node.node_type,
              },
            });
          });

          // Add graph traversal events
          if (options.retrievalMode !== "vector") {
            data.graphContext.edges.slice(0, 5).forEach((edge) => {
              const sourceNode = data.graphContext.anchorNodes.find(
                (n) => n.id === edge.source_node_id
              );
              const targetNode =
                data.graphContext.anchorNodes.find((n) => n.id === edge.target_node_id) ||
                data.graphContext.expandedNodes.find((n) => n.node_id === edge.target_node_id);

              if (sourceNode && targetNode) {
                traceEvents.push({
                  type: "rag_graph_traverse",
                  data: {
                    ragRelationPath: `"${sourceNode.name}" → "${edge.relation_type}" → "${
                      "node_name" in targetNode ? targetNode.node_name : targetNode.name
                    }"`,
                    ragTraversalDepth: "depth" in targetNode ? targetNode.depth : 1,
                  },
                });
              }
            });
          }

          // Add context injection event
          traceEvents.push({
            type: "rag_context_inject",
            data: {
              ragChunksCount: data.stats.chunksFound,
              ragNodesCount: data.stats.anchorNodesFound + data.stats.expandedNodesFound,
              message: `Context enriched with ${data.stats.chunksFound} chunks and ${
                data.stats.anchorNodesFound + data.stats.expandedNodesFound
              } graph nodes`,
            },
          });
        }

        const result: RAGSearchResult = {
          citations: allCitations,
          enrichedContext: combinedContext,
          traceEvents,
          stats: totalStats,
        };

        setLastResult(result);
        return result;
      } catch (error) {
        console.error("RAG search failed:", error);
        return null;
      } finally {
        setIsSearching(false);
      }
    },
    []
  );

  /**
   * Build system prompt with RAG context
   */
  const buildEnrichedPrompt = useCallback(
    (basePrompt: string, ragContext: string): string => {
      if (!ragContext) return basePrompt;

      return `${basePrompt}

## 知识库检索结果

以下是从知识库中检索到的相关信息，请基于这些信息回答用户问题：

${ragContext}

请注意：
1. 优先使用上述知识库中的信息回答问题
2. 如果知识库信息不足以回答问题，可以结合自身知识补充，但需注明
3. 回答时引用相关来源以增加可信度`;
    },
    []
  );

  return {
    searchRAG,
    buildEnrichedPrompt,
    isSearching,
    lastResult,
  };
}
