/**
 * @file useAgents.ts
 * @description 智能体管理钩子模块，提供智能体的增删改查、部署和技能绑定等核心功能
 * @module Hooks/Agent
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "../integrations/supabase/client.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { toast } from "./use-toast.ts";
import type { Tables, TablesInsert, TablesUpdate, Json } from "../integrations/supabase/types.ts";

/**
 * 智能体数据表类型定义
 * 对应数据库中 agents 表的完整字段结构
 */
export type Agent = Tables<"agents">;

/**
 * 智能体插入类型定义
 * 用于创建新智能体时的数据结构
 */
export type AgentInsert = TablesInsert<"agents">;

/**
 * 智能体更新类型定义
 * 用于更新现有智能体时的数据结构
 */
export type AgentUpdate = TablesUpdate<"agents">;

/**
 * 带技能列表的智能体扩展接口
 * 在基础智能体数据之上附加已挂载的技能信息
 */
export interface AgentWithSkills extends Agent {
  /** 已挂载到该智能体的技能列表 */
  skills: Tables<"skills">[];
}

/**
 * 获取当前用户创建的所有智能体
 * 
 * 该钩子函数从数据库中查询当前登录用户所拥有的全部智能体列表，
 * 结果按更新时间降序排列，最新修改的智能体排在最前面。
 * 
 * @returns {UseQueryResult} 包含智能体列表的查询结果对象
 * @example
 * const { data: agents, isLoading } = useMyAgents();
 */
export function useMyAgents() {
  // [获取]：从认证上下文中获取当前登录用户信息
  const { user } = useAuth();

  return useQuery({
    // [缓存]：使用用户ID作为缓存键的一部分，确保不同用户数据隔离
    queryKey: ["agents", "my", user?.id],
    queryFn: async () => {
      // [校验]：用户未登录时返回空数组
      if (!user) return [];

      // [查询]：从 agents 表中获取当前用户的所有智能体
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("author_id", user.id)
        .order("updated_at", { ascending: false });

      // [异常]：查询失败时抛出错误
      if (error) throw error;
      return data;
    },
    // [条件]：仅在用户已登录时启用查询
    enabled: !!user,
  });
}

/**
 * 获取所有已部署的公开智能体
 * 
 * 该钩子函数查询系统中所有状态为"已部署"的智能体，
 * 通常用于运行时环境中让用户选择可用的智能体。
 * 
 * @returns {UseQueryResult} 包含已部署智能体列表的查询结果对象
 */
