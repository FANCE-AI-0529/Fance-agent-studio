// =====================================================
// IO 类型推断器 - IO Type Inference
// 从节点规格推断标准化 IO 端口
// =====================================================

import {
  IOPort,
  IODataType,
  IOSpec,
  SchemaDefinition,
  NodeWithIO,
} from '@/types/wiringTypes';

// ========== 节点 IO Schema 库 ==========
// 标准化不同类型节点的输入输出

export const NODE_IO_SCHEMAS: Record<string, { inputs: IOPort[]; outputs: IOPort[] }> = {
  knowledge: {
    inputs: [
      { id: 'query', name: '查询文本', type: 'string', direction: 'input', required: true },
      { id: 'filters', name: '过滤条件', type: 'object', direction: 'input' },
      { id: 'top_k', name: '返回数量', type: 'number', direction: 'input' },
    ],
    outputs: [
      { id: 'content_text', name: '检索内容', type: 'string', direction: 'output' },
      { id: 'chunks', name: '分块列表', type: 'array', direction: 'output' },
      { id: 'sources', name: '来源引用', type: 'array', direction: 'output' },
      { id: 'metadata', name: '元数据', type: 'object', direction: 'output' },
      { id: 'relevance_score', name: '相关度分数', type: 'number', direction: 'output' },
    ],
  },

  skill: {
    inputs: [
      { id: 'input', name: '输入', type: 'any', direction: 'input', required: true },
      { id: 'config', name: '配置', type: 'object', direction: 'input' },
      { id: 'context', name: '上下文', type: 'object', direction: 'input' },
    ],
    outputs: [
      { id: 'output', name: '输出', type: 'any', direction: 'output' },
      { id: 'result', name: '结果', type: 'any', direction: 'output' },
      { id: 'status', name: '状态', type: 'string', direction: 'output' },
      { id: 'error', name: '错误', type: 'string', direction: 'output' },
    ],
  },

  mcp_action: {
    inputs: [
      { id: 'body', name: '请求体', type: 'object', direction: 'input', required: true },
      { id: 'params', name: '参数', type: 'object', direction: 'input' },
      { id: 'context', name: '上下文', type: 'object', direction: 'input' },
      { id: 'control_in', name: '控制输入', type: 'boolean', direction: 'input' },
    ],
    outputs: [
      { id: 'result', name: '执行结果', type: 'any', direction: 'output' },
      { id: 'status', name: '状态码', type: 'string', direction: 'output' },
      { id: 'error', name: '错误信息', type: 'string', direction: 'output' },
      { id: 'response', name: '响应数据', type: 'object', direction: 'output' },
    ],
  },

  agent: {
    inputs: [
      { id: 'user_message', name: '用户消息', type: 'string', direction: 'input', required: true },
      { id: 'context', name: '上下文', type: 'object', direction: 'input' },
      { id: 'knowledge_context', name: '知识上下文', type: 'string', direction: 'input' },
      { id: 'tool_results', name: '工具结果', type: 'object', direction: 'input' },
      { id: 'system_prompt', name: '系统提示词', type: 'string', direction: 'input' },
    ],
    outputs: [
      { id: 'response', name: '回复', type: 'string', direction: 'output' },
      { id: 'thinking', name: '推理过程', type: 'string', direction: 'output' },
      { id: 'actions', name: '执行动作', type: 'array', direction: 'output' },
      { id: 'confidence', name: '置信度', type: 'number', direction: 'output' },
    ],
  },

  intentRouter: {
    inputs: [
      { id: 'input', name: '输入', type: 'string', direction: 'input', required: true },
      { id: 'intent_query', name: '意图查询', type: 'string', direction: 'input' },
    ],
    outputs: [
      { id: 'matched_intent', name: '匹配意图', type: 'string', direction: 'output' },
      { id: 'confidence', name: '置信度', type: 'number', direction: 'output' },
      { id: 'original_input', name: '原始输入', type: 'string', direction: 'output' },
      { id: 'route', name: '路由目标', type: 'string', direction: 'output' },
    ],
  },

  condition: {
    inputs: [
      { id: 'value', name: '判断值', type: 'any', direction: 'input', required: true },
      { id: 'expression', name: '条件表达式', type: 'string', direction: 'input' },
    ],
    outputs: [
      { id: 'result', name: '判断结果', type: 'boolean', direction: 'output' },
      { id: 'true_branch', name: 'True分支', type: 'any', direction: 'output' },
      { id: 'false_branch', name: 'False分支', type: 'any', direction: 'output' },
    ],
  },

  // MCP 特定工具的 IO Schema
  email_sender: {
    inputs: [
      { id: 'to', name: '收件人', type: 'string', direction: 'input', required: true },
      { id: 'subject', name: '主题', type: 'string', direction: 'input', required: true },
      { id: 'body', name: '正文', type: 'string', direction: 'input', required: true },
      { id: 'cc', name: '抄送', type: 'array', direction: 'input' },
      { id: 'attachments', name: '附件', type: 'array', direction: 'input' },
    ],
    outputs: [
      { id: 'message_id', name: '消息ID', type: 'string', direction: 'output' },
      { id: 'status', name: '发送状态', type: 'string', direction: 'output' },
      { id: 'sent_at', name: '发送时间', type: 'string', direction: 'output' },
    ],
  },

  file_writer: {
    inputs: [
      { id: 'path', name: '文件路径', type: 'string', direction: 'input', required: true },
      { id: 'content', name: '文件内容', type: 'string', direction: 'input', required: true },
      { id: 'mode', name: '写入模式', type: 'string', direction: 'input' },
    ],
    outputs: [
      { id: 'success', name: '是否成功', type: 'boolean', direction: 'output' },
      { id: 'file_path', name: '完整路径', type: 'string', direction: 'output' },
      { id: 'bytes_written', name: '写入字节数', type: 'number', direction: 'output' },
    ],
  },

  manus_logger: {
    inputs: [
      { id: 'action_data', name: '动作数据', type: 'object', direction: 'input', required: true },
      { id: 'message', name: '日志消息', type: 'string', direction: 'input' },
    ],
    outputs: [
      { id: 'log_complete', name: '日志完成', type: 'boolean', direction: 'output' },
      { id: 'log_entry', name: '日志条目', type: 'string', direction: 'output' },
    ],
  },

  llm_transform: {
    inputs: [
      { id: 'input', name: '输入数据', type: 'any', direction: 'input', required: true },
      { id: 'prompt', name: '转换提示', type: 'string', direction: 'input' },
    ],
    outputs: [
      { id: 'output', name: '转换结果', type: 'any', direction: 'output' },
      { id: 'raw_response', name: '原始响应', type: 'string', direction: 'output' },
    ],
  },

  format_converter: {
    inputs: [
      { id: 'input', name: '输入', type: 'any', direction: 'input', required: true },
      { id: 'format', name: '格式', type: 'string', direction: 'input' },
    ],
    outputs: [
      { id: 'output', name: '输出', type: 'any', direction: 'output' },
    ],
  },

  extractor: {
    inputs: [
      { id: 'input', name: '输入对象', type: 'object', direction: 'input', required: true },
      { id: 'path', name: '提取路径', type: 'string', direction: 'input', required: true },
    ],
    outputs: [
      { id: 'output', name: '提取结果', type: 'any', direction: 'output' },
    ],
  },

  output: {
    inputs: [
      { id: 'content', name: '输出内容', type: 'string', direction: 'input', required: true },
      { id: 'format', name: '输出格式', type: 'string', direction: 'input' },
    ],
    outputs: [
      { id: 'rendered', name: '渲染结果', type: 'string', direction: 'output' },
    ],
  },

  intervention: {
    inputs: [
      { id: 'data', name: '待确认数据', type: 'any', direction: 'input', required: true },
      { id: 'message', name: '确认消息', type: 'string', direction: 'input' },
    ],
    outputs: [
      { id: 'approved', name: '是否批准', type: 'boolean', direction: 'output' },
      { id: 'modified_data', name: '修改后数据', type: 'any', direction: 'output' },
      { id: 'user_feedback', name: '用户反馈', type: 'string', direction: 'output' },
    ],
  },
};

