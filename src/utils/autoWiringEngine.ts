// =====================================================
// 自动布线引擎 - Auto-Wiring Engine (增强版)
// 负责智能推断节点间的变量映射
// 支持草稿边机制 + 置信度标记
// =====================================================

import { 
  NodeSpec, 
  InputMapping, 
  GeneratedVariableMapping 
} from '../types/workflowDSL.ts';
import { 
  VariableType, 
  nodeOutputSchemas, 
  isTypeCompatible 
} from '../components/builder/variables/variableTypes.ts';

// ========== 类型定义 ==========

interface SchemaField {
  path: string;
  type: VariableType;
  description?: string;
  required?: boolean;
}

interface WiringCandidate {
  sourceField: SchemaField;
  targetField: SchemaField;
  confidence: number;
  matchReason: string;
}

// ========== 布线结果类型 ==========

export interface WiringResult {
  mapping: InputMapping;
  confidence: number;
  status: 'confirmed' | 'draft';
  matchReason: string;
}

export interface EdgeWithConfidence {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  style?: Record<string, unknown>;
  data: {
    confidence: number;
    status: 'confirmed' | 'draft';
    needsReview: boolean;
    matchReason?: string;
    mappings?: InputMapping[];
  };
}

// ========== 节点输入 Schema 定义 ==========

export const nodeInputSchemas: Record<string, Record<string, { type: VariableType; required?: boolean; description?: string }>> = {
  agent: {
    'context': { type: 'object', description: '上下文信息' },
    'user_message': { type: 'string', required: true, description: '用户消息' },
    'knowledge_context': { type: 'string', description: '知识库上下文' },
    'tool_results': { type: 'object', description: '工具执行结果' },
    'system_prompt_override': { type: 'string', description: '系统提示词覆盖' },
  },
  skill: {
    'input': { type: 'any', required: true, description: '技能输入' },
    'config': { type: 'object', description: '技能配置' },
  },
  mcp_action: {
    'params': { type: 'object', required: true, description: 'MCP 参数' },
    'context': { type: 'object', description: '执行上下文' },
  },
  knowledge: {
    'query': { type: 'string', required: true, description: '查询文本' },
    'filters': { type: 'object', description: '过滤条件' },
  },
  condition: {
    'value': { type: 'any', required: true, description: '判断值' },
  },
  output: {
    'content': { type: 'string', required: true, description: '输出内容' },
    'format': { type: 'string', description: '输出格式' },
  },
  intervention: {
    'data': { type: 'any', required: true, description: '待确认数据' },
    'message': { type: 'string', description: '确认消息' },
  },
};

// ========== 语义匹配关键词 ==========

const SEMANTIC_KEYWORDS: Record<string, string[]> = {
  // 通用字段
  'message': ['content', 'text', 'body', 'data', 'response', 'output', 'result'],
  'content': ['message', 'text', 'body', 'data', 'response', 'output', 'result'],
  'query': ['question', 'search', 'input', 'message', 'text', 'prompt'],
  'result': ['output', 'response', 'data', 'answer', 'content'],
  'context': ['metadata', 'info', 'state', 'data', 'background'],
  
  // 特定领域
  'temperature': ['temp', 'weather_temp', 'current_temp'],
  'email': ['mail', 'message', 'content', 'to', 'recipient'],
  'name': ['title', 'label', 'display_name', 'subject'],
  'id': ['identifier', 'key', 'uuid', 'ref'],
  'url': ['link', 'href', 'path', 'endpoint'],
  'user': ['author', 'creator', 'owner', 'sender'],
  'time': ['timestamp', 'date', 'datetime', 'created_at', 'updated_at'],
  'recipients': ['to', 'email', 'addresses', 'receivers'],
};

// ========== 置信度阈值 ==========

const CONFIDENCE_THRESHOLDS = {
  CONFIRMED: 0.7,  // 自动确认阈值
  DRAFT: 0.4,      // 草稿阈值（低于此不连接）
};

// ========== 主函数：自动推断变量映射 ==========

