// =====================================================
// DSL 到 React Flow Graph 转换器
// DSL to React Flow Graph Converter
// =====================================================

import { Node, Edge } from '@xyflow/react';
import {
  WorkflowDSL,
  StageSpec,
  NodeSpec,
  BranchSpec,
  GeneratedNode,
  GeneratedEdge,
  GeneratedVariableMapping,
} from '@/types/workflowDSL';

// ========== 布局配置 ==========

interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalGap: number;
  verticalGap: number;
  branchGap: number;
  startX: number;
  startY: number;
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  nodeWidth: 280,
  nodeHeight: 120,
  horizontalGap: 100,
  verticalGap: 80,
  branchGap: 150,
  startX: 100,
  startY: 100,
};

// ========== 节点类型映射 ==========

const NODE_TYPE_MAP: Record<string, string> = {
  trigger: 'triggerNode',
  agent: 'agentNode',
  skill: 'skillNode',
  mcp_action: 'mcpActionNode',
  knowledge: 'knowledgeBaseNode',
  condition: 'conditionNode',
  parallel: 'parallelNode',
  loop: 'loopNode',
  intervention: 'interventionNode',
  output: 'outputNode',
};

// ========== 主转换函数 ==========

export function convertDSLToGraph(
  dsl: WorkflowDSL,
  config: Partial<LayoutConfig> = {}
): {
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
  variableMappings: GeneratedVariableMapping[];
} {
  const layoutConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  const nodes: GeneratedNode[] = [];
  const edges: GeneratedEdge[] = [];
  const variableMappings: GeneratedVariableMapping[] = [];

  let currentX = layoutConfig.startX;
  let currentY = layoutConfig.startY;

  // 1. 创建触发器节点
  const triggerId = 'trigger-node';
  nodes.push({
    id: triggerId,
    type: 'triggerNode',
    position: { x: currentX, y: currentY },
    data: {
      label: '触发器',
      triggerType: dsl.trigger.type,
      config: dsl.trigger.config || {},
    },
  });

  currentY += layoutConfig.nodeHeight + layoutConfig.verticalGap;
  let lastNodeIds: string[] = [triggerId];

  // 2. 处理每个阶段
  for (const stage of dsl.stages) {
    const stageResult = processStage(
      stage,
      lastNodeIds,
      currentX,
      currentY,
      layoutConfig,
      variableMappings
    );

    nodes.push(...stageResult.nodes);
    edges.push(...stageResult.edges);
    lastNodeIds = stageResult.outputNodeIds;
    currentY = stageResult.nextY;
  }

  // 3. 创建输出节点（如果需要）
  if (dsl.stages.length > 0) {
    const outputId = 'output-node';
    nodes.push({
      id: outputId,
      type: 'outputNode',
      position: { x: currentX, y: currentY },
      data: {
        label: '输出',
        format: 'auto',
      },
    });

    // 连接最后的节点到输出
    for (const lastId of lastNodeIds) {
      edges.push({
        id: `edge-${lastId}-${outputId}`,
        source: lastId,
        target: outputId,
        animated: true,
      });
    }
  }

  return { nodes, edges, variableMappings };
}

// ========== 阶段处理 ==========

function processStage(
  stage: StageSpec,
  inputNodeIds: string[],
  startX: number,
  startY: number,
  config: LayoutConfig,
  variableMappings: GeneratedVariableMapping[]
): {
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
  outputNodeIds: string[];
  nextY: number;
} {
  switch (stage.type) {
    case 'sequential':
      return processSequentialStage(stage, inputNodeIds, startX, startY, config, variableMappings);
    case 'parallel':
      return processParallelStage(stage, inputNodeIds, startX, startY, config, variableMappings);
    case 'conditional':
      return processConditionalStage(stage, inputNodeIds, startX, startY, config, variableMappings);
    case 'loop':
      return processLoopStage(stage, inputNodeIds, startX, startY, config, variableMappings);
    default:
      return processSequentialStage(stage, inputNodeIds, startX, startY, config, variableMappings);
  }
}

// ========== 顺序阶段处理 ==========

function processSequentialStage(
  stage: StageSpec,
  inputNodeIds: string[],
  startX: number,
  startY: number,
  config: LayoutConfig,
  variableMappings: GeneratedVariableMapping[]
): {
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
  outputNodeIds: string[];
  nextY: number;
} {
  const nodes: GeneratedNode[] = [];
  const edges: GeneratedEdge[] = [];
  let currentY = startY;
  let prevNodeIds = inputNodeIds;

  for (const nodeSpec of stage.nodes) {
    const node = createNodeFromSpec(nodeSpec, startX, currentY, config);
    nodes.push(node);

    // 创建从前序节点的连线
    for (const prevId of prevNodeIds) {
      const edge = createEdge(prevId, node.id, nodeSpec.inputMappings, variableMappings);
      edges.push(edge);
    }

    prevNodeIds = [node.id];
    currentY += config.nodeHeight + config.verticalGap;
  }

  return {
    nodes,
    edges,
    outputNodeIds: prevNodeIds,
    nextY: currentY,
  };
}

