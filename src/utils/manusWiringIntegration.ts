// =====================================================
// Manus 协议连线集成 - Manus Wiring Integration
// 确保所有 MCP 写入操作都记录到 progress.md
// =====================================================

import {
  ManusWiringRule,
  MCPOperationType,
  WiringConnection,
  ManusLoggerNodeSpec,
  IODataType,
} from '../types/wiringTypes.ts';
import { NodeSpec } from '../types/workflowDSL.ts';

// ========== Manus 强制连线规则 ==========

export const MANUS_WIRING_RULES: ManusWiringRule[] = [
  {
    trigger: {
      nodeType: 'mcp_action',
      operation: 'write',
    },
    enforce: {
      preConnection: {
        targetPort: 'progress_update',
        mappingTemplate: `[{{timestamp}}] 📝 写入操作: {{node.name}} - 目标: {{node.inputs.path || node.inputs.target}}`,
      },
    },
  },
  {
    trigger: {
      nodeType: 'mcp_action',
      operation: 'send',
    },
    enforce: {
      preConnection: {
        targetPort: 'progress_update',
        mappingTemplate: `[{{timestamp}}] 📧 发送操作: {{node.name}} - 收件人: {{node.inputs.to || node.inputs.recipient}}`,
      },
    },
  },
  {
    trigger: {
      nodeType: 'mcp_action',
      operation: 'delete',
    },
    enforce: {
      preConnection: {
        targetPort: 'progress_update',
        mappingTemplate: `[{{timestamp}}] ⚠️ 删除操作: {{node.name}} - 目标: {{node.inputs.target || node.inputs.path}}`,
      },
    },
  },
  {
    trigger: {
      nodeType: 'mcp_action',
      operation: 'execute',
    },
    enforce: {
      preConnection: {
        targetPort: 'progress_update',
        mappingTemplate: `[{{timestamp}}] ⚙️ 执行操作: {{node.name}} - 参数: {{node.inputs | summary}}`,
      },
    },
  },
];

// ========== MCP 操作类型关键词 ==========

const WRITE_OPERATION_KEYWORDS = [
  'write', 'create', 'update', 'insert', 'save', 'put', 'post', 'add',
  '写入', '创建', '更新', '保存', '添加', '新增',
];

const SEND_OPERATION_KEYWORDS = [
  'send', 'email', 'notify', 'push', 'message', 'broadcast', 'deliver',
  '发送', '通知', '推送', '邮件', '消息',
];

const DELETE_OPERATION_KEYWORDS = [
  'delete', 'remove', 'drop', 'clear', 'purge', 'destroy', 'erase',
  '删除', '移除', '清除', '销毁',
];

const EXECUTE_OPERATION_KEYWORDS = [
  'execute', 'run', 'trigger', 'invoke', 'call', 'action',
  '执行', '运行', '触发', '调用',
];

// ========== 检测 MCP 操作类型 ==========

export function detectMCPOperationType(node: NodeSpec): MCPOperationType {
  const name = (node.name || '').toLowerCase();
  const desc = (node.description || '').toLowerCase();
  const text = `${name} ${desc}`;

  // 按优先级检测
  if (DELETE_OPERATION_KEYWORDS.some(k => text.includes(k))) {
    return 'delete';
  }
  if (SEND_OPERATION_KEYWORDS.some(k => text.includes(k))) {
    return 'send';
  }
  if (WRITE_OPERATION_KEYWORDS.some(k => text.includes(k))) {
    return 'write';
  }
  if (EXECUTE_OPERATION_KEYWORDS.some(k => text.includes(k))) {
    return 'execute';
  }

  return 'read'; // 默认为读操作，不需要日志
}

// ========== 检查是否需要 Manus 日志 ==========

export function needsManusLogging(node: NodeSpec): boolean {
  if (node.type !== 'mcp_action') {
    return false;
  }

  const operation = detectMCPOperationType(node);
  
  // 只有写、发送、删除、执行操作需要日志
  return ['write', 'send', 'delete', 'execute'].includes(operation);
}

// ========== 创建 Manus Logger 节点 ==========

export function createManusLoggerNode(
  targetNode: NodeSpec,
  rule: ManusWiringRule
): ManusLoggerNodeSpec {
  const loggerNode: ManusLoggerNodeSpec = {
    id: `manus-logger-${targetNode.id}`,
    type: 'manus_logger',
    name: `Manus 进度记录 (${targetNode.name})`,
    config: {
      template: rule.enforce.preConnection.mappingTemplate,
      targetFile: 'progress.md',
    },
    inputMappings: [
      {
        targetField: 'action_data',
        sourceExpression: `{{${targetNode.id}.inputs}}`,
      },
      {
        targetField: 'node_name',
        sourceExpression: `"${targetNode.name}"`,
      },
    ],
    outputKey: `manus_log_${targetNode.id}`,
  };

  return loggerNode;
}

// ========== 注入 Manus 协议连线 ==========

