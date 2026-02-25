// 画布 → Swarms 编译器 (Canvas to Swarms Compiler)

import type { Node, Edge } from '@xyflow/react';
import type {
  SwarmDefinition,
  SwarmMember,
  SwarmCommunicationMode,
  SwarmMemberRole,
  SwarmCompileResult,
  SwarmCompileError,
  CanvasToSwarmMapping,
} from '@/types/swarms';

/**
 * 节点类型到 Swarm 角色的映射
 */
const NODE_ROLE_MAP: Record<string, SwarmMemberRole> = {
  agent: 'worker',
  start: 'leader',
  end: 'worker',
  condition: 'specialist',
  parallel: 'worker',
  llm: 'specialist',
  code: 'specialist',
  http_request: 'specialist',
  reviewer: 'reviewer',
  leader: 'leader',
};

/**
 * 将画布节点和边编译为 Swarm 定义
 */
export function compileCanvasToSwarm(
  nodes: Node[],
  edges: Edge[],
  options: {
    swarmName?: string;
    description?: string;
    communicationMode?: SwarmCommunicationMode;
    maxRounds?: number;
    timeoutMs?: number;
  } = {}
): SwarmCompileResult {
  const errors: SwarmCompileError[] = [];
  const warnings: string[] = [];

  // 1. 验证画布
  const agentNodes = nodes.filter(n => isAgentNode(n));
  
  if (agentNodes.length === 0) {
    errors.push({
      code: 'NO_AGENT_NODES',
      message: '画布上没有 Agent 节点，无法创建 Swarm',
    });
    return { valid: false, errors, warnings };
  }

  if (agentNodes.length === 1) {
    warnings.push('只有一个 Agent 节点，Swarm 将退化为单 Agent 模式');
  }

  // 2. 检查循环依赖
  const cycles = detectCycles(agentNodes, edges);
  if (cycles.length > 0) {
    for (const cycle of cycles) {
      errors.push({
        code: 'CIRCULAR_DEPENDENCY',
        message: `检测到循环依赖: ${cycle.join(' → ')}`,
        nodeId: cycle[0],
      });
    }
    return { valid: false, errors, warnings };
  }

  // 3. 检查未连接节点
  const connectedNodeIds = new Set<string>();
  edges.forEach(e => {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
  });

  for (const node of agentNodes) {
    if (!connectedNodeIds.has(node.id)) {
      warnings.push(`节点 "${getNodeLabel(node)}" 未连接到任何其他节点`);
    }
  }

  // 4. 推断协作模式
  const communicationMode = options.communicationMode || inferCommunicationMode(agentNodes, edges);

  // 5. 构建 Swarm 成员
  const members: SwarmMember[] = agentNodes.map((node, index) => ({
    id: node.id,
    agentId: getNodeData(node, 'agentId') || node.id,
    name: getNodeLabel(node) || `Agent ${index + 1}`,
    role: inferRole(node, edges, agentNodes),
    capabilities: getNodeData(node, 'capabilities') || [],
    systemPrompt: getNodeData(node, 'systemPrompt'),
    priority: inferPriority(node, edges),
    canVeto: inferRole(node, edges, agentNodes) === 'reviewer',
  }));

  // 6. 构建 Swarm 定义
  const definition: SwarmDefinition = {
    id: crypto.randomUUID(),
    name: options.swarmName || `Swarm-${Date.now()}`,
    description: options.description || `由 ${members.length} 个 Agent 组成的 Swarm`,
    members,
    communicationMode,
    sharedContext: {
      goal: options.description || '',
      constraints: [],
      allowedCommunicationChannels: ['broadcast', 'direct'],
      maxMessagesPerRound: 10,
    },
    maxRounds: options.maxRounds || 10,
    timeoutMs: options.timeoutMs || 300000,
  };

  // 7. 生成 YAML
  const yamlContent = generateSwarmYaml(definition);

  return {
    valid: true,
    definition,
    yamlContent,
    errors,
    warnings,
  };
}

// ─── 辅助函数 ───

