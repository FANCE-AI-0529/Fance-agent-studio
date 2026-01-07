import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface KnowledgeNode {
  id: string;
  knowledge_base_id: string;
  document_id: string | null;
  chunk_id: string | null;
  user_id: string;
  name: string;
  node_type: string;
  description: string | null;
  source_content: string | null;
  importance_score: number;
  occurrence_count: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeEdge {
  id: string;
  knowledge_base_id: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  description: string | null;
  strength: number;
  is_bidirectional: boolean;
  source_content: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface GraphSearchResult {
  vectorResults: Array<{
    id: string;
    content: string;
    similarity: number;
  }>;
  graphContext: {
    anchorNodes: KnowledgeNode[];
    expandedNodes: Array<{
      node_id: string;
      node_name: string;
      node_type: string;
      description: string;
      relation_path: string;
      depth: number;
    }>;
    edges: KnowledgeEdge[];
  };
  enrichedContext: string;
  stats: {
    chunksFound: number;
    anchorNodesFound: number;
    expandedNodesFound: number;
    edgesFound: number;
  };
}

export function useKnowledgeNodes(knowledgeBaseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["knowledge-nodes", knowledgeBaseId],
    queryFn: async () => {
      if (!knowledgeBaseId || !user) return [];

      const { data, error } = await supabase
        .from("knowledge_nodes")
        .select("*")
        .eq("knowledge_base_id", knowledgeBaseId)
        .eq("user_id", user.id)
        .order("importance_score", { ascending: false });

      if (error) throw error;
      return data as KnowledgeNode[];
    },
    enabled: !!knowledgeBaseId && !!user,
  });
}

export function useKnowledgeEdges(knowledgeBaseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["knowledge-edges", knowledgeBaseId],
    queryFn: async () => {
      if (!knowledgeBaseId || !user) return [];

      const { data, error } = await supabase
        .from("knowledge_edges")
        .select("*")
        .eq("knowledge_base_id", knowledgeBaseId)
        .eq("user_id", user.id);

      if (error) throw error;
      return data as KnowledgeEdge[];
    },
    enabled: !!knowledgeBaseId && !!user,
  });
}

export function useGenerateGraph() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      knowledgeBaseId, 
      documentId 
    }: { 
      knowledgeBaseId: string; 
      documentId?: string 
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("graph-extract", {
        body: { knowledgeBaseId, documentId },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-nodes", variables.knowledgeBaseId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-edges", variables.knowledgeBaseId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      toast.success(`图谱生成完成: ${data.nodesCreated} 节点, ${data.edgesCreated} 关系`);
    },
    onError: (error: Error) => {
      toast.error(`图谱生成失败: ${error.message}`);
    },
  });
}

export function useGraphSearch() {
  return useMutation({
    mutationFn: async ({
      query,
      knowledgeBaseId,
      topK = 5,
      graphDepth = 2,
    }: {
      query: string;
      knowledgeBaseId: string;
      topK?: number;
      graphDepth?: number;
    }): Promise<GraphSearchResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("graph-search", {
        body: { query, knowledgeBaseId, topK, graphDepth },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onError: (error: Error) => {
      toast.error(`搜索失败: ${error.message}`);
    },
  });
}

export function useDeleteKnowledgeNode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nodeId: string) => {
      const { error } = await supabase
        .from("knowledge_nodes")
        .delete()
        .eq("id", nodeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-nodes"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-edges"] });
      toast.success("节点已删除");
    },
    onError: (error: Error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
}

// Node type styling configuration
export const nodeTypeStyles: Record<string, { color: string; bgColor: string; label: string }> = {
  person: { color: "#22c55e", bgColor: "#22c55e20", label: "人物" },
  organization: { color: "#3b82f6", bgColor: "#3b82f620", label: "组织" },
  concept: { color: "#f59e0b", bgColor: "#f59e0b20", label: "概念" },
  location: { color: "#a855f7", bgColor: "#a855f720", label: "位置" },
  event: { color: "#ef4444", bgColor: "#ef444420", label: "事件" },
  product: { color: "#06b6d4", bgColor: "#06b6d420", label: "产品" },
  technology: { color: "#78716c", bgColor: "#78716c20", label: "技术" },
};

// Relation type labels
export const relationTypeLabels: Record<string, string> = {
  manages: "管理",
  belongs_to: "属于",
  uses: "使用",
  causes: "导致",
  relates_to: "关联",
  follows: "跟随",
  creates: "创建",
  contains: "包含",
};