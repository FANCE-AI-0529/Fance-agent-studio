import { useState, useMemo, useCallback, useEffect } from "react";
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet.tsx";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { Badge } from "../ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog.tsx";
import { Label } from "../ui/label.tsx";
import { Switch } from "../ui/switch.tsx";
import { Slider } from "../ui/slider.tsx";
import {
  Network,
  Upload,
  Search,
  Trash2,
  FileText,
  Loader2,
  Zap,
  Plus,
  RefreshCw,
  Eye,
  EyeOff,
  Target,
  GitBranch,
} from "lucide-react";
import {
  useEntities,
  useEntityRelations,
  useDocumentProcessing,
  useExtractEntities,
  useRSSQuery,
  useDeleteEntity,
  useCreateRelation,
  entityTypeColors,
  relationTypeLabels,
  type Entity,
  type RSSQueryResult,
} from "../../hooks/useSemanticGraph.ts";

interface SemanticGraphPanelProps {
  agentId?: string;
  agentName?: string;
}

// Highlight colors for RSS visualization
const HIGHLIGHT_COLORS = {
  anchor: "#FF6B6B", // Red for anchor nodes
  depth1: "#4ECDC4", // Teal for depth 1
  depth2: "#45B7D1", // Blue for depth 2
  relation: "#FFD93D", // Yellow for highlighted relations
};

