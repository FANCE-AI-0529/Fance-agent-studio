// =====================================================
// Manus 合规性验证器 - Manus Compliance Verifier
// 检查生成的工作流是否符合 Manus 协议要求
// =====================================================

import type {
  ManusExpectation,
  ManusComplianceResult,
  NodeSpec,
  WorkflowDSL,
} from '../types/verificationTypes.ts';

// MCP 操作类型检测关键词
const OPERATION_KEYWORDS = {
  write: ['write', 'create', 'update', 'insert', 'save', 'set', '写入', '创建', '更新', '保存'],
  send: ['send', 'email', 'notify', 'push', 'message', 'slack', '发送', '通知', '推送', '邮件'],
  delete: ['delete', 'remove', 'drop', 'clear', '删除', '移除', '清除'],
};

/**
 * 验证 Manus 协议合规性
 */
export function verifyManusCompliance(
  dsl: WorkflowDSL,
  expectation: ManusExpectation
): ManusComplianceResult {
  const result: ManusComplianceResult = {
    passed: true,
    planningEnabled: false,
    loggerNodesInjected: 0,
    findingsConnected: false,
    progressConnected: false,
    operationsCovered: [],
    missingOperations: [],
    details: [],
  };

  // 提取所有节点
  const allNodes = extractAllNodes(dsl);
  
  // 1. 检查 planning-with-files 是否启用
  result.planningEnabled = checkPlanningEnabled(allNodes, dsl);
  if (expectation.planningWithFiles && !result.planningEnabled) {
    result.passed = false;
    result.details.push('❌ Agent Core 未启用 planning-with-files');
  } else if (result.planningEnabled) {
    result.details.push('✅ Agent Core 已启用 planning-with-files');
  }

  // 2. 检查 Manus Logger 节点注入
  const loggerNodes = allNodes.filter(n => 
    n.type === 'manus_logger' || 
    n.name.toLowerCase().includes('manus') ||
    n.name.toLowerCase().includes('progress')
  );
  result.loggerNodesInjected = loggerNodes.length;

  // 3. 检查 findings.md 连接
  result.findingsConnected = checkFindingsConnection(allNodes, dsl);
  if (expectation.findingsLogging && !result.findingsConnected) {
    result.details.push('⚠️ 路由判断结果未连接到 findings.md');
  } else if (result.findingsConnected) {
    result.details.push('✅ 已连接 findings.md 记录');
  }

  // 4. 检查 progress.md 连接
  result.progressConnected = checkProgressConnection(allNodes, dsl);
  if (expectation.progressLogging && !result.progressConnected) {
    result.details.push('⚠️ MCP 操作未连接到 progress.md');
  } else if (result.progressConnected) {
    result.details.push('✅ 已连接 progress.md 日志');
  }

  // 5. 检查必需的日志操作覆盖
  const mcpNodes = allNodes.filter(n => 
    n.type === 'mcp_action' || 
    n.type === 'mcp' || 
    n.type.includes('mcp')
  );

  for (const operation of expectation.requiredLogOperations) {
    const hasOperation = mcpNodes.some(node => {
      const opType = detectMCPOperationType(node);
      return opType === operation;
    });

    if (hasOperation) {
      result.operationsCovered.push(operation);
      
      // 检查该操作是否有前置日志
      const hasLogger = checkOperationHasLogger(operation, mcpNodes, allNodes, dsl);
      if (hasLogger) {
        result.details.push(`✅ ${operation} 操作已有前置日志`);
      } else {
        result.details.push(`⚠️ ${operation} 操作缺少前置日志`);
      }
    } else {
      result.missingOperations.push(operation);
      result.details.push(`❌ 缺少 ${operation} 操作节点`);
    }
  }

  // 计算最终结果
  if (result.missingOperations.length > 0) {
    result.passed = false;
  }

  if (expectation.progressLogging && result.loggerNodesInjected === 0) {
    result.passed = false;
    result.details.push('❌ 未注入 Manus Logger 节点');
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
 * 检测 MCP 操作类型
 */
export function detectMCPOperationType(node: NodeSpec): 'write' | 'send' | 'delete' | 'execute' | 'read' {
  const name = node.name.toLowerCase();
  const desc = (node.description || '').toLowerCase();
  const text = `${name} ${desc}`;
  
  for (const [opType, keywords] of Object.entries(OPERATION_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) {
      return opType as 'write' | 'send' | 'delete';
    }
  }
  
  return 'execute';
}

/**
 * 检查是否启用了 planning-with-files
 */
function checkPlanningEnabled(nodes: NodeSpec[], dsl: WorkflowDSL): boolean {
  // 检查 Agent 节点配置
  const agentNodes = nodes.filter(n => 
    n.type === 'agent' || 
    n.type === 'llm' || 
    n.type.includes('agent')
  );
  
  for (const agent of agentNodes) {
    const config = agent.config as Record<string, unknown> | undefined;
    
    // 检查 planning 配置
    if (config?.planningEnabled || config?.planning) {
      return true;
    }
    
    // 检查 Manus 协议配置
    if (config?.manusProtocol || config?.manus) {
      return true;
    }
    
    // 检查系统提示词中是否包含 planning 相关内容
    const systemPrompt = (config?.systemPrompt as string) || '';
    if (
      systemPrompt.includes('planning') ||
      systemPrompt.includes('progress.md') ||
      systemPrompt.includes('findings.md')
    ) {
      return true;
    }
  }
  
  // 检查 DSL 元数据
  if (dsl.metadata?.planningEnabled || dsl.metadata?.manusProtocol) {
    return true;
  }
  
  return false;
}

/**
 * 检查 findings.md 连接
 */
function checkFindingsConnection(nodes: NodeSpec[], dsl: WorkflowDSL): boolean {
  // 查找路由/决策节点
  const routerNodes = nodes.filter(n => 
    n.type === 'router' || 
    n.type === 'decision' || 
    n.type.includes('router')
  );
  
  if (routerNodes.length === 0) {
    return false;
  }
  
  // 检查是否有连接到 findings 的边或 logger 节点
  const hasFindingsLogger = nodes.some(n => {
    const config = n.config as Record<string, unknown> | undefined;
    const targetFile = (config?.targetFile as string) || '';
    return targetFile.includes('findings');
  });
  
  // 检查边是否连接到 findings
  const hasFindingsEdge = dsl.edges.some(e => 
    e.dataMapping?.includes('findings') ||
    e.target.includes('findings')
  );
  
  return hasFindingsLogger || hasFindingsEdge;
}

/**
 * 检查 progress.md 连接
 */
function checkProgressConnection(nodes: NodeSpec[], dsl: WorkflowDSL): boolean {
  // 查找 MCP 操作节点
  const mcpNodes = nodes.filter(n => 
    n.type === 'mcp_action' || 
    n.type === 'mcp' || 
    n.type.includes('mcp')
  );
  
  if (mcpNodes.length === 0) {
    return true; // 没有 MCP 节点，不需要检查
  }
  
  // 检查是否有连接到 progress 的 logger 节点
  const hasProgressLogger = nodes.some(n => {
    if (n.type !== 'manus_logger') return false;
    
    const config = n.config as Record<string, unknown> | undefined;
    const targetFile = (config?.targetFile as string) || '';
    return targetFile.includes('progress');
  });
  
  // 检查边是否连接到 progress
  const hasProgressEdge = dsl.edges.some(e => 
    e.dataMapping?.includes('progress') ||
    e.target.includes('progress')
  );
  
  return hasProgressLogger || hasProgressEdge;
}

/**
 * 检查特定操作是否有前置日志
 */
function checkOperationHasLogger(
  operation: string,
  mcpNodes: NodeSpec[],
  allNodes: NodeSpec[],
  dsl: WorkflowDSL
): boolean {
  // 找到该操作类型的 MCP 节点
  const operationNodes = mcpNodes.filter(n => {
    const opType = detectMCPOperationType(n);
    return opType === operation;
  });
  
  if (operationNodes.length === 0) {
    return false;
  }
  
  // 检查每个操作节点是否有前置 logger
  for (const opNode of operationNodes) {
    // 查找指向该节点的边
    const incomingEdges = dsl.edges.filter(e => e.target === opNode.id);
    
    for (const edge of incomingEdges) {
      // 检查源节点是否是 logger
      const sourceNode = allNodes.find(n => n.id === edge.source);
      if (sourceNode?.type === 'manus_logger') {
        return true;
      }
    }
  }
  
  // 如果有全局 logger 节点，也算通过
  const hasGlobalLogger = allNodes.some(n => 
    n.type === 'manus_logger' && 
    (n.config as Record<string, unknown>)?.global === true
  );
  
  return hasGlobalLogger;
}

/**
 * 获取 Manus 合规性分数
 */
export function getManusComplianceScore(result: ManusComplianceResult): number {
  let score = 0;
  let maxScore = 0;
  
  // planning-with-files (25分)
  maxScore += 25;
  if (result.planningEnabled) score += 25;
  
  // logger 节点注入 (25分)
  maxScore += 25;
  if (result.loggerNodesInjected > 0) {
    score += Math.min(25, result.loggerNodesInjected * 10);
  }
  
  // findings 连接 (25分)
  maxScore += 25;
  if (result.findingsConnected) score += 25;
  
  // progress 连接 (25分)
  maxScore += 25;
  if (result.progressConnected) score += 25;
  
  return score / maxScore;
}
