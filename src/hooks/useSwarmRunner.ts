/**
 * useSwarmRunner — Swarm 编排引擎 Hook
 * 将 SwarmDefinition 转化为容器操作序列，管理成员调度与消息路由
 */

import { useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client.ts';
import { useSwarmStore } from '../stores/swarmStore.ts';
import { useRuntimeStore } from '../stores/runtimeStore.ts';
import type {
  SwarmDefinition,
  SwarmMember,
  SwarmMessage,
  SwarmResult,
  SwarmMemberContribution,
} from '../types/swarms.ts';

interface SwarmRunnerReturn {
  startSwarm: (definition: SwarmDefinition) => Promise<string>;
  cancelSwarm: (swarmId: string) => Promise<void>;
  pauseMember: (swarmId: string, memberId: string) => void;
  resumeMember: (swarmId: string, memberId: string) => void;
}

export function useSwarmRunner(): SwarmRunnerReturn {
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  const store = useSwarmStore;
  const runtimeStore = useRuntimeStore;

  // ─── Gateway 调用辅助 ───
  const callGateway = useCallback(async (action: string, params: Record<string, unknown>) => {
    const config = runtimeStore.getState().config;
    const nanoclawEndpoint = `${config.nanoclaw?.endpoint || 'http://localhost'}:${config.nanoclaw?.port || 3100}`;
    const authToken = config.nanoclaw?.authToken || '';

    const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
      body: { action, nanoclawEndpoint, authToken, ...params },
    });

    if (error) throw new Error(`Gateway error: ${error.message}`);
    return data;
  }, []);

  // ─── 向成员容器发送命令并收集输出 ───
  const dispatchToMember = useCallback(async (
    swarmId: string,
    member: SwarmMember,
    command: string,
    abortSignal: AbortSignal,
  ): Promise<{ output: string; exitCode: number }> => {
    const containerId = store.getState().getContainerId(swarmId, member.id);
    if (!containerId) throw new Error(`No container for member ${member.id}`);

    store.getState().setMemberStatus(swarmId, member.id, 'executing');
    store.getState().updateMemberState(swarmId, member.id, { currentTask: command.substring(0, 80) });

    const result = await callGateway('swarm_dispatch', {
      swarmId,
      memberId: member.id,
      command,
    });

    if (abortSignal.aborted) throw new Error('Cancelled');

    store.getState().updateMemberState(swarmId, member.id, {
      status: result.exitCode === 0 ? 'done' : 'error',
      progress: 100,
      tokensUsed: (result.tokensUsed || 0),
    });

    // Record as SwarmMessage
    const msg: SwarmMessage = {
      id: crypto.randomUUID(),
      fromMemberId: member.id,
      toMemberId: 'broadcast',
      content: result.stdout?.substring(0, 500) || '(no output)',
      messageType: 'result',
      timestamp: new Date(),
      round: store.getState().getSwarm(swarmId)?.currentRound || 0,
    };
    store.getState().addMessage(swarmId, msg);

    return { output: result.stdout || '', exitCode: result.exitCode ?? 0 };
  }, [callGateway]);

  // ─── Sequential 调度 ───
  const runSequential = useCallback(async (
    swarmId: string,
    members: SwarmMember[],
    goal: string,
    abortSignal: AbortSignal,
  ) => {
    const sorted = [...members].sort((a, b) => b.priority - a.priority);
    let previousOutput = '';

    for (const member of sorted) {
      if (abortSignal.aborted) break;
      store.getState().advanceRound(swarmId);
      const command = previousOutput
        ? `echo "Previous output: ${previousOutput.substring(0, 200)}" && echo "Goal: ${goal}" && echo "Your role: ${member.role}"`
        : `echo "Goal: ${goal}" && echo "Your role: ${member.role}"`;
      const { output } = await dispatchToMember(swarmId, member, command, abortSignal);
      previousOutput = output;
    }
  }, [dispatchToMember]);

  // ─── Parallel 调度 ───
  const runParallel = useCallback(async (
    swarmId: string,
    members: SwarmMember[],
    goal: string,
    abortSignal: AbortSignal,
  ) => {
    store.getState().advanceRound(swarmId);
    const command = `echo "Goal: ${goal}"`;
    await Promise.allSettled(
      members.map((m) => dispatchToMember(swarmId, m, command, abortSignal))
    );
  }, [dispatchToMember]);

  // ─── Hierarchical 调度 ───
  const runHierarchical = useCallback(async (
    swarmId: string,
    members: SwarmMember[],
    goal: string,
    abortSignal: AbortSignal,
  ) => {
    const leader = members.find((m) => m.role === 'leader') || members[0];
    const workers = members.filter((m) => m.id !== leader.id);

    // Round 1: Leader analyzes
    store.getState().advanceRound(swarmId);
    store.getState().setMemberStatus(swarmId, leader.id, 'thinking');
    const { output: leaderOutput } = await dispatchToMember(
      swarmId, leader, `echo "Goal: ${goal}" && echo "Workers: ${workers.map(w => w.name).join(', ')}"`, abortSignal
    );

    if (abortSignal.aborted) return;

    // Round 2: Workers execute in parallel
    store.getState().advanceRound(swarmId);
    await Promise.allSettled(
      workers.map((w) =>
        dispatchToMember(swarmId, w, `echo "Leader directive: ${leaderOutput.substring(0, 200)}"`, abortSignal)
      )
    );
  }, [dispatchToMember]);

  // ─── Consensus 调度 ───
  const runConsensus = useCallback(async (
    swarmId: string,
    members: SwarmMember[],
    goal: string,
    abortSignal: AbortSignal,
  ) => {
    // All members execute
    store.getState().advanceRound(swarmId);
    const command = `echo "Goal: ${goal}" && echo "Vote on solution"`;
    const results = await Promise.allSettled(
      members.map((m) => dispatchToMember(swarmId, m, command, abortSignal))
    );

    // Tally "votes"
    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const total = members.length;

    const voteMsg: SwarmMessage = {
      id: crypto.randomUUID(),
      fromMemberId: 'system',
      toMemberId: 'broadcast',
      content: `Consensus vote: ${successful}/${total} members completed successfully`,
      messageType: 'consensus_vote',
      timestamp: new Date(),
      round: store.getState().getSwarm(swarmId)?.currentRound || 0,
    };
    store.getState().addMessage(swarmId, voteMsg);
  }, [dispatchToMember]);

  // ─── 主入口: startSwarm ───
  const startSwarm = useCallback(async (definition: SwarmDefinition): Promise<string> => {
    const swarmId = store.getState().startSwarm(definition);
    const abortController = new AbortController();
    abortControllersRef.current.set(swarmId, abortController);
    const startTime = Date.now();

    try {
      // 1. 批量创建容器
      store.getState().setSwarmState(swarmId, 'initializing');
      const createResult = await callGateway('swarm_create', {
        definition: {
          id: definition.id,
          name: definition.name,
          members: definition.members.map((m) => ({
            id: m.id,
            name: m.name,
            role: m.role,
          })),
          containerConfig: definition.containerConfig,
        },
      });

      if (!createResult?.containerMap) {
        throw new Error('Failed to create swarm containers');
      }

      store.getState().setContainerMap(swarmId, createResult.containerMap);
      store.getState().setSwarmState(swarmId, 'running');

      // 2. 按 communicationMode 调度
      const { communicationMode, members, sharedContext } = definition;
      const goal = sharedContext.goal || definition.description;

      switch (communicationMode) {
        case 'sequential':
          await runSequential(swarmId, members, goal, abortController.signal);
          break;
        case 'parallel':
          await runParallel(swarmId, members, goal, abortController.signal);
          break;
        case 'hierarchical':
          await runHierarchical(swarmId, members, goal, abortController.signal);
          break;
        case 'consensus':
          await runConsensus(swarmId, members, goal, abortController.signal);
          break;
      }

      // 3. 汇总结果
      const swarmState = store.getState().getSwarm(swarmId);
      const contributions: SwarmMemberContribution[] = (swarmState?.memberStates || []).map((ms) => ({
        memberId: ms.memberId,
        name: ms.name,
        role: definition.members.find((m) => m.id === ms.memberId)?.role || 'worker',
        tasksSolved: ms.status === 'done' ? 1 : 0,
        tokensUsed: ms.tokensUsed,
        outputSummary: ms.currentTask || '',
      }));

      const result: SwarmResult = {
        success: true,
        output: `Swarm "${definition.name}" completed`,
        memberContributions: contributions,
        totalRounds: swarmState?.currentRound || 0,
        totalTokensUsed: contributions.reduce((sum, c) => sum + c.tokensUsed, 0),
        totalDurationMs: Date.now() - startTime,
        consensusReached: communicationMode === 'consensus' ? true : undefined,
      };

      store.getState().setSwarmResult(swarmId, result);
    } catch (error: any) {
      if (error.message !== 'Cancelled') {
        store.getState().setSwarmError(swarmId, error.message || 'Unknown error');
      }
    } finally {
      abortControllersRef.current.delete(swarmId);
    }

    return swarmId;
  }, [callGateway, runSequential, runParallel, runHierarchical, runConsensus]);

  // ─── cancelSwarm ───
  const cancelSwarm = useCallback(async (swarmId: string) => {
    const controller = abortControllersRef.current.get(swarmId);
    if (controller) controller.abort();
    store.getState().setSwarmState(swarmId, 'cancelled');
    abortControllersRef.current.delete(swarmId);
  }, []);

  // ─── pause / resume ───
  const pauseMember = useCallback((swarmId: string, memberId: string) => {
    store.getState().setMemberStatus(swarmId, memberId, 'waiting');
  }, []);

  const resumeMember = useCallback((swarmId: string, memberId: string) => {
    store.getState().setMemberStatus(swarmId, memberId, 'executing');
  }, []);

  return { startSwarm, cancelSwarm, pauseMember, resumeMember };
}
