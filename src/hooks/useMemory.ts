/**
 * @file useMemory.ts
 * @description 用户记忆管理钩子，提供用户偏好、事实和上下文记忆的增删改查及上下文生成功能
 * @module Hooks/Memory
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 记忆实体接口
 * 
 * 定义用户记忆的完整数据结构。
 */
export interface Memory {
  /** 记忆唯一标识 */
  id: string;
  /** 所属用户ID */
  userId: string;
  /** 关联智能体ID（可选） */
  agentId?: string;
  /** 记忆类型 */
  memoryType: "preference" | "fact" | "context";
  /** 记忆键名 */
  key: string;
  /** 记忆值 */
  value: string;
  /** 重要程度（1-10） */
  importance: number;
  /** 来源类型 */
  source: "user_stated" | "inferred" | "system";
  /** 最后访问时间 */
  lastAccessed: Date;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 获取用户记忆列表钩子
 * 
 * 查询当前用户的所有记忆，支持按智能体筛选。
 * 按重要程度和最后访问时间倒序排列。
 * 
 * @param {string} agentId - 智能体ID（可选），传入时同时返回该智能体专属记忆和通用记忆
 * @returns {UseQueryResult} - 包含记忆列表的查询结果
 */
export function useUserMemories(agentId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-memories", user?.id, agentId],
    queryFn: async () => {
      if (!user) return [];

      // [构建查询]：按用户ID过滤，按重要程度和访问时间排序
      let query = supabase
        .from("user_memories")
        .select("*")
        .eq("user_id", user.id)
        .order("importance", { ascending: false })
        .order("last_accessed", { ascending: false });

      // [条件筛选]：若指定智能体，返回该智能体专属记忆和通用记忆
      if (agentId) {
        query = query.or(`agent_id.eq.${agentId},agent_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        return [];
      }

      // [数据转换]：转换为前端Memory接口格式
      return data.map((m) => ({
        id: m.id,
        userId: m.user_id,
        agentId: m.agent_id || undefined,
        memoryType: m.memory_type as Memory["memoryType"],
        key: m.key,
        value: m.value,
        importance: m.importance,
        source: m.source as Memory["source"],
        lastAccessed: new Date(m.last_accessed),
        createdAt: new Date(m.created_at),
        updatedAt: new Date(m.updated_at),
      })) as Memory[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

/**
 * 添加记忆钩子
 * 
 * 创建新的用户记忆条目。
 * 
 * @returns {UseMutationResult} - 添加操作的变更结果
 */
export function useAddMemory() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (memory: {
      agentId?: string;
      memoryType: Memory["memoryType"];
      key: string;
      value: string;
      importance?: number;
      source?: Memory["source"];
    }) => {
      // [验证]：检查用户登录状态
      if (!user) throw new Error("Must be logged in");

      // [插入]：创建记忆记录
      const { data, error } = await supabase
        .from("user_memories")
        .insert({
          user_id: user.id,
          agent_id: memory.agentId,
          memory_type: memory.memoryType,
          key: memory.key,
          value: memory.value,
          importance: memory.importance ?? 5,
          source: memory.source ?? "user_stated",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // [刷新]：更新记忆列表缓存
      queryClient.invalidateQueries({ queryKey: ["user-memories"] });
    },
  });
}

/**
 * 更新记忆钩子
 * 
 * 修改现有记忆条目的内容或属性。
 * 
 * @returns {UseMutationResult} - 更新操作的变更结果
 */
export function useUpdateMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (update: {
      id: string;
      key?: string;
      value?: string;
      importance?: number;
    }) => {
      // [构建]：组装更新数据
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (update.key !== undefined) updateData.key = update.key;
      if (update.value !== undefined) updateData.value = update.value;
      if (update.importance !== undefined) updateData.importance = update.importance;

      // [更新]：执行更新操作
      const { error } = await supabase
        .from("user_memories")
        .update(updateData)
        .eq("id", update.id);

      if (error) throw error;
    },
    onSuccess: () => {
      // [刷新]：更新记忆列表缓存
      queryClient.invalidateQueries({ queryKey: ["user-memories"] });
    },
  });
}

/**
 * 删除记忆钩子
 * 
 * 移除指定的记忆条目。
 * 
 * @returns {UseMutationResult} - 删除操作的变更结果
 */
export function useDeleteMemory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // [删除]：执行删除操作
      const { error } = await supabase
        .from("user_memories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      // [刷新]：更新记忆列表缓存
      queryClient.invalidateQueries({ queryKey: ["user-memories"] });
    },
  });
}

/**
 * 记录记忆访问钩子
 * 
 * 更新记忆的最后访问时间，用于访问频率追踪。
 * 
 * @returns {UseMutationResult} - 访问记录操作的变更结果
 */
export function useAccessMemory() {
  return useMutation({
    mutationFn: async (id: string) => {
      // [更新]：记录访问时间
      const { error } = await supabase
        .from("user_memories")
        .update({ last_accessed: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
  });
}

/**
 * 记忆上下文生成钩子
 * 
 * 从用户记忆和Manus工作文件生成AI提示上下文字符串。
 * 用于在对话中注入用户个性化信息。
 * 
 * @param {string} agentId - 智能体ID（可选）
 * @param {Array<{ filePath: string; content: string }>} manusFiles - Manus内存文件列表（可选）
 * @returns {Object} - 记忆数据及上下文生成函数
 * 
 * @example
 * ```tsx
 * const { generateContext, hasMemories } = useMemoryContext(agentId);
 * 
 * if (hasMemories) {
 *   const context = generateContext();
 *   // 将context注入到AI提示中
 * }
 * ```
 */
export function useMemoryContext(agentId?: string, manusFiles?: { filePath: string; content: string }[]) {
  const { data: memories = [] } = useUserMemories(agentId);

  /**
   * 生成上下文字符串
   * 
   * 将用户记忆和Manus文件整合为结构化的Markdown格式上下文。
   * 
   * @returns {string} - 格式化的上下文字符串
   */
  const generateContext = () => {
    const hasMemories = memories.length > 0;
    const hasManusFiles = manusFiles && manusFiles.length > 0;
    
    if (!hasMemories && !hasManusFiles) return "";

    let context = "";

    // [用户记忆部分]：按类型分组输出
    if (hasMemories) {
      const grouped = {
        preference: memories.filter((m) => m.memoryType === "preference"),
        fact: memories.filter((m) => m.memoryType === "fact"),
        context: memories.filter((m) => m.memoryType === "context"),
      };

      context += "## 用户记忆信息\n\n";

      // [偏好类记忆]
      if (grouped.preference.length > 0) {
        context += "### 用户偏好\n";
        grouped.preference.forEach((m) => {
          context += `- ${m.key}: ${m.value}\n`;
        });
        context += "\n";
      }

      // [事实类记忆]
      if (grouped.fact.length > 0) {
        context += "### 重要事实\n";
        grouped.fact.forEach((m) => {
          context += `- ${m.key}: ${m.value}\n`;
        });
        context += "\n";
      }

      // [上下文类记忆]
      if (grouped.context.length > 0) {
        context += "### 对话上下文\n";
        grouped.context.forEach((m) => {
          context += `- ${m.key}: ${m.value}\n`;
        });
        context += "\n";
      }
    }

    // [Manus文件部分]：添加智能体工作状态
    if (hasManusFiles) {
      context += "\n## 智能体工作状态\n\n";
      
      for (const file of manusFiles) {
        const fileName = file.filePath.split("/").pop() || file.filePath;
        context += `### ${fileName}\n`;
        // [截断处理]：限制每个文件内容长度避免上下文溢出
        const truncatedContent = file.content.length > 500 
          ? file.content.slice(0, 500) + "\n...(truncated)"
          : file.content;
        context += `${truncatedContent}\n\n`;
      }
    }

    return context;
  };

  return {
    /** 用户记忆列表 */
    memories,
    /** 生成上下文字符串 */
    generateContext,
    /** 是否有记忆数据 */
    hasMemories: memories.length > 0,
    /** 是否有Manus文件 */
    hasManusFiles: manusFiles && manusFiles.length > 0,
  };
}