export function useDeployedAgents() {
  return useQuery({
    queryKey: ["agents", "deployed"],
    queryFn: async () => {
      // [查询]：筛选状态为 deployed 的智能体，按名称升序排列
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("status", "deployed")
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

/**
 * 获取单个智能体的详细信息及其挂载的技能
 * 
 * 该钩子函数根据智能体ID查询完整的智能体数据，
 * 并通过关联表获取该智能体已挂载的所有技能信息。
 * 
 * @param {string | null} agentId - 智能体的唯一标识符
 * @returns {UseQueryResult<AgentWithSkills | null>} 包含智能体及其技能的查询结果
 */
export function useAgent(agentId: string | null) {
  return useQuery({
    queryKey: ["agents", agentId],
    queryFn: async () => {
      // [校验]：ID为空时返回null
      if (!agentId) return null;

      // [步骤1]：查询智能体基础信息
      const { data: agent, error: agentError } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single();

      if (agentError) throw agentError;

      // [步骤2]：查询智能体与技能的关联记录
      const { data: agentSkills, error: skillsError } = await supabase
        .from("agent_skills")
        .select("skill_id")
        .eq("agent_id", agentId);

      if (skillsError) throw skillsError;

      // [处理]：提取技能ID列表
      const skillIds = useMemo(() => agentSkills.map((as) => as.skill_id), [agentSkills]);

      // [优化]：无关联技能时直接返回，避免空查询
      if (skillIds.length === 0) {
        return { ...agent, skills: [] } as AgentWithSkills;
      }

      // [步骤3]：批量查询技能详情
      const { data: skills, error: fetchSkillsError } = await supabase
        .from("skills")
        .select("*")
        .in("id", skillIds);

      if (fetchSkillsError) throw fetchSkillsError;

      // [组装]：合并智能体与技能数据
      return { ...agent, skills: skills || [] } as AgentWithSkills;
    },
    // [条件]：仅在agentId有效时启用查询
    enabled: !!agentId,
  });
}

/**
 * 创建新智能体
 * 
 * 该钩子函数提供创建智能体的变更操作，会自动关联当前用户ID作为作者，
 * 创建成功后会刷新智能体列表缓存。
 * 
 * @returns {UseMutationResult} 包含创建操作的变更结果对象
 */
export function useCreateAgent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (agent: Omit<AgentInsert, "author_id">) => {
      // [校验]：确保用户已登录
      if (!user) throw new Error("用户未登录");

      // [插入]：创建智能体记录，不使用 .single() 以避免隐式冲突处理
      const { data, error } = await supabase
        .from("agents")
        .insert({ ...agent, author_id: user.id })
        .select();

      if (error) throw error;
      // [校验]：确保返回数据有效
      if (!data || data.length === 0) throw new Error("创建 Agent 失败");
      
      const createdAgent = data[0];
      return createdAgent;
    },
    onSuccess: () => {
      // [刷新]：创建成功后使智能体列表缓存失效
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error) => {
      // [通知]：显示错误提示
      toast({ title: "创建失败", description: error.message, variant: "destructive" });
    },
  });
}

/**
 * 更新智能体信息
 * 
 * 该钩子函数提供更新现有智能体数据的变更操作，
 * 更新成功后会刷新相关缓存。
 * 
 * @returns {UseMutationResult} 包含更新操作的变更结果对象
 */
export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: AgentUpdate & { id: string }) => {
      // [更新]：根据ID更新智能体字段
      const { data, error } = await supabase
        .from("agents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // [刷新]：更新成功后使缓存失效
      queryClient.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error) => {
      toast({ title: "保存失败", description: error.message, variant: "destructive" });
    },
  });
}

/**
 * 保存智能体及其关联的技能
 * 
 * 该钩子函数提供智能体与技能关联的原子性保存操作，
 * 支持创建新智能体或更新现有智能体，同时管理技能绑定关系。
 * 
 * @returns {UseMutationResult} 包含保存操作的变更结果对象
 */
