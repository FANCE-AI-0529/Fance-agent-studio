import { Node, Edge } from "@xyflow/react";

export interface LayoutConfig {
  nodeSpacing: { horizontal: number; vertical: number };
  layerWidth: number;
  startPosition: { x: number; y: number };
}

export type NodeLayerType = 
  | "trigger" 
  | "manus"      // Manus Kernel layer - sits above agent
  | "agent" 
  | "skill" 
  | "intentRouter" 
  | "condition" 
  | "mcpAction" 
  | "intervention" 
  | "output" 
  | "knowledge"
  | "parallel";

const DEFAULT_CONFIG: LayoutConfig = {
  nodeSpacing: { horizontal: 280, vertical: 150 },
  layerWidth: 250,
  startPosition: { x: 100, y: 100 },
};

// Layer order for horizontal layout
// Manus sits between trigger and agent visually
const LAYER_ORDER: Record<NodeLayerType, number> = {
  trigger: 0,
  manus: 1.2,    // Manus Kernel - above agent in the thinking layer
  knowledge: 1,
  agent: 2,
  skill: 2.5,
  intentRouter: 3,
  condition: 4,
  parallel: 4,
  mcpAction: 5,
  intervention: 5,
  output: 6,
};

export interface CanvasNodeConfig {
  id: string;
  type: NodeLayerType;
  data: Record<string, unknown>;
  parentId?: string;
}

export interface CanvasEdgeConfig {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  animated?: boolean;
  label?: string;
}

/**
 * Calculate optimal positions for nodes based on their type and connections
 */
export function calculateNodePositions(
  nodeConfigs: CanvasNodeConfig[],
  edgeConfigs: CanvasEdgeConfig[],
  config: LayoutConfig = DEFAULT_CONFIG
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  
  // Group nodes by layer
  const layerGroups = new Map<number, CanvasNodeConfig[]>();
  
  nodeConfigs.forEach(node => {
    const layer = LAYER_ORDER[node.type] ?? 3;
    if (!layerGroups.has(layer)) {
      layerGroups.set(layer, []);
    }
    layerGroups.get(layer)!.push(node);
  });
  
  // Sort layers and calculate positions
  const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);
  
  sortedLayers.forEach((layer, layerIndex) => {
    const nodesInLayer = layerGroups.get(layer)!;
    const totalHeight = (nodesInLayer.length - 1) * config.nodeSpacing.vertical;
    const startY = config.startPosition.y + (500 - totalHeight) / 2;
    
    nodesInLayer.forEach((node, nodeIndex) => {
      positions.set(node.id, {
        x: config.startPosition.x + layerIndex * config.nodeSpacing.horizontal,
        y: startY + nodeIndex * config.nodeSpacing.vertical,
      });
    });
  });
  
  return positions;
}

/**
 * Convert AI-generated node configs to ReactFlow nodes with proper positions
 */
export function convertToReactFlowNodes(
  nodeConfigs: CanvasNodeConfig[],
  edgeConfigs: CanvasEdgeConfig[],
  config?: LayoutConfig
): Node[] {
  const positions = calculateNodePositions(nodeConfigs, edgeConfigs, config);
  
  return nodeConfigs.map(nodeConfig => {
    const position = positions.get(nodeConfig.id) || { x: 400, y: 300 };
    
    return {
      id: nodeConfig.id,
      type: nodeConfig.type,
      position,
      data: {
        ...nodeConfig.data,
        id: nodeConfig.data.id || nodeConfig.id,
      },
      draggable: nodeConfig.type !== 'agent',
    };
  });
}

/**
 * Convert AI-generated edge configs to ReactFlow edges
 */
export function convertToReactFlowEdges(edgeConfigs: CanvasEdgeConfig[]): Edge[] {
  return edgeConfigs.map(edgeConfig => ({
    id: edgeConfig.id,
    source: edgeConfig.source,
    sourceHandle: edgeConfig.sourceHandle,
    target: edgeConfig.target,
    targetHandle: edgeConfig.targetHandle,
    animated: edgeConfig.animated ?? true,
    label: edgeConfig.label,
    style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
  }));
}

/**
 * Auto-layout existing nodes after generation
 */
export function autoLayoutNodes(
  nodes: Node[],
  edges: Edge[],
  config?: LayoutConfig
): Node[] {
  const nodeConfigs: CanvasNodeConfig[] = nodes.map(node => ({
    id: node.id,
    type: (node.type || 'agent') as NodeLayerType,
    data: node.data as Record<string, unknown>,
  }));
  
  const edgeConfigs: CanvasEdgeConfig[] = edges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }));
  
  const positions = calculateNodePositions(nodeConfigs, edgeConfigs, config);
  
  return nodes.map(node => ({
    ...node,
    position: positions.get(node.id) || node.position,
  }));
}

/**
 * Calculate center position for the agent node
 */
export function getAgentCenterPosition(nodeCount: number): { x: number; y: number } {
  return {
    x: 400,
    y: 320 + Math.max(0, (nodeCount - 3) * 30), // Moved down to accommodate Manus above
  };
}

/**
 * Get Manus Kernel position - directly above the agent node
 */
export function getManusPosition(agentPosition: { x: number; y: number }): { x: number; y: number } {
  return {
    x: agentPosition.x,
    y: agentPosition.y - 180, // 180px above the agent
  };
}

/**
 * Distribute skill nodes around the agent in a semicircle
 */
export function distributeSkillsAroundAgent(
  skillCount: number,
  agentPosition: { x: number; y: number },
  radius: number = 200
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const startAngle = Math.PI * 0.75; // Start from top-left
  const endAngle = Math.PI * 1.25;   // End at bottom-left
  const angleStep = (endAngle - startAngle) / Math.max(skillCount - 1, 1);
  
  for (let i = 0; i < skillCount; i++) {
    const angle = skillCount === 1 ? Math.PI : startAngle + i * angleStep;
    positions.push({
      x: agentPosition.x + radius * Math.cos(angle),
      y: agentPosition.y + radius * Math.sin(angle),
    });
  }
  
  return positions;
}

/**
 * Distribute knowledge bases on the opposite side of skills
 */
export function distributeKnowledgeAroundAgent(
  kbCount: number,
  agentPosition: { x: number; y: number },
  radius: number = 180
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const startAngle = -Math.PI * 0.25;
  const endAngle = Math.PI * 0.25;
  const angleStep = (endAngle - startAngle) / Math.max(kbCount - 1, 1);
  
  for (let i = 0; i < kbCount; i++) {
    const angle = kbCount === 1 ? 0 : startAngle + i * angleStep;
    positions.push({
      x: agentPosition.x + radius * Math.cos(angle),
      y: agentPosition.y + radius * Math.sin(angle),
    });
  }
  
  return positions;
}
