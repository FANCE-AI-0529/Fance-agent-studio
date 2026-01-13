// =====================================================
// 治理策略注入器 - Policy Injector
// 自动检测高风险操作并注入干预节点
// =====================================================

import {
  WorkflowDSL,
  StageSpec,
  NodeSpec,
  RiskLevel,
  MPLPPolicy,
  InjectedIntervention,
  GenerationWarning,
} from '@/types/workflowDSL';

// ========== 风险规则类型 ==========

interface RiskRule {
  pattern: RegExp;
  riskLevel: RiskLevel;
  interventionType: 'confirm' | 'approve' | 'edit' | 'preview';
  reason: string;
}

interface MCPRiskMapping {
  [toolId: string]: {
    riskLevel: RiskLevel;
    reason: string;
  };
}

// ========== MPLP 风险规则库 ==========

export const MPLP_RISK_RULES: RiskRule[] = [
  // 高风险操作 - 需要确认或批准
  {
    pattern: /delete|remove|drop|destroy|erase|purge/i,
    riskLevel: 'high',
    interventionType: 'confirm',
    reason: '删除操作不可逆，需要用户确认',
  },
  {
    pattern: /payment|pay|charge|transfer|refund|withdraw/i,
    riskLevel: 'high',
    interventionType: 'approve',
    reason: '涉及资金操作，需要明确批准',
  },
  {
    pattern: /send_email|send_sms|notify|broadcast|publish/i,
    riskLevel: 'medium',
    interventionType: 'preview',
    reason: '外发通信需要预览确认',
  },
  {
    pattern: /update_password|change_credential|reset_auth/i,
    riskLevel: 'high',
    interventionType: 'approve',
    reason: '凭证变更需要明确批准',
  },
  {
    pattern: /grant_permission|revoke_access|modify_role/i,
    riskLevel: 'high',
    interventionType: 'approve',
    reason: '权限变更需要明确批准',
  },
  {
    pattern: /execute_code|run_script|eval/i,
    riskLevel: 'high',
    interventionType: 'confirm',
    reason: '代码执行存在安全风险',
  },
  
  // 中风险操作 - 需要预览
  {
    pattern: /create|insert|add|write|upload/i,
    riskLevel: 'medium',
    interventionType: 'preview',
    reason: '创建操作建议预览',
  },
  {
    pattern: /modify|edit|change|alter/i,
    riskLevel: 'medium',
    interventionType: 'edit',
    reason: '修改操作允许用户编辑',
  },
  {
    pattern: /api_call|external_request|webhook/i,
    riskLevel: 'medium',
    interventionType: 'preview',
    reason: '外部API调用建议确认',
  },
];

// ========== MCP 工具风险映射 ==========

export const MCP_RISK_MAPPING: MCPRiskMapping = {
  // 数据库操作
  'database:delete_record': { riskLevel: 'high', reason: '数据库删除操作' },
  'database:drop_table': { riskLevel: 'high', reason: '数据库表删除' },
  'database:truncate': { riskLevel: 'high', reason: '数据清空操作' },
  'database:update_record': { riskLevel: 'medium', reason: '数据库更新' },
  'database:insert_record': { riskLevel: 'low', reason: '数据库插入' },
  
  // 邮件操作
  'email:send_email': { riskLevel: 'medium', reason: '邮件发送' },
  'email:send_bulk': { riskLevel: 'high', reason: '批量邮件发送' },
  
  // 文件操作
  'file:delete_file': { riskLevel: 'high', reason: '文件删除' },
  'file:write_file': { riskLevel: 'medium', reason: '文件写入' },
  'file:upload_file': { riskLevel: 'low', reason: '文件上传' },
  
  // 支付操作
  'stripe:create_charge': { riskLevel: 'high', reason: '创建支付' },
  'stripe:create_refund': { riskLevel: 'high', reason: '创建退款' },
  'stripe:cancel_subscription': { riskLevel: 'high', reason: '取消订阅' },
  
  // GitHub 操作
  'github:create_issue': { riskLevel: 'low', reason: '创建Issue' },
  'github:close_issue': { riskLevel: 'medium', reason: '关闭Issue' },
  'github:merge_pr': { riskLevel: 'high', reason: '合并PR' },
  'github:delete_branch': { riskLevel: 'high', reason: '删除分支' },
  
  // Slack 操作
  'slack:send_message': { riskLevel: 'low', reason: '发送消息' },
  'slack:post_channel': { riskLevel: 'medium', reason: '频道发布' },
};

// ========== MPLP 策略阈值 ==========

