// =====================================================
// 模拟数据生成器 - Mock Data Generator
// =====================================================

import type { DataFieldSnapshot, NodeDataSnapshot } from '@/types/dataSnapshotTypes';
import type { VariableType } from '@/components/builder/variables/variableTypes';

/**
 * 根据测试场景预定义的模拟数据
 */
const SCENARIO_MOCK_DATA: Record<string, Record<string, Record<string, unknown>>> = {
  'after-sales-assistant': {
    'trigger': {
      message: '我的手机屏幕裂开了，请帮我看看是什么问题',
      timestamp: Date.now(),
      user_id: 'user_12345',
    },
    'knowledge': {
      context: '根据维修手册第3.2节：屏幕裂纹分为两类：\n1) 人为损坏：外力撞击导致的裂纹\n2) 质量问题：正常使用下出现的裂纹',
      chunks: [{ id: 'chunk_1', content: '维修手册内容...' }],
      sources: ['repair_manual_v2.pdf'],
    },
    'skill': {
      output: {
        damage_type: 'physical_impact',
        severity: 'high',
        is_manufacturing_defect: false,
        confidence: 0.95,
      },
      status: 'success',
    },
    'router': {
      matched_intent: 'human_damage',
      confidence: 0.92,
      original_input: '综合判断：人为损坏',
      decision: 'branch_email',
    },
    'mcp_email': {
      status: 'sent',
      recipient: 'user@example.com',
      subject: '维修报价单',
      body: '您好，根据我们的检测...',
    },
    'mcp_notion': {
      status: 'created',
      page_id: 'notion_page_123',
      database: '质量问题登记表',
      title: '屏幕裂纹投诉 #12345',
    },
  },
  'research-assistant': {
    'trigger': {
      query: '请帮我分析最近的AI发展趋势',
      user_id: 'researcher_001',
    },
    'knowledge': {
      context: '2024年AI趋势报告显示：大模型向多模态发展，Agent成为主流范式...',
      sources: ['ai_trends_2024.pdf', 'gartner_report.pdf'],
    },
    'skill': {
      output: {
        summary: 'AI发展呈现三大趋势：多模态、Agent化、边缘部署',
        key_points: ['多模态融合', 'Agent生态', '轻量化部署'],
      },
    },
    'agent': {
      response: '根据分析，当前AI发展主要呈现以下趋势...',
      tokens_used: 1250,
    },
  },
  'default': {
    'trigger': {
      message: '用户输入消息',
      timestamp: Date.now(),
    },
    'knowledge': {
      context: '从知识库检索到的相关内容...',
      sources: ['document.pdf'],
    },
    'skill': {
      output: { result: '技能处理结果' },
      status: 'success',
    },
    'router': {
      decision: 'default_branch',
      confidence: 0.8,
    },
    'agent': {
      response: 'Agent 生成的响应内容',
      tokens_used: 500,
    },
    'mcp_action': {
      status: 'completed',
      result: { success: true },
    },
  },
};

/**
 * 节点类型对应的输入字段定义
 */
const NODE_INPUT_SCHEMAS: Record<string, { path: string; type: VariableType; description: string }[]> = {
  knowledge: [
    { path: 'query', type: 'string', description: '检索查询' },
  ],
  skill: [
    { path: 'input', type: 'object', description: '技能输入数据' },
    { path: 'context', type: 'string', description: '上下文信息' },
  ],
  router: [
    { path: 'input', type: 'string', description: '待路由的内容' },
    { path: 'context', type: 'object', description: '上下文数据' },
  ],
  agent: [
    { path: 'messages', type: 'array', description: '对话历史' },
    { path: 'context', type: 'object', description: '上下文信息' },
  ],
  mcp_action: [
    { path: 'params', type: 'object', description: '操作参数' },
  ],
  intervention: [
    { path: 'pending_action', type: 'object', description: '待审批操作' },
  ],
};

/**
 * 节点类型对应的输出字段定义
 */
const NODE_OUTPUT_SCHEMAS: Record<string, { path: string; type: VariableType; description: string }[]> = {
  trigger: [
    { path: 'message', type: 'string', description: '用户消息' },
    { path: 'timestamp', type: 'number', description: '时间戳' },
  ],
  knowledge: [
    { path: 'context', type: 'string', description: '检索到的内容' },
    { path: 'sources', type: 'array', description: '来源文档' },
  ],
  skill: [
    { path: 'output', type: 'object', description: '技能输出' },
    { path: 'status', type: 'string', description: '执行状态' },
  ],
  router: [
    { path: 'decision', type: 'string', description: '路由决策' },
    { path: 'confidence', type: 'number', description: '置信度' },
  ],
  agent: [
    { path: 'response', type: 'string', description: 'Agent响应' },
    { path: 'tokens_used', type: 'number', description: '使用Token数' },
  ],
  mcp_action: [
    { path: 'status', type: 'string', description: '执行状态' },
    { path: 'result', type: 'object', description: '执行结果' },
  ],
  intervention: [
    { path: 'approved', type: 'boolean', description: '是否批准' },
    { path: 'feedback', type: 'string', description: '审批反馈' },
  ],
};

