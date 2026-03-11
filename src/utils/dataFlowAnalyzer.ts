// =====================================================
// 数据流分析器 - Data Flow Analyzer
// 分析工作流中的数据流动路径
// =====================================================

import type {
  DataFlowPath,
  DataFlowAnalysis,
  NodeSpec,
  WorkflowDSL,
  WorkflowEdge,
} from '../types/verificationTypes.ts';

/**
 * 分析工作流数据流
 */
export function analyzeDataFlow(
  dsl: WorkflowDSL
): DataFlowAnalysis {
  const allNodes = extractAllNodes(dsl);
  const paths = findAllDataFlowPaths(allNodes, dsl.edges);
  
  // 识别关键点
  const entryPoints = findEntryPoints(allNodes, dsl.edges);
  const exitPoints = findExitPoints(allNodes, dsl.edges);
  const branchPoints = findBranchPoints(allNodes, dsl.edges);

  // 选择主要路径作为高亮路径
  const mainPath = paths.length > 0 ? paths[0] : null;

  return {
    paths,
    highlightedPath: mainPath?.nodes || [],
    entryPoints,
    exitPoints,
    branchPoints,
  };
}

/**
 * 从 DSL 中提取所有节点
 */
function extractAllNodes(dsl: WorkflowDSL): NodeSpec[] {
  const nodes: NodeSpec[] = [];
  
  for (const stage of dsl.stages) {
    nodes.push(...stage.nodes);
    if (stage.branches) {
      for (const branch of stage.branches) {
        nodes.push(...branch.nodes);
      }
    }
  }
  
  return nodes;
}

/**
 * 查找所有数据流路径
 */
function findAllDataFlowPaths(
  nodes: NodeSpec[],
  edges: WorkflowEdge[]
): DataFlowPath[] {
  const paths: DataFlowPath[] = [];
  const entryNodes = findEntryNodes(nodes, edges);

  for (const entry of entryNodes) {
    const visited = new Set<string>();
    const currentPath: DataFlowPath = {
      id: `path-${paths.length + 1}`,
      nodes: [],
      edges: [],
      dataTypes: [],
      isComplete: false,
      description: '',
    };

    dfsTraverse(entry.id, nodes, edges, visited, currentPath);

    // 检查是否到达终点
    const lastNodeId = currentPath.nodes[currentPath.nodes.length - 1];
    const hasOutgoingEdge = edges.some(e => e.source === lastNodeId);
    currentPath.isComplete = !hasOutgoingEdge;

    // 生成描述
    currentPath.description = generatePathDescription(currentPath, nodes);

    if (currentPath.nodes.length > 0) {
      paths.push(currentPath);
    }
  }

  // 按路径长度排序，最长的路径优先
  paths.sort((a, b) => b.nodes.length - a.nodes.length);

  return paths;
}

/**
 * 深度优先遍历
 */
function dfsTraverse(
  nodeId: string,
  nodes: NodeSpec[],
  edges: WorkflowEdge[],
  visited: Set<string>,
  path: DataFlowPath
): void {
  if (visited.has(nodeId)) {
    return;
  }

  visited.add(nodeId);
  path.nodes.push(nodeId);

  const node = nodes.find(n => n.id === nodeId);
  if (node) {
    path.dataTypes.push(inferNodeOutputType(node));
  }

  // 查找出边
  const outgoingEdges = edges.filter(e => e.source === nodeId);

  if (outgoingEdges.length === 0) {
    return;
  }

  // 继续遍历第一条路径（其他分支会在单独的路径中处理）
  const nextEdge = outgoingEdges[0];
  path.edges.push(nextEdge.id);
  dfsTraverse(nextEdge.target, nodes, edges, visited, path);
}

/**
 * 查找入口节点
 */
function findEntryNodes(nodes: NodeSpec[], edges: WorkflowEdge[]): NodeSpec[] {
  // 入口节点: 没有入边的节点，或者是 trigger 类型
  return nodes.filter(node => {
    if (node.type === 'trigger') {
      return true;
    }
    return !edges.some(e => e.target === node.id);
  });
}

/**
 * 查找入口点 ID
 */
function findEntryPoints(nodes: NodeSpec[], edges: WorkflowEdge[]): string[] {
  return findEntryNodes(nodes, edges).map(n => n.id);
}

/**
 * 查找出口点 ID
 */
function findExitPoints(nodes: NodeSpec[], edges: WorkflowEdge[]): string[] {
  // 出口节点: 没有出边的节点
  return nodes
    .filter(node => !edges.some(e => e.source === node.id))
    .map(n => n.id);
}

/**
 * 查找分支点 ID
 */
