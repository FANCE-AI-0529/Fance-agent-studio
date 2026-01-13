// =====================================================
// 自动连线边缘函数 - Auto-Wire Edge Function
// 提供智能胶水层的服务端处理能力
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ========== 类型定义 ==========

type IODataType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'image' | 'file' | 'any';

interface IOPort {
  id: string;
  name: string;
  type: IODataType;
  direction: 'input' | 'output';
  description?: string;
  required?: boolean;
}

interface NodeSpec {
  id: string;
  type: string;
  name: string;
  description?: string;
  config?: Record<string, unknown>;
}

interface WiringConnection {
  id: string;
  source: {
    nodeId: string;
    portId: string;
    portName: string;
    dataType: IODataType;
  };
  target: {
    nodeId: string;
    portId: string;
    portName: string;
    dataType: IODataType;
  };
  mapping: string;
  confidence: number;
  status: 'confirmed' | 'draft' | 'needs_adapter';
  matchReason: string;
  adapterNode?: AdapterNodeSpec;
}

interface AdapterNodeSpec {
  id: string;
  type: string;
  name: string;
  inputType: IODataType;
  outputType: IODataType;
  config: Record<string, unknown>;
}

interface ManusLoggerNodeSpec {
  id: string;
  type: 'manus_logger';
  name: string;
  config: {
    template: string;
    targetFile: string;
  };
  inputMappings: Array<{
    targetField: string;
    sourceExpression: string;
  }>;
  outputKey: string;
}

interface WiringOptions {
  enableTypeAdapters?: boolean;
  enableManusIntegration?: boolean;
  confidenceThreshold?: number;
}

interface AutoWireRequest {
  nodes: NodeSpec[];
  edges: { source: string; target: string }[];
  options?: WiringOptions;
}

// ========== 节点 IO Schema 库 ==========

const NODE_IO_SCHEMAS: Record<string, { inputs: IOPort[]; outputs: IOPort[] }> = {
  knowledge: {
    inputs: [
      { id: 'query', name: '查询文本', type: 'string', direction: 'input', required: true },
    ],
    outputs: [
      { id: 'content_text', name: '检索内容', type: 'string', direction: 'output' },
      { id: 'chunks', name: '分块列表', type: 'array', direction: 'output' },
      { id: 'sources', name: '来源引用', type: 'array', direction: 'output' },
    ],
  },
  skill: {
    inputs: [
      { id: 'input', name: '输入', type: 'any', direction: 'input', required: true },
      { id: 'config', name: '配置', type: 'object', direction: 'input' },
    ],
    outputs: [
      { id: 'output', name: '输出', type: 'any', direction: 'output' },
      { id: 'result', name: '结果', type: 'any', direction: 'output' },
      { id: 'status', name: '状态', type: 'string', direction: 'output' },
    ],
  },
  mcp_action: {
    inputs: [
      { id: 'body', name: '请求体', type: 'object', direction: 'input', required: true },
      { id: 'params', name: '参数', type: 'object', direction: 'input' },
      { id: 'control_in', name: '控制输入', type: 'boolean', direction: 'input' },
    ],
    outputs: [
      { id: 'result', name: '执行结果', type: 'any', direction: 'output' },
      { id: 'status', name: '状态码', type: 'string', direction: 'output' },
    ],
  },
  agent: {
    inputs: [
      { id: 'user_message', name: '用户消息', type: 'string', direction: 'input', required: true },
      { id: 'knowledge_context', name: '知识上下文', type: 'string', direction: 'input' },
    ],
    outputs: [
      { id: 'response', name: '回复', type: 'string', direction: 'output' },
      { id: 'actions', name: '执行动作', type: 'array', direction: 'output' },
    ],
  },
  email_sender: {
    inputs: [
      { id: 'to', name: '收件人', type: 'string', direction: 'input', required: true },
      { id: 'subject', name: '主题', type: 'string', direction: 'input', required: true },
      { id: 'body', name: '正文', type: 'string', direction: 'input', required: true },
    ],
    outputs: [
      { id: 'message_id', name: '消息ID', type: 'string', direction: 'output' },
      { id: 'status', name: '发送状态', type: 'string', direction: 'output' },
    ],
  },
};

// ========== 语义匹配关键词 ==========

const PORT_SEMANTIC_SYNONYMS: Record<string, string[]> = {
  content: ['text', 'body', 'message', 'data', 'output', 'result', 'response'],
  query: ['input', 'question', 'search', 'text', 'message', 'prompt'],
  body: ['content', 'text', 'message', 'data', 'payload'],
  result: ['output', 'response', 'data', 'content', 'answer'],
  to: ['recipient', 'email', 'target', 'destination'],
  subject: ['title', 'header', 'name'],
};

// ========== 类型兼容性矩阵 ==========

