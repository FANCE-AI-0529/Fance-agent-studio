import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RAGQueryInput {
  query: string;
  knowledgeBaseId?: string;
  topK?: number;
  threshold?: number;
}

export interface RAGChunk {
  id: string;
  document_id: string;
  knowledge_base_id: string;
  content: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface RAGQueryResult {
  chunks: RAGChunk[];
  context: string;
  tokenCount: number;
}

export function useRAGQuery() {
  return useMutation({
    mutationFn: async (input: RAGQueryInput): Promise<RAGQueryResult> => {
      const { data, error } = await supabase.functions.invoke("rag-query", {
        body: {
          query: input.query,
          knowledgeBaseId: input.knowledgeBaseId,
          topK: input.topK || 5,
          threshold: input.threshold || 0.7,
        },
      });

      if (error) throw error;
      return data as RAGQueryResult;
    },
    onError: (error) => {
      toast.error(`查询失败: ${error.message}`);
    },
  });
}

export function useEmbedText() {
  return useMutation({
    mutationFn: async (text: string): Promise<number[]> => {
      const { data, error } = await supabase.functions.invoke("embed-text", {
        body: { text },
      });

      if (error) throw error;
      return data.embedding as number[];
    },
    onError: (error) => {
      toast.error(`嵌入失败: ${error.message}`);
    },
  });
}