// ========== 并行阶段处理 ==========

function processParallelStage(
  stage: StageSpec,
  inputNodeIds: string[],
  startX: number,
  startY: number,
  config: LayoutConfig,
  variableMappings: GeneratedVariableMapping[]
): {
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
  outputNodeIds: string[];
  nextY: number;
} {
  const nodes: GeneratedNode[] = [];
  const edges: GeneratedEdge[] = [];
  const outputNodeIds: string[] = [];

  // 创建并行分叉节点
  const forkId = `parallel-fork-${stage.id}`;
  nodes.push({
    id: forkId,
    type: 'parallelNode',
    position: { x: startX, y: startY },
    data: {
      label: stage.name || '并行执行',
      mode: 'fork',
      waitAll: stage.parallelConfig?.waitAll ?? true,
    },
  });

  // 连接输入到分叉
  for (const inputId of inputNodeIds) {
    edges.push({
      id: `edge-${inputId}-${forkId}`,
      source: inputId,
      target: forkId,
      animated: true,
    });
  }

  // 并行执行各节点
  const parallelY = startY + config.nodeHeight + config.verticalGap;
  const totalWidth = stage.nodes.length * (config.nodeWidth + config.horizontalGap) - config.horizontalGap;
  let parallelX = startX - totalWidth / 2 + config.nodeWidth / 2;
  let maxY = parallelY;

  for (const nodeSpec of stage.nodes) {
    const node = createNodeFromSpec(nodeSpec, parallelX, parallelY, config);
    nodes.push(node);
    outputNodeIds.push(node.id);

    // 从分叉连接到并行节点
    edges.push({
      id: `edge-${forkId}-${node.id}`,
      source: forkId,
      target: node.id,
      sourceHandle: 'parallel-out',
      animated: true,
    });

    parallelX += config.nodeWidth + config.horizontalGap;
    maxY = Math.max(maxY, parallelY + config.nodeHeight);
  }

  // 创建并行汇合节点
  const joinId = `parallel-join-${stage.id}`;
  const joinY = maxY + config.verticalGap;
  nodes.push({
    id: joinId,
    type: 'parallelNode',
    position: { x: startX, y: joinY },
    data: {
      label: '汇合',
      mode: 'join',
    },
  });

  // 连接并行节点到汇合
  for (const nodeId of outputNodeIds) {
    edges.push({
      id: `edge-${nodeId}-${joinId}`,
      source: nodeId,
      target: joinId,
      animated: true,
    });
  }

  return {
    nodes,
    edges,
    outputNodeIds: [joinId],
    nextY: joinY + config.nodeHeight + config.verticalGap,
  };
}

// ========== 条件阶段处理 ==========

function processConditionalStage(
  stage: StageSpec,
  inputNodeIds: string[],
  startX: number,
  startY: number,
  config: LayoutConfig,
  variableMappings: GeneratedVariableMapping[]
): {
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
  outputNodeIds: string[];
  nextY: number;
} {
  const nodes: GeneratedNode[] = [];
  const edges: GeneratedEdge[] = [];
  const branchEndNodeIds: string[] = [];

  // 创建条件判断节点
  const conditionId = `condition-${stage.id}`;
  nodes.push({
    id: conditionId,
    type: 'conditionNode',
    position: { x: startX, y: startY },
    data: {
      label: stage.name || '条件判断',
      branches: stage.branches?.map(b => ({
        id: b.id,
        name: b.name,
        condition: b.condition,
      })) || [],
    },
  });

  // 连接输入到条件节点
  for (const inputId of inputNodeIds) {
    edges.push({
      id: `edge-${inputId}-${conditionId}`,
      source: inputId,
      target: conditionId,
      animated: true,
    });
  }

  // 处理每个分支
  const branchY = startY + config.nodeHeight + config.verticalGap;
  const branches = stage.branches || [];
  const totalWidth = branches.length * (config.nodeWidth + config.branchGap) - config.branchGap;
  let branchX = startX - totalWidth / 2 + config.nodeWidth / 2;
  let maxBranchY = branchY;

  for (const branch of branches) {
    // 处理分支中的节点
    let currentBranchY = branchY;
    let prevNodeIds = [conditionId];

    for (const nodeSpec of branch.nodes) {
      const node = createNodeFromSpec(nodeSpec, branchX, currentBranchY, config);
      nodes.push(node);

      // 连接到前一个节点
      for (const prevId of prevNodeIds) {
        const sourceHandle = prevId === conditionId ? `branch-${branch.id}` : undefined;
        edges.push({
          id: `edge-${prevId}-${node.id}`,
          source: prevId,
          target: node.id,
          sourceHandle,
          animated: true,
          data: { branchId: branch.id, branchName: branch.name },
        });
      }

      prevNodeIds = [node.id];
      currentBranchY += config.nodeHeight + config.verticalGap;
    }

    branchEndNodeIds.push(...prevNodeIds);
    maxBranchY = Math.max(maxBranchY, currentBranchY);
    branchX += config.nodeWidth + config.branchGap;
  }

  return {
    nodes,
    edges,
    outputNodeIds: branchEndNodeIds,
    nextY: maxBranchY,
  };
}

