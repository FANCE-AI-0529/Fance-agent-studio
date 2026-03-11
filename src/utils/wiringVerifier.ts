// =====================================================
// 连线验证器 - Wiring Verifier
// 检查生成的工作流连线是否完整且正确
// =====================================================

import type {
  WiringExpectation,
  WiringCheckResult,
  NodeSpec,
  WorkflowDSL,
} from '../types/verificationTypes.ts';
import type { WiringConnection } from '../types/wiringTypes.ts';

/**
 * 验证工作流连线
 */
export function verifyWiring(
  dsl: WorkflowDSL,
  expectation: WiringExpectation,
  connections?: WiringConnection[]
): WiringCheckResult {
  const result: WiringCheckResult = {
    passed: true,
    connections: connections || [],
    coveragePercent: 0,
    draftEdges: 0,
    confirmedEdges: 0,
    missingConnections: [],
    warnings: [],
  };

  // 提取所有节点
  const allNodes = extractAllNodes(dsl);

  // 如果没有提供连线信息，从 DSL edges 推断
  if (!connections || connections.length === 0) {
    result.connections = inferConnectionsFromEdges(dsl, allNodes);
  }

  // 统计连线状态
  for (const conn of result.connections) {
    if (conn.status === 'confirmed') {
      result.confirmedEdges++;
    } else if (conn.status === 'draft') {
      result.draftEdges++;
    }
  }

  // 检查必需的连线
  for (const reqConn of expectation.requiredConnections) {
    const found = findMatchingConnection(
      result.connections,
      allNodes,
      reqConn.sourcePattern,
      reqConn.targetPattern
    );

    if (found) {
      if (found.confidence < reqConn.minConfidence) {
        result.warnings.push(
          `⚠️ 连线置信度不足: ${reqConn.sourcePattern} → ${reqConn.targetPattern} ` +
          `(${Math.round(found.confidence * 100)}% < ${Math.round(reqConn.minConfidence * 100)}%)`
        );
      }
    } else {
      result.passed = false;
      result.missingConnections.push(`${reqConn.sourcePattern} → ${reqConn.targetPattern}`);
      result.warnings.push(`❌ 缺少连线: ${reqConn.sourcePattern} → ${reqConn.targetPattern}`);
    }
  }

  // 计算覆盖率
  const totalExpected = expectation.requiredConnections.length;
  const foundCount = totalExpected - result.missingConnections.length;
  result.coveragePercent = totalExpected > 0 ? foundCount / totalExpected : 1;

  // 检查是否满足最低覆盖率
  if (result.coveragePercent < expectation.minCoverage) {
    result.passed = false;
    result.warnings.push(
      `❌ 连线覆盖率不足: ${Math.round(result.coveragePercent * 100)}% < ` +
      `${Math.round(expectation.minCoverage * 100)}%`
    );
  }

  // 检查是否有孤立节点
  const orphanNodes = findOrphanNodes(allNodes, dsl.edges);
  if (orphanNodes.length > 0) {
    result.warnings.push(
      `⚠️ 发现 ${orphanNodes.length} 个孤立节点: ${orphanNodes.map(n => n.name).join(', ')}`
    );
  }

  return result;
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
 * 从 DSL edges 推断连线信息
 */
function inferConnectionsFromEdges(
  dsl: WorkflowDSL,
  nodes: NodeSpec[]
): WiringConnection[] {
  const connections: WiringConnection[] = [];

  for (const edge of dsl.edges) {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) {
      continue;
    }

    connections.push({
      id: edge.id,
      source: {
        nodeId: sourceNode.id,
        portId: 'output',
        portName: '输出',
        dataType: 'any',
      },
      target: {
        nodeId: targetNode.id,
        portId: 'input',
        portName: '输入',
        dataType: 'any',
      },
      mapping: edge.dataMapping || `{{${sourceNode.id}.output}}`,
      confidence: edge.condition ? 0.7 : 0.9,
      status: 'confirmed',
      matchReason: edge.condition ? `条件边: ${edge.condition}` : '直连',
    });
  }

  return connections;
}

/**
 * 查找匹配的连线
 */
