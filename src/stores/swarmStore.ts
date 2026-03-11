// Swarm 运行时状态 Store (Swarm Runtime State Store)

import { create } from 'zustand';
import type {
  SwarmDefinition,
  SwarmRuntimeState,
  SwarmMemberState,
  SwarmMemberStatus,
  SwarmExecutionState,
  SwarmMessage,
  SwarmResult,
} from '../types/swarms.ts';

interface SwarmStoreState {
  // 活跃 Swarm 列表
  activeSwarms: Map<string, SwarmRuntimeState>;
  // 当前焦点 Swarm
  focusedSwarmId: string | null;
  // 容器映射: swarmId → { memberId → containerId }
  containerMaps: Map<string, Record<string, string>>;

  // ─── Swarm 生命周期 ───
  startSwarm: (definition: SwarmDefinition) => string;
  setSwarmState: (swarmId: string, state: SwarmExecutionState) => void;
  setSwarmResult: (swarmId: string, result: SwarmResult) => void;
  setSwarmError: (swarmId: string, error: string) => void;
  advanceRound: (swarmId: string) => void;
  resetSwarm: (swarmId: string) => void;
  removeSwarm: (swarmId: string) => void;

  // ─── 容器映射 ───
  setContainerMap: (swarmId: string, map: Record<string, string>) => void;
  getContainerId: (swarmId: string, memberId: string) => string | undefined;

  // ─── 成员状态 ───
  updateMemberState: (swarmId: string, memberId: string, updates: Partial<SwarmMemberState>) => void;
  setMemberStatus: (swarmId: string, memberId: string, status: SwarmMemberStatus) => void;

  // ─── 消息记录 ───
  addMessage: (swarmId: string, message: SwarmMessage) => void;

  // ─── 焦点 ───
  setFocusedSwarm: (swarmId: string | null) => void;
  getFocusedSwarm: () => SwarmRuntimeState | undefined;

  // ─── 查询 ───
  getSwarm: (swarmId: string) => SwarmRuntimeState | undefined;
  getAllSwarms: () => SwarmRuntimeState[];
}

export const useSwarmStore = create<SwarmStoreState>((set, get) => ({
  activeSwarms: new Map(),
  focusedSwarmId: null,
  containerMaps: new Map(),

  startSwarm: (definition: SwarmDefinition) => {
    const swarmId = definition.id;
    const memberStates: SwarmMemberState[] = definition.members.map((m) => ({
      memberId: m.id,
      agentId: m.agentId,
      name: m.name,
      status: 'idle' as SwarmMemberStatus,
      progress: 0,
      lastActivityAt: new Date(),
      tokensUsed: 0,
      messagesProcessed: 0,
    }));

    const runtimeState: SwarmRuntimeState = {
      swarmId,
      state: 'initializing',
      currentRound: 0,
      memberStates,
      messageLog: [],
      startedAt: new Date(),
    };

    set((s) => {
      const next = new Map(s.activeSwarms);
      next.set(swarmId, runtimeState);
      return { activeSwarms: next, focusedSwarmId: swarmId };
    });

    return swarmId;
  },

  setSwarmState: (swarmId, state) =>
    set((s) => {
      const swarm = s.activeSwarms.get(swarmId);
      if (!swarm) return s;
      const next = new Map(s.activeSwarms);
      next.set(swarmId, {
        ...swarm,
        state,
        completedAt: state === 'completed' || state === 'failed' || state === 'cancelled' ? new Date() : swarm.completedAt,
      });
      return { activeSwarms: next };
    }),

  setSwarmResult: (swarmId, result) =>
    set((s) => {
      const swarm = s.activeSwarms.get(swarmId);
      if (!swarm) return s;
      const next = new Map(s.activeSwarms);
      next.set(swarmId, { ...swarm, result, state: 'completed', completedAt: new Date() });
      return { activeSwarms: next };
    }),

  setSwarmError: (swarmId, error) =>
    set((s) => {
      const swarm = s.activeSwarms.get(swarmId);
      if (!swarm) return s;
      const next = new Map(s.activeSwarms);
      next.set(swarmId, { ...swarm, error, state: 'failed', completedAt: new Date() });
      return { activeSwarms: next };
    }),

  advanceRound: (swarmId) =>
    set((s) => {
      const swarm = s.activeSwarms.get(swarmId);
      if (!swarm) return s;
      const next = new Map(s.activeSwarms);
      next.set(swarmId, { ...swarm, currentRound: swarm.currentRound + 1 });
      return { activeSwarms: next };
    }),

  resetSwarm: (swarmId) =>
    set((s) => {
      const next = new Map(s.activeSwarms);
      next.delete(swarmId);
      const cms = new Map(s.containerMaps);
      cms.delete(swarmId);
      return {
        activeSwarms: next,
        containerMaps: cms,
        focusedSwarmId: s.focusedSwarmId === swarmId ? null : s.focusedSwarmId,
      };
    }),

  removeSwarm: (swarmId) => get().resetSwarm(swarmId),

  setContainerMap: (swarmId, map) =>
    set((s) => {
      const next = new Map(s.containerMaps);
      next.set(swarmId, map);
      return { containerMaps: next };
    }),

  getContainerId: (swarmId, memberId) => {
    return get().containerMaps.get(swarmId)?.[memberId];
  },

  updateMemberState: (swarmId, memberId, updates) =>
    set((s) => {
      const swarm = s.activeSwarms.get(swarmId);
      if (!swarm) return s;
      const next = new Map(s.activeSwarms);
      next.set(swarmId, {
        ...swarm,
        memberStates: swarm.memberStates.map((m) =>
          m.memberId === memberId ? { ...m, ...updates, lastActivityAt: new Date() } : m
        ),
      });
      return { activeSwarms: next };
    }),

  setMemberStatus: (swarmId, memberId, status) =>
    get().updateMemberState(swarmId, memberId, { status }),

  addMessage: (swarmId, message) =>
    set((s) => {
      const swarm = s.activeSwarms.get(swarmId);
      if (!swarm) return s;
      const next = new Map(s.activeSwarms);
      next.set(swarmId, {
        ...swarm,
        messageLog: [...swarm.messageLog, message].slice(-500),
      });
      return { activeSwarms: next };
    }),

  setFocusedSwarm: (swarmId) => set({ focusedSwarmId: swarmId }),

  getFocusedSwarm: () => {
    const { focusedSwarmId, activeSwarms } = get();
    return focusedSwarmId ? activeSwarms.get(focusedSwarmId) : undefined;
  },

  getSwarm: (swarmId) => get().activeSwarms.get(swarmId),

  getAllSwarms: () => Array.from(get().activeSwarms.values()),
}));
