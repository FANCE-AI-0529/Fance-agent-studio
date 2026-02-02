// Port Type Definitions for Multi-Port Node System

/**
 * Port types for different data/control flows
 * - data: Blue - JSON/Text data transmission
 * - control: Purple - MPLP protocol control flow
 * - perception: Orange - RAG/MCP context reception
 */
export type PortType = "data" | "control" | "perception" | "file" | "array" | "streaming";

/**
 * Port direction
 */
export type PortDirection = "input" | "output";

/**
 * Port configuration for each handle
 */
export interface PortConfig {
  id: string;
  type: PortType;
  direction: PortDirection;
  label?: string;
  description?: string;
  maxConnections?: number;
  required?: boolean;
}

/**
 * Port color scheme for visual differentiation
 */
export const portColors: Record<PortType, {
  primary: string;
  background: string;
  border: string;
  glow: string;
  tailwind: string;
  tailwindBg: string;
}> = {
  data: {
    primary: "hsl(217, 91%, 60%)",        // Blue
    background: "hsla(217, 91%, 60%, 0.1)",
    border: "hsla(217, 91%, 60%, 0.5)",
    glow: "0 0 8px hsla(217, 91%, 60%, 0.6)",
    tailwind: "text-blue-500",
    tailwindBg: "bg-blue-500",
  },
  control: {
    primary: "hsl(271, 91%, 65%)",        // Purple
    background: "hsla(271, 91%, 65%, 0.1)",
    border: "hsla(271, 91%, 65%, 0.5)",
    glow: "0 0 8px hsla(271, 91%, 65%, 0.6)",
    tailwind: "text-purple-500",
    tailwindBg: "bg-purple-500",
  },
  perception: {
    primary: "hsl(25, 95%, 53%)",         // Orange
    background: "hsla(25, 95%, 53%, 0.1)",
    border: "hsla(25, 95%, 53%, 0.5)",
    glow: "0 0 8px hsla(25, 95%, 53%, 0.6)",
    tailwind: "text-orange-500",
    tailwindBg: "bg-orange-500",
  },
  file: {
    primary: "hsl(142, 71%, 45%)",        // Green
    background: "hsla(142, 71%, 45%, 0.1)",
    border: "hsla(142, 71%, 45%, 0.5)",
    glow: "0 0 8px hsla(142, 71%, 45%, 0.6)",
    tailwind: "text-green-500",
    tailwindBg: "bg-green-500",
  },
  array: {
    primary: "hsl(187, 92%, 47%)",        // Cyan
    background: "hsla(187, 92%, 47%, 0.1)",
    border: "hsla(187, 92%, 47%, 0.5)",
    glow: "0 0 8px hsla(187, 92%, 47%, 0.6)",
    tailwind: "text-cyan-500",
    tailwindBg: "bg-cyan-500",
  },
  streaming: {
    primary: "hsl(48, 96%, 53%)",         // Yellow
    background: "hsla(48, 96%, 53%, 0.1)",
    border: "hsla(48, 96%, 53%, 0.5)",
    glow: "0 0 8px hsla(48, 96%, 53%, 0.6)",
    tailwind: "text-yellow-500",
    tailwindBg: "bg-yellow-500",
  },
};

/**
 * Node category based on port configuration
 */
export type NodeCategory = "trigger" | "processor" | "output";

/**
 * Node category definitions
 */
export const nodeCategoryConfig: Record<NodeCategory, {
  hasInput: boolean;
  hasOutput: boolean;
  description: string;
}> = {
  trigger: {
    hasInput: false,
    hasOutput: true,
    description: "Input source - only output ports (user input, timer, webhook)",
  },
  processor: {
    hasInput: true,
    hasOutput: true,
    description: "Logic processor - both input and output ports (Agent, Skill)",
  },
  output: {
    hasInput: true,
    hasOutput: false,
    description: "Output terminal - only input ports (send message, write DB)",
  },
};

/**
 * Get port handle ID format
 */
