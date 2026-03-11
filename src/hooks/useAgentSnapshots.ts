/**
 * @file useAgentSnapshots.ts
 * @description 智能体快照管理钩子模块，提供版本控制、快照创建、恢复及标签管理功能
 * @module Hooks/GitOps
 * @author Agent OS Studio Team
 * @copyright 2025 Agent OS Studio. All rights reserved.
 * @version 1.0.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { toast } from 'sonner';
import type { 
  AgentSnapshot, 
  SnapshotTag, 
  CreateSnapshotRequest,
  TimelineSnapshot,
  SnapshotTriggerSource,
  ChangeStats,
  GraphData,
  SnapshotSkillRef,
} from '../types/gitops.ts';

/**
 * 将数据库快照记录映射为应用层快照对象
 * 
 * 该函数负责将数据库返回的原始数据转换为类型安全的 AgentSnapshot 对象，
 * 处理字段命名转换（snake_case -> camelCase）和类型断言。
 * 
 * @param {any} db - 数据库返回的原始快照记录
 * @returns {AgentSnapshot} 返回格式化后的快照对象
 */
function mapDbSnapshotToAgentSnapshot(db: any): AgentSnapshot {
  return {
    /** 快照唯一标识符 */
    id: db.id,
    /** 关联的智能体ID */
    agentId: db.agent_id,
    /** 创建者用户ID */
    userId: db.user_id,
    /** 提交哈希值（短格式） */
    commitHash: db.commit_hash,
    /** 提交消息 */
    commitMessage: db.commit_message,
    /** 父快照ID（用于版本链） */
    parentSnapshotId: db.parent_snapshot_id,
    /** 智能体配置清单 */
    manifest: (db.manifest || {}) as Record<string, unknown>,
    /** 图形数据（节点和边） */
    graphData: (db.graph_data || { nodes: [], edges: [] }) as GraphData,
    /** 已挂载的技能引用列表 */
    mountedSkills: (db.mounted_skills || []) as SnapshotSkillRef[],
    /** 系统提示词 */
    systemPrompt: db.system_prompt,
    /** MPLP 协议策略 */
    mplpPolicy: db.mplp_policy,
    /** 性格配置 */
    personalityConfig: db.personality_config as Record<string, unknown> | null,
    /** 创建时间 */
    createdAt: db.created_at,
    /** 是否为自动保存 */
    isAutoSave: db.is_auto_save,
    /** 触发来源 */
    triggerSource: db.trigger_source as SnapshotTriggerSource,
    /** 变更统计信息 */
    changeStats: db.change_stats as ChangeStats | null,
    /** 关联的标签列表 */
    tags: (db.snapshot_tags || []).map((t: any) => ({
      id: t.id,
      snapshotId: t.snapshot_id,
      userId: t.user_id,
      name: t.name,
      color: t.color,
      description: t.description,
      createdAt: t.created_at,
    })),
  };
}

/**
 * 智能体快照管理钩子
 * 
 * 该钩子函数提供完整的智能体版本控制功能，包括：
 * - 快照列表查询
 * - 创建新快照
 * - 恢复到历史版本
 * - 标签管理
 * - 时间线数据获取
 * 
 * @param {string | null} agentId - 智能体唯一标识符
 * @returns 返回快照数据及操作函数
 * 
 * @example
 * const { snapshots, createSnapshot, restoreSnapshot } = useAgentSnapshots(agentId);
 */