function findMatchingConnection(
  connections: WiringConnection[],
  nodes: NodeSpec[],
  sourcePattern: string,
  targetPattern: string
): WiringConnection | null {
  const sourceRegex = new RegExp(sourcePattern, 'i');
  const targetRegex = new RegExp(targetPattern, 'i');

  for (const conn of connections) {
    const sourceNode = nodes.find(n => n.id === conn.source.nodeId);
    const targetNode = nodes.find(n => n.id === conn.target.nodeId);

    if (!sourceNode || !targetNode) {
      continue;
    }

    const sourceMatch = 
      sourceRegex.test(sourceNode.type) ||
      sourceRegex.test(sourceNode.name) ||
      sourceRegex.test(sourceNode.id);

    const targetMatch = 
      targetRegex.test(targetNode.type) ||
      targetRegex.test(targetNode.name) ||
      targetRegex.test(targetNode.id);

    if (sourceMatch && targetMatch) {
      return conn;
    }
  }

  return null;
}

/**
 * 查找孤立节点（没有入边也没有出边的节点）
 */
function findOrphanNodes(
  nodes: NodeSpec[],
  edges: Array<{ source: string; target: string }>
): NodeSpec[] {
  const orphans: NodeSpec[] = [];
  
  for (const node of nodes) {
    // trigger 节点不需要入边
    if (node.type === 'trigger') {
      const hasOutgoing = edges.some(e => e.source === node.id);
      if (!hasOutgoing) {
        orphans.push(node);
      }
      continue;
    }

    const hasIncoming = edges.some(e => e.target === node.id);
    const hasOutgoing = edges.some(e => e.source === node.id);

    // 终端节点（只有入边没有出边）是正常的
    // 但没有任何边的节点是孤立的
    if (!hasIncoming && !hasOutgoing) {
      orphans.push(node);
    }
  }

  return orphans;
}

/**
 * 分析连线质量
 */
export function analyzeWiringQuality(
  connections: WiringConnection[]
): {
  averageConfidence: number;
  highConfidenceCount: number;
  lowConfidenceCount: number;
  needsAdapterCount: number;
} {
  if (connections.length === 0) {
    return {
      averageConfidence: 0,
      highConfidenceCount: 0,
      lowConfidenceCount: 0,
      needsAdapterCount: 0,
    };
  }

  const confidences = connections.map(c => c.confidence);
  const averageConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

  return {
    averageConfidence,
    highConfidenceCount: connections.filter(c => c.confidence >= 0.8).length,
    lowConfidenceCount: connections.filter(c => c.confidence < 0.5).length,
    needsAdapterCount: connections.filter(c => c.status === 'needs_adapter').length,
  };
}

/**
 * 获取节点连接图
 */
export function getNodeConnectionGraph(
  nodes: NodeSpec[],
  connections: WiringConnection[]
): Map<string, { incoming: string[]; outgoing: string[] }> {
  const graph = new Map<string, { incoming: string[]; outgoing: string[] }>();

  // 初始化所有节点
  for (const node of nodes) {
    graph.set(node.id, { incoming: [], outgoing: [] });
  }

  // 填充连接关系
  for (const conn of connections) {
    const sourceEntry = graph.get(conn.source.nodeId);
    const targetEntry = graph.get(conn.target.nodeId);

    if (sourceEntry) {
      sourceEntry.outgoing.push(conn.target.nodeId);
    }

    if (targetEntry) {
      targetEntry.incoming.push(conn.source.nodeId);
    }
  }

  return graph;
}

/**
 * 检查是否存在循环依赖
 */
export function hasCyclicDependency(
  nodes: NodeSpec[],
  connections: WiringConnection[]
): { hasCycle: boolean; cyclePath: string[] } {
  const graph = getNodeConnectionGraph(nodes, connections);
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cyclePath: string[] = [];

  function dfs(nodeId: string, path: string[]): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const entry = graph.get(nodeId);
    if (!entry) return false;

    for (const neighbor of entry.outgoing) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor, [...path, neighbor])) {
          return true;
        }
      } else if (recStack.has(neighbor)) {
        cyclePath.push(...path, neighbor);
        return true;
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id, [node.id])) {
        return { hasCycle: true, cyclePath };
      }
    }
  }

  return { hasCycle: false, cyclePath: [] };
}
