/**
 * @file useAgentApi.ts
 * @description 智能体 API 密钥管理钩子模块，提供 API 密钥的创建、查询、更新、删除及调用日志统计功能
 * @module Hooks/AgentApi
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * 智能体 API 密钥数据结构
 * 定义存储在数据库中的 API 密钥完整字段
 */
interface AgentApiKey {
  /** 密钥唯一标识符 */
  id: string;
  /** 关联的智能体ID */
  agent_id: string;
  /** 密钥所属用户ID */
  user_id: string;
  /** 密钥名称（用于识别用途） */
  name: string;
  /** 密钥前缀（用于显示，如 "agos_abc123..."） */
  api_key_prefix: string;
  /** 密钥是否激活 */
  is_active: boolean;
  /** 速率限制（每分钟请求数） */
  rate_limit: number;
  /** 累计调用次数 */
  total_calls: number;
  /** 最后使用时间 */
  last_used_at: string | null;
  /** 过期时间 */
  expires_at: string | null;
  /** 创建时间 */
  created_at: string;
  /** 更新时间 */
  updated_at: string;
}

/**
 * 计算 API 密钥的 SHA-256 哈希值
 * 
 * 使用浏览器原生 Web Crypto API 对密钥进行安全哈希处理，
 * 确保明文密钥不会被存储在数据库中。
 * 
 * @param {string} apiKey - 需要哈希的原始 API 密钥
 * @returns {Promise<string>} 返回十六进制格式的哈希字符串
 */
async function hashApiKey(apiKey: string): Promise<string> {
  // [编码]：将字符串转换为 UTF-8 字节数组
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  
  // [哈希]：使用 SHA-256 算法计算哈希值
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  
  // [转换]：将哈希缓冲区转换为十六进制字符串
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * API 调用日志数据结构
 * 记录每次 API 调用的详细信息
 */
interface AgentApiLog {
  /** 日志唯一标识符 */
  id: string;
  /** 使用的 API 密钥ID */
  api_key_id: string;
  /** 调用的智能体ID */
  agent_id: string;
  /** 调用用户ID */
  user_id: string;
  /** 请求体内容 */
  request_body: any;
  /** 响应体内容 */
  response_body: any;
  /** HTTP 状态码 */
  status_code: number;
  /** 响应延迟（毫秒） */
  latency_ms: number | null;
  /** 消耗的 Token 数量 */
  tokens_used: number | null;
  /** 错误信息（如有） */
  error_message: string | null;
  /** 客户端 IP 地址 */
  ip_address: string | null;
  /** 调用时间 */
  created_at: string;
}

/**
 * 生成安全的随机 API 密钥
 * 
 * 使用加密安全的随机数生成器创建 32 位密钥，
 * 密钥格式为 "agos_" 前缀加 Base64 编码的随机字符串。
 * 
 * @returns {string} 返回格式化的 API 密钥字符串
 */
function generateApiKey(): string {
  // [随机]：生成 24 字节的加密安全随机数
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  
  // [编码]：转换为 Base64 并清理特殊字符
  const base64 = btoa(String.fromCharCode(...array));
  
  // [格式化]：添加 agos_ 前缀，截取 32 位有效字符
  return "agos_" + base64.replace(/[+/=]/g, "").substring(0, 32);
}

/**
 * 获取指定智能体的所有 API 密钥
 * 
 * 该钩子函数查询当前用户在指定智能体下创建的所有 API 密钥，
 * 结果按创建时间降序排列。
 * 
 * @param {string | null} agentId - 智能体唯一标识符
 * @returns {UseQueryResult<AgentApiKey[]>} 包含 API 密钥列表的查询结果
 */
export function useAgentApiKeys(agentId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agent-api-keys", agentId],
    queryFn: async () => {
      // [校验]：智能体ID或用户为空时返回空数组
      if (!agentId || !user) return [];
      
      // [查询]：获取当前用户在该智能体下的所有密钥
      const { data, error } = await supabase
        .from("agent_api_keys")
        .select("*")
        .eq("agent_id", agentId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as AgentApiKey[];
    },
    // [条件]：仅在智能体ID和用户都有效时启用
    enabled: !!agentId && !!user,
  });
}

/**
 * 新创建的 API 密钥返回结构
 * 包含完整的密钥字符串（仅在创建时显示一次）
 */
interface CreatedApiKeyResult extends Omit<AgentApiKey, 'api_key_prefix'> {
  /** 完整的 API 密钥（仅创建时返回） */
  api_key: string;
  /** 密钥前缀（用于后续显示） */
  api_key_prefix: string;
}

/**
 * 创建新的 API 密钥
 * 
 * 该钩子函数生成新的 API 密钥并存储其哈希值到数据库，
 * 创建成功后会返回完整密钥供用户复制保存（仅显示一次）。
 * 
 * @returns {UseMutationResult<CreatedApiKeyResult>} 包含创建操作的变更结果
 */