export function useAgentSnapshots(agentId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  /**
   * 查询快照列表
   * 获取指定智能体的所有快照记录，包含关联的标签信息
   */
  const { data: snapshots, isLoading, error } = useQuery({
    queryKey: ['agent-snapshots', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      
      // [查询]：获取快照及其关联标签
      const { data, error } = await supabase
        .from('agent_snapshots')
        .select(`
          *,
          snapshot_tags(*)
        `)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // [转换]：将数据库格式映射为应用层格式
      return (data || []).map(mapDbSnapshotToAgentSnapshot);
    },
    // [条件]：仅在智能体ID和用户都有效时启用
    enabled: !!agentId && !!user,
  });

  /**
   * 获取单个快照详情
   * 
   * @param {string} snapshotId - 快照唯一标识符
   * @returns {Promise<AgentSnapshot | null>} 返回快照详情或 null
   */
  const getSnapshot = async (snapshotId: string): Promise<AgentSnapshot | null> => {
    // [查询]：获取指定快照及其标签
    const { data, error } = await supabase
      .from('agent_snapshots')
      .select(`
        *,
        snapshot_tags(*)
      `)
      .eq('id', snapshotId)
      .single();

    if (error) return null;
    return mapDbSnapshotToAgentSnapshot(data);
  };

  /**
   * 创建新快照
   * 保存当前智能体状态为一个新版本
   */
  const createSnapshot = useMutation({
    mutationFn: async ({
      message,
      isAutoSave = false,
      triggerSource = 'manual',
      tags = [],
    }: Omit<CreateSnapshotRequest, 'agentId'>) => {
      // [校验]：确保智能体ID有效
      if (!agentId) throw new Error('Agent ID is required');

      // [调用]：通过 Edge Function 创建快照
      const { data, error } = await supabase.functions.invoke('create-snapshot', {
        body: { agentId, message, isAutoSave, triggerSource, tags },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // [刷新]：使快照列表缓存失效
      queryClient.invalidateQueries({ queryKey: ['agent-snapshots', agentId] });
      
      // [通知]：非自动保存时显示成功提示
      if (!data.snapshot?.is_auto_save) {
        toast.success(`版本已保存: ${data.snapshot?.commit_hash}`);
      }
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  /**
   * 恢复到指定快照版本
   * 将智能体状态回滚到历史版本
   */
  const restoreSnapshot = useMutation({
    mutationFn: async (snapshotId: string) => {
      if (!agentId) throw new Error('Agent ID is required');

      // [调用]：通过 Edge Function 恢复快照，同时创建当前状态的备份
      const { data, error } = await supabase.functions.invoke('restore-snapshot', {
        body: { snapshotId, agentId, createBackup: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // [刷新]：使所有相关缓存失效
      queryClient.invalidateQueries({ queryKey: ['agents', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agent-snapshots', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agent-graph', agentId] });
      
      toast.success('已恢复到选定版本');
    },
    onError: (error) => {
      toast.error(`恢复失败: ${error.message}`);
    },
  });

  /**
   * 为快照添加标签
   * 用于标记重要版本（如"生产版"、"稳定版"等）
   */
  const addTag = useMutation({
    mutationFn: async ({ snapshotId, name, color, description }: {
      /** 快照ID */
      snapshotId: string;
      /** 标签名称 */
      name: string;
      /** 标签颜色 */
      color?: string;
      /** 标签描述 */
      description?: string;
    }) => {
      // [插入]：创建新标签记录
      const { data, error } = await supabase
        .from('snapshot_tags')
        .insert([{
          snapshot_id: snapshotId,
          user_id: user?.id,
          name,
          color: color || '#6366f1',
          description,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-snapshots', agentId] });
      toast.success('标签已添加');
    },
  });

  /**
   * 删除快照标签
   */
  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('snapshot_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-snapshots', agentId] });
    },
  });

  /**
   * 获取时间线数据
   * 用于在 UI 中显示版本历史时间线
   * 
   * @param {number} limit - 返回记录数量上限
   * @returns {Promise<TimelineSnapshot[]>} 返回时间线格式的快照列表
   */
  const getTimeline = async (limit = 50): Promise<TimelineSnapshot[]> => {
    if (!agentId) return [];

    // [查询]：获取精简的时间线数据
    const { data, error } = await supabase
      .from('agent_snapshots')
      .select(`
        id,
        commit_hash,
        commit_message,
        created_at,
        is_auto_save,
        trigger_source,
        change_stats,
        snapshot_tags(*)
      `)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return [];

    // [转换]：映射为时间线格式
    return (data || []).map((d: any) => ({
      id: d.id,
      commitHash: d.commit_hash,
      commitMessage: d.commit_message,
      createdAt: d.created_at,
      isAutoSave: d.is_auto_save,
      triggerSource: d.trigger_source as SnapshotTriggerSource,
      changeStats: d.change_stats as ChangeStats | null,
      tags: (d.snapshot_tags || []).map((t: any) => ({
        id: t.id,
        snapshotId: t.snapshot_id,
        userId: t.user_id,
        name: t.name,
        color: t.color,
        description: t.description,
        createdAt: t.created_at,
      })),
    }));
  };

  return {
    /** 快照列表 */
    snapshots,
    /** 加载状态 */
    isLoading,
    /** 错误信息 */
    error,
    /** 获取单个快照 */
    getSnapshot,
    /** 获取时间线数据 */
    getTimeline,
    /** 创建快照 */
    createSnapshot,
    /** 恢复快照 */
    restoreSnapshot,
    /** 添加标签 */
    addTag,
    /** 删除标签 */
    removeTag,
  };
}
