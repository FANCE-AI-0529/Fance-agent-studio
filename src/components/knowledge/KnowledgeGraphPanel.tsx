import { useState, useCallback, useMemo } from "react";
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
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Badge } from "../ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { 
  Search, 
  RefreshCw, 
  Network, 
  ZoomIn, 
  ZoomOut,
  Maximize2,
  Filter,
  Info
} from "lucide-react";
import {
  useKnowledgeNodes,
  useKnowledgeEdges,
  useGenerateGraph,
  useGraphSearch,
  nodeTypeStyles,
  relationTypeLabels,
  type KnowledgeNode,
  type GraphSearchResult,
} from "../../hooks/useKnowledgeGraph.ts";
import { GraphNodeComponent } from "./GraphNode.tsx";
import { GraphLegend } from "./GraphLegend.tsx";

interface KnowledgeGraphPanelProps {
  knowledgeBaseId: string;
}

const nodeTypes = {
  graphNode: GraphNodeComponent,
};

export function KnowledgeGraphPanel({ knowledgeBaseId }: KnowledgeGraphPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNode, setSelectedNode] = useState<KnowledgeNode | null>(null);
  const [searchResult, setSearchResult] = useState<GraphSearchResult | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const { data: knowledgeNodes, isLoading: nodesLoading } = useKnowledgeNodes(knowledgeBaseId);
  const { data: knowledgeEdges, isLoading: edgesLoading } = useKnowledgeEdges(knowledgeBaseId);
  const generateGraph = useGenerateGraph();
  const graphSearch = useGraphSearch();

  // Convert knowledge nodes/edges to ReactFlow format
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!knowledgeNodes || !knowledgeEdges) {
      return { initialNodes: [], initialEdges: [] };
    }

    // Filter nodes by type if filter is active
    const filteredNodes = typeFilter
      ? knowledgeNodes.filter((n) => n.node_type === typeFilter)
      : knowledgeNodes;

    const nodeIds = new Set(filteredNodes.map((n) => n.id));

    // Layout nodes in a circle
    const nodes: Node[] = filteredNodes.map((node, index) => {
      const angle = (2 * Math.PI * index) / filteredNodes.length;
      const radius = Math.min(300, 50 + filteredNodes.length * 20);
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);

      const style = nodeTypeStyles[node.node_type] || nodeTypeStyles.concept;

      return {
        id: node.id,
        type: "graphNode",
        position: { x, y },
        data: {
          label: node.name,
          nodeType: node.node_type,
          description: node.description,
          importance: node.importance_score,
          occurrences: node.occurrence_count,
          style,
        },
      };
    });

    // Filter edges to only include visible nodes
    const edges: Edge[] = knowledgeEdges
      .filter((edge) => nodeIds.has(edge.source_node_id) && nodeIds.has(edge.target_node_id))
      .map((edge) => ({
        id: edge.id,
        source: edge.source_node_id,
        target: edge.target_node_id,
        label: relationTypeLabels[edge.relation_type] || edge.relation_type,
        type: "smoothstep",
        animated: edge.strength > 0.7,
        style: { stroke: "#64748b", strokeWidth: Math.max(1, edge.strength * 3) },
        labelStyle: { fill: "#94a3b8", fontSize: 10 },
      }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [knowledgeNodes, knowledgeEdges, typeFilter]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges when data changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleGenerateGraph = useCallback(() => {
    generateGraph.mutate({ knowledgeBaseId });
  }, [generateGraph, knowledgeBaseId]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    const result = await graphSearch.mutateAsync({
      query: searchQuery,
      knowledgeBaseId,
      topK: 5,
      graphDepth: 2,
    });

    setSearchResult(result);

    // Highlight matching nodes
    const anchorNodeIds = new Set(result.graphContext.anchorNodes.map((n) => n.id));
    const expandedNodeIds = new Set(result.graphContext.expandedNodes.map((n) => n.node_id));

    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        style: {
          ...node.style,
          opacity: anchorNodeIds.has(node.id) ? 1 : expandedNodeIds.has(node.id) ? 0.8 : 0.4,
          transform: anchorNodeIds.has(node.id) ? "scale(1.2)" : "scale(1)",
        },
      }))
    );
  }, [searchQuery, knowledgeBaseId, graphSearch, setNodes]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const knowledgeNode = knowledgeNodes?.find((n) => n.id === node.id);
      setSelectedNode(knowledgeNode || null);
    },
    [knowledgeNodes]
  );

  const clearFilter = useCallback(() => {
    setTypeFilter(null);
    setSearchResult(null);
    setNodes((nds) => nds.map((node) => ({ ...node, style: { ...node.style, opacity: 1 } })));
  }, [setNodes]);

  if (nodesLoading || edgesLoading) {
    return (
      <div className="h-full flex flex-col gap-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="flex-1" />
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
              placeholder="搜索实体或输入问题..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9"
            />
          </div>
          <Button
            size="sm"
            onClick={handleSearch}
            disabled={graphSearch.isPending || !searchQuery.trim()}
          >
            {graphSearch.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              "搜索"
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {typeFilter && (
            <Badge variant="secondary" className="gap-1">
              <Filter className="h-3 w-3" />
              {nodeTypeStyles[typeFilter]?.label || typeFilter}
              <button onClick={clearFilter} className="ml-1 hover:text-destructive">
                ×
              </button>
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateGraph}
            disabled={generateGraph.isPending}
          >
            {generateGraph.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Network className="h-4 w-4 mr-2" />
            )}
            {hasNodes ? "重新生成" : "生成图谱"}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph canvas */}
        <div className="flex-1 relative">
          {hasNodes ? (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose}
              fitView
              attributionPosition="bottom-left"
            >
              <Controls />
              <MiniMap 
                nodeColor={(node) => (node.data as any)?.style?.color || "#64748b"}
                maskColor="rgba(0, 0, 0, 0.1)"
              />
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            </ReactFlow>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Network className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg mb-2">暂无知识图谱</p>
              <p className="text-sm mb-4">上传文档后点击"生成图谱"提取实体和关系</p>
              <Button onClick={handleGenerateGraph} disabled={generateGraph.isPending}>
                {generateGraph.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Network className="h-4 w-4 mr-2" />
                )}
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

        {/* Side panel */}
        {(selectedNode || searchResult) && (
          <div className="w-80 border-l border-border bg-card overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              {selectedNode && (
                <Card className="m-3 border-none shadow-none">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: nodeTypeStyles[selectedNode.node_type]?.color }}
                      />
                      <CardTitle className="text-base">{selectedNode.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="w-fit">
                      {nodeTypeStyles[selectedNode.node_type]?.label || selectedNode.node_type}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {selectedNode.description && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">描述</p>
                        <p>{selectedNode.description}</p>
                      </div>
                    )}
                    <div className="flex gap-4">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">重要性</p>
                        <p>{(selectedNode.importance_score * 100).toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">出现次数</p>
                        <p>{selectedNode.occurrence_count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {searchResult && (
                <Card className="m-3 border-none shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      搜索结果
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {searchResult.stats.chunksFound} 片段
                      </Badge>
                      <Badge variant="outline">
                        {searchResult.stats.anchorNodesFound} 核心实体
                      </Badge>
                      <Badge variant="outline">
                        {searchResult.stats.expandedNodesFound} 关联实体
                      </Badge>
                    </div>

                    {searchResult.graphContext.anchorNodes.length > 0 && (
                      <div>
                        <p className="text-muted-foreground text-xs mb-2">核心实体</p>
                        <div className="space-y-1">
                          {searchResult.graphContext.anchorNodes.map((node) => (
                            <div
                              key={node.id}
                              className="flex items-center gap-2 p-2 rounded bg-muted/50"
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: nodeTypeStyles[node.node_type]?.color }}
                              />
                              <span className="text-xs">{node.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={clearFilter}
                    >
                      清除搜索
                    </Button>
                  </CardContent>
                </Card>
              )}
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Stats bar */}
      {hasNodes && (
        <div className="px-4 py-2 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
          <span>节点: {knowledgeNodes?.length || 0}</span>
          <span>关系: {knowledgeEdges?.length || 0}</span>
          {typeFilter && (
            <span>
              筛选: {nodeTypeStyles[typeFilter]?.label} ({nodes.length})
            </span>
          )}
        </div>
      )}
    </div>
  );
}