export function inferVariableMappings(
  sourceNode: NodeSpec,
  targetNode: NodeSpec,
  existingVariables: Map<string, SchemaField[]>
): InputMapping[] {
  const mappings: InputMapping[] = [];
  
  // 1. 获取源节点的输出 Schema
  const sourceOutputs = getNodeOutputFields(sourceNode, existingVariables);
  
  // 2. 获取目标节点的输入 Schema
  const targetInputs = getNodeInputFields(targetNode);
  
  // 3. 寻找最佳匹配
  const candidates = findWiringCandidates(sourceOutputs, targetInputs, sourceNode.id);
  
  // 4. 选择高置信度的映射
  for (const candidate of candidates) {
    if (candidate.confidence >= CONFIDENCE_THRESHOLDS.DRAFT) {
      mappings.push({
        targetField: candidate.targetField.path,
        sourceExpression: `{{${sourceNode.outputKey || sourceNode.id}.output.${candidate.sourceField.path}}}`,
      });
    }
  }
  
  return mappings;
}

// ========== 增强：带置信度的映射推断 ==========

export function inferVariableMappingsWithConfidence(
  sourceNode: NodeSpec,
  targetNode: NodeSpec,
  existingVariables: Map<string, SchemaField[]>
): WiringResult[] {
  const results: WiringResult[] = [];
  
  const sourceOutputs = getNodeOutputFields(sourceNode, existingVariables);
  const targetInputs = getNodeInputFields(targetNode);
  const candidates = findWiringCandidates(sourceOutputs, targetInputs, sourceNode.id);
  
  for (const candidate of candidates) {
    if (candidate.confidence >= CONFIDENCE_THRESHOLDS.DRAFT) {
      results.push({
        mapping: {
          targetField: candidate.targetField.path,
          sourceExpression: `{{${sourceNode.outputKey || sourceNode.id}.output.${candidate.sourceField.path}}}`,
        },
        confidence: candidate.confidence,
        status: candidate.confidence >= CONFIDENCE_THRESHOLDS.CONFIRMED ? 'confirmed' : 'draft',
        matchReason: candidate.matchReason,
      });
    }
  }
  
  return results;
}

// ========== 创建带置信度的边 ==========

