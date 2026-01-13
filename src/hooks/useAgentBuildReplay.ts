import { useState, useCallback, useRef, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useAgent, AgentWithSkills } from './useAgents';
import { useBuildPlanStore } from '@/stores/buildPlanStore';
import { MANUS_KERNEL } from '@/data/manusKernel';
import { BuildPlan } from '@/types/buildPlan';

// Phase key type from BuildPlan
type PhaseKey = keyof BuildPlan['phases'];

// Build step types
export interface BuildStep {
  type: 'manus' | 'agent' | 'trigger' | 'knowledge' | 'skill' | 'mcpAction' | 'output' | 'edge';
  id: string;
  label: string;
  data: Record<string, unknown>;
  position?: { x: number; y: number };
  order: number;
  sourceId?: string;
  targetId?: string;
}

export interface BuildReplayState {
  isReplaying: boolean;
  isComplete: boolean;
  currentStep: number;
  totalSteps: number;
  progress: number;
  phase: 'loading' | 'analyzing' | 'assembling' | 'connecting' | 'complete';
  phaseLabel: string;
  visibleNodes: Node[];
  visibleEdges: Edge[];
}

export interface UseAgentBuildReplayReturn {
  state: BuildReplayState;
  startReplay: () => Promise<void>;
  skipReplay: () => void;
  pauseReplay: () => void;
  resumeReplay: () => void;
}

// Animation timing
const STEP_DELAY = 180; // ms between steps
const PHASE_DELAY = 400; // ms between phases
const EDGE_DELAY = 100; // ms between edges

// Infer build sequence from agent data (for agents without build_metadata)
function inferBuildSequence(agent: AgentWithSkills): BuildStep[] {
  const sequence: BuildStep[] = [];
  const manifest = agent.manifest as Record<string, unknown> | null;
  let order = 0;

  // 1. Manus Kernel (always first)
  sequence.push({
    type: 'manus',
    id: 'manus-kernel',
    label: 'Manus 内核',
    data: { ...MANUS_KERNEL } as Record<string, unknown>,
    position: { x: 400, y: 50 },
    order: order++,
  });

  // 2. Agent core node
  sequence.push({
    type: 'agent',
    id: 'agent-central',
    label: agent.name,
    data: {
      name: agent.name,
      department: agent.department || '',
      model: agent.model,
      skillCount: agent.skills?.length || 0,
    },
    position: { x: 400, y: 250 },
    order: order++,
  });

  // Edge: Manus → Agent
  sequence.push({
    type: 'edge',
    id: 'edge-manus-agent',
    label: 'Manus 生命周期',
    data: { edgeType: 'manusLifecycle' },
    sourceId: 'manus-kernel',
    targetId: 'agent-central',
    order: order++,
  });

  // 3. Trigger node
  sequence.push({
    type: 'trigger',
    id: 'trigger-chat',
    label: '对话触发器',
    data: { type: 'chat', enabled: true },
    position: { x: 100, y: 250 },
    order: order++,
  });

  // Edge: Trigger → Agent
  sequence.push({
    type: 'edge',
    id: 'edge-trigger-agent',
    label: '输入连接',
    data: {},
    sourceId: 'trigger-chat',
    targetId: 'agent-central',
    order: order++,
  });

  // 4. Knowledge bases
  const knowledgeBases = manifest?.knowledgeBases as Array<Record<string, unknown>> | undefined;
  if (knowledgeBases && Array.isArray(knowledgeBases)) {
    knowledgeBases.forEach((kb, i) => {
      const nodeId = `knowledge-${(kb.id as string) || i}-${Date.now()}`;
      sequence.push({
        type: 'knowledge',
        id: nodeId,
        label: (kb.name as string) || `知识库 ${i + 1}`,
        data: kb,
        position: { x: 650 + (i % 2) * 180, y: 100 + Math.floor(i / 2) * 120 },
        order: order++,
      });

      // Edge: Knowledge → Agent
      sequence.push({
        type: 'edge',
        id: `edge-${nodeId}-agent`,
        label: 'RAG 连接',
        data: { type: 'rag' },
        sourceId: nodeId,
        targetId: 'agent-central',
        order: order++,
      });
    });
  }

  // 5. Skills
  if (agent.skills && agent.skills.length > 0) {
    agent.skills.forEach((skill, i) => {
      const nodeId = `skill-${skill.id}-${Date.now()}-${i}`;
      sequence.push({
        type: 'skill',
        id: nodeId,
        label: skill.name,
        data: {
          id: skill.id,
          name: skill.name,
          category: skill.category,
          description: skill.description || '',
          permissions: skill.permissions || [],
        },
        position: { x: 100 + (i % 3) * 180, y: 80 + Math.floor(i / 3) * 140 },
        order: order++,
      });

      // Edge: Skill → Agent
      sequence.push({
        type: 'edge',
        id: `edge-${nodeId}-agent`,
        label: '技能连接',
        data: {},
        sourceId: nodeId,
        targetId: 'agent-central',
        order: order++,
      });
    });
  }

  // 6. MCP Tools
  const mcpTools = manifest?.mcpTools as Array<Record<string, unknown>> | undefined;
  if (mcpTools && Array.isArray(mcpTools)) {
    mcpTools.forEach((mcp, i) => {
      const nodeId = `mcp-action-${(mcp.name as string) || i}-${Date.now()}`;
      sequence.push({
        type: 'mcpAction',
        id: nodeId,
        label: (mcp.name as string) || `MCP 工具 ${i + 1}`,
        data: mcp,
        position: { x: 650 + (i % 2) * 180, y: 350 + Math.floor(i / 2) * 100 },
        order: order++,
      });

      // Edge: MCP → Agent
      sequence.push({
        type: 'edge',
        id: `edge-${nodeId}-agent`,
        label: 'MCP 连接',
        data: {},
        sourceId: nodeId,
        targetId: 'agent-central',
        order: order++,
      });
    });
  }

  // 7. Output node
  sequence.push({
    type: 'output',
    id: 'output-message',
    label: '消息输出',
    data: { type: 'message' },
    position: { x: 400, y: 450 },
    order: order++,
  });

  // Edge: Agent → Output
  sequence.push({
    type: 'edge',
    id: 'edge-agent-output',
    label: '输出连接',
    data: {},
    sourceId: 'agent-central',
    targetId: 'output-message',
    order: order++,
  });

  return sequence.sort((a, b) => a.order - b.order);
}