const POLICY_THRESHOLDS: Record<MPLPPolicy, { minRiskForIntervention: RiskLevel }> = {
  permissive: { minRiskForIntervention: 'high' },
  default: { minRiskForIntervention: 'medium' },
  strict: { minRiskForIntervention: 'low' },
};

// ========== 主函数：验证并注入策略 ==========

export function validateAndInjectPolicies(
  workflow: WorkflowDSL,
  mplpPolicy: MPLPPolicy = 'default'
): {
  validatedWorkflow: WorkflowDSL;
  injectedInterventions: InjectedIntervention[];
  warnings: GenerationWarning[];
} {
  const injectedInterventions: InjectedIntervention[] = [];
  const warnings: GenerationWarning[] = [];
  const threshold = POLICY_THRESHOLDS[mplpPolicy];

  // 深拷贝工作流
  const validatedWorkflow: WorkflowDSL = JSON.parse(JSON.stringify(workflow));

  // 设置治理策略
  validatedWorkflow.governance = {
    mplpPolicy,
    auditLogging: true,
    ...validatedWorkflow.governance,
  };

  // 遍历所有阶段和节点
  for (const stage of validatedWorkflow.stages) {
    processStageNodes(stage, threshold.minRiskForIntervention, injectedInterventions, warnings);
  }

  return {
    validatedWorkflow,
    injectedInterventions,
    warnings,
  };
}

// ========== 处理阶段节点 ==========

function processStageNodes(
  stage: StageSpec,
  minRiskLevel: RiskLevel,
  interventions: InjectedIntervention[],
  warnings: GenerationWarning[]
): void {
  const nodesToInsert: Array<{ index: number; intervention: NodeSpec }> = [];

  for (let i = 0; i < stage.nodes.length; i++) {
    const node = stage.nodes[i];
    const riskAnalysis = analyzeNodeRisk(node);

    // 更新节点的风险级别
    node.riskLevel = riskAnalysis.riskLevel;

    // 检查是否需要干预
    if (shouldInjectIntervention(riskAnalysis.riskLevel, minRiskLevel)) {
      const intervention = createInterventionNode(node, riskAnalysis);
      
      nodesToInsert.push({ index: i, intervention });
      
      interventions.push({
        nodeId: intervention.id,
        beforeNodeId: node.id,
        type: riskAnalysis.interventionType,
        reason: riskAnalysis.reason,
        riskLevel: riskAnalysis.riskLevel,
      });

      // 添加警告
      warnings.push({
        code: 'RISK_DETECTED',
        message: `检测到${getRiskLevelLabel(riskAnalysis.riskLevel)}操作: ${riskAnalysis.reason}`,
        nodeId: node.id,
        severity: riskAnalysis.riskLevel === 'high' ? 'warning' : 'info',
      });
    }
  }

  // 插入干预节点（从后往前插入以保持索引正确）
  for (let i = nodesToInsert.length - 1; i >= 0; i--) {
    const { index, intervention } = nodesToInsert[i];
    stage.nodes.splice(index, 0, intervention);
  }

  // 递归处理条件分支
  if (stage.branches) {
    for (const branch of stage.branches) {
      const branchStage: StageSpec = {
        id: `branch-${branch.id}`,
        name: branch.name,
        type: 'sequential',
        nodes: branch.nodes,
      };
      processStageNodes(branchStage, minRiskLevel, interventions, warnings);
      branch.nodes = branchStage.nodes;
    }
  }
}

// ========== 分析节点风险 ==========

interface RiskAnalysis {
  riskLevel: RiskLevel;
  interventionType: 'confirm' | 'approve' | 'edit' | 'preview';
  reason: string;
  matchedRules: string[];
}