export function SemanticGraphPanel({ agentId, agentName }: SemanticGraphPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("graph");
  const [documentText, setDocumentText] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [rssQuery, setRssQuery] = useState("");
  const [rssResult, setRssResult] = useState<RSSQueryResult | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [newRelation, setNewRelation] = useState({
    sourceId: "",
    targetId: "",
    type: "requires",
    description: "",
  });
  
  // RSS visualization state
  const [showRSSHighlight, setShowRSSHighlight] = useState(false);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
  const [highlightedEdgeIds, setHighlightedEdgeIds] = useState<Set<string>>(new Set());
  const [anchorNodeIds, setAnchorNodeIds] = useState<Set<string>>(new Set());
  const [nodeDepthMap, setNodeDepthMap] = useState<Map<string, number>>(new Map());
  const [topK, setTopK] = useState(5);
  const [traverseDepth, setTraverseDepth] = useState(2);

  const { data: entities = [], isLoading: entitiesLoading, refetch: refetchEntities } = useEntities(agentId);
  const { data: relations = [], refetch: refetchRelations } = useEntityRelations(
    entities.map((e) => e.id)
  );
  const { data: documents = [] } = useDocumentProcessing(agentId);

  const extractEntities = useExtractEntities();
  const rssQueryMutation = useRSSQuery();
  const deleteEntity = useDeleteEntity();
  const createRelation = useCreateRelation();

  // Update highlight state when RSS result changes
  useEffect(() => {
    if (rssResult && showRSSHighlight) {
      const anchors = new Set(rssResult.anchors.map(a => a.entity_id));
      const allHighlighted = new Set<string>();
      const depthMap = new Map<string, number>();
      
      // Add anchors (depth 0)
      rssResult.anchors.forEach(a => {
        allHighlighted.add(a.entity_id);
        depthMap.set(a.entity_id, 0);
      });
      
      // Add subgraph nodes with their depths
      rssResult.subgraph.forEach(node => {
        allHighlighted.add(node.entity_id);
        if (!depthMap.has(node.entity_id)) {
          depthMap.set(node.entity_id, node.depth);
        }
      });
      
      // Find highlighted edges (relations between highlighted nodes)
      const highlightedEdges = new Set<string>();
      relations.forEach(rel => {
        if (allHighlighted.has(rel.source_entity_id) && allHighlighted.has(rel.target_entity_id)) {
          highlightedEdges.add(rel.id);
        }
      });
      
      setAnchorNodeIds(anchors);
      setHighlightedNodeIds(allHighlighted);
      setHighlightedEdgeIds(highlightedEdges);
      setNodeDepthMap(depthMap);
    } else {
      setAnchorNodeIds(new Set());
      setHighlightedNodeIds(new Set());
      setHighlightedEdgeIds(new Set());
      setNodeDepthMap(new Map());
    }
  }, [rssResult, showRSSHighlight, relations]);

  // Convert entities and relations to React Flow nodes and edges with highlighting
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = entities.map((entity, index) => {
      const angle = (2 * Math.PI * index) / entities.length;
      const radius = Math.min(300, entities.length * 30);
      
      const isAnchor = anchorNodeIds.has(entity.id);
      const isHighlighted = highlightedNodeIds.has(entity.id);
      const depth = nodeDepthMap.get(entity.id) ?? -1;
      
      // Determine node style based on highlight state
      let nodeStyle: React.CSSProperties = {
        background: `${entityTypeColors[entity.entity_type] || "#888"}20`,
        border: `2px solid ${entityTypeColors[entity.entity_type] || "#888"}`,
        borderRadius: "8px",
        padding: "4px",
        minWidth: "80px",
        transition: "all 0.3s ease",
      };
      
      if (showRSSHighlight && rssResult) {
        if (isAnchor) {
          // Anchor nodes - prominent red glow
          nodeStyle = {
            ...nodeStyle,
            background: `${HIGHLIGHT_COLORS.anchor}40`,
            border: `3px solid ${HIGHLIGHT_COLORS.anchor}`,
            boxShadow: `0 0 20px ${HIGHLIGHT_COLORS.anchor}80, 0 0 40px ${HIGHLIGHT_COLORS.anchor}40`,
            transform: "scale(1.1)",
            zIndex: 100,
          };
        } else if (isHighlighted) {
          // Traversed nodes - color by depth
          const depthColor = depth === 1 ? HIGHLIGHT_COLORS.depth1 : HIGHLIGHT_COLORS.depth2;
          nodeStyle = {
            ...nodeStyle,
            background: `${depthColor}30`,
            border: `2px solid ${depthColor}`,
            boxShadow: `0 0 10px ${depthColor}60`,
          };
        } else {
          // Non-highlighted nodes - dimmed
          nodeStyle = {
            ...nodeStyle,
            opacity: 0.3,
            filter: "grayscale(50%)",
          };
        }
      }

      return {
        id: entity.id,
        type: "default",
        position: {
          x: 400 + radius * Math.cos(angle),
          y: 300 + radius * Math.sin(angle),
        },
        data: {
          label: (
            <div className="text-center p-1">
              <div className="font-medium text-xs flex items-center justify-center gap-1">
                {isAnchor && showRSSHighlight && (
                  <Target className="h-3 w-3" style={{ color: HIGHLIGHT_COLORS.anchor }} />
                )}
                {entity.name}
              </div>
              <Badge
                variant="outline"
                className="text-[10px] mt-1"
                style={{
                  borderColor: entityTypeColors[entity.entity_type] || "#888",
                  color: entityTypeColors[entity.entity_type] || "#888",
                }}
              >
                {entity.entity_type}
              </Badge>
              {showRSSHighlight && isHighlighted && depth >= 0 && (
                <div className="text-[9px] mt-1 text-muted-foreground">
                  {isAnchor ? "锚点" : `深度 ${depth}`}
                </div>
              )}
            </div>
          ),
        },
        style: nodeStyle,
      };
    });

    const edges: Edge[] = relations.map((rel) => {
      const isHighlighted = highlightedEdgeIds.has(rel.id);
      
      let edgeStyle: React.CSSProperties = {
        strokeWidth: 2,
        transition: "all 0.3s ease",
      };
      
      if (showRSSHighlight && rssResult) {
        if (isHighlighted) {
          edgeStyle = {
            strokeWidth: 3,
            stroke: HIGHLIGHT_COLORS.relation,
            filter: `drop-shadow(0 0 4px ${HIGHLIGHT_COLORS.relation})`,
          };
        } else {
          edgeStyle = {
            strokeWidth: 1,
            opacity: 0.2,
          };
        }
      }
      
      return {
        id: rel.id,
        source: rel.source_entity_id,
        target: rel.target_entity_id,
        label: relationTypeLabels[rel.relation_type] || rel.relation_type,
        type: "smoothstep",
        animated: isHighlighted && showRSSHighlight,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 15,
          height: 15,
          color: isHighlighted && showRSSHighlight ? HIGHLIGHT_COLORS.relation : undefined,
        },
        style: edgeStyle,
        labelStyle: {
          fontSize: 10,
          fill: isHighlighted && showRSSHighlight ? HIGHLIGHT_COLORS.relation : "hsl(var(--muted-foreground))",
          fontWeight: isHighlighted && showRSSHighlight ? "bold" : "normal",
        },
      };
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [entities, relations, showRSSHighlight, rssResult, anchorNodeIds, highlightedNodeIds, highlightedEdgeIds, nodeDepthMap]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when entities change or highlight state changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleExtract = async () => {
    if (!documentText.trim() || !documentName.trim()) return;

    await extractEntities.mutateAsync({
      documentContent: documentText,
      documentName: documentName,
      agentId,
    });

    setDocumentText("");
    setDocumentName("");
    refetchEntities();
    refetchRelations();
  };

  const handleRSSQuery = async () => {
    if (!rssQuery.trim()) return;

    const result = await rssQueryMutation.mutateAsync({
      query: rssQuery,
      agentId,
      topK,
      traverseDepth,
    });

    setRssResult(result);
    setShowRSSHighlight(true);
    setActiveTab("graph"); // Switch to graph view to see highlights
  };

  const handleClearHighlight = () => {
    setShowRSSHighlight(false);
    setRssResult(null);
  };

  const handleDeleteEntity = async (entityId: string) => {
    await deleteEntity.mutateAsync(entityId);
    setSelectedEntity(null);
  };

  const handleAddRelation = async () => {
    if (!newRelation.sourceId || !newRelation.targetId) return;

    await createRelation.mutateAsync({
      sourceEntityId: newRelation.sourceId,
      targetEntityId: newRelation.targetId,
      relationType: newRelation.type,
      description: newRelation.description,
    });

    setShowAddRelation(false);
    setNewRelation({ sourceId: "", targetId: "", type: "requires", description: "" });
    refetchRelations();
  };

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      const entity = entities.find((e) => e.id === node.id);
      if (entity) {
        setSelectedEntity(entity);
      }
    },
    [entities]
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <Network className="h-4 w-4 mr-2" />
          语义图谱
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[900px] sm:max-w-[900px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            项目语义图谱 (PSG)
            {agentName && (
              <Badge variant="outline" className="ml-2">
                {agentName}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="graph" className="relative">
              图谱视图
              {showRSSHighlight && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-destructive rounded-full animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="extract">实体抽取</TabsTrigger>
            <TabsTrigger value="rss">RSS 检索</TabsTrigger>
            <TabsTrigger value="history">处理历史</TabsTrigger>
          </TabsList>

          <TabsContent value="graph" className="mt-4">
            {/* RSS Highlight Legend & Controls */}
            {showRSSHighlight && rssResult && (
              <Card className="mb-4 border-2" style={{ borderColor: HIGHLIGHT_COLORS.anchor }}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: HIGHLIGHT_COLORS.anchor, boxShadow: `0 0 8px ${HIGHLIGHT_COLORS.anchor}` }}
                        />
                        <span className="text-xs">锚点实体 ({rssResult.stats.anchorCount})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: HIGHLIGHT_COLORS.depth1 }}
                        />
                        <span className="text-xs">深度 1</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: HIGHLIGHT_COLORS.depth2 }}
                        />
                        <span className="text-xs">深度 2</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-1 rounded" 
                          style={{ backgroundColor: HIGHLIGHT_COLORS.relation }}
                        />
                        <span className="text-xs">关联边</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowRSSHighlight(!showRSSHighlight)}
                      >
                        {showRSSHighlight ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleClearHighlight}
                      >
                        清除高亮
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    查询: "{rssQuery}" | 子图节点: {rssResult.stats.subgraphNodes} | 关联边: {rssResult.stats.relationsCount}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <div className="h-[500px] border rounded-lg overflow-hidden">
              {entitiesLoading ? (
                <div className="h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : entities.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <Network className="h-12 w-12 mb-4 opacity-50" />
                  <p>暂无实体数据</p>
                  <p className="text-sm">请先上传文档进行实体抽取</p>
                </div>
              ) : (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={onNodeClick}
                  fitView
                >
                  <Controls />
                  <MiniMap 
                    nodeColor={(node) => {
                      if (showRSSHighlight && rssResult) {
                        if (anchorNodeIds.has(node.id)) return HIGHLIGHT_COLORS.anchor;
                        if (highlightedNodeIds.has(node.id)) {
                          const depth = nodeDepthMap.get(node.id);
                          return depth === 1 ? HIGHLIGHT_COLORS.depth1 : HIGHLIGHT_COLORS.depth2;
                        }
                        return "#666";
                      }
                      return entityTypeColors[(entities.find(e => e.id === node.id))?.entity_type || ""] || "#888";
                    }}
                  />
                  <Background />
                  <Panel position="top-right" className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        refetchEntities();
                        refetchRelations();
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddRelation(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      添加关系
                    </Button>
                  </Panel>
                </ReactFlow>
              )}
            </div>

            {/* Entity Legend */}
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(entityTypeColors).map(([type, color]) => (
                <Badge
                  key={type}
                  variant="outline"
                  style={{ borderColor: color, color }}
                >
                  {type}
                </Badge>
              ))}
            </div>

            {/* Selected Entity Details */}
            {selectedEntity && (
              <Card className="mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      {selectedEntity.name}
                      {showRSSHighlight && anchorNodeIds.has(selectedEntity.id) && (
                        <Badge variant="destructive" className="text-xs">锚点</Badge>
                      )}
                      {showRSSHighlight && highlightedNodeIds.has(selectedEntity.id) && !anchorNodeIds.has(selectedEntity.id) && (
                        <Badge variant="secondary" className="text-xs">
                          深度 {nodeDepthMap.get(selectedEntity.id)}
                        </Badge>
                      )}
                    </span>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteEntity(selectedEntity.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>
                    <strong>类型:</strong> {selectedEntity.entity_type}
                  </p>
                  {selectedEntity.description && (
                    <p>
                      <strong>描述:</strong> {selectedEntity.description}
                    </p>
                  )}
                  {selectedEntity.source_document && (
                    <p>
                      <strong>来源:</strong> {selectedEntity.source_document}
                    </p>
                  )}
                  {selectedEntity.source_content && (
                    <p className="text-muted-foreground text-xs">
                      "{selectedEntity.source_content.substring(0, 200)}..."
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="extract" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  文档实体抽取
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>文档名称</Label>
                  <Input
                    placeholder="例如：公积金办理指南.pdf"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>文档内容</Label>
                  <Textarea
                    placeholder="粘贴文档内容..."
                    className="min-h-[200px]"
                    value={documentText}
                    onChange={(e) => setDocumentText(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleExtract}
                  disabled={
                    extractEntities.isPending ||
                    !documentText.trim() ||
                    !documentName.trim()
                  }
                  className="w-full"
                >
                  {extractEntities.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      正在抽取实体...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      开始抽取
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">实体统计</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{entities.length}</div>
                    <div className="text-xs text-muted-foreground">实体总数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{relations.length}</div>
                    <div className="text-xs text-muted-foreground">关系总数</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{documents.length}</div>
                    <div className="text-xs text-muted-foreground">处理文档</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rss" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  运行时状态切片 (RSS) 查询
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>查询语句</Label>
                  <Textarea
                    placeholder="输入查询内容，例如：如何办理公积金提取？"
                    value={rssQuery}
                    onChange={(e) => setRssQuery(e.target.value)}
                  />
                </div>
                
                {/* Query Parameters */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs flex items-center gap-2">
                      <Target className="h-3 w-3" />
                      锚点数量 (Top-K): {topK}
                    </Label>
                    <Slider
                      value={[topK]}
                      onValueChange={([v]) => setTopK(v)}
                      min={1}
                      max={10}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-2">
                      <GitBranch className="h-3 w-3" />
                      遍历深度: {traverseDepth}
                    </Label>
                    <Slider
                      value={[traverseDepth]}
                      onValueChange={([v]) => setTraverseDepth(v)}
                      min={1}
                      max={4}
                      step={1}
                      className="mt-2"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="auto-highlight"
                      checked={showRSSHighlight}
                      onCheckedChange={setShowRSSHighlight}
                      disabled={!rssResult}
                    />
                    <Label htmlFor="auto-highlight" className="text-xs">
                      在图谱中高亮显示结果
                    </Label>
                  </div>
                </div>
                
                <Button
                  onClick={handleRSSQuery}
                  disabled={rssQueryMutation.isPending || !rssQuery.trim()}
                  className="w-full"
                >
                  {rssQueryMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      正在检索...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      执行 RSS 查询并可视化
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {rssResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>检索结果</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowRSSHighlight(true);
                        setActiveTab("graph");
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      查看图谱
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div className="p-2 rounded" style={{ backgroundColor: `${HIGHLIGHT_COLORS.anchor}20` }}>
                      <div className="font-bold" style={{ color: HIGHLIGHT_COLORS.anchor }}>{rssResult.stats.anchorCount}</div>
                      <div className="text-xs text-muted-foreground">锚点实体</div>
                    </div>
                    <div className="p-2 rounded" style={{ backgroundColor: `${HIGHLIGHT_COLORS.depth1}20` }}>
                      <div className="font-bold" style={{ color: HIGHLIGHT_COLORS.depth1 }}>{rssResult.stats.subgraphNodes}</div>
                      <div className="text-xs text-muted-foreground">子图节点</div>
                    </div>
                    <div className="p-2 rounded" style={{ backgroundColor: `${HIGHLIGHT_COLORS.relation}20` }}>
                      <div className="font-bold" style={{ color: HIGHLIGHT_COLORS.relation }}>{rssResult.stats.relationsCount}</div>
                      <div className="text-xs text-muted-foreground">相关关系</div>
                    </div>
                    <div className="p-2 rounded bg-muted">
                      <div className="font-bold">{rssResult.stats.contextLength}</div>
                      <div className="text-xs text-muted-foreground">上下文字符</div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs flex items-center gap-2">
                      <Target className="h-3 w-3" style={{ color: HIGHLIGHT_COLORS.anchor }} />
                      核心相关实体 (锚点)
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rssResult.anchors.map((anchor) => (
                        <Badge
                          key={anchor.entity_id}
                          className="text-xs cursor-pointer hover:opacity-80"
                          style={{ 
                            backgroundColor: `${HIGHLIGHT_COLORS.anchor}20`,
                            color: HIGHLIGHT_COLORS.anchor,
                            borderColor: HIGHLIGHT_COLORS.anchor,
                          }}
                          onClick={() => {
                            const entity = entities.find(e => e.id === anchor.entity_id);
                            if (entity) setSelectedEntity(entity);
                            setActiveTab("graph");
                            setShowRSSHighlight(true);
                          }}
                        >
                          {anchor.entity_name} ({(anchor.similarity * 100).toFixed(0)}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {rssResult.subgraph.length > 0 && (
                    <div>
                      <Label className="text-xs flex items-center gap-2">
                        <GitBranch className="h-3 w-3" style={{ color: HIGHLIGHT_COLORS.depth1 }} />
                        遍历扩展节点
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rssResult.subgraph
                          .filter(node => node.depth > 0)
                          .slice(0, 10)
                          .map((node) => (
                            <Badge
                              key={node.entity_id}
                              variant="outline"
                              className="text-xs cursor-pointer hover:opacity-80"
                              style={{ 
                                borderColor: node.depth === 1 ? HIGHLIGHT_COLORS.depth1 : HIGHLIGHT_COLORS.depth2,
                                color: node.depth === 1 ? HIGHLIGHT_COLORS.depth1 : HIGHLIGHT_COLORS.depth2,
                              }}
                              onClick={() => {
                                const entity = entities.find(e => e.id === node.entity_id);
                                if (entity) setSelectedEntity(entity);
                                setActiveTab("graph");
                                setShowRSSHighlight(true);
                              }}
                            >
                              {node.entity_name} (深度{node.depth})
                            </Badge>
                          ))}
                        {rssResult.subgraph.filter(n => n.depth > 0).length > 10 && (
                          <Badge variant="secondary" className="text-xs">
                            +{rssResult.subgraph.filter(n => n.depth > 0).length - 10} 更多
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">生成的上下文</Label>
                    <ScrollArea className="h-[150px] mt-1">
                      <pre className="text-xs whitespace-pre-wrap bg-muted p-2 rounded">
                        {rssResult.context}
                      </pre>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {documents.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>暂无处理历史</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <Card key={doc.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{doc.document_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(doc.created_at).toLocaleString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                doc.status === "completed"
                                  ? "default"
                                  : doc.status === "failed"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {doc.status}
                            </Badge>
                            {doc.status === "completed" && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {doc.entities_count} 实体, {doc.relations_count} 关系
                              </div>
                            )}
                          </div>
                        </div>
                        {doc.error_message && (
                          <div className="text-xs text-destructive mt-2">
                            {doc.error_message}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Add Relation Dialog */}
        <Dialog open={showAddRelation} onOpenChange={setShowAddRelation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加实体关系</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>源实体</Label>
                <Select
                  value={newRelation.sourceId}
                  onValueChange={(v) =>
                    setNewRelation((prev) => ({ ...prev, sourceId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择源实体" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>关系类型</Label>
                <Select
                  value={newRelation.type}
                  onValueChange={(v) =>
                    setNewRelation((prev) => ({ ...prev, type: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(relationTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>目标实体</Label>
                <Select
                  value={newRelation.targetId}
                  onValueChange={(v) =>
                    setNewRelation((prev) => ({ ...prev, targetId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择目标实体" />
                  </SelectTrigger>
                  <SelectContent>
                    {entities.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>描述 (可选)</Label>
                <Input
                  value={newRelation.description}
                  onChange={(e) =>
                    setNewRelation((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="关系描述"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddRelation(false)}>
                取消
              </Button>
              <Button
                onClick={handleAddRelation}
                disabled={!newRelation.sourceId || !newRelation.targetId}
              >
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
