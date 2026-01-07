import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface KnowledgeDocument {
  id: string;
  knowledge_base_id: string;
  user_id: string;
  name: string;
  source_type: "upload" | "url" | "paste";
  source_url: string | null;
  content: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: "pending" | "processing" | "indexed" | "failed";
  chunks_count: number;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateDocumentInput {
  knowledge_base_id: string;
  name: string;
  source_type: "upload" | "url" | "paste";
  source_url?: string;
  content?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string;
  metadata?: Record<string, unknown>;
}

export function useKnowledgeDocuments(knowledgeBaseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["knowledge-documents", knowledgeBaseId],
    queryFn: async () => {
      if (!knowledgeBaseId || !user?.id) return [];

      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("*")
        .eq("knowledge_base_id", knowledgeBaseId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as KnowledgeDocument[];
    },
    enabled: !!knowledgeBaseId && !!user?.id,
  });
}

export function useKnowledgeDocument(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["knowledge-document", id],
    queryFn: async () => {
      if (!id || !user?.id) return null;

      const { data, error } = await supabase
        .from("knowledge_documents")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as KnowledgeDocument;
    },
    enabled: !!id && !!user?.id,
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateDocumentInput) => {
      if (!user?.id) throw new Error("用户未登录");

      const { data, error } = await supabase
        .from("knowledge_documents")
        .insert({
          knowledge_base_id: input.knowledge_base_id,
          name: input.name,
          source_type: input.source_type,
          source_url: input.source_url,
          content: input.content,
          file_path: input.file_path,
          file_size: input.file_size,
          mime_type: input.mime_type,
          metadata: input.metadata as Record<string, never>,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as KnowledgeDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ["knowledge-documents", data.knowledge_base_id] 
      });
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      toast.success("文档添加成功");
    },
    onError: (error) => {
      toast.error(`添加失败: ${error.message}`);
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, knowledgeBaseId }: { id: string; knowledgeBaseId: string }) => {
      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { knowledgeBaseId };
    },
    onSuccess: ({ knowledgeBaseId }) => {
      queryClient.invalidateQueries({ 
        queryKey: ["knowledge-documents", knowledgeBaseId] 
      });
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      toast.success("文档已删除");
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
}

export function useIngestDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data, error } = await supabase.functions.invoke("rag-ingest", {
        body: { documentId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, documentId) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-document", documentId] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-documents"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      toast.success("文档索引已启动");
    },
    onError: (error) => {
      toast.error(`索引失败: ${error.message}`);
    },
  });
}
