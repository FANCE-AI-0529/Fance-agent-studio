/**
 * @file useKnowledgeDocuments.ts
 * @description 知识文档管理钩子，提供知识库文档的增删查及索引触发功能
 * @module Hooks/Knowledge
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * 知识文档接口
 * 
 * 定义知识文档实体的完整数据结构。
 */
export interface KnowledgeDocument {
  /** 文档唯一标识 */
  id: string;
  /** 所属知识库ID */
  knowledge_base_id: string;
  /** 所属用户ID */
  user_id: string;
  /** 文档名称 */
  name: string;
  /** 来源类型 */
  source_type: "upload" | "url" | "paste";
  /** 来源URL */
  source_url: string | null;
  /** 文档内容 */
  content: string | null;
  /** 存储路径 */
  file_path: string | null;
  /** 文件大小（字节） */
  file_size: number | null;
  /** MIME类型 */
  mime_type: string | null;
  /** 处理状态 */
  status: "pending" | "processing" | "indexed" | "failed";
  /** 分块数量 */
  chunks_count: number;
  /** 错误信息 */
  error_message: string | null;
  /** 元数据 */
  metadata: Record<string, unknown>;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

/**
 * 创建文档输入接口
 * 
 * 定义创建文档时需要提供的参数。
 */
export interface CreateDocumentInput {
  /** 所属知识库ID（必填） */
  knowledge_base_id: string;
  /** 文档名称（必填） */
  name: string;
  /** 来源类型（必填） */
  source_type: "upload" | "url" | "paste";
  /** 来源URL */
  source_url?: string;
  /** 文档内容 */
  content?: string;
  /** 存储路径 */
  file_path?: string;
  /** 文件大小 */
  file_size?: number;
  /** MIME类型 */
  mime_type?: string;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 获取知识库文档列表钩子
 * 
 * 查询指定知识库下的所有文档，按创建时间倒序排列。
 * 
 * @param {string | undefined} knowledgeBaseId - 知识库ID
 * @returns {UseQueryResult} - 包含文档列表的查询结果
 */
export function useKnowledgeDocuments(knowledgeBaseId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["knowledge-documents", knowledgeBaseId],
    queryFn: async () => {
      if (!knowledgeBaseId || !user?.id) return [];

      // [查询]：获取指定知识库的所有文档
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

/**
 * 获取单个文档详情钩子
 * 
 * 根据ID查询特定文档的详细信息。
 * 
 * @param {string | undefined} id - 文档ID
 * @returns {UseQueryResult} - 包含文档详情的查询结果
 */
export function useKnowledgeDocument(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["knowledge-document", id],
    queryFn: async () => {
      if (!id || !user?.id) return null;

      // [查询]：获取指定文档
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

/**
 * 创建文档钩子
 * 
 * 提供添加新文档到知识库的变更操作。
 * 
 * @returns {UseMutationResult} - 创建操作的变更结果
 */
export function useCreateDocument() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateDocumentInput) => {
      // [验证]：检查用户登录状态
      if (!user?.id) throw new Error("用户未登录");

      // [插入]：创建文档记录
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
      // [刷新]：更新相关缓存
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

/**
 * 删除文档钩子
 * 
 * 提供从知识库中删除文档的变更操作。
 * 
 * @returns {UseMutationResult} - 删除操作的变更结果
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, knowledgeBaseId }: { id: string; knowledgeBaseId: string }) => {
      // [查询]：获取文档信息以清理 Storage 文件
      const { data: doc } = await supabase
        .from("knowledge_documents")
        .select("file_path")
        .eq("id", id)
        .single();

      // [清理]：删除 Storage 中的文件
      if (doc?.file_path) {
        await supabase.storage
          .from("knowledge-documents")
          .remove([doc.file_path]);
      }

      // [删除]：执行删除操作
      const { error } = await supabase
        .from("knowledge_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { knowledgeBaseId };
    },
    onSuccess: ({ knowledgeBaseId }) => {
      // [刷新]：更新相关缓存
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

/**
 * 触发文档索引钩子
 */
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

/**
 * 文档状态实时订阅钩子
 * 
 * 监听 knowledge_documents 表的实时更新，当文档状态变化时自动刷新缓存。
 */
export function useDocumentRealtimeUpdates(knowledgeBaseId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!knowledgeBaseId) return;

    const channel = supabase
      .channel(`kb-docs-${knowledgeBaseId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "knowledge_documents",
          filter: `knowledge_base_id=eq.${knowledgeBaseId}`,
        },
        (payload) => {
          const newStatus = payload.new?.status;
          if (newStatus === "indexed" || newStatus === "failed") {
            queryClient.invalidateQueries({ queryKey: ["knowledge-documents", knowledgeBaseId] });
            queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [knowledgeBaseId, queryClient]);
}
