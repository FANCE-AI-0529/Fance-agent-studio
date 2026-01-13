import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AgentSnapshot, TimelineSnapshot, ChangeStats, SnapshotTriggerSource, GraphData, SnapshotSkillRef } from '@/types/gitops';

export function useTimeTravel(agentId: string | null) {
  const [previewSnapshot, setPreviewSnapshot] = useState<AgentSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mapDbToSnapshot = (data: any): AgentSnapshot => ({
    id: data.id,
    agentId: data.agent_id,
    userId: data.user_id,
    commitHash: data.commit_hash,
    commitMessage: data.commit_message,
    parentSnapshotId: data.parent_snapshot_id,
    manifest: (data.manifest || {}) as Record<string, unknown>,
    graphData: (data.graph_data || { nodes: [], edges: [] }) as GraphData,
    mountedSkills: (data.mounted_skills || []) as SnapshotSkillRef[],
    systemPrompt: data.system_prompt,
    mplpPolicy: data.mplp_policy,
    personalityConfig: data.personality_config as Record<string, unknown> | null,
    createdAt: data.created_at,
    isAutoSave: data.is_auto_save,
    triggerSource: data.trigger_source as SnapshotTriggerSource,
    changeStats: data.change_stats as ChangeStats | null,
    tags: (data.snapshot_tags || []).map((t: any) => ({
      id: t.id,
      snapshotId: t.snapshot_id,
      userId: t.user_id,
      name: t.name,
      color: t.color,
      description: t.description,
      createdAt: t.created_at,
    })),
  });

  const findSnapshotByDate = useCallback(async (targetDate: Date): Promise<AgentSnapshot | null> => {
    if (!agentId) return null;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_snapshots')
        .select(`*, snapshot_tags(*)`)
        .eq('agent_id', agentId)
        .lte('created_at', targetDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) return null;
      return mapDbToSnapshot(data);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  const previewAtTime = useCallback(async (targetDate: Date): Promise<AgentSnapshot | null> => {
    const snapshot = await findSnapshotByDate(targetDate);
    setPreviewSnapshot(snapshot);
    return snapshot;
  }, [findSnapshotByDate]);

  const previewBySnapshotId = useCallback(async (snapshotId: string): Promise<AgentSnapshot | null> => {
    if (!agentId) return null;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('agent_snapshots')
        .select(`*, snapshot_tags(*)`)
        .eq('id', snapshotId)
        .single();

      if (error) return null;
      const snapshot = mapDbToSnapshot(data);
      setPreviewSnapshot(snapshot);
      return snapshot;
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  const getSnapshotsInRange = useCallback(async (startDate: Date, endDate: Date): Promise<TimelineSnapshot[]> => {
    if (!agentId) return [];

    const { data, error } = await supabase
      .from('agent_snapshots')
      .select(`id, commit_hash, commit_message, created_at, is_auto_save, trigger_source, change_stats, snapshot_tags(*)`)
      .eq('agent_id', agentId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });

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
        id: t.id, snapshotId: t.snapshot_id, userId: t.user_id, name: t.name, color: t.color, description: t.description, createdAt: t.created_at,
      })),
    }));
  }, [agentId]);

  const getSnapshotsByDate = useCallback(async (date: Date): Promise<TimelineSnapshot[]> => {
    const startOfDay = new Date(date); startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date); endOfDay.setHours(23, 59, 59, 999);
    return getSnapshotsInRange(startOfDay, endOfDay);
  }, [getSnapshotsInRange]);

  const getSnapshotDates = useCallback(async (year: number, month: number): Promise<Date[]> => {
    if (!agentId) return [];
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const { data, error } = await supabase
      .from('agent_snapshots')
      .select('created_at')
      .eq('agent_id', agentId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) return [];
    const dateSet = new Set<string>();
    (data || []).forEach((d: any) => dateSet.add(new Date(d.created_at).toISOString().split('T')[0]));
    return Array.from(dateSet).map(d => new Date(d));
  }, [agentId]);

  return {
    previewSnapshot, isLoading, previewAtTime, previewBySnapshotId, findSnapshotByDate, getSnapshotsInRange, getSnapshotsByDate, getSnapshotDates, clearPreview: () => setPreviewSnapshot(null),
  };
}
