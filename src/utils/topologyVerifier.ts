// =====================================================
// 拓扑验证器 - Topology Verifier
// 检查生成的工作流是否包含所有必需的节点和分支
// =====================================================

import type {
  TopologyExpectation,
  TopologyCheckResult,
  NodeMatch,
  NodeSpec,
  WorkflowDSL,
  WorkflowStage,
} from '../types/verificationTypes.ts';

/**
 * 验证工作流拓扑是否符合期望
 */
export function verifyTopology(
  generatedDSL: WorkflowDSL,
  expectation: TopologyExpectation
): TopologyCheckResult {
  const result: TopologyCheckResult = {
    passed: true,
    foundNodes: [],
    missingNodes: [],
    branchesCorrect: true,
    details: [],
    nodeCount: 0,
  };

  // 提取所有节点
  const allNodes = extractAllNodes(generatedDSL);
  result.nodeCount = allNodes.length;

  // 检查必需节点
  for (const required of expectation.requiredNodes) {
    const found = findMatchingNode(allNodes, required);
    
    if (found) {
      result.foundNodes.push({
        expected: required,
        actual: found.node,
        match: found.matchType,
      });
      result.details.push(`✅ 找到节点: ${required.type} - ${found.node.name}`);
    } else {
      result.passed = false;
      const patternDesc = required.namePattern 
        ? ` (匹配: ${required.namePattern.source})` 
        : '';
      result.missingNodes.push(`${required.type}${patternDesc}`);
      result.details.push(`❌ 缺少节点: ${required.type}${patternDesc}`);
    }
  }

  // 检查分支
  if (expectation.requiredBranches && expectation.requiredBranches.length > 0) {
    const branchResult = verifyBranches(generatedDSL, expectation.requiredBranches);
    result.branchesCorrect = branchResult.allFound;
    
    for (const detail of branchResult.details) {
      result.details.push(detail);
    }
    
    if (!branchResult.allFound) {
      result.passed = false;
    }
  }

  // 检查节点数量
  if (allNodes.length < expectation.minNodes) {
    result.passed = false;
    result.details.push(`⚠️ 节点数量不足: ${allNodes.length} < ${expectation.minNodes}`);
  }

  if (allNodes.length > expectation.maxNodes) {
    result.details.push(`⚠️ 节点数量过多: ${allNodes.length} > ${expectation.maxNodes}`);
  }

  return result;
}

/**
 * 从 DSL 中提取所有节点
 */
function extractAllNodes(dsl: WorkflowDSL): NodeSpec[] {
  const nodes: NodeSpec[] = [];
  
  for (const stage of dsl.stages) {
    // 添加阶段中的节点
    nodes.push(...stage.nodes);
    
    // 添加分支中的节点
    if (stage.branches) {
      for (const branch of stage.branches) {
        nodes.push(...branch.nodes);
      }
    }
  }
  
  return nodes;
}

/**
 * 查找匹配的节点
 */
function findMatchingNode(
  nodes: NodeSpec[],
  requirement: {
    type: string;
    namePattern?: RegExp;
    slotType?: string;
  }
): { node: NodeSpec; matchType: 'exact' | 'partial' | 'semantic' } | null {
  // 首先尝试精确匹配
  for (const node of nodes) {
    if (isExactMatch(node, requirement)) {
      return { node, matchType: 'exact' };
    }
  }
  
  // 尝试部分匹配
  for (const node of nodes) {
    if (isPartialMatch(node, requirement)) {
      return { node, matchType: 'partial' };
    }
  }
  
  // 尝试语义匹配
  for (const node of nodes) {
    if (isSemanticMatch(node, requirement)) {
      return { node, matchType: 'semantic' };
    }
  }
  
  return null;
}

/**
 * 精确匹配检查
 */
function isExactMatch(
  node: NodeSpec,
  requirement: { type: string; namePattern?: RegExp; slotType?: string }
): boolean {
  // 类型必须匹配
  if (node.type !== requirement.type) {
    return false;
  }
  
  // 如果有名称模式，必须匹配
  if (requirement.namePattern && !requirement.namePattern.test(node.name)) {
    return false;
  }
  
  // 如果有槽位类型，必须匹配
  if (requirement.slotType && node.slotType !== requirement.slotType) {
    return false;
  }
  
  return true;
}

/**
 * 部分匹配检查
 */
function isPartialMatch(
  node: NodeSpec,
  requirement: { type: string; namePattern?: RegExp; slotType?: string }
): boolean {
  // 类型必须匹配
  if (node.type !== requirement.type) {
    return false;
  }
  
  // 名称模式可以不完全匹配
  if (requirement.namePattern) {
    const nodeName = node.name.toLowerCase();
    const nodeDesc = (node.description || '').toLowerCase();
    const patternSource = requirement.namePattern.source.toLowerCase();
    const keywords = patternSource.split('|').map(k => k.replace(/[\\^$.*+?()[\]{}]/g, ''));
    
    const hasKeywordMatch = keywords.some(k => 
      nodeName.includes(k) || nodeDesc.includes(k)
    );
    
    if (!hasKeywordMatch) {
      return false;
    }
  }
  
  return true;
}

