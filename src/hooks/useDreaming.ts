import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTieredMemoryStore } from '@/stores/tieredMemoryStore';
import { useManusMemoryStore } from '@/stores/manusMemoryStore';
import type { DreamingTask, DreamingTriggerCondition, ConsolidationResult } from '@/types/tieredMemory';
import type { Json } from '@/integrations/supabase/types';

export function useDreaming(agentId?: string) {
  const { user } = useAuth();
  const memoryStore = useTieredMemoryStore();
  const manusStore = useManusMemoryStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [sessionStartTime] = useState(() => new Date());
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // === 检查触发条件 ===
  const checkTriggerConditions = useCallback((): DreamingTriggerCondition => {
    const progressLines = manusStore.progress.split('\n').filter(l => l.trim()).length;
    const lastActivity = memoryStore.lastActivityAt;
    const questionCount = manusStore.questionCount;
    const sessionDuration = Date.now() - sessionStartTime.getTime();

    return {
      progressLineCount: progressLines,
      lastActivityAt: lastActivity,
      questionCount,
      sessionDuration,
    };
  }, [manusStore, memoryStore]);

  // === 判断是否应该触发 Dreaming ===
  const shouldDream = useCallback((): boolean => {
    if (!memoryStore.config.enableDreaming) return false;
    if (isProcessing) return false;

    const conditions = checkTriggerConditions();
    const config = memoryStore.config;
    
    // 触发条件:
    // 1. progress.md 行数超过阈值
    if (conditions.progressLineCount >= config.progressLineThreshold) {
      return true;
    }
    
    // 2. 空闲时间超过阈值
    const idleTime = Date.now() - conditions.lastActivityAt.getTime();
    if (idleTime >= config.dreamingIdleThreshold && conditions.progressLineCount > 10) {
      return true;
    }
    
    // 3. 问题数达到 5 问题重启阈值
    if (conditions.questionCount >= 5) {
      return true;
    }

    return false;
  }, [memoryStore, isProcessing, checkTriggerConditions]);

  // === 创建 Dreaming 任务 ===
  const createDreamingTask = useCallback(async (
    taskType: DreamingTask['type'],
    input: Record<string, unknown>,
    priority: number = 5
  ): Promise<string | null> => {
    if (!user || !agentId) return null;

    try {
      const { data, error } = await supabase
        .from('dreaming_tasks')
        .insert({
          user_id: user.id,
          agent_id: agentId,
          task_type: taskType,
          priority,
          input: input as Json,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    } catch (err) {
      console.error('Failed to create dreaming task:', err);
      return null;
    }
  }, [user, agentId]);

  // === 执行 Dreaming ===
  const dream = useCallback(async (force: boolean = false): Promise<boolean> => {
    if (!user || !agentId) return false;
    if (isProcessing) return false;
    if (!force && !shouldDream()) return false;

    setIsProcessing(true);
    setLastError(null);
    memoryStore.setDreamingStatus('running');

    try {
      // 收集需要整理的数据
      const progressContent = manusStore.progress;
      const findings = manusStore.findings;
      const questionCount = manusStore.questionCount;

      // 调用记忆整合边缘函数
      const { data, error } = await supabase.functions.invoke('memory-consolidation', {
        body: {
          userId: user.id,
          agentId,
          progressContent,
          findings,
          questionCount,
        },
      });

      if (error) throw error;

      const result = data as ConsolidationResult;

      // 1. 保存归档记忆
      await supabase.from('memory_archives').insert({
        user_id: user.id,
        agent_id: agentId,
        summary: result.summary,
        key_insights: result.keyInsights as unknown as Json,
        user_patterns: result.userPatterns as unknown as Json,
        emotional_tone: result.emotionalTone,
        topics_discussed: result.topicsDiscussed as unknown as Json,
        original_message_count: questionCount,
        token_count: Math.ceil(result.summary.length / 4),
      });

      // 2. 更新核心事实 (高重要性的)
      for (const fact of result.coreFacts.filter(f => f.importance >= 7)) {
        await supabase.from('core_memories').upsert({
          agent_id: agentId,
          user_id: user.id,
          category: 'core_facts',
          key: fact.key,
          value: fact.value,
          is_read_only: false,
          token_count: Math.ceil(fact.value.length / 4),
          priority: fact.importance,
        }, {
          onConflict: 'agent_id,user_id,category,key',
        });
      }

      // 3. 清理 progress.md (保留最近 10 条)
      const lines = progressContent.split('\n').filter(l => l.trim());
      if (lines.length > 10) {
        const cleanedProgress = lines.slice(-10).join('\n');
        manusStore.updateProgress(cleanedProgress);
      }

      // 4. 重置问题计数 (通过 initializeSession 保持当前 sessionId)
      const currentSessionId = manusStore.sessionId;
      if (currentSessionId) {
        manusStore.initializeSession(currentSessionId);
      }

      // 更新状态
      memoryStore.setDreamingStatus('completed');
      memoryStore.setLastDreamingAt(new Date());

      if (import.meta.env.DEV) console.debug('Dreaming completed successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setLastError(errorMessage);
      memoryStore.setDreamingStatus('failed');
      console.error('Dreaming failed:', err);
      return false;
    } finally {
      setIsProcessing(false);
      // 5 秒后重置状态
      setTimeout(() => {
        memoryStore.setDreamingStatus('idle');
      }, 5000);
    }
  }, [user, agentId, isProcessing, shouldDream, manusStore, memoryStore]);

  // === 设置空闲检测定时器 ===
  useEffect(() => {
    if (!memoryStore.config.enableDreaming || !agentId) return;

    // 清除之前的定时器
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // 设置新的定时器
    idleTimerRef.current = setTimeout(() => {
      if (shouldDream()) {
        console.log('Idle dreaming triggered');
        dream();
      }
    }, memoryStore.config.dreamingIdleThreshold);

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [agentId, memoryStore.config, memoryStore.lastActivityAt, shouldDream, dream]);

  // === 会话结束时触发 ===
  useEffect(() => {
    return () => {
      if (shouldDream()) {
        // 异步执行，不阻塞卸载
        dream().catch(console.error);
      }
    };
  }, []);

  return {
    dream,
    isProcessing,
    shouldDream,
    lastError,
    checkTriggerConditions,
    dreamingStatus: memoryStore.dreamingStatus,
    lastDreamingAt: memoryStore.lastDreamingAt,
  };
}