// Convert BuildStep to ReactFlow Node
function stepToNode(step: BuildStep): Node | null {
  if (step.type === 'edge') return null;

  const baseNode = {
    id: step.id,
    position: step.position || { x: 0, y: 0 },
    data: step.data,
  };

  switch (step.type) {
    case 'manus':
      return { ...baseNode, type: 'manus' };
    case 'agent':
      return { ...baseNode, type: 'agent', draggable: false };
    case 'trigger':
      return { ...baseNode, type: 'trigger' };
    case 'knowledge':
      return { ...baseNode, type: 'knowledge' };
    case 'skill':
      return { ...baseNode, type: 'skill' };
    case 'mcpAction':
      return { ...baseNode, type: 'mcpAction' };
    case 'output':
      return { ...baseNode, type: 'output' };
    default:
      return null;
  }
}

// Convert BuildStep to ReactFlow Edge
function stepToEdge(step: BuildStep): Edge | null {
  if (step.type !== 'edge' || !step.sourceId || !step.targetId) return null;

  const isManusEdge = step.data?.edgeType === 'manusLifecycle';

  return {
    id: step.id,
    source: step.sourceId,
    target: step.targetId,
    type: isManusEdge ? 'manusLifecycle' : 'animatedFlow',
    animated: true,
    style: isManusEdge 
      ? { stroke: 'hsl(45, 93%, 47%)', strokeWidth: 2 }
      : { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
    data: step.data,
  };
}

export function useAgentBuildReplay(agentId: string | null): UseAgentBuildReplayReturn {
  const { data: agent, isLoading } = useAgent(agentId);
  const { 
    initializePlan, 
    startPhase, 
    completePhase, 
    addEvent,
    reset: resetBuildPlan 
  } = useBuildPlanStore();

  const [state, setState] = useState<BuildReplayState>({
    isReplaying: false,
    isComplete: false,
    currentStep: 0,
    totalSteps: 0,
    progress: 0,
    phase: 'loading',
    phaseLabel: '加载中...',
    visibleNodes: [],
    visibleEdges: [],
  });

  const isPausedRef = useRef(false);
  const abortRef = useRef(false);
  const stepsRef = useRef<BuildStep[]>([]);

  // Phase labels
  const phaseLabels: Record<BuildReplayState['phase'], string> = {
    loading: '加载智能体数据...',
    analyzing: '解析构建结构...',
    assembling: '组装核心组件...',
    connecting: '建立节点连接...',
    complete: '构建完成',
  };

  // Map step types to build phases
  const getPhaseForStep = (step: BuildStep): BuildReplayState['phase'] => {
    if (step.type === 'manus' || step.type === 'agent') return 'assembling';
    if (step.type === 'edge') return 'connecting';
    return 'assembling';
  };

  // Map step types to store phase keys
  const getStorePhaseForStep = (step: BuildStep): PhaseKey => {
    const phaseMap: Record<string, PhaseKey> = {
      manus: 'intentAnalysis',
      agent: 'intentAnalysis',
      trigger: 'assetCheck',
      knowledge: 'assetCheck',
      skill: 'skillGeneration',
      mcpAction: 'skillGeneration',
      output: 'assembly',
      edge: 'assembly',
    };
    return phaseMap[step.type] || 'assembly';
  };

  const startReplay = useCallback(async () => {
    if (!agent || isLoading) return;

    abortRef.current = false;
    isPausedRef.current = false;

    // Reset and initialize build plan store
    resetBuildPlan();
    initializePlan(`${agent.name} 构建回放`);

    // Initialize state
    setState(prev => ({
      ...prev,
      isReplaying: true,
      isComplete: false,
      currentStep: 0,
      phase: 'loading',
      phaseLabel: phaseLabels.loading,
      visibleNodes: [],
      visibleEdges: [],
    }));

    // Wait a moment for loading state
    await new Promise(resolve => setTimeout(resolve, PHASE_DELAY));

    if (abortRef.current) return;

    // Analyze phase
    setState(prev => ({
      ...prev,
      phase: 'analyzing',
      phaseLabel: phaseLabels.analyzing,
    }));

    startPhase('intentAnalysis');
    addEvent('intentAnalysis', '分析智能体构建结构...', 'info');

    // Get build sequence
    let buildSequence: BuildStep[];
    const agentAny = agent as unknown as { build_metadata?: { nodeSequence?: BuildStep[] } };
    const buildMetadata = agentAny.build_metadata;

    if (buildMetadata?.nodeSequence && buildMetadata.nodeSequence.length > 0) {
      // Use stored build metadata
      buildSequence = buildMetadata.nodeSequence;
    } else {
      // Infer from agent structure
      buildSequence = inferBuildSequence(agent);
    }

    stepsRef.current = buildSequence;

    setState(prev => ({
      ...prev,
      totalSteps: buildSequence.length,
    }));

    await new Promise(resolve => setTimeout(resolve, PHASE_DELAY));

    if (abortRef.current) return;

    completePhase('intentAnalysis', `解析完成: ${buildSequence.length} 个构建步骤`);

    // Track which phases we've started
    const startedPhases = new Set<PhaseKey>(['intentAnalysis']);

    // Process each step
    for (let i = 0; i < buildSequence.length; i++) {
      // Check for abort
      if (abortRef.current) return;

      // Wait if paused
      while (isPausedRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (abortRef.current) return;
      }

      const step = buildSequence[i];
      const newPhase = getPhaseForStep(step);
      const storePhase = getStorePhaseForStep(step);

      // Start phase if not already started
      if (!startedPhases.has(storePhase)) {
        startPhase(storePhase);
        startedPhases.add(storePhase);
      }

      setState(prev => ({
        ...prev,
        currentStep: i + 1,
        progress: Math.round(((i + 1) / buildSequence.length) * 100),
        phase: newPhase,
        phaseLabel: phaseLabels[newPhase],
      }));

      // Add node or edge
      if (step.type === 'edge') {
        const edge = stepToEdge(step);
        if (edge) {
          setState(prev => ({
            ...prev,
            visibleEdges: [...prev.visibleEdges, edge],
          }));
        }
        await new Promise(resolve => setTimeout(resolve, EDGE_DELAY));
      } else {
        const node = stepToNode(step);
        if (node) {
          setState(prev => ({
            ...prev,
            visibleNodes: [...prev.visibleNodes, node],
          }));
          addEvent(storePhase, `添加 ${step.label}`, 'success');
        }
        await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
      }
    }

    // Complete remaining phases
    for (const phase of ['assetCheck', 'skillGeneration', 'assembly', 'validation'] as PhaseKey[]) {
      if (startedPhases.has(phase)) {
        completePhase(phase);
      } else {
        startPhase(phase);
        completePhase(phase, '回放完成');
      }
    }

    setState(prev => ({
      ...prev,
      isReplaying: false,
      isComplete: true,
      phase: 'complete',
      phaseLabel: phaseLabels.complete,
      progress: 100,
    }));
  }, [agent, isLoading, resetBuildPlan, initializePlan, startPhase, completePhase, addEvent, phaseLabels]);

  const skipReplay = useCallback(() => {
    if (!agent) return;

    abortRef.current = true;

    // Get all steps and immediately render
    const buildSequence = stepsRef.current.length > 0 
      ? stepsRef.current 
      : inferBuildSequence(agent);

    const allNodes = buildSequence
      .filter(step => step.type !== 'edge')
      .map(stepToNode)
      .filter((n): n is Node => n !== null);

    const allEdges = buildSequence
      .filter(step => step.type === 'edge')
      .map(stepToEdge)
      .filter((e): e is Edge => e !== null);

    setState({
      isReplaying: false,
      isComplete: true,
      currentStep: buildSequence.length,
      totalSteps: buildSequence.length,
      progress: 100,
      phase: 'complete',
      phaseLabel: '构建完成',
      visibleNodes: allNodes,
      visibleEdges: allEdges,
    });

    // Complete all phases
    for (const phase of ['intentAnalysis', 'assetCheck', 'skillGeneration', 'assembly', 'validation'] as PhaseKey[]) {
      startPhase(phase);
      completePhase(phase, '已跳过');
    }
  }, [agent, startPhase, completePhase]);

  const pauseReplay = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  const resumeReplay = useCallback(() => {
    isPausedRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
    };
  }, []);

  return {
    state,
    startReplay,
    skipReplay,
    pauseReplay,
    resumeReplay,
  };
}