/**
 * 数据转换描述
 */
const TRANSFORMATION_DESCRIPTIONS: Record<string, string> = {
  trigger: '接收用户输入，解析消息内容和元数据',
  knowledge: '从知识库检索相关文档片段，提取语义匹配的内容',
  skill: '执行技能处理，分析输入数据并生成结构化输出',
  router: '根据规则或 AI 判断，决定数据流向哪个分支',
  agent: '综合所有输入，进行推理并生成响应',
  mcp_action: '调用外部服务执行操作，返回执行结果',
  intervention: '暂停流程等待人工审批，记录审批结果',
  manus_kernel: '协调多个子任务，管理执行状态和结果汇总',
};

/**
 * 推断变量类型
 */
function inferType(value: unknown): VariableType {
  if (value === null || value === undefined) return 'any';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'any';
}

/**
 * 生成节点输入快照
 */
function generateInputSnapshots(
  nodeType: string,
  previousNodeData: Record<string, unknown>,
  scenarioData: Record<string, unknown>
): DataFieldSnapshot[] {
  const inputSchema = NODE_INPUT_SCHEMAS[nodeType] || [];
  const snapshots: DataFieldSnapshot[] = [];

  // 基于 schema 生成输入
  for (const field of inputSchema) {
    const value = previousNodeData[field.path] ?? scenarioData[field.path] ?? null;
    if (value !== null) {
      snapshots.push({
        path: field.path,
        type: field.type,
        value,
        source: 'mock',
        description: field.description,
      });
    }
  }

  // 如果有前置节点数据，添加来自前置节点的输出
  for (const [key, value] of Object.entries(previousNodeData)) {
    if (!snapshots.find(s => s.path === key) && value !== undefined) {
      snapshots.push({
        path: `prev.${key}`,
        type: inferType(value),
        value,
        source: 'mock',
        description: '来自上游节点',
      });
    }
  }

  return snapshots;
}

/**
 * 生成节点输出快照
 */
function generateOutputSnapshots(
  nodeId: string,
  nodeType: string,
  scenarioData: Record<string, unknown>
): DataFieldSnapshot[] {
  const outputSchema = NODE_OUTPUT_SCHEMAS[nodeType] || [];
  const nodeData = scenarioData[nodeId] || scenarioData[nodeType] || {};
  const snapshots: DataFieldSnapshot[] = [];

  // 基于 schema 生成输出
  for (const field of outputSchema) {
    const value = (nodeData as Record<string, unknown>)[field.path];
    if (value !== undefined) {
      snapshots.push({
        path: `${nodeId}.${field.path}`,
        type: field.type,
        value,
        source: 'mock',
        description: field.description,
      });
    }
  }

  // 添加 nodeData 中的其他字段
  for (const [key, value] of Object.entries(nodeData as Record<string, unknown>)) {
    const fullPath = `${nodeId}.${key}`;
    if (!snapshots.find(s => s.path === fullPath) && value !== undefined) {
      snapshots.push({
        path: fullPath,
        type: inferType(value),
        value,
        source: 'mock',
      });
    }
  }

  return snapshots;
}

/**
 * 生成节点数据快照
 */
export function generateNodeSnapshot(
  nodeId: string,
  nodeType: string,
  nodeName: string,
  scenarioId: string,
  previousNodeOutputs: Record<string, unknown> = {}
): NodeDataSnapshot {
  // 获取场景数据，fallback 到 default
  const scenarioData = SCENARIO_MOCK_DATA[scenarioId] || SCENARIO_MOCK_DATA['default'];
  
  // 规范化节点类型
  const normalizedType = nodeType.toLowerCase().replace(/_/g, '').replace('node', '');
  const typeKey = normalizedType.includes('mcp') ? 'mcp_action' : 
                  normalizedType.includes('knowledge') ? 'knowledge' :
                  normalizedType.includes('skill') ? 'skill' :
                  normalizedType.includes('router') ? 'router' :
                  normalizedType.includes('agent') ? 'agent' :
                  normalizedType.includes('trigger') ? 'trigger' :
                  normalizedType.includes('intervention') ? 'intervention' :
                  'skill';

  const inputs = generateInputSnapshots(typeKey, previousNodeOutputs, scenarioData);
  const outputs = generateOutputSnapshots(nodeId, typeKey, scenarioData);
  const transformation = TRANSFORMATION_DESCRIPTIONS[typeKey] || '处理输入数据并产生输出';

  return {
    nodeId,
    nodeName,
    nodeType,
    inputs,
    outputs,
    transformation,
  };
}

/**
 * 从节点快照中提取输出数据（用于传递给下一个节点）
 */
export function extractOutputData(snapshot: NodeDataSnapshot): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  for (const output of snapshot.outputs) {
    // 移除节点ID前缀，只保留字段名
    const fieldName = output.path.split('.').pop() || output.path;
    result[fieldName] = output.value;
  }
  
  return result;
}