// ========== 类型映射 ==========

function mapSchemaTypeToIOType(schemaType: string | undefined): IODataType {
  const typeMap: Record<string, IODataType> = {
    'string': 'string',
    'number': 'number',
    'integer': 'number',
    'boolean': 'boolean',
    'object': 'object',
    'array': 'array',
    'null': 'any',
    'file': 'file',
    'image': 'image',
  };
  
  return typeMap[schemaType || 'any'] || 'any';
}

// ========== 从 IO Spec 解析端口 ==========

function parseIOSpecToPorts(ioSpec: IOSpec): { inputs: IOPort[]; outputs: IOPort[] } {
  const inputs: IOPort[] = [];
  const outputs: IOPort[] = [];

  // 解析输入
  if (ioSpec.input?.properties) {
    for (const [key, prop] of Object.entries(ioSpec.input.properties)) {
      inputs.push({
        id: key,
        name: prop.description || key,
        type: mapSchemaTypeToIOType(prop.type),
        direction: 'input',
        required: ioSpec.input.required?.includes(key),
        schema: prop,
      });
    }
  }

  // 解析输出
  if (ioSpec.output?.properties) {
    for (const [key, prop] of Object.entries(ioSpec.output.properties)) {
      outputs.push({
        id: key,
        name: prop.description || key,
        type: mapSchemaTypeToIOType(prop.type),
        direction: 'output',
        schema: prop,
      });
    }
  }

  return { inputs, outputs };
}