export function useCreateAgentApiKey() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      agentId, 
      name = "Default API Key",
      rateLimit = 100,
      expiresAt = null as string | null
    }: { 
      /** 关联的智能体ID */
      agentId: string; 
      /** 密钥名称 */
      name?: string;
      /** 速率限制（每分钟请求数） */
      rateLimit?: number;
      /** 过期时间（ISO格式） */
      expiresAt?: string | null;
    }): Promise<CreatedApiKeyResult> => {
      // [校验]：确保用户已认证
      if (!user) throw new Error("User not authenticated");

      // [生成]：创建随机密钥
      const apiKey = generateApiKey();
      
      // [哈希]：计算密钥的 SHA-256 哈希值
      const apiKeyHash = await hashApiKey(apiKey);
      
      // [前缀]：提取前 12 位用于显示
      const apiKeyPrefix = apiKey.substring(0, 12) + "...";

      // [存储]：将密钥信息写入数据库
      const { data, error } = await supabase
        .from("agent_api_keys")
        .insert({
          agent_id: agentId,
          user_id: user.id,
          name,
          api_key: apiKey,
          api_key_hash: apiKeyHash,
          api_key_prefix: apiKeyPrefix,
          rate_limit: rateLimit,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;
      
      // [返回]：包含完整密钥供一次性显示
      return {
        ...data,
        api_key: apiKey,
      } as CreatedApiKeyResult;
    },
    onSuccess: (data) => {
      // [刷新]：使相关缓存失效
      queryClient.invalidateQueries({ queryKey: ["agent-api-keys", data.agent_id] });
      // [提示]：警告用户密钥仅显示一次
      toast.success("API 密钥已创建 - 请立即复制保存，此密钥仅显示一次！");
    },
    onError: (error) => {
      toast.error("创建 API 密钥失败");
    },
  });
}

/**
 * 更新 API 密钥配置
 * 
 * 该钩子函数允许修改 API 密钥的名称、状态、速率限制和过期时间等属性。
 * 
 * @returns {UseMutationResult<AgentApiKey>} 包含更新操作的变更结果
 */
export function useUpdateAgentApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      name,
      isActive,
      rateLimit,
      expiresAt
    }: { 
      /** 密钥ID */
      id: string;
      /** 新名称 */
      name?: string;
      /** 激活状态 */
      isActive?: boolean;
      /** 速率限制 */
      rateLimit?: number;
      /** 过期时间 */
      expiresAt?: string | null;
    }) => {
      // [构建]：组装更新字段对象
      const updates: any = { updated_at: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (isActive !== undefined) updates.is_active = isActive;
      if (rateLimit !== undefined) updates.rate_limit = rateLimit;
      if (expiresAt !== undefined) updates.expires_at = expiresAt;

      // [更新]：执行数据库更新操作
      const { data, error } = await supabase
        .from("agent_api_keys")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as AgentApiKey;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["agent-api-keys", data.agent_id] });
      toast.success("API 密钥已更新");
    },
    onError: (error) => {
      toast.error("更新 API 密钥失败");
    },
  });
}

/**
 * 删除 API 密钥
 * 
 * 该钩子函数从数据库中永久删除指定的 API 密钥，
 * 删除后该密钥将立即失效，无法再用于 API 调用。
 * 
 * @returns {UseMutationResult} 包含删除操作的变更结果
 */
export function useDeleteAgentApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, agentId }: { id: string; agentId: string }) => {
      // [删除]：根据ID删除密钥记录
      const { error } = await supabase
        .from("agent_api_keys")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, agentId };
    },
    onSuccess: ({ agentId }) => {
      queryClient.invalidateQueries({ queryKey: ["agent-api-keys", agentId] });
      toast.success("API 密钥已删除");
    },
    onError: (error) => {
      toast.error("删除 API 密钥失败");
    },
  });
}

/**
 * 获取 API 调用日志
 * 
 * 该钩子函数查询指定 API 密钥的调用历史记录，
 * 用于监控和调试 API 使用情况。
 * 
 * @param {string | null} apiKeyId - API 密钥ID
 * @param {number} limit - 返回记录数量上限，默认50条
 * @returns {UseQueryResult<AgentApiLog[]>} 包含调用日志的查询结果
 */
export function useAgentApiLogs(apiKeyId: string | null, limit = 50) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agent-api-logs", apiKeyId, limit],
    queryFn: async () => {
      if (!apiKeyId || !user) return [];
      
      // [查询]：获取指定密钥的调用日志，按时间降序
      const { data, error } = await supabase
        .from("agent_api_logs")
        .select("*")
        .eq("api_key_id", apiKeyId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as AgentApiLog[];
    },
    enabled: !!apiKeyId && !!user,
  });
}

/**
 * 获取智能体的 API 使用统计
 * 
 * 该钩子函数聚合指定智能体下所有 API 密钥的调用统计信息，
 * 包括密钥总数、调用总次数和最后使用时间。
 * 
 * @param {string | null} agentId - 智能体ID
 * @returns {UseQueryResult} 包含统计信息的查询结果
 */
export function useAgentApiStats(agentId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["agent-api-stats", agentId],
    queryFn: async () => {
      if (!agentId || !user) return null;
      
      // [查询]：获取该智能体的所有 API 密钥统计信息
      const { data: keys, error: keysError } = await supabase
        .from("agent_api_keys")
        .select("id, total_calls, last_used_at")
        .eq("agent_id", agentId)
        .eq("user_id", user.id);

      if (keysError) throw keysError;

      // [聚合]：计算总调用次数
      const totalCalls = keys?.reduce((sum, k) => sum + (k.total_calls || 0), 0) || 0;
      
      // [排序]：找出最近使用时间
      const lastUsed = keys
        ?.filter(k => k.last_used_at)
        ?.sort((a, b) => new Date(b.last_used_at!).getTime() - new Date(a.last_used_at!).getTime())[0]
        ?.last_used_at;

      return {
        /** API 密钥总数 */
        totalKeys: keys?.length || 0,
        /** 累计调用次数 */
        totalCalls,
        /** 最后使用时间 */
        lastUsed,
      };
    },
    enabled: !!agentId && !!user,
  });
}
