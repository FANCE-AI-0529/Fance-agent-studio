/**
 * @file useAgentClone.ts
 * @description 智能体复刻钩子模块，提供将公开智能体复制到当前用户账户的功能
 * @module Hooks/AgentClone
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * 智能体复刻钩子
 * 
 * 该钩子函数提供复刻公开智能体的功能，通过调用数据库存储过程
 * 将源智能体的配置、技能绑定等数据完整复制到当前用户账户下。
 * 复刻成功后自动跳转到构建器页面进行编辑。
 * 
 * @returns {UseMutationResult} 包含复刻操作的变更结果对象
 * 
 * @example
 * const cloneAgent = useAgentClone();
 * cloneAgent.mutate(sourceAgentId);
 */
export function useAgentClone() {
  // [初始化]：获取查询客户端用于缓存失效
  const queryClient = useQueryClient();
  // [认证]：获取当前登录用户信息
  const { user } = useAuth();
  // [路由]：获取导航函数
  const navigate = useNavigate();

  return useMutation({
    /**
     * 执行智能体复刻操作
     * 
     * @param {string} sourceAgentId - 源智能体的唯一标识符
     * @returns {Promise<string>} 返回新创建的智能体ID
     * @throws {Error} 用户未登录或复刻失败时抛出异常
     */
    mutationFn: async (sourceAgentId: string) => {
      // [校验]：确保用户已登录
      if (!user) {
        throw new Error("请先登录后再复刻");
      }

      // [调用]：执行数据库存储过程进行复刻
      // clone_agent 函数会复制智能体的所有配置和关联数据
      const { data, error } = await supabase.rpc("clone_agent", {
        source_id: sourceAgentId,
      });

      if (error) throw error;
      
      // [返回]：新创建的智能体ID
      return data as string;
    },
    onSuccess: (newAgentId) => {
      // [刷新]：使相关缓存失效以获取最新数据
      queryClient.invalidateQueries({ queryKey: ["my-agents"] });
      queryClient.invalidateQueries({ queryKey: ["trending-agents"] });
      
      // [通知]：显示成功提示
      toast.success("复刻成功！正在跳转到编辑页面...");
      
      // [跳转]：导航到构建器页面编辑新智能体
      navigate(`/hive?tab=builder&agentId=${newAgentId}`);
    },
    onError: (error: Error) => {
      // [错误]：显示错误提示
      toast.error(error.message || "复刻失败，请重试");
    },
  });
}