export function createEdgeWithConfidence(
  sourceNodeId: string,
  targetNodeId: string,
  wiringResults: WiringResult[]
): EdgeWithConfidence {
  // 计算整体置信度（取平均）
  const avgConfidence = wiringResults.length > 0
    ? wiringResults.reduce((sum, r) => sum + r.confidence, 0) / wiringResults.length
    : 0.5;
  
  // 确定状态
  const hasLowConfidence = wiringResults.some(r => r.status === 'draft');
  const status = hasLowConfidence ? 'draft' : 'confirmed';
  
  // 汇总匹配原因
  const matchReasons = [...new Set(wiringResults.map(r => r.matchReason))];
  
  return {
    id: `edge-${sourceNodeId}-${targetNodeId}`,
    source: sourceNodeId,
    target: targetNodeId,
    style: status === 'draft' 
      ? { stroke: '#ef4444', strokeDasharray: '5,5', strokeWidth: 2 }
      : { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
    data: {
      confidence: avgConfidence,
      status,
      needsReview: status === 'draft',
      matchReason: matchReasons.join('; '),
      mappings: wiringResults.map(r => r.mapping),
    },
  };
}

// ========== 获取节点输出字段 ==========

function getNodeOutputFields(
  node: NodeSpec,
  existingVariables: Map<string, SchemaField[]>
): SchemaField[] {
  // 首先检查是否有自定义的输出 schema
  if (existingVariables.has(node.id)) {
    return existingVariables.get(node.id)!;
  }
  
  // 使用预定义的 schema
  const schema = nodeOutputSchemas[node.type];
  if (!schema) {
    return [{ path: 'output', type: 'any' }];
  }
  
  return Object.entries(schema).map(([key, type]) => ({
    path: key,
    type: type as VariableType,
  }));
}

// ========== 获取节点输入字段 ==========

function getNodeInputFields(node: NodeSpec): SchemaField[] {
  const schema = nodeInputSchemas[node.type];
  if (!schema) {
    return [{ path: 'input', type: 'any', required: true }];
  }
  
  return Object.entries(schema).map(([key, config]) => ({
    path: key,
    type: config.type,
    required: config.required,
    description: config.description,
  }));
}

// ========== 寻找布线候选 ==========

function findWiringCandidates(
  sources: SchemaField[],
  targets: SchemaField[],
  sourceNodeId: string
): WiringCandidate[] {
  const candidates: WiringCandidate[] = [];
  
  for (const target of targets) {
    let bestMatch: WiringCandidate | null = null;
    
    for (const source of sources) {
      const confidence = calculateMatchConfidence(source, target);
      
      if (confidence > 0 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = {
          sourceField: source,
          targetField: target,
          confidence,
          matchReason: getMatchReason(source, target, confidence),
        };
      }
    }
    
    if (bestMatch) {
      candidates.push(bestMatch);
    }
  }
  
  // 按置信度排序
  return candidates.sort((a, b) => b.confidence - a.confidence);
}

// ========== 计算匹配置信度 ==========

function calculateMatchConfidence(source: SchemaField, target: SchemaField): number {
  let confidence = 0;
  
  // 1. 类型兼容性检查 (权重: 0.3)
  if (isTypeCompatible(source.type, target.type)) {
    confidence += 0.3;
  } else {
    return 0; // 类型不兼容直接返回 0
  }
  
  // 2. 字段名完全匹配 (权重: 0.5)
  const sourceName = source.path.toLowerCase();
  const targetName = target.path.toLowerCase();
  
  if (sourceName === targetName) {
    confidence += 0.5;
  }
  // 3. 字段名部分匹配 (权重: 0.3)
  else if (sourceName.includes(targetName) || targetName.includes(sourceName)) {
    confidence += 0.3;
  }
  // 4. 语义关键词匹配 (权重: 0.25)
  else {
    const semanticMatch = checkSemanticMatch(sourceName, targetName);
    confidence += semanticMatch * 0.25;
  }
  
  // 5. 必填字段加权 (权重: 0.1)
  if (target.required) {
    confidence += 0.1;
  }
  
  // 6. 描述匹配 (权重: 0.1)
  if (source.description && target.description) {
    const descMatch = calculateTextSimilarity(source.description, target.description);
    confidence += descMatch * 0.1;
  }
  
  return Math.min(confidence, 1.0);
}

// ========== 语义匹配检查 ==========

function checkSemanticMatch(source: string, target: string): number {
  // 检查是否在语义关键词表中
  for (const [key, synonyms] of Object.entries(SEMANTIC_KEYWORDS)) {
    const allTerms = [key, ...synonyms];
    const sourceMatches = allTerms.some(t => source.includes(t) || t.includes(source));
    const targetMatches = allTerms.some(t => target.includes(t) || t.includes(target));
    
    if (sourceMatches && targetMatches) {
      return 1.0;
    }
  }
  
  return 0;
}

// ========== 文本相似度计算 ==========

function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

// ========== 获取匹配原因 ==========

function getMatchReason(source: SchemaField, target: SchemaField, confidence: number): string {
  const sourceName = source.path.toLowerCase();
  const targetName = target.path.toLowerCase();
  
  if (sourceName === targetName) {
    return '字段名完全匹配';
  }
  if (sourceName.includes(targetName) || targetName.includes(sourceName)) {
    return '字段名部分匹配';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.CONFIRMED) {
    return '语义相似度高';
  }
  if (confidence >= CONFIDENCE_THRESHOLDS.DRAFT) {
    return '类型兼容，需人工确认';
  }
  return '类型兼容匹配';
}

// ========== 批量自动布线 ==========

export function autoWireWorkflow(
  nodes: NodeSpec[],
  edges: { source: string; target: string }[]
): Map<string, InputMapping[]> {
  const result = new Map<string, InputMapping[]>();
  const variableContext = new Map<string, SchemaField[]>();
  
  // 按拓扑顺序处理
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    
    if (sourceNode && targetNode) {
      const mappings = inferVariableMappings(sourceNode, targetNode, variableContext);
      const edgeKey = `${edge.source}->${edge.target}`;
      result.set(edgeKey, mappings);
      
      // 更新变量上下文
      const outputFields = getNodeOutputFields(sourceNode, variableContext);
      variableContext.set(sourceNode.id, outputFields);
    }
  }
  
  return result;
}

