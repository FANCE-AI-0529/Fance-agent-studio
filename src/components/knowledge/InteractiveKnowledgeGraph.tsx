import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  BackgroundVariant,
  ConnectionMode,
  useReactFlow,
  ReactFlowProvider,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  RefreshCw,
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Focus,
  Filter,
  Info,
  Eye,
  EyeOff,
  Crosshair,
  Layers,
  Move,
  Lock,
  Unlock,
  RotateCcw,
} from "lucide-react";
import {
  useKnowledgeNodes,
  useKnowledgeEdges,
  useGenerateGraph,
  nodeTypeStyles,
  relationTypeLabels,
  type KnowledgeNode,
} from "@/hooks/useKnowledgeGraph";
import { GraphNodeComponent } from "./GraphNode";
import { GraphLegend } from "./GraphLegend";
import { cn } from "@/lib/utils";

interface InteractiveKnowledgeGraphProps {
  knowledgeBaseId: string;
}

const nodeTypes = {
  graphNode: GraphNodeComponent,
};

// Force-directed layout algorithm
function forceDirectedLayout(
  nodes: Node[],
  edges: Edge[],
  iterations: number = 50
): Node[] {
  if (nodes.length === 0) return nodes;

  const positions = nodes.map((n) => ({
    x: n.position.x || Math.random() * 800,
    y: n.position.y || Math.random() * 600,
  }));

  const k = Math.sqrt((800 * 600) / nodes.length);
  const cooling = 0.95;
  let temperature = 100;

  for (let iter = 0; iter < iterations; iter++) {
    // Calculate repulsive forces
    const forces = positions.map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (k * k) / dist;

        forces[i].x += (dx / dist) * force;
        forces[i].y += (dy / dist) * force;
        forces[j].x -= (dx / dist) * force;
        forces[j].y -= (dy / dist) * force;
      }
    }

    // Calculate attractive forces from edges
    edges.forEach((edge) => {
      const sourceIdx = nodes.findIndex((n) => n.id === edge.source);
      const targetIdx = nodes.findIndex((n) => n.id === edge.target);
      if (sourceIdx === -1 || targetIdx === -1) return;

      const dx = positions[sourceIdx].x - positions[targetIdx].x;
      const dy = positions[sourceIdx].y - positions[targetIdx].y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (dist * dist) / k;

      forces[sourceIdx].x -= (dx / dist) * force;
      forces[sourceIdx].y -= (dy / dist) * force;
      forces[targetIdx].x += (dx / dist) * force;
      forces[targetIdx].y += (dy / dist) * force;
    });

    // Apply forces with temperature
    positions.forEach((pos, i) => {
      const magnitude = Math.sqrt(forces[i].x ** 2 + forces[i].y ** 2) || 1;
      pos.x += (forces[i].x / magnitude) * Math.min(magnitude, temperature);
      pos.y += (forces[i].y / magnitude) * Math.min(magnitude, temperature);
    });

    temperature *= cooling;
  }

  // Center the layout
  const centerX = positions.reduce((sum, p) => sum + p.x, 0) / positions.length;
  const centerY = positions.reduce((sum, p) => sum + p.y, 0) / positions.length;

  return nodes.map((node, i) => ({
    ...node,
    position: {
      x: positions[i].x - centerX + 400,
      y: positions[i].y - centerY + 300,
    },
  }));
}