export function getPortHandleId(nodeId: string, portId: string, direction: PortDirection): string {
  return `${nodeId}-${direction}-${portId}`;
}

/**
 * Parse port handle ID
 */
export function parsePortHandleId(handleId: string): {
  nodeId: string;
  direction: PortDirection;
  portId: string;
} | null {
  const parts = handleId.split("-");
  if (parts.length < 3) return null;
  
  const direction = parts[parts.length - 2] as PortDirection;
  const portId = parts[parts.length - 1];
  const nodeId = parts.slice(0, -2).join("-");
  
  return { nodeId, direction, portId };
}

/**
 * Check if two ports can be connected
 */
export function canConnect(
  sourcePortType: PortType,
  targetPortType: PortType
): boolean {
  // Same type ports can connect
  if (sourcePortType === targetPortType) return true;
  
  // Data can flow into perception (RAG context)
  if (sourcePortType === "data" && targetPortType === "perception") return true;
  
  return false;
}

/**
 * Get port type from handle ID
 */
export function getPortTypeFromHandleId(
  handleId: string,
  portConfigs: PortConfig[]
): PortType | null {
  const parsed = parsePortHandleId(handleId);
  if (!parsed) return null;
  
  const port = portConfigs.find(p => p.id === parsed.portId);
  return port?.type || null;
}

/**
 * Branch output colors for condition nodes
 */
export const branchColors = {
  true: {
    primary: "hsl(142, 71%, 45%)",
    tailwind: "text-green-500",
    tailwindBg: "bg-green-500",
    border: "border-green-500",
  },
  false: {
    primary: "hsl(0, 72%, 51%)",
    tailwind: "text-red-500",
    tailwindBg: "bg-red-500",
    border: "border-red-500",
  },
  default: {
    primary: "hsl(220, 8.9%, 46.1%)",
    tailwind: "text-muted-foreground",
    tailwindBg: "bg-muted",
    border: "border-muted",
  },
};

/**
 * Standard port configurations for common node types
 */