const TYPE_COMPATIBILITY: Record<IODataType, IODataType[]> = {
  string: ['string', 'any'],
  number: ['number', 'string', 'any'],
  boolean: ['boolean', 'string', 'any'],
  object: ['object', 'any'],
  array: ['array', 'any'],
  image: ['image', 'file', 'string', 'any'],
  file: ['file', 'string', 'any'],
  any: ['string', 'number', 'boolean', 'object', 'array', 'image', 'file', 'any'],
};

// ========== MCP 操作检测 ==========

const WRITE_KEYWORDS = ['write', 'create', 'update', 'save', '写入', '创建'];
const SEND_KEYWORDS = ['send', 'email', 'notify', '发送', '通知'];
const DELETE_KEYWORDS = ['delete', 'remove', '删除', '移除'];

function detectMCPOperation(node: NodeSpec): string {
  const text = `${node.name} ${node.description || ''}`.toLowerCase();
  if (DELETE_KEYWORDS.some(k => text.includes(k))) return 'delete';
  if (SEND_KEYWORDS.some(k => text.includes(k))) return 'send';
  if (WRITE_KEYWORDS.some(k => text.includes(k))) return 'write';
  return 'execute';
}

// ========== 辅助函数 ==========

function getNodeIOPorts(node: NodeSpec): { inputs: IOPort[]; outputs: IOPort[] } {
  return NODE_IO_SCHEMAS[node.type] || {
    inputs: [{ id: 'input', name: '输入', type: 'any', direction: 'input', required: true }],
    outputs: [{ id: 'output', name: '输出', type: 'any', direction: 'output' }],
  };
}

function checkSemanticMatch(source: string, target: string): number {
  for (const [key, synonyms] of Object.entries(PORT_SEMANTIC_SYNONYMS)) {
    const allTerms = [key, ...synonyms];
    if (allTerms.some(t => source.includes(t)) && allTerms.some(t => target.includes(t))) {
      return 1.0;
    }
  }
  return 0;
}