function analyzeNodeRisk(node: NodeSpec): RiskAnalysis {
  const matchedRules: string[] = [];
  let highestRisk: RiskLevel = 'low';
  let interventionType: 'confirm' | 'approve' | 'edit' | 'preview' = 'preview';
  let reason = '';

  // 1. 检查 MCP 工具风险映射
  if (node.type === 'mcp_action' && node.assetId) {
    const mcpRisk = MCP_RISK_MAPPING[node.assetId];
    if (mcpRisk) {
      if (compareRiskLevel(mcpRisk.riskLevel, highestRisk) > 0) {
        highestRisk = mcpRisk.riskLevel;
        reason = mcpRisk.reason;
      }
      matchedRules.push(`MCP: ${node.assetId}`);
    }
  }

  // 2. 检查节点名称和描述的风险模式
  const textToCheck = [
    node.name,
    node.description,
    node.outputKey,
    JSON.stringify(node.config),
  ].filter(Boolean).join(' ');

  for (const rule of MPLP_RISK_RULES) {
    if (rule.pattern.test(textToCheck)) {
      if (compareRiskLevel(rule.riskLevel, highestRisk) > 0) {
        highestRisk = rule.riskLevel;
        interventionType = rule.interventionType;
        reason = rule.reason;
      }
      matchedRules.push(rule.pattern.source);
    }
  }

  // 3. 检查节点是否已标记风险
  if (node.riskLevel && compareRiskLevel(node.riskLevel, highestRisk) > 0) {
    highestRisk = node.riskLevel;
  }

  return {
    riskLevel: highestRisk,
    interventionType,
    reason: reason || '需要用户确认',
    matchedRules,
  };
}

// ========== 创建干预节点 ==========

function createInterventionNode(
  targetNode: NodeSpec,
  riskAnalysis: RiskAnalysis
): NodeSpec {
  return {
    id: `intervention-${targetNode.id}`,
    type: 'intervention',
    name: getInterventionName(riskAnalysis.interventionType),
    description: riskAnalysis.reason,
    config: {
      interventionType: riskAnalysis.interventionType,
      targetNodeId: targetNode.id,
      targetNodeName: targetNode.name,
      riskLevel: riskAnalysis.riskLevel,
      message: generateInterventionMessage(targetNode, riskAnalysis),
    },
    inputMappings: [],
    outputKey: `${targetNode.id}_confirmed`,
    riskLevel: 'low',
    requiresConfirmation: false,
  };
}

// ========== 辅助函数 ==========

function shouldInjectIntervention(nodeRisk: RiskLevel, threshold: RiskLevel): boolean {
  return compareRiskLevel(nodeRisk, threshold) >= 0;
}

function compareRiskLevel(a: RiskLevel, b: RiskLevel): number {
  const levels: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };
  return levels[a] - levels[b];
}

function getRiskLevelLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  };
  return labels[level];
}

function getInterventionName(type: 'confirm' | 'approve' | 'edit' | 'preview'): string {
  const names: Record<string, string> = {
    confirm: '确认操作',
    approve: '审批请求',
    edit: '编辑确认',
    preview: '预览确认',
  };
  return names[type] || '确认';
}

function generateInterventionMessage(
  node: NodeSpec,
  riskAnalysis: RiskAnalysis
): string {
  const action = node.name || node.type;
  const risk = getRiskLevelLabel(riskAnalysis.riskLevel);
  
  switch (riskAnalysis.interventionType) {
    case 'confirm':
      return `即将执行"${action}"（${risk}）。${riskAnalysis.reason}。确定要继续吗？`;
    case 'approve':
      return `"${action}"需要您的批准（${risk}）。${riskAnalysis.reason}。请审核后决定。`;
    case 'edit':
      return `请检查"${action}"的内容（${risk}）。您可以在执行前进行修改。`;
    case 'preview':
      return `以下是"${action}"将要执行的操作预览（${risk}）。确认后将执行。`;
    default:
      return `请确认是否执行"${action}"。`;
  }
}

// ========== 批量风险评估 ==========

export function assessWorkflowRisk(workflow: WorkflowDSL): {
  overallRisk: RiskLevel;
  highRiskNodes: string[];
  mediumRiskNodes: string[];
  totalNodes: number;
} {
  let highCount = 0;
  let mediumCount = 0;
  let totalCount = 0;
  const highRiskNodes: string[] = [];
  const mediumRiskNodes: string[] = [];

  const processNodes = (nodes: NodeSpec[]) => {
    for (const node of nodes) {
      totalCount++;
      const analysis = analyzeNodeRisk(node);
      
      if (analysis.riskLevel === 'high') {
        highCount++;
        highRiskNodes.push(node.id);
      } else if (analysis.riskLevel === 'medium') {
        mediumCount++;
        mediumRiskNodes.push(node.id);
      }
    }
  };

  for (const stage of workflow.stages) {
    processNodes(stage.nodes);
    if (stage.branches) {
      for (const branch of stage.branches) {
        processNodes(branch.nodes);
      }
    }
  }

  let overallRisk: RiskLevel = 'low';
  if (highCount > 0) {
    overallRisk = 'high';
  } else if (mediumCount > 0) {
    overallRisk = 'medium';
  }

  return {
    overallRisk,
    highRiskNodes,
    mediumRiskNodes,
    totalNodes: totalCount,
  };
}
