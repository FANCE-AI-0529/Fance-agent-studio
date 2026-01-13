import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
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
} from '@/types/gitops';

function mapDbSnapshotToAgentSnapshot(db: any): AgentSnapshot {
  return {
    id: db.id,
    agentId: db.agent_id,
    userId: db.user_id,
    commitHash: db.commit_hash,
    commitMessage: db.commit_message,
    parentSnapshotId: db.parent_snapshot_id,
    manifest: (db.manifest || {}) as Record<string, unknown>,
    graphData: (db.graph_data || { nodes: [], edges: [] }) as GraphData,
    mountedSkills: (db.mounted_skills || []) as SnapshotSkillRef[],
    systemPrompt: db.system_prompt,
    mplpPolicy: db.mplp_policy,
    personalityConfig: db.personality_config as Record<string, unknown> | null,
    createdAt: db.created_at,
    isAutoSave: db.is_auto_save,
    triggerSource: db.trigger_source as SnapshotTriggerSource,
    changeStats: db.change_stats as ChangeStats | null,
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

export function useAgentSnapshots(agentId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 获取快照列表
  const { data: snapshots, isLoading, error } = useQuery({
    queryKey: ['agent-snapshots', agentId],
    queryFn: async () => {
      if (!agentId) return [];
      
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
      return (data || []).map(mapDbSnapshotToAgentSnapshot);
    },
    enabled: !!agentId && !!user,
  });

  // 获取单个快照详情
  const getSnapshot = async (snapshotId: string): Promise<AgentSnapshot | null> => {
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

  // 创建快照
  const createSnapshot = useMutation({
    mutationFn: async ({
      message,
      isAutoSave = false,
      triggerSource = 'manual',
      tags = [],
    }: Omit<CreateSnapshotRequest, 'agentId'>) => {
      if (!agentId) throw new Error('Agent ID is required');

      const { data, error } = await supabase.functions.invoke('create-snapshot', {
        body: { agentId, message, isAutoSave, triggerSource, tags },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['agent-snapshots', agentId] });
      if (!data.snapshot?.is_auto_save) {
        toast.success(`版本已保存: ${data.snapshot?.commit_hash}`);
      }
    },
    onError: (error) => {
      toast.error(`保存失败: ${error.message}`);
    },
  });

  // 恢复快照
  const restoreSnapshot = useMutation({
    mutationFn: async (snapshotId: string) => {
      if (!agentId) throw new Error('Agent ID is required');

      const { data, error } = await supabase.functions.invoke('restore-snapshot', {
        body: { snapshotId, agentId, createBackup: true },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agent-snapshots', agentId] });
      queryClient.invalidateQueries({ queryKey: ['agent-graph', agentId] });
      toast.success('已恢复到选定版本');
    },
    onError: (error) => {
      toast.error(`恢复失败: ${error.message}`);
    },
  });

  // 添加标签
  const addTag = useMutation({
    mutationFn: async ({ snapshotId, name, color, description }: {
      snapshotId: string;
      name: string;
      color?: string;
      description?: string;
    }) => {
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

  // 删除标签
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

  // 获取时间线数据
  const getTimeline = async (limit = 50): Promise<TimelineSnapshot[]> => {
    if (!agentId) return [];

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
    snapshots,
    isLoading,
    error,
    getSnapshot,
    getTimeline,
    createSnapshot,
    restoreSnapshot,
    addTag,
    removeTag,
  };
}
