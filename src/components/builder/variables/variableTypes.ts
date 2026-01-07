// Variable type definitions for the data pipeline system

export type VariableType = 
  | "string" 
  | "number" 
  | "boolean" 
  | "object" 
  | "array" 
  | "any";

export type VariableScope = "node" | "workflow" | "global";

export interface Variable {
  id: string;
  name: string;
  type: VariableType;
  scope: VariableScope;
  sourceNodeId?: string;
  sourcePortId?: string;
  path?: string;
  defaultValue?: unknown;
  description?: string;
  mockValue?: unknown;
}

export interface EdgeMapping {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  mappings: VariableMapping[];
}

export interface VariableMapping {
  id: string;
  source: string; // e.g., "{{weather_api.output.temperature}}"
  target: string; // e.g., "{{agent.input.context.temp}}"
  enabled: boolean;
}

export interface GlobalVariable extends Variable {
  scope: "global";
  value: unknown;
  isSecret?: boolean;
}

export interface NodeOutputVariable extends Variable {
  scope: "node";
  outputSchema?: Record<string, VariableType>;
}

// Node output schemas for each node type
export const nodeOutputSchemas: Record<string, Record<string, VariableType>> = {
  trigger: {
    "message": "string",
    "timestamp": "number",
    "metadata": "object",
    "user_id": "string",
  },
  agent: {
    "response": "string",
    "thinking": "string",
    "confidence": "number",
    "citations": "array",
    "trace": "object",
  },
  skill: {
    "output": "any",
    "status": "string",
    "error": "string",
  },
  knowledge: {
    "chunks": "array",
    "entities": "array",
    "context": "string",
    "sources": "array",
  },
  intentRouter: {
    "matched_intent": "string",
    "confidence": "number",
    "original_input": "string",
  },
  condition: {
    "result": "boolean",
    "evaluated_value": "any",
  },
  parallel: {
    "results": "object",
    "completed": "array",
    "failed": "array",
  },
};

// Parse variable reference {{node.path.to.value}}
export function parseVariableReference(ref: string): {
  nodeId: string;
  path: string[];
} | null {
  const match = ref.match(/^\{\{([^.}]+)\.(.+)\}\}$/);
  if (!match) return null;
  
  const [, nodeId, pathStr] = match;
  const path = pathStr.split(".");
  
  return { nodeId, path };
}

// Create variable reference string
export function createVariableReference(nodeId: string, path: string[]): string {
  return `{{${nodeId}.${path.join(".")}}}`;
}

// Get value from nested object using path
export function getValueFromPath(data: unknown, path: string[]): unknown {
  if (!data || path.length === 0) return data;
  
  let current: unknown = data;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  
  return current;
}

// Check if types are compatible for mapping
export function isTypeCompatible(
  sourceType: VariableType, 
  targetType: VariableType
): boolean {
  if (targetType === "any") return true;
  if (sourceType === targetType) return true;
  if (sourceType === "number" && targetType === "string") return true;
  return false;
}

// Get all paths from a schema
export function getSchemaPathsWithTypes(
  schema: Record<string, VariableType>,
  prefix: string = ""
): Array<{ path: string; type: VariableType }> {
  const results: Array<{ path: string; type: VariableType }> = [];
  
  for (const [key, type] of Object.entries(schema)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    results.push({ path: fullPath, type });
  }
  
  return results;
}
