// Port Type Definitions for Multi-Port Node System

/**
 * Port types for different data/control flows
 * - data: Blue - JSON/Text data transmission
 * - control: Purple - MPLP protocol control flow
 * - perception: Orange - RAG/MCP context reception
 */
export type PortType = "data" | "control" | "perception";

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
};

/**
 * Port layout configuration
 */
export const portLayout = {
  spacing: 24,      // px between ports
  size: 12,         // port handle size
  offset: 0,        // distance from node edge
  labelOffset: 16,  // label distance from port
};
