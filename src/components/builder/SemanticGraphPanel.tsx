import { useState, useMemo, useCallback } from "react";
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
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
} from "@/hooks/useSemanticGraph";

interface SemanticGraphPanelProps {
  agentId?: string;
  agentName?: string;
}

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

  const { data: entities = [], isLoading: entitiesLoading, refetch: refetchEntities } = useEntities(agentId);
  const { data: relations = [], refetch: refetchRelations } = useEntityRelations(
    entities.map((e) => e.id)
  );
  const { data: documents = [] } = useDocumentProcessing(agentId);

  const extractEntities = useExtractEntities();
  const rssQueryMutation = useRSSQuery();
  const deleteEntity = useDeleteEntity();
  const createRelation = useCreateRelation();

  // Convert entities and relations to React Flow nodes and edges
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = entities.map((entity, index) => {
      const angle = (2 * Math.PI * index) / entities.length;
      const radius = Math.min(300, entities.length * 30);

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
              <div className="font-medium text-xs">{entity.name}</div>
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
            </div>
          ),
        },
        style: {
          background: `${entityTypeColors[entity.entity_type] || "#888"}20`,
          border: `2px solid ${entityTypeColors[entity.entity_type] || "#888"}`,
          borderRadius: "8px",
          padding: "4px",
          minWidth: "80px",
        },
      };
    });

    const edges: Edge[] = relations.map((rel) => ({
      id: rel.id,
      source: rel.source_entity_id,
      target: rel.target_entity_id,
      label: relationTypeLabels[rel.relation_type] || rel.relation_type,
      type: "smoothstep",
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 15,
        height: 15,
      },
      style: {
        strokeWidth: 2,
      },
      labelStyle: {
        fontSize: 10,
        fill: "hsl(var(--muted-foreground))",
      },
    }));

    return { initialNodes: nodes, initialEdges: edges };
  }, [entities, relations]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when entities change
  useMemo(() => {
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
      topK: 5,
      traverseDepth: 2,
    });

    setRssResult(result);
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
            <TabsTrigger value="graph">图谱视图</TabsTrigger>
            <TabsTrigger value="extract">实体抽取</TabsTrigger>
            <TabsTrigger value="rss">RSS 检索</TabsTrigger>
            <TabsTrigger value="history">处理历史</TabsTrigger>
          </TabsList>

          <TabsContent value="graph" className="mt-4">
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
                  <MiniMap />
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
                    <span>{selectedEntity.name}</span>
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
                      执行 RSS 查询
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {rssResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">检索结果</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div>
                      <div className="font-bold">{rssResult.stats.anchorCount}</div>
                      <div className="text-xs text-muted-foreground">锚点实体</div>
                    </div>
                    <div>
                      <div className="font-bold">{rssResult.stats.subgraphNodes}</div>
                      <div className="text-xs text-muted-foreground">子图节点</div>
                    </div>
                    <div>
                      <div className="font-bold">{rssResult.stats.relationsCount}</div>
                      <div className="text-xs text-muted-foreground">相关关系</div>
                    </div>
                    <div>
                      <div className="font-bold">{rssResult.stats.contextLength}</div>
                      <div className="text-xs text-muted-foreground">上下文字符</div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">核心相关实体</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rssResult.anchors.map((anchor) => (
                        <Badge
                          key={anchor.entity_id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {anchor.entity_name} ({(anchor.similarity * 100).toFixed(0)}%)
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">生成的上下文</Label>
                    <ScrollArea className="h-[200px] mt-1">
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