// ========== 主函数: 推断节点 IO 端口 ==========

export function inferIOPorts(node: NodeWithIO): { inputs: IOPort[]; outputs: IOPort[] } {
  // 1. 如果节点已有端口定义，直接使用
  if (node.inputs && node.outputs) {
    return { inputs: node.inputs, outputs: node.outputs };
  }

  // 2. 检查预定义 Schema
  if (NODE_IO_SCHEMAS[node.type]) {
    return NODE_IO_SCHEMAS[node.type];
  }

  // 3. 从 io_spec 动态推断
  if (node.config?.ioSpec) {
    return parseIOSpecToPorts(node.config.ioSpec as IOSpec);
  }

  // 4. 默认 Schema
  return {
    inputs: [
      { id: 'input', name: '输入', type: 'any', direction: 'input', required: true },
    ],
    outputs: [
      { id: 'output', name: '输出', type: 'any', direction: 'output' },
    ],
  };
}

// ========== 批量推断 IO ==========

export function inferAllNodeIOPorts(
  nodes: NodeWithIO[]
): Map<string, { inputs: IOPort[]; outputs: IOPort[] }> {
  const result = new Map<string, { inputs: IOPort[]; outputs: IOPort[] }>();

  for (const node of nodes) {
    result.set(node.id, inferIOPorts(node));
  }

  return result;
}

// ========== 获取特定端口 ==========

export function getNodePort(
  node: NodeWithIO,
  portId: string,
  direction: 'input' | 'output'
): IOPort | undefined {
  const { inputs, outputs } = inferIOPorts(node);
  const ports = direction === 'input' ? inputs : outputs;
  return ports.find(p => p.id === portId);
}

// ========== 获取必填输入端口 ==========

export function getRequiredInputPorts(node: NodeWithIO): IOPort[] {
  const { inputs } = inferIOPorts(node);
  return inputs.filter(p => p.required);
}

// ========== 检查端口兼容性 ==========

export function arePortsCompatible(
  sourcePort: IOPort,
  targetPort: IOPort
): boolean {
  // any 类型与任何类型兼容
  if (sourcePort.type === 'any' || targetPort.type === 'any') {
    return true;
  }

  // 相同类型兼容
  if (sourcePort.type === targetPort.type) {
    return true;
  }

  // 特殊兼容规则
  const compatibilityRules: Record<IODataType, IODataType[]> = {
    'string': ['any'],
    'number': ['string', 'any'],
    'boolean': ['string', 'any'],
    'object': ['any'],
    'array': ['any'],
    'image': ['file', 'string', 'any'],
    'file': ['string', 'any'],
    'any': ['string', 'number', 'boolean', 'object', 'array', 'image', 'file'],
  };

  return compatibilityRules[sourcePort.type]?.includes(targetPort.type) || false;
}

// ========== 从节点类型获取默认 Schema ==========

export function getDefaultSchemaForType(nodeType: string): { inputs: IOPort[]; outputs: IOPort[] } | null {
  return NODE_IO_SCHEMAS[nodeType] || null;
}

// ========== 验证节点 IO 配置 ==========

export function validateNodeIO(node: NodeWithIO): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { inputs, outputs } = inferIOPorts(node);

  // 检查是否有输入
  if (inputs.length === 0) {
    errors.push(`节点 ${node.name} 没有定义输入端口`);
  }

  // 检查是否有输出
  if (outputs.length === 0) {
    errors.push(`节点 ${node.name} 没有定义输出端口`);
  }

  // 检查必填端口
  const requiredInputs = inputs.filter(p => p.required);
  if (requiredInputs.length === 0 && inputs.length > 0) {
    errors.push(`节点 ${node.name} 没有标记必填输入端口`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