function isAgentNode(node: Node): boolean {
  const agentTypes = ['agent', 'llm', 'code', 'reviewer', 'leader', 'start', 'swarm_member'];
  return agentTypes.includes(node.type || '');
}

function getNodeLabel(node: Node): string {
  const data = node.data as Record<string, unknown>;
  return (data?.label as string) || (data?.name as string) || node.id;
}

function getNodeData(node: Node, key: string): any {
  const data = node.data as Record<string, unknown>;
  return data?.[key];
}

function inferCommunicationMode(nodes: Node[], edges: Edge[]): SwarmCommunicationMode {
  // 检查是否有并行分支
  const sourceCount = new Map<string, number>();
  edges.forEach(e => {
    sourceCount.set(e.source, (sourceCount.get(e.source) || 0) + 1);
  });

  const hasParallelBranch = Array.from(sourceCount.values()).some(c => c > 1);
  const hasParallelNode = nodes.some(n => n.type === 'parallel');

  if (hasParallelBranch || hasParallelNode) return 'parallel';

  // 检查是否有 reviewer
  if (nodes.some(n => n.type === 'reviewer')) return 'consensus';

  // 检查是否有明确的 leader
  if (nodes.some(n => n.type === 'leader')) return 'hierarchical';

  // 默认顺序模式
  return 'sequential';
}

function inferRole(node: Node, edges: Edge[], allNodes: Node[]): SwarmMemberRole {
  const mapped = NODE_ROLE_MAP[node.type || ''];
  if (mapped && mapped !== 'worker') return mapped;

  // 如果是第一个节点（无入边），可能是 leader
  const hasIncoming = edges.some(e => e.target === node.id);
  if (!hasIncoming && allNodes.length > 1) return 'leader';

  return 'worker';
}

function inferPriority(node: Node, edges: Edge[]): number {
  // 入度越少优先级越高
  const inDegree = edges.filter(e => e.target === node.id).length;
  return Math.max(1, 10 - inDegree);
}

function detectCycles(nodes: Node[], edges: Edge[]): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const stack = new Set<string>();
  const path: string[] = [];

  const nodeIds = new Set(nodes.map(n => n.id));
  const adjacency = new Map<string, string[]>();
  
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
      adjacency.get(edge.source)!.push(edge.target);
    }
  }

  function dfs(nodeId: string): void {
    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);

    for (const neighbor of adjacency.get(nodeId) || []) {
      if (stack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        cycles.push([...path.slice(cycleStart), neighbor]);
      } else if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    }

    stack.delete(nodeId);
    path.pop();
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      dfs(node.id);
    }
  }

  return cycles;
}

function generateSwarmYaml(definition: SwarmDefinition): string {
  const yaml = [
    `# Swarm Configuration`,
    `# Generated at ${new Date().toISOString()}`,
    ``,
    `name: "${definition.name}"`,
    `description: "${definition.description}"`,
    `communication_mode: ${definition.communicationMode}`,
    `max_rounds: ${definition.maxRounds}`,
    `timeout_ms: ${definition.timeoutMs}`,
    ``,
    `shared_context:`,
    `  goal: "${definition.sharedContext.goal}"`,
    `  max_messages_per_round: ${definition.sharedContext.maxMessagesPerRound}`,
    `  channels:`,
    ...definition.sharedContext.allowedCommunicationChannels.map(c => `    - ${c}`),
    ``,
    `members:`,
  ];

  for (const member of definition.members) {
    yaml.push(
      `  - id: "${member.id}"`,
      `    agent_id: "${member.agentId}"`,
      `    name: "${member.name}"`,
      `    role: ${member.role}`,
      `    priority: ${member.priority}`,
      `    can_veto: ${member.canVeto}`,
    );
    if (member.capabilities.length > 0) {
      yaml.push(`    capabilities:`);
      member.capabilities.forEach(c => yaml.push(`      - ${c}`));
    }
    if (member.claudeMdPath) {
      yaml.push(`    claude_md: "${member.claudeMdPath}"`);
    }
    yaml.push('');
  }

  return yaml.join('\n');
}
