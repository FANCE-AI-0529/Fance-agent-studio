/**
 * @file useKnowledgeBases.ts
 * @description 知识库管理钩子，提供知识库的增删改查功能
 * @module Hooks/Knowledge
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * 知识库接口
 * 
 * 定义知识库实体的完整数据结构。
 */
export interface KnowledgeBase {
  /** 知识库唯一标识 */
  id: string;
  /** 所属用户ID */
  user_id: string;
  /** 知识库名称 */
  name: string;
  /** 知识库描述 */
  description: string | null;
  /** 所属部门 */
  department: string | null;
  /** 索引状态 */
  index_status: "pending" | "indexing" | "ready" | "failed";
  /** 嵌入模型名称 */
  embedding_model: string;
  /** 分块大小 */
  chunk_size: number;
  /** 分块重叠大小 */
  chunk_overlap: number;
  /** 文档数量 */
  documents_count: number;
  /** 分块数量 */
  chunks_count: number;
  /** 图谱节点数量 */
  nodes_count: number;
  /** 图谱边数量 */
  edges_count: number;
  /** 是否启用图谱 */
  graph_enabled: boolean;
  /** 元数据 */
  metadata: Record<string, unknown>;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

/**
 * 创建知识库输入接口
 * 
 * 定义创建知识库时需要提供的参数。
 */
export interface CreateKnowledgeBaseInput {
  /** 知识库名称（必填） */
  name: string;
  /** 知识库描述 */
  description?: string;
  /** 所属部门 */
  department?: string;
  /** 嵌入模型名称 */
  embedding_model?: string;
  /** 分块大小 */
  chunk_size?: number;
  /** 分块重叠大小 */
  chunk_overlap?: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 更新知识库输入接口
 * 
 * 定义更新知识库时可修改的字段。
 */
export interface UpdateKnowledgeBaseInput {
  /** 知识库ID（必填） */
  id: string;
  /** 知识库名称 */
  name?: string;
  /** 知识库描述 */
  description?: string;
  /** 所属部门 */
  department?: string;
  /** 嵌入模型名称 */
  embedding_model?: string;
  /** 分块大小 */
  chunk_size?: number;
  /** 分块重叠大小 */
  chunk_overlap?: number;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 获取知识库列表钩子
 * 
 * 查询当前用户的所有知识库，按创建时间倒序排列。
 * 
 * @returns {UseQueryResult} - 包含知识库列表的查询结果
 */
export function useKnowledgeBases() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["knowledge-bases", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // [查询]：获取用户的所有知识库
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

/**
 * 获取单个知识库钩子
 * 
 * 根据ID查询特定知识库的详细信息。
 * 
 * @param {string | undefined} id - 知识库ID
 * @returns {UseQueryResult} - 包含知识库详情的查询结果
 */
export function useKnowledgeBase(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["knowledge-base", id],
    queryFn: async () => {
      if (!id || !user?.id) return null;

      // [查询]：获取指定知识库
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

/**
 * 创建知识库钩子
 * 
 * 提供创建新知识库的变更操作。
 * 
 * @returns {UseMutationResult} - 创建操作的变更结果
 */
export function useCreateKnowledgeBase() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateKnowledgeBaseInput) => {
      // [验证]：检查用户登录状态
      if (!user?.id) throw new Error("用户未登录");

      // [插入]：创建知识库记录
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
      // [刷新]：更新知识库列表缓存
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      toast.success("知识库创建成功");
    },
    onError: (error) => {
      toast.error(`创建失败: ${error.message}`);
    },
  });
}

/**
 * 更新知识库钩子
 * 
 * 提供更新现有知识库的变更操作。
 * 
 * @returns {UseMutationResult} - 更新操作的变更结果
 */
export function useUpdateKnowledgeBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateKnowledgeBaseInput) => {
      // [构建]：组装更新数据
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

      // [更新]：执行更新操作
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
      // [刷新]：更新相关缓存
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      queryClient.invalidateQueries({ queryKey: ["knowledge-base", data.id] });
      toast.success("知识库更新成功");
    },
    onError: (error) => {
      toast.error(`更新失败: ${error.message}`);
    },
  });
}

/**
 * 删除知识库钩子
 * 
 * 提供删除知识库的变更操作。
 * 
 * @returns {UseMutationResult} - 删除操作的变更结果
 */
export function useDeleteKnowledgeBase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // [清理]：删除 Storage 中的知识库文件目录
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: files } = await supabase.storage
          .from("knowledge-documents")
          .list(`${user.id}/${id}`);
        if (files && files.length > 0) {
          await supabase.storage
            .from("knowledge-documents")
            .remove(files.map(f => `${user.id}/${id}/${f.name}`));
        }
      }

      // [删除]：执行删除操作
      const { error } = await supabase
        .from("knowledge_bases")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      // [刷新]：更新知识库列表缓存
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
      toast.success("知识库已删除");
    },
    onError: (error) => {
      toast.error(`删除失败: ${error.message}`);
    },
  });
}