function InteractiveGraphContent({ knowledgeBaseId }: InteractiveKnowledgeGraphProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState([1]);
  const [isLocked, setIsLocked] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [highlightDepth, setHighlightDepth] = useState([1]);

  const reactFlowInstance = useReactFlow();

  const { data: knowledgeNodes, isLoading: nodesLoading } = useKnowledgeNodes(knowledgeBaseId);
  const { data: knowledgeEdges, isLoading: edgesLoading } = useKnowledgeEdges(knowledgeBaseId);
  const generateGraph = useGenerateGraph();

  // Convert and layout nodes
  const { initialNodes, initialEdges, nodeMap } = useMemo(() => {
    if (!knowledgeNodes || !knowledgeEdges) {
      return { initialNodes: [], initialEdges: [], nodeMap: new Map() };
    }

    const filteredNodes = typeFilter
      ? knowledgeNodes.filter((n) => n.node_type === typeFilter)
      : knowledgeNodes;

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const nodeMapResult = new Map(filteredNodes.map((n) => [n.id, n]));

    // Create initial nodes
    let nodes: Node[] = filteredNodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / filteredNodes.length;
      const radius = Math.min(300, 50 + filteredNodes.length * 20);
      const style = nodeTypeStyles[node.node_type] || nodeTypeStyles.concept;

      return {
        id: node.id,
        type: "graphNode",
        position: { x: 400 + radius * Math.cos(angle), y: 300 + radius * Math.sin(angle) },
        data: {
          label: node.name,
          nodeType: node.node_type,
          description: node.description,
          importance: node.importance_score,
          occurrences: node.occurrence_count,
          style,
          showLabel: showLabels,
          isFocused: focusedNodeId === node.id,
        },
      };
    });

    const edges: Edge[] = knowledgeEdges
      .filter((edge) => nodeIds.has(edge.source_node_id) && nodeIds.has(edge.target_node_id))
      .map((edge) => ({
        id: edge.id,
        source: edge.source_node_id,
        target: edge.target_node_id,
        label: showLabels ? (relationTypeLabels[edge.relation_type] || edge.relation_type) : undefined,
        type: "smoothstep",
        animated: edge.strength > 0.7,
        style: { stroke: "#64748b", strokeWidth: Math.max(1, edge.strength * 3) },
        labelStyle: { fill: "#94a3b8", fontSize: 10 },
      }));

    // Apply force-directed layout
    nodes = forceDirectedLayout(nodes, edges);

    return { initialNodes: nodes, initialEdges: edges, nodeMap: nodeMapResult };
  }, [knowledgeNodes, knowledgeEdges, typeFilter, showLabels, focusedNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync with new data
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Handle focus on node
  const handleFocusNode = useCallback(
    (nodeId: string) => {
      setFocusedNodeId(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      if (node && reactFlowInstance) {
        reactFlowInstance.setCenter(node.position.x, node.position.y, {
          zoom: 1.5,
          duration: 500,
        });

        // Highlight connected nodes
        const connectedIds = new Set<string>();
        const depth = highlightDepth[0];
        
        const traverse = (id: string, currentDepth: number) => {
          if (currentDepth > depth) return;
          connectedIds.add(id);
          edges.forEach((edge) => {
            if (edge.source === id && !connectedIds.has(edge.target)) {
              traverse(edge.target, currentDepth + 1);
            }
            if (edge.target === id && !connectedIds.has(edge.source)) {
              traverse(edge.source, currentDepth + 1);
            }
          });
        };
        
        traverse(nodeId, 0);

        setNodes((nds) =>
          nds.map((n) => ({
            ...n,
            style: {
              ...n.style,
              opacity: connectedIds.has(n.id) ? 1 : 0.2,
              transform: n.id === nodeId ? "scale(1.3)" : "scale(1)",
            },
          }))
        );
      }
    },
    [nodes, edges, reactFlowInstance, highlightDepth, setNodes]
  );

  const clearFocus = useCallback(() => {
    setFocusedNodeId(null);
    setSelectedNode(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: { ...n.style, opacity: 1, transform: "scale(1)" },
      }))
    );
  }, [setNodes]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const knowledgeNode = nodeMap.get(node.id);
      setSelectedNode(knowledgeNode || null);
      handleFocusNode(node.id);
    },
    [nodeMap, handleFocusNode]
  );

  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    
    const matchingNode = knowledgeNodes?.find(
      (n) =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (matchingNode) {
      handleFocusNode(matchingNode.id);
      setSelectedNode(matchingNode);
    }
  }, [searchQuery, knowledgeNodes, handleFocusNode]);

  const resetView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2, duration: 500 });
      clearFocus();
    }
  }, [reactFlowInstance, clearFocus]);

  const handleZoomChange = useCallback(
    (value: number[]) => {
      setZoomLevel(value);
      if (reactFlowInstance) {
        reactFlowInstance.zoomTo(value[0], { duration: 200 });
      }
    },
    [reactFlowInstance]
  );

  if (nodesLoading || edgesLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasNodes = knowledgeNodes && knowledgeNodes.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="p-3 border-b border-border flex items-center gap-2 flex-wrap">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索节点..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button size="sm" onClick={handleSearch} disabled={!searchQuery.trim()}>
            搜索
          </Button>
        </div>

        <TooltipProvider>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowLabels(!showLabels)}
                >
                  {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>切换标签显示</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsLocked(!isLocked)}
                >
                  {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isLocked ? "解锁节点" : "锁定节点"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={resetView}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>重置视图</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => generateGraph.mutate({ knowledgeBaseId })}
                  disabled={generateGraph.isPending}
                >
                  {generateGraph.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Network className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>重新生成图谱</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          {hasNodes ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={isLocked ? undefined : onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose}
              fitView
              attributionPosition="bottom-left"
              nodesDraggable={!isLocked}
            >
              <Controls />
              <MiniMap
                nodeColor={(node) => (node.data as any)?.style?.color || "#64748b"}
                maskColor="rgba(0, 0, 0, 0.1)"
              />
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />

              {/* Zoom Control Panel */}
              <Panel position="top-right" className="bg-card/80 backdrop-blur-sm rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ZoomOut className="h-3 w-3" />
                  <Slider
                    value={zoomLevel}
                    onValueChange={handleZoomChange}
                    min={0.1}
                    max={2}
                    step={0.1}
                    className="w-24"
                  />
                  <ZoomIn className="h-3 w-3" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">高亮深度</label>
                  <Slider
                    value={highlightDepth}
                    onValueChange={setHighlightDepth}
                    min={1}
                    max={3}
                    step={1}
                    className="w-24"
                  />
                </div>
              </Panel>
            </ReactFlow>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Network className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg mb-2">暂无知识图谱</p>
              <Button onClick={() => generateGraph.mutate({ knowledgeBaseId })}>
                生成图谱
              </Button>
            </div>
          )}

          {/* Legend */}
          {hasNodes && (
            <div className="absolute bottom-4 left-4">
              <GraphLegend onFilterChange={setTypeFilter} activeFilter={typeFilter} />
            </div>
          )}
        </div>

        {/* Node Detail Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-border bg-card overflow-hidden"
            >
              <ScrollArea className="h-full p-4">
                <Card className="border-none shadow-none">
                  <CardHeader className="pb-2 px-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: nodeTypeStyles[selectedNode.node_type]?.color }}
                        />
                        <CardTitle className="text-base">{selectedNode.name}</CardTitle>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearFocus}>
                        ×
                      </Button>
                    </div>
                    <Badge variant="secondary" className="w-fit">
                      {nodeTypeStyles[selectedNode.node_type]?.label || selectedNode.node_type}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4 px-0 text-sm">
                    {selectedNode.description && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">描述</p>
                        <p>{selectedNode.description}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-muted-foreground text-[10px]">重要性</p>
                        <p className="font-medium">{(selectedNode.importance_score * 100).toFixed(0)}%</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-muted-foreground text-[10px]">出现次数</p>
                        <p className="font-medium">{selectedNode.occurrence_count}</p>
                      </div>
                    </div>

                    {/* Related nodes */}
                    <div>
                      <p className="text-muted-foreground text-xs mb-2">关联节点</p>
                      <div className="space-y-1">
                        {edges
                          .filter((e) => e.source === selectedNode.id || e.target === selectedNode.id)
                          .slice(0, 5)
                          .map((edge) => {
                            const relatedId = edge.source === selectedNode.id ? edge.target : edge.source;
                            const relatedNode = nodeMap.get(relatedId);
                            if (!relatedNode) return null;
                            
                            return (
                              <div
                                key={edge.id}
                                className="flex items-center gap-2 p-2 rounded bg-muted/30 cursor-pointer hover:bg-muted/50"
                                onClick={() => handleFocusNode(relatedId)}
                              >
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: nodeTypeStyles[relatedNode.node_type]?.color }}
                                />
                                <span className="text-xs truncate">{relatedNode.name}</span>
                                <Badge variant="outline" className="text-[10px] ml-auto">
                                  {edge.label}
                                </Badge>
                              </div>
                            );
                          })}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={() => handleFocusNode(selectedNode.id)}
                    >
                      <Crosshair className="h-3.5 w-3.5" />
                      聚焦此节点
                    </Button>
                  </CardContent>
                </Card>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Stats bar */}
      {hasNodes && (
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
          <span>节点: {nodes.length}</span>
          <span>关系: {edges.length}</span>
          {focusedNodeId && <span className="text-primary">已聚焦节点</span>}
          {typeFilter && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Filter className="h-2.5 w-2.5" />
              {nodeTypeStyles[typeFilter]?.label}
              <button onClick={() => setTypeFilter(null)} className="ml-1 hover:text-destructive">×</button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

export function InteractiveKnowledgeGraph(props: InteractiveKnowledgeGraphProps) {
  return (
    <ReactFlowProvider>
      <InteractiveGraphContent {...props} />
    </ReactFlowProvider>
  );
}