// ========== 循环阶段处理 ==========

function processLoopStage(
  stage: StageSpec,
  inputNodeIds: string[],
  startX: number,
  startY: number,
  config: LayoutConfig,
  variableMappings: GeneratedVariableMapping[]
): {
  nodes: GeneratedNode[];
  edges: GeneratedEdge[];
  outputNodeIds: string[];
  nextY: number;
} {
  const nodes: GeneratedNode[] = [];
  const edges: GeneratedEdge[] = [];

  // 创建循环开始节点
  const loopStartId = `loop-start-${stage.id}`;
  nodes.push({
    id: loopStartId,
    type: 'loopNode',
    position: { x: startX, y: startY },
    data: {
      label: stage.name || '循环',
      mode: 'start',
      iteratorVariable: stage.loopConfig?.iteratorVariable,
      collectionExpression: stage.loopConfig?.collectionExpression,
      maxIterations: stage.loopConfig?.maxIterations,
    },
  });

  // 连接输入
  for (const inputId of inputNodeIds) {
    edges.push({
      id: `edge-${inputId}-${loopStartId}`,
      source: inputId,
      target: loopStartId,
      animated: true,
    });
  }

  // 处理循环体内的节点
  let currentY = startY + config.nodeHeight + config.verticalGap;
  let prevNodeIds = [loopStartId];

  for (const nodeSpec of stage.nodes) {
    const node = createNodeFromSpec(nodeSpec, startX, currentY, config);
    nodes.push(node);

    for (const prevId of prevNodeIds) {
      edges.push({
        id: `edge-${prevId}-${node.id}`,
        source: prevId,
        target: node.id,
        animated: true,
      });
    }

    prevNodeIds = [node.id];
    currentY += config.nodeHeight + config.verticalGap;
  }

  // 创建循环结束节点
  const loopEndId = `loop-end-${stage.id}`;
  nodes.push({
    id: loopEndId,
    type: 'loopNode',
    position: { x: startX, y: currentY },
    data: {
      label: '循环结束',
      mode: 'end',
    },
  });

  // 连接到循环结束
  for (const prevId of prevNodeIds) {
    edges.push({
      id: `edge-${prevId}-${loopEndId}`,
      source: prevId,
      target: loopEndId,
      animated: true,
    });
  }

  // 循环回边
  edges.push({
    id: `edge-${loopEndId}-${loopStartId}-back`,
    source: loopEndId,
    target: loopStartId,
    sourceHandle: 'loop-back',
    targetHandle: 'loop-in',
    animated: true,
    data: { isLoopBack: true },
  });

  return {
    nodes,
    edges,
    outputNodeIds: [loopEndId],
    nextY: currentY + config.nodeHeight + config.verticalGap,
  };
}

// ========== 辅助函数 ==========

function createNodeFromSpec(
  spec: NodeSpec,
  x: number,
  y: number,
  config: LayoutConfig
): GeneratedNode {
  const nodeType = NODE_TYPE_MAP[spec.type] || 'default';

  return {
    id: spec.id,
    type: nodeType,
    position: { x, y },
    data: {
      label: spec.name,
      description: spec.description,
      assetId: spec.assetId,
      assetType: spec.assetType,
      config: spec.config,
      outputKey: spec.outputKey,
      riskLevel: spec.riskLevel,
      requiresConfirmation: spec.requiresConfirmation,
      ...spec.config,
    },
  };
}

function createEdge(
  sourceId: string,
  targetId: string,
  inputMappings: { targetField: string; sourceExpression: string }[],
  variableMappings: GeneratedVariableMapping[]
): GeneratedEdge {
  const edgeId = `edge-${sourceId}-${targetId}`;

  // 如果有输入映射，添加到变量映射表
  if (inputMappings && inputMappings.length > 0) {
    variableMappings.push({
      edgeId,
      sourceNodeId: sourceId,
      targetNodeId: targetId,
      mappings: inputMappings.map((mapping, idx) => ({
        id: `mapping-${edgeId}-${idx}`,
        source: mapping.sourceExpression,
        target: `{{${targetId}.input.${mapping.targetField}}}`,
        enabled: true,
      })),
    });
  }

  return {
    id: edgeId,
    source: sourceId,
    target: targetId,
    animated: true,
    data: {
      hasMappings: inputMappings && inputMappings.length > 0,
      mappingCount: inputMappings?.length || 0,
    },
  };
}

// ========== 导出转换后的 React Flow 格式 ==========

export function convertToReactFlowFormat(
  generated: ReturnType<typeof convertDSLToGraph>
): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = generated.nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data,
  }));

  const edges: Edge[] = generated.edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    animated: e.animated,
    data: e.data,
    type: 'animatedFlow',
  }));

  return { nodes, edges };
}