function calculatePortMatchScore(sourcePort: IOPort, targetPort: IOPort): number {
  let score = 0;

  // Type compatibility (0.4)
  if (sourcePort.type === targetPort.type || targetPort.type === 'any') {
    score += 0.4;
  } else if (TYPE_COMPATIBILITY[sourcePort.type]?.includes(targetPort.type)) {
    score += 0.25;
  }

  // Name matching (0.35)
  const sourceName = sourcePort.id.toLowerCase();
  const targetName = targetPort.id.toLowerCase();

  if (sourceName === targetName) {
    score += 0.35;
  } else if (sourceName.includes(targetName) || targetName.includes(sourceName)) {
    score += 0.25;
  } else {
    score += checkSemanticMatch(sourceName, targetName) * 0.2;
  }

  // Required field bonus (0.1)
  if (targetPort.required) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

function needsAdapter(sourceType: IODataType, targetType: IODataType): boolean {
  if (sourceType === targetType || targetType === 'any' || sourceType === 'any') {
    return false;
  }
  return !TYPE_COMPATIBILITY[sourceType]?.includes(targetType);
}

function createAdapter(
  sourceNodeId: string,
  targetNodeId: string,
  sourceType: IODataType,
  targetType: IODataType,
  context: { sourcePortName: string; targetPortName: string }
): AdapterNodeSpec {
  return {
    id: `adapter-${sourceNodeId}-${targetNodeId}`,
    type: 'llm_transform',
    name: `转换: ${context.sourcePortName} → ${context.targetPortName}`,
    inputType: sourceType,
    outputType: targetType,
    config: {
      prompt: `将 ${sourceType} 类型数据转换为 ${targetType} 类型`,
    },
  };
}

// ========== 主处理函数 ==========

function processAutoWiring(request: AutoWireRequest) {
  const { nodes, edges, options = {} } = request;
  const {
    enableTypeAdapters = true,
    enableManusIntegration = true,
    confidenceThreshold = 0.4,
  } = options;

  const connections: WiringConnection[] = [];
  const adapterNodes: AdapterNodeSpec[] = [];
  const manusNodes: ManusLoggerNodeSpec[] = [];
  const warnings: string[] = [];

  // Build node IO map
  const nodeIOMap = new Map<string, { inputs: IOPort[]; outputs: IOPort[] }>();
  const nodeMap = new Map<string, NodeSpec>();
  for (const node of nodes) {
    nodeIOMap.set(node.id, getNodeIOPorts(node));
    nodeMap.set(node.id, node);
  }

  // Process each edge
  for (const edge of edges) {
    const sourceIO = nodeIOMap.get(edge.source);
    const targetIO = nodeIOMap.get(edge.target);

    if (!sourceIO || !targetIO) continue;

    // Find best port matches
    for (const targetPort of targetIO.inputs) {
      let bestMatch: WiringConnection | null = null;
      let bestScore = 0;

      for (const sourcePort of sourceIO.outputs) {
        const score = calculatePortMatchScore(sourcePort, targetPort);

        if (score > bestScore) {
          bestScore = score;
          const needsConversion = needsAdapter(sourcePort.type, targetPort.type);

          bestMatch = {
            id: `wire-${edge.source}-${sourcePort.id}-${edge.target}-${targetPort.id}`,
            source: {
              nodeId: edge.source,
              portId: sourcePort.id,
              portName: sourcePort.name,
              dataType: sourcePort.type,
            },
            target: {
              nodeId: edge.target,
              portId: targetPort.id,
              portName: targetPort.name,
              dataType: targetPort.type,
            },
            mapping: `{{${edge.source}.output.${sourcePort.id}}}`,
            confidence: score,
            status: score >= 0.7 ? 'confirmed' : needsConversion ? 'needs_adapter' : 'draft',
            matchReason: getMatchReason(sourcePort, targetPort, score),
          };

          if (enableTypeAdapters && needsConversion) {
            const adapter = createAdapter(
              edge.source,
              edge.target,
              sourcePort.type,
              targetPort.type,
              { sourcePortName: sourcePort.name, targetPortName: targetPort.name }
            );
            bestMatch.adapterNode = adapter;
          }
        }
      }

      if (bestMatch && (targetPort.required || bestScore >= confidenceThreshold)) {
        connections.push(bestMatch);

        if (bestMatch.adapterNode) {
          adapterNodes.push(bestMatch.adapterNode);
          warnings.push(`类型转换: ${bestMatch.source.portName} → ${bestMatch.target.portName}`);
        }

        if (bestMatch.status === 'draft') {
          warnings.push(`⚠️ 低置信度: ${bestMatch.source.portName} → ${bestMatch.target.portName}`);
        }
      }
    }
  }

  // Manus integration
  if (enableManusIntegration) {
    for (const node of nodes) {
      if (node.type !== 'mcp_action') continue;

      const operation = detectMCPOperation(node);
      if (operation === 'execute') continue; // Skip read operations

      const hasLogger = connections.some(
        c => c.target.nodeId === node.id && c.source.nodeId.startsWith('manus-logger')
      );

      if (!hasLogger) {
        const loggerNode: ManusLoggerNodeSpec = {
          id: `manus-logger-${node.id}`,
          type: 'manus_logger',
          name: `Manus 进度记录 (${node.name})`,
          config: {
            template: `[{{timestamp}}] ${operation} 操作: ${node.name}`,
            targetFile: 'progress.md',
          },
          inputMappings: [
            { targetField: 'action_data', sourceExpression: `{{${node.id}.inputs}}` },
          ],
          outputKey: `manus_log_${node.id}`,
        };

        manusNodes.push(loggerNode);

        connections.push({
          id: `manus-wire-${node.id}`,
          source: {
            nodeId: loggerNode.id,
            portId: 'log_complete',
            portName: '日志完成',
            dataType: 'boolean',
          },
          target: {
            nodeId: node.id,
            portId: 'control_in',
            portName: '控制输入',
            dataType: 'boolean',
          },
          mapping: `{{${loggerNode.id}.output.log_complete}}`,
          confidence: 1.0,
          status: 'confirmed',
          matchReason: `Manus Protocol: ${operation} 操作前置日志`,
        });

        warnings.push(`⚡ Manus: 为 "${node.name}" 注入进度记录`);
      }
    }
  }

  // Calculate statistics
  const statistics = {
    totalConnections: connections.length,
    confirmedConnections: connections.filter(c => c.status === 'confirmed').length,
    draftConnections: connections.filter(c => c.status === 'draft').length,
    adapterCount: adapterNodes.length,
    manusNodeCount: manusNodes.length,
    averageConfidence: connections.length > 0
      ? connections.reduce((sum, c) => sum + c.confidence, 0) / connections.length
      : 0,
  };

  return {
    connections,
    adapterNodes,
    manusNodes,
    warnings,
    statistics,
  };
}

function getMatchReason(source: IOPort, target: IOPort, score: number): string {
  const sourceName = source.id.toLowerCase();
  const targetName = target.id.toLowerCase();

  if (sourceName === targetName) return '字段名完全匹配';
  if (sourceName.includes(targetName) || targetName.includes(sourceName)) return '字段名部分匹配';
  if (source.type === target.type) return '类型完全匹配';
  if (score >= 0.7) return '语义相似度高';
  if (score >= 0.4) return '类型兼容，需确认';
  return '类型兼容匹配';
}

// ========== HTTP Handler ==========

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: AutoWireRequest = await req.json();
    
    console.log(`[auto-wire] Processing ${request.nodes.length} nodes, ${request.edges.length} edges`);
    
    const result = processAutoWiring(request);
    
    console.log(`[auto-wire] Generated ${result.connections.length} connections, ${result.adapterNodes.length} adapters`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[auto-wire] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
