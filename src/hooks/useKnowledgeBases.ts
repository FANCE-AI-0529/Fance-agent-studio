import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface KnowledgeBase {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  department: string | null;
  index_status: "pending" | "indexing" | "ready" | "failed";
  embedding_model: string;
  chunk_size: number;
  chunk_overlap: number;
  documents_count: number;
  chunks_count: number;
  nodes_count: number;
  edges_count: number;
  graph_enabled: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeBaseInput {
  name: string;
  description?: string;
  department?: string;
  embedding_model?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateKnowledgeBaseInput {
  id: string;
  name?: string;
  description?: string;
  department?: string;
  embedding_model?: string;
  chunk_size?: number;
  chunk_overlap?: number;
  metadata?: Record<string, unknown>;
}

export function useKnowledgeBases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["knowledge-bases", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("knowledge_bases")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as KnowledgeBase[];
    },
    enabled: !!user?.id,
  });
}

export function useKnowledgeBase(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["knowledge-base", id],
    queryFn: async () => {
      if (!id || !user?.id) return null;

      const { data, error } = await supabase
        .from("knowledge_bases")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      return data as KnowledgeBase;
    },
    enabled: !!id && !!user?.id,
  });
}

export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateKnowledgeBaseInput) => {
      if (!user?.id) throw new Error("用户未登录");

      const { data, error } = await supabase
        .from("knowledge_bases")
        .insert({
          name: input.name,
          description: input.description,
          department: input.department,
          embedding_model: input.embedding_model,
          chunk_size: input.chunk_size,
          chunk_overlap: input.chunk_overlap,
          metadata: input.metadata as Record<string, never>,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as KnowledgeBase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      toast.success("知识库创建成功");
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });
}

export function useUpdateKnowledgeBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateKnowledgeBaseInput) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.department !== undefined) updateData.department = input.department;
      if (input.embedding_model !== undefined) updateData.embedding_model = input.embedding_model;
      if (input.chunk_size !== undefined) updateData.chunk_size = input.chunk_size;
      if (input.chunk_overlap !== undefined) updateData.chunk_overlap = input.chunk_overlap;
      if (input.metadata !== undefined) updateData.metadata = input.metadata;

      const { data, error } = await supabase
        .from("knowledge_bases")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as KnowledgeBase;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-base", data.id] });
      toast.success("知识库更新成功");
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });
}

export function useDeleteKnowledgeBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("knowledge_bases")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      toast.success("知识库已删除");
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
}