// ========== 批量自动布线（带置信度） ==========

export function autoWireWorkflowWithConfidence(
  nodes: NodeSpec[],
  edges: { source: string; target: string }[]
): Map<string, EdgeWithConfidence> {
  const result = new Map<string, EdgeWithConfidence>();
  const variableContext = new Map<string, SchemaField[]>();
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    
    if (sourceNode && targetNode) {
      const wiringResults = inferVariableMappingsWithConfidence(sourceNode, targetNode, variableContext);
      const edgeWithConfidence = createEdgeWithConfidence(edge.source, edge.target, wiringResults);
      
      const edgeKey = `${edge.source}->${edge.target}`;
      result.set(edgeKey, edgeWithConfidence);
      
      const outputFields = getNodeOutputFields(sourceNode, variableContext);
      variableContext.set(sourceNode.id, outputFields);
    }
  }
  
  return result;
}

// ========== 验证映射有效性 ==========

export function validateMappings(
  mappings: InputMapping[],
  sourceNode: NodeSpec,
  targetNode: NodeSpec
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const targetInputs = getNodeInputFields(targetNode);
  
  // 检查必填字段是否都有映射
  const mappedTargets = new Set(mappings.map(m => m.targetField));
  for (const input of targetInputs) {
    if (input.required && !mappedTargets.has(input.path)) {
      errors.push(`必填字段 "${input.path}" 缺少映射`);
    }
  }
  
  // 验证表达式语法
  for (const mapping of mappings) {
    if (!isValidExpression(mapping.sourceExpression)) {
      errors.push(`无效的表达式: ${mapping.sourceExpression}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

function isValidExpression(expr: string): boolean {
  // 检查基本的变量引用格式 {{node.path}}
  const pattern = /^\{\{[\w\-]+(\.\w+)*\}\}$/;
  return pattern.test(expr) || expr.startsWith('{') || expr.startsWith('[');
}

// ========== 生成映射建议 ==========

export function generateMappingSuggestions(
  sourceNode: NodeSpec,
  targetNode: NodeSpec,
  existingMappings: InputMapping[]
): Array<{ mapping: InputMapping; confidence: number; reason: string }> {
  const existingTargets = new Set(existingMappings.map(m => m.targetField));
  const variableContext = new Map<string, SchemaField[]>();
  
  const sourceOutputs = getNodeOutputFields(sourceNode, variableContext);
  const targetInputs = getNodeInputFields(targetNode);
  
  const suggestions: Array<{ mapping: InputMapping; confidence: number; reason: string }> = [];
  
  for (const target of targetInputs) {
    if (existingTargets.has(target.path)) continue;
    
    for (const source of sourceOutputs) {
      const confidence = calculateMatchConfidence(source, target);
      
      if (confidence >= 0.3) {
        suggestions.push({
          mapping: {
            targetField: target.path,
            sourceExpression: `{{${sourceNode.outputKey || sourceNode.id}.output.${source.path}}}`,
          },
          confidence,
          reason: getMatchReason(source, target, confidence),
        });
      }
    }
  }
  
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

// ========== 获取草稿边列表 ==========

export function getDraftEdges(
  edgesWithConfidence: Map<string, EdgeWithConfidence>
): EdgeWithConfidence[] {
  return Array.from(edgesWithConfidence.values()).filter(e => e.data.status === 'draft');
}

// ========== 导出置信度阈值 ==========

export { CONFIDENCE_THRESHOLDS };

// ========== 智能胶水层集成 ==========
// 重新导出智能连线相关模块供外部使用

export { inferIOPorts, inferAllNodeIOPorts } from './ioTypeInference.ts';
export { needsTypeAdapter, createAdapterNode, TYPE_COMPATIBILITY_MATRIX } from './typeAdapterInjector.ts';
export { injectManusConnections, detectMCPOperationType, needsManusLogging } from './manusWiringIntegration.ts';
export type { 
  IOPort, 
  IODataType, 
  WiringConnection, 
  AdapterNodeSpec, 
  ManusLoggerNodeSpec,
  IntelligentWiringResult 
} from '../types/wiringTypes.ts';