export function injectManusConnections(
  nodes: NodeSpec[],
  connections: WiringConnection[]
): {
  modifiedConnections: WiringConnection[];
  manusNodes: ManusLoggerNodeSpec[];
  warnings: string[];
} {
  const modifiedConnections = [...connections];
  const manusNodes: ManusLoggerNodeSpec[] = [];
  const warnings: string[] = [];

  for (const node of nodes) {
    // 只处理 MCP 动作节点
    if (node.type !== 'mcp_action') continue;

    const operation = detectMCPOperationType(node);

    // 跳过读操作
    if (operation === 'read') continue;

    // 查找适用的 Manus 规则
    const applicableRule = MANUS_WIRING_RULES.find(
      rule =>
        rule.trigger.nodeType === node.type &&
        rule.trigger.operation === operation
    );

    if (!applicableRule) continue;

    // 检查是否已有 Manus Logger 连接
    const hasLoggerConnection = connections.some(
      c =>
        c.target.nodeId === node.id &&
        c.source.nodeId.startsWith('manus-logger')
    );

    if (hasLoggerConnection) continue;

    // 创建 Manus Logger 节点
    const loggerNode = createManusLoggerNode(node, applicableRule);
    manusNodes.push(loggerNode);

    // 创建从 Logger 到目标节点的控制连接
    const controlConnection: WiringConnection = {
      id: `manus-wire-${node.id}`,
      source: {
        nodeId: loggerNode.id,
        portId: 'log_complete',
        portName: '日志完成',
        dataType: 'boolean' as IODataType,
      },
      target: {
        nodeId: node.id,
        portId: 'control_in',
        portName: '控制输入',
        dataType: 'boolean' as IODataType,
      },
      mapping: `{{${loggerNode.id}.output.log_complete}}`,
      confidence: 1.0,
      status: 'confirmed',
      matchReason: `Manus Protocol: ${operation} 操作前置日志记录`,
    };

    modifiedConnections.push(controlConnection);
    warnings.push(
      `⚡ Manus 协议: 为 "${node.name}" (${operation}) 注入进度记录节点`
    );
  }

  return { modifiedConnections, manusNodes, warnings };
}

// ========== 验证 Manus 协议合规性 ==========

export function validateManusCompliance(
  nodes: NodeSpec[],
  connections: WiringConnection[]
): { compliant: boolean; violations: string[] } {
  const violations: string[] = [];

  for (const node of nodes) {
    if (!needsManusLogging(node)) continue;

    // 检查是否有前置 Manus Logger 连接
    const hasLoggerConnection = connections.some(
      c =>
        c.target.nodeId === node.id &&
        c.source.nodeId.startsWith('manus-logger')
    );

    if (!hasLoggerConnection) {
      const operation = detectMCPOperationType(node);
      violations.push(
        `节点 "${node.name}" 执行 ${operation} 操作但未连接 Manus Logger`
      );
    }
  }

  return {
    compliant: violations.length === 0,
    violations,
  };
}

// ========== 生成 Manus 日志模板 ==========

export function generateManusLogTemplate(
  node: NodeSpec,
  operation: MCPOperationType
): string {
  const templates: Record<MCPOperationType, string> = {
    write: `| {{timestamp}} | 写入 | {{node.name}} | {{node.inputs.path || node.inputs.target}} | ✅ 完成 |`,
    send: `| {{timestamp}} | 发送 | {{node.name}} | {{node.inputs.to || node.inputs.recipient}} | ✅ 已发送 |`,
    delete: `| {{timestamp}} | 删除 | {{node.name}} | {{node.inputs.target || node.inputs.path}} | ⚠️ 已删除 |`,
    execute: `| {{timestamp}} | 执行 | {{node.name}} | {{node.inputs | summary}} | ✅ 完成 |`,
    read: `| {{timestamp}} | 读取 | {{node.name}} | - | ℹ️ 信息 |`,
  };

  return templates[operation];
}

// ========== 获取操作的风险等级 ==========

export function getOperationRiskLevel(
  operation: MCPOperationType
): 'low' | 'medium' | 'high' {
  const riskLevels: Record<MCPOperationType, 'low' | 'medium' | 'high'> = {
    read: 'low',
    execute: 'medium',
    write: 'medium',
    send: 'medium',
    delete: 'high',
  };

  return riskLevels[operation];
}

// ========== 检查是否为敏感操作 ==========

export function isSensitiveOperation(node: NodeSpec): boolean {
  const operation = detectMCPOperationType(node);
  return getOperationRiskLevel(operation) !== 'low';
}

// ========== 批量注入 Manus 日志 ==========

export function batchInjectManusLogging(
  nodes: NodeSpec[]
): {
  loggerNodes: ManusLoggerNodeSpec[];
  connectionPairs: Array<{ loggerId: string; targetId: string }>;
} {
  const loggerNodes: ManusLoggerNodeSpec[] = [];
  const connectionPairs: Array<{ loggerId: string; targetId: string }> = [];

  for (const node of nodes) {
    if (!needsManusLogging(node)) continue;

    const operation = detectMCPOperationType(node);
    const rule = MANUS_WIRING_RULES.find(
      r => r.trigger.nodeType === node.type && r.trigger.operation === operation
    );

    if (!rule) continue;

    const loggerNode = createManusLoggerNode(node, rule);
    loggerNodes.push(loggerNode);
    connectionPairs.push({
      loggerId: loggerNode.id,
      targetId: node.id,
    });
  }

  return { loggerNodes, connectionPairs };
}