export const standardPorts = {
  trigger: {
    outputs: [
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "触发信号" },
      { id: "data-out", type: "data" as PortType, direction: "output" as PortDirection, label: "触发数据" },
    ],
  },
  agent: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "执行请求" },
      { id: "data-in", type: "data" as PortType, direction: "input" as PortDirection, label: "输入数据" },
      { id: "perception-rag", type: "perception" as PortType, direction: "input" as PortDirection, label: "RAG 上下文" },
      { id: "perception-mcp", type: "perception" as PortType, direction: "input" as PortDirection, label: "MCP 工具" },
    ],
    outputs: [
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "完成信号" },
      { id: "data-out", type: "data" as PortType, direction: "output" as PortDirection, label: "输出结果" },
      { id: "data-trace", type: "data" as PortType, direction: "output" as PortDirection, label: "决策日志" },
    ],
  },
  skill: {
    inputs: [
      { id: "data-in", type: "data" as PortType, direction: "input" as PortDirection, label: "输入参数" },
    ],
    outputs: [
      { id: "data-out", type: "data" as PortType, direction: "output" as PortDirection, label: "输出结果" },
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "完成信号" },
    ],
  },
  knowledge: {
    inputs: [
      { id: "data-in", type: "data" as PortType, direction: "input" as PortDirection, label: "查询请求" },
    ],
    outputs: [
      { id: "perception-out", type: "perception" as PortType, direction: "output" as PortDirection, label: "检索结果" },
      { id: "data-sources", type: "data" as PortType, direction: "output" as PortDirection, label: "引用来源" },
    ],
  },
  output: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "触发发送" },
      { id: "data-in", type: "data" as PortType, direction: "input" as PortDirection, label: "消息内容" },
    ],
  },
  // Logic nodes
  intentRouter: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "执行请求" },
      { id: "data-in", type: "data" as PortType, direction: "input" as PortDirection, label: "输入数据" },
    ],
    // outputs are dynamic based on routes
  },
  condition: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "执行请求" },
      { id: "data-in", type: "data" as PortType, direction: "input" as PortDirection, label: "判断数据" },
    ],
    outputs: [
      { id: "true-out", type: "control" as PortType, direction: "output" as PortDirection, label: "True" },
      { id: "false-out", type: "control" as PortType, direction: "output" as PortDirection, label: "False" },
    ],
  },
  parallel: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "触发信号" },
      { id: "data-in", type: "data" as PortType, direction: "input" as PortDirection, label: "共享数据" },
    ],
    // outputs are dynamic based on branches
  },
  // MCP Action node ports
  mcpAction: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "触发" },
    ],
    outputs: [
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "完成" },
      { id: "result-out", type: "data" as PortType, direction: "output" as PortDirection, label: "结果" },
      { id: "error-out", type: "data" as PortType, direction: "output" as PortDirection, label: "错误" },
    ],
  },
  // Intervention node ports (MPLP confirmation)
  intervention: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "触发" },
      { id: "data-preview", type: "data" as PortType, direction: "input" as PortDirection, label: "预览数据" },
    ],
    outputs: [
      { id: "approved-out", type: "control" as PortType, direction: "output" as PortDirection, label: "已批准" },
      { id: "rejected-out", type: "control" as PortType, direction: "output" as PortDirection, label: "已拒绝" },
      { id: "user-input", type: "data" as PortType, direction: "output" as PortDirection, label: "用户输入" },
    ],
  },
  // === Phase 1: Dify-inspired Core Nodes ===
  
  // LLM Node - Independent LLM calls with structured output
  llm: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "触发" },
      { id: "system-prompt", type: "data" as PortType, direction: "input" as PortDirection, label: "系统提示" },
      { id: "user-input", type: "data" as PortType, direction: "input" as PortDirection, label: "用户输入" },
      { id: "context", type: "perception" as PortType, direction: "input" as PortDirection, label: "上下文" },
      { id: "files", type: "file" as PortType, direction: "input" as PortDirection, label: "文件/图片" },
    ],
    outputs: [
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "完成" },
      { id: "text-out", type: "data" as PortType, direction: "output" as PortDirection, label: "文本输出" },
      { id: "structured-out", type: "data" as PortType, direction: "output" as PortDirection, label: "结构化输出" },
      { id: "streaming-out", type: "streaming" as PortType, direction: "output" as PortDirection, label: "流式输出" },
      { id: "metadata", type: "data" as PortType, direction: "output" as PortDirection, label: "元数据" },
    ],
  },
  // HTTP Request Node - REST/GraphQL API calls
  httpRequest: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "触发" },
      { id: "url", type: "data" as PortType, direction: "input" as PortDirection, label: "URL" },
      { id: "headers", type: "data" as PortType, direction: "input" as PortDirection, label: "请求头" },
      { id: "body", type: "data" as PortType, direction: "input" as PortDirection, label: "请求体" },
      { id: "query-params", type: "data" as PortType, direction: "input" as PortDirection, label: "查询参数" },
    ],
    outputs: [
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "完成" },
      { id: "response-body", type: "data" as PortType, direction: "output" as PortDirection, label: "响应体" },
      { id: "status-code", type: "data" as PortType, direction: "output" as PortDirection, label: "状态码" },
      { id: "response-headers", type: "data" as PortType, direction: "output" as PortDirection, label: "响应头" },
      { id: "error", type: "data" as PortType, direction: "output" as PortDirection, label: "错误" },
    ],
  },
  // Code Node - JavaScript/Python code execution
  code: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "触发" },
      { id: "variables", type: "data" as PortType, direction: "input" as PortDirection, label: "输入变量" },
    ],
    outputs: [
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "完成" },
      { id: "result", type: "data" as PortType, direction: "output" as PortDirection, label: "执行结果" },
      { id: "error", type: "data" as PortType, direction: "output" as PortDirection, label: "错误" },
    ],
  },
  // Parameter Extractor Node - LLM-driven entity extraction
  parameterExtractor: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "触发" },
      { id: "text-in", type: "data" as PortType, direction: "input" as PortDirection, label: "待提取文本" },
      { id: "context", type: "perception" as PortType, direction: "input" as PortDirection, label: "上下文" },
    ],
    outputs: [
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "完成" },
      { id: "extracted-params", type: "data" as PortType, direction: "output" as PortDirection, label: "提取参数" },
      { id: "confidence", type: "data" as PortType, direction: "output" as PortDirection, label: "置信度" },
    ],
  },
  // === Phase 2: Auxiliary Nodes ===
  
  // Template Node - Jinja2/Handlebars template rendering
  template: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "触发" },
      { id: "variables", type: "data" as PortType, direction: "input" as PortDirection, label: "变量" },
    ],
    outputs: [
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "完成" },
      { id: "rendered", type: "data" as PortType, direction: "output" as PortDirection, label: "渲染结果" },
    ],
  },
  // Variable Aggregator Node - Merge variables from multiple branches
  variableAggregator: {
    inputs: [
      { id: "control-in-1", type: "control" as PortType, direction: "input" as PortDirection, label: "分支1" },
      { id: "control-in-2", type: "control" as PortType, direction: "input" as PortDirection, label: "分支2" },
      { id: "data-in-1", type: "data" as PortType, direction: "input" as PortDirection, label: "数据1" },
      { id: "data-in-2", type: "data" as PortType, direction: "input" as PortDirection, label: "数据2" },
    ],
    outputs: [
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "完成" },
      { id: "aggregated-data", type: "data" as PortType, direction: "output" as PortDirection, label: "聚合数据" },
    ],
  },
  // Variable Assigner Node - Set/modify workflow variables
  variableAssigner: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "触发" },
      { id: "source-value", type: "data" as PortType, direction: "input" as PortDirection, label: "源值" },
    ],
    outputs: [
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "完成" },
      { id: "assigned-value", type: "data" as PortType, direction: "output" as PortDirection, label: "赋值结果" },
    ],
  },
  // Document Extractor Node - Extract text from files
  docExtractor: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "触发" },
      { id: "file-in", type: "file" as PortType, direction: "input" as PortDirection, label: "文件" },
    ],
    outputs: [
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "完成" },
      { id: "text-content", type: "data" as PortType, direction: "output" as PortDirection, label: "文本内容" },
      { id: "metadata", type: "data" as PortType, direction: "output" as PortDirection, label: "元数据" },
    ],
  },
  // Iterator Node - Iterate over arrays
  iterator: {
    inputs: [
      { id: "control-in", type: "control" as PortType, direction: "input" as PortDirection, label: "触发" },
      { id: "array-in", type: "array" as PortType, direction: "input" as PortDirection, label: "数组数据" },
    ],
    outputs: [
      { id: "loop-body", type: "control" as PortType, direction: "output" as PortDirection, label: "循环体" },
      { id: "current-item", type: "data" as PortType, direction: "output" as PortDirection, label: "当前项" },
      { id: "index", type: "data" as PortType, direction: "output" as PortDirection, label: "索引" },
      { id: "control-out", type: "control" as PortType, direction: "output" as PortDirection, label: "完成" },
      { id: "aggregated-results", type: "array" as PortType, direction: "output" as PortDirection, label: "聚合结果" },
    ],
  },
};

/**
 * Generate input ports from JSON Schema
 */
export function generatePortsFromSchema(
  schema: { 
    properties?: Record<string, { type: string; description?: string }>; 
    required?: string[] 
  }
): PortConfig[] {
  if (!schema?.properties) return [];
  
  return Object.entries(schema.properties).map(([name, prop]) => ({
    id: `param-${name}`,
    type: "data" as PortType,
    direction: "input" as PortDirection,
    label: name,
    description: prop.description,
    required: schema.required?.includes(name),
  }));
}

/**
 * Port layout configuration
 */
export const portLayout = {
  spacing: 24,      // px between ports
  size: 12,         // port handle size
  offset: 0,        // distance from node edge
  labelOffset: 16,  // label distance from port
};