/**
 * 语义匹配检查
 */
function isSemanticMatch(
  node: NodeSpec,
  requirement: { type: string; namePattern?: RegExp; slotType?: string }
): boolean {
  // 语义同义词映射
  const TYPE_SYNONYMS: Record<string, string[]> = {
    knowledge: ['rag', 'retrieval', 'knowledge_base', 'kb', 'doc', 'document'],
    skill: ['function', 'tool', 'capability', 'ability', 'processor'],
    router: ['decision', 'branch', 'conditional', 'switch', 'intent', 'classifier'],
    mcp_action: ['mcp', 'action', 'tool', 'external', 'api', 'integration'],
    agent: ['llm', 'ai', 'assistant', 'core', 'brain'],
    trigger: ['start', 'entry', 'input', 'begin', 'schedule'],
  };
  
  // 检查类型同义词
  const synonyms = TYPE_SYNONYMS[requirement.type] || [];
  const nodeTypeLower = node.type.toLowerCase();
  
  if (nodeTypeLower !== requirement.type && !synonyms.includes(nodeTypeLower)) {
    return false;
  }
  
  return true;
}

/**
 * 验证分支结构
 */
function verifyBranches(
  dsl: WorkflowDSL,
  requiredBranches: Array<{ condition: string; targetNodeType: string }>
): { allFound: boolean; details: string[] } {
  const details: string[] = [];
  let allFound = true;
  
  // 查找所有条件阶段
  const conditionalStages = dsl.stages.filter(s => s.type === 'conditional');
  
  if (conditionalStages.length === 0) {
    // 检查边是否有条件
    const conditionalEdges = dsl.edges.filter(e => e.condition);
    
    if (conditionalEdges.length === 0 && requiredBranches.length > 0) {
      details.push('❌ 未找到条件分支结构');
      return { allFound: false, details };
    }
  }
  
  for (const reqBranch of requiredBranches) {
    let found = false;
    
    // 在条件阶段中查找
    for (const stage of conditionalStages) {
      if (stage.branches) {
        for (const branch of stage.branches) {
          const conditionMatch = 
            branch.condition.includes(reqBranch.condition) ||
            branch.name.includes(reqBranch.condition);
          
          if (conditionMatch) {
            // 检查目标节点类型
            const hasTargetType = branch.nodes.some(n => 
              n.type === reqBranch.targetNodeType ||
              n.type.includes(reqBranch.targetNodeType)
            );
            
            if (hasTargetType) {
              found = true;
              details.push(`✅ 找到分支: "${reqBranch.condition}" → ${reqBranch.targetNodeType}`);
              break;
            }
          }
        }
      }
      
      if (found) break;
    }
    
    // 在边中查找
    if (!found) {
      for (const edge of dsl.edges) {
        if (edge.condition && edge.condition.includes(reqBranch.condition)) {
          found = true;
          details.push(`✅ 找到条件边: "${reqBranch.condition}"`);
          break;
        }
      }
    }
    
    if (!found) {
      allFound = false;
      details.push(`❌ 缺少分支: "${reqBranch.condition}" → ${reqBranch.targetNodeType}`);
    }
  }
  
  return { allFound, details };
}

/**
 * 获取节点类型统计
 */
export function getNodeTypeStats(dsl: WorkflowDSL): Record<string, number> {
  const allNodes = extractAllNodes(dsl);
  const stats: Record<string, number> = {};
  
  for (const node of allNodes) {
    stats[node.type] = (stats[node.type] || 0) + 1;
  }
  
  return stats;
}

/**
 * 检查是否有路由/决策节点
 */
export function hasRouterNode(dsl: WorkflowDSL): boolean {
  const allNodes = extractAllNodes(dsl);
  return allNodes.some(n => 
    n.type === 'router' || 
    n.type === 'decision' || 
    n.type === 'intentRouter' ||
    n.type.includes('router')
  );
}

/**
 * 检查是否有知识库节点
 */
export function hasKnowledgeNode(dsl: WorkflowDSL): boolean {
  const allNodes = extractAllNodes(dsl);
  return allNodes.some(n => 
    n.type === 'knowledge' || 
    n.type === 'rag' || 
    n.type.includes('knowledge')
  );
}

/**
 * 获取所有 MCP 操作节点
 */
export function getMCPActionNodes(dsl: WorkflowDSL): NodeSpec[] {
  const allNodes = extractAllNodes(dsl);
  return allNodes.filter(n => 
    n.type === 'mcp_action' || 
    n.type === 'mcp' || 
    n.type.includes('mcp')
  );
}