function findBranchPoints(nodes: NodeSpec[], edges: WorkflowEdge[]): string[] {
  // 分支节点: 有多条出边的节点
  const edgeCount = new Map<string, number>();
  
  for (const edge of edges) {
    edgeCount.set(edge.source, (edgeCount.get(edge.source) || 0) + 1);
  }

  return Array.from(edgeCount.entries())
    .filter(([_, count]) => count > 1)
    .map(([nodeId]) => nodeId);
}

/**
 * 推断节点输出类型
 */
function inferNodeOutputType(node: NodeSpec): string {
  switch (node.type) {
    case 'trigger':
      return 'user_input';
    case 'knowledge':
    case 'rag':
      return 'text';
    case 'skill':
      return 'processed_data';
    case 'router':
    case 'decision':
      return 'decision';
    case 'mcp_action':
    case 'mcp':
      return 'action_result';
    case 'agent':
    case 'llm':
      return 'ai_response';
    default:
      return 'data';
  }
}

/**
 * 生成路径描述
 */
function generatePathDescription(path: DataFlowPath, nodes: NodeSpec[]): string {
  const nodeNames = path.nodes.map(id => {
    const node = nodes.find(n => n.id === id);
    return node ? `[${node.name}]` : `[${id}]`;
  });

  return nodeNames.join(' → ');
}

/**
 * 生成可视化数据
 */
export function generateFlowVisualization(
  paths: DataFlowPath[],
  nodes: NodeSpec[]
): {
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    isEntry: boolean;
    isExit: boolean;
    isBranch: boolean;
    pathIndex: number[];
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    pathIndex: number[];
    isHighlighted: boolean;
  }>;
} {
  const nodeMap = new Map<string, {
    id: string;
    name: string;
    type: string;
    isEntry: boolean;
    isExit: boolean;
    isBranch: boolean;
    pathIndex: number[];
  }>();

  const edgeMap = new Map<string, {
    id: string;
    source: string;
    target: string;
    pathIndex: number[];
    isHighlighted: boolean;
  }>();

  // 处理每条路径
  paths.forEach((path, pathIndex) => {
    // 处理节点
    path.nodes.forEach((nodeId, idx) => {
      const node = nodes.find(n => n.id === nodeId);
      const existing = nodeMap.get(nodeId);

      if (existing) {
        existing.pathIndex.push(pathIndex);
      } else {
        nodeMap.set(nodeId, {
          id: nodeId,
          name: node?.name || nodeId,
          type: node?.type || 'unknown',
          isEntry: idx === 0,
          isExit: idx === path.nodes.length - 1,
          isBranch: false,
          pathIndex: [pathIndex],
        });
      }
    });

    // 处理边
    path.edges.forEach(edgeId => {
      const existing = edgeMap.get(edgeId);

      if (existing) {
        existing.pathIndex.push(pathIndex);
      } else {
        // 从路径中推断源和目标
        const edgeIndex = path.edges.indexOf(edgeId);
        const source = path.nodes[edgeIndex];
        const target = path.nodes[edgeIndex + 1];

        edgeMap.set(edgeId, {
          id: edgeId,
          source,
          target,
          pathIndex: [pathIndex],
          isHighlighted: pathIndex === 0,
        });
      }
    });
  });

  // 标记分支点
  for (const [nodeId, nodeData] of nodeMap.entries()) {
    const outgoingEdges = Array.from(edgeMap.values()).filter(e => e.source === nodeId);
    if (outgoingEdges.length > 1) {
      nodeData.isBranch = true;
    }
  }

  return {
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values()),
  };
}

/**
 * 获取从源到目标的路径
 */
export function getPathBetween(
  sourceId: string,
  targetId: string,
  edges: WorkflowEdge[]
): string[] | null {
  const visited = new Set<string>();
  const queue: Array<{ nodeId: string; path: string[] }> = [
    { nodeId: sourceId, path: [sourceId] }
  ];

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!;

    if (nodeId === targetId) {
      return path;
    }

    if (visited.has(nodeId)) {
      continue;
    }

    visited.add(nodeId);

    const outgoingEdges = edges.filter(e => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (!visited.has(edge.target)) {
        queue.push({
          nodeId: edge.target,
          path: [...path, edge.target],
        });
      }
    }
  }

  return null;
}

/**
 * 计算路径复杂度
 */
export function calculatePathComplexity(paths: DataFlowPath[]): {
  totalPaths: number;
  maxDepth: number;
  averageDepth: number;
  branchingFactor: number;
} {
  if (paths.length === 0) {
    return {
      totalPaths: 0,
      maxDepth: 0,
      averageDepth: 0,
      branchingFactor: 0,
    };
  }

  const depths = paths.map(p => p.nodes.length);
  const maxDepth = Math.max(...depths);
  const averageDepth = depths.reduce((a, b) => a + b, 0) / depths.length;

  // 分支因子 = 总路径数 / 最大深度
  const branchingFactor = paths.length / maxDepth;

  return {
    totalPaths: paths.length,
    maxDepth,
    averageDepth,
    branchingFactor,
  };
}