export function useSaveAgentWithSkills() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      agent,
      skillIds,
      manifest,
    }: {
      /** 智能体数据（创建时无id，更新时有id） */
      agent: Omit<AgentInsert, "author_id"> & { id?: string };
      /** 要关联的技能ID列表 */
      skillIds: string[];
      /** 智能体配置清单 */
      manifest: Json;
    }) => {
      // [校验]：确保用户已登录
      if (!user) throw new Error("用户未登录");

      // UUID 格式校验函数
      const isValidUUID = (str: string | undefined | null): boolean => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      // [清洗]：去重并过滤无效的技能ID，严格校验 UUID 格式
      const allSkillIds = Array.from(new Set(skillIds)).filter(
        (id) => id && typeof id === "string" && id.trim() !== ""
      );
      
      // [关键修复]：严格过滤非 UUID 格式的 ID（如 "node-0"）
      const cleanSkillIds = allSkillIds.filter(isValidUUID);
      
      // [警告]：如果有无效的 skill ID 被过滤，记录到控制台
      const invalidSkillIds = allSkillIds.filter(id => !isValidUUID(id));
      if (invalidSkillIds.length > 0) {
        console.warn(
          `[useSaveAgentWithSkills] 过滤了 ${invalidSkillIds.length} 个无效的 skill ID:`,
          invalidSkillIds
        );
      }

      let agentId = agent.id;

      try {
        if (agentId) {
          // [分支1]：更新现有智能体
          const { error: updateError } = await supabase
            .from("agents")
            .update({
              name: agent.name,
              department: agent.department,
              model: agent.model,
              manifest,
            })
            .eq("id", agentId);

          if (updateError) {
            // [错误]：构建详细的错误信息
            const errMsg = `[agents.update] ${updateError.message}${updateError.details ? ` | details: ${updateError.details}` : ''}${updateError.hint ? ` | hint: ${updateError.hint}` : ''}`;
            throw new Error(errMsg);
          }

          // [清理]：删除旧的技能关联记录
          const { error: deleteError } = await supabase
            .from("agent_skills")
            .delete()
            .eq("agent_id", agentId);

          if (deleteError) {
            const errMsg = `[agent_skills.delete] ${deleteError.message}${deleteError.details ? ` | details: ${deleteError.details}` : ''}${deleteError.hint ? ` | hint: ${deleteError.hint}` : ''}`;
            throw new Error(errMsg);
          }
        } else {
          // [分支2]：创建新智能体
          const { data: newAgentData, error: createError } = await supabase
            .from("agents")
            .insert({
              name: agent.name,
              department: agent.department,
              model: agent.model,
              manifest,
              author_id: user.id,
            })
            .select();

          if (createError) {
            const errMsg = `[agents.insert] ${createError.message}${createError.details ? ` | details: ${createError.details}` : ''}${createError.hint ? ` | hint: ${createError.hint}` : ''}`;
            throw new Error(errMsg);
          }
          if (!newAgentData || newAgentData.length === 0) {
            throw new Error("[agents.insert] 创建 Agent 失败：返回数据为空");
          }
          agentId = newAgentData[0].id;
        }

        // [关联]：建立新的技能关联（仅在有有效技能ID时执行）
        if (cleanSkillIds.length > 0) {
          const agentSkills = cleanSkillIds.map((skillId) => ({
            agent_id: agentId!,
            skill_id: skillId,
          }));

          const { error: skillsError } = await supabase
            .from("agent_skills")
            .insert(agentSkills);

          if (skillsError) {
            const errMsg = `[agent_skills.insert] ${skillsError.message}${skillsError.details ? ` | details: ${skillsError.details}` : ''}${skillsError.hint ? ` | hint: ${skillsError.hint}` : ''}`;
            throw new Error(errMsg);
          }
        }

        return agentId;
      } catch (err: any) {
        // [重抛]：保留原始错误信息
        throw err;
      }
    },
    onSuccess: () => {
      // [刷新]：保存成功后使缓存失效并显示成功提示
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "保存成功", description: "Agent 配置已保存" });
    },
    onError: (error) => {
      toast({ title: "保存失败", description: error.message, variant: "destructive" });
    },
  });
}

/**
 * 部署智能体
 * 
 * 该钩子函数将智能体状态更新为"已部署"，
 * 使其可被其他用户在运行时环境中使用。
 * 
 * @returns {UseMutationResult} 包含部署操作的变更结果对象
 */
export function useDeployAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // [更新]：将状态设置为 deployed，不使用 .select().single() 以避免 RLS 问题
      const { error } = await supabase
        .from("agents")
        .update({ status: "deployed" })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "部署成功", description: "智能体已部署到城市网络" });
    },
    onError: (error) => {
      toast({ title: "部署失败", description: error.message, variant: "destructive" });
    },
  });
}

/**
 * 删除智能体
 * 
 * 该钩子函数从数据库中永久删除指定的智能体，
 * 关联的技能绑定记录会通过外键级联自动删除。
 * 
 * @returns {UseMutationResult} 包含删除操作的变更结果对象
 */
export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // [删除]：根据ID删除智能体记录
      const { error } = await supabase.from("agents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      toast({ title: "删除成功", description: "Agent 已删除" });
    },
    onError: (error) => {
      toast({ title: "删除失败", description: error.message, variant: "destructive" });
    },
  });
}
