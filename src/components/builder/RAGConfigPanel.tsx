import React from "react";
import { BookOpen, Network, Layers, Database, X, FileText, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface RAGConfig {
  retrieval_mode: 'vector' | 'graph' | 'hybrid';
  top_k: number;
  graph_depth: number;
  source_traceability: boolean;
  auto_inject_context: boolean;
}

interface RAGConfigPanelProps {
  knowledgeBase: {
    id: string;
    name: string;
    description?: string;
    documents_count: number;
    chunks_count: number;
    nodes_count?: number;
    edges_count?: number;
    index_status: string;
    graph_enabled: boolean;
  };
  config: RAGConfig;
  onChange: (config: RAGConfig) => void;
  onClose: () => void;
}

const RAGConfigPanel: React.FC<RAGConfigPanelProps> = ({
  knowledgeBase,
  config,
  onChange,
  onClose,
}) => {
  const handleModeChange = (mode: string) => {
    onChange({ ...config, retrieval_mode: mode as RAGConfig['retrieval_mode'] });
  };

  const handleTopKChange = (value: number[]) => {
    onChange({ ...config, top_k: value[0] });
  };

  const handleGraphDepthChange = (value: number[]) => {
    onChange({ ...config, graph_depth: value[0] });
  };

  const handleTraceabilityChange = (checked: boolean) => {
    onChange({ ...config, source_traceability: checked });
  };

  const handleAutoInjectChange = (checked: boolean) => {
    onChange({ ...config, auto_inject_context: checked });
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <BookOpen className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">知识库配置</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">{knowledgeBase.name}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Knowledge Base Info */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">状态</span>
              <Badge 
                variant={knowledgeBase.index_status === 'ready' ? 'default' : 'secondary'}
                className={cn(
                  knowledgeBase.index_status === 'ready' && "bg-green-500/10 text-green-600 border-green-500/30"
                )}
              >
                {knowledgeBase.index_status === 'ready' ? '已就绪' : 
                 knowledgeBase.index_status === 'indexing' ? '索引中' : '待处理'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" /> 文档数
              </span>
              <span className="font-medium">{knowledgeBase.documents_count}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Layers className="h-3 w-3" /> 切片数
              </span>
              <span className="font-medium">{knowledgeBase.chunks_count}</span>
            </div>
            {knowledgeBase.graph_enabled && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Network className="h-3 w-3" /> 图谱节点
                </span>
                <span className="font-medium">{knowledgeBase.nodes_count || 0}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Retrieval Mode */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">检索模式</Label>
            <RadioGroup
              value={config.retrieval_mode}
              onValueChange={handleModeChange}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="vector" id="vector" />
                <Label htmlFor="vector" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-blue-500" />
                    <span>向量检索 (Vector)</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    基于语义相似度匹配相关文档切片
                  </p>
                </Label>
              </div>

              <div 
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border border-border transition-colors",
                  knowledgeBase.graph_enabled 
                    ? "hover:bg-muted/50" 
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <RadioGroupItem 
                  value="graph" 
                  id="graph" 
                  disabled={!knowledgeBase.graph_enabled}
                />
                <Label 
                  htmlFor="graph" 
                  className={cn("flex-1", knowledgeBase.graph_enabled && "cursor-pointer")}
                >
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4 text-purple-500" />
                    <span>图谱检索 (GraphRAG)</span>
                    {!knowledgeBase.graph_enabled && (
                      <Badge variant="outline" className="text-xs">需启用图谱</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    基于知识图谱进行关系推理和路径发现
                  </p>
                </Label>
              </div>

              <div 
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors",
                  config.retrieval_mode === 'hybrid' 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:bg-muted/50"
                )}
              >
                <RadioGroupItem value="hybrid" id="hybrid" />
                <Label htmlFor="hybrid" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-green-500" />
                    <span>混合检索 (Hybrid)</span>
                    <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/30">
                      推荐
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    结合向量相似度和图谱遍历，获取最全面的上下文
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Top-K Setting */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">检索 Top-K</Label>
              <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                {config.top_k}
              </span>
            </div>
            <Slider
              value={[config.top_k]}
              onValueChange={handleTopKChange}
              min={1}
              max={20}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              返回最相关的 {config.top_k} 个文档切片
            </p>
          </div>

          {/* Graph Depth Setting */}
          {(config.retrieval_mode === 'graph' || config.retrieval_mode === 'hybrid') && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">图谱遍历深度</Label>
                  <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                    {config.graph_depth}
                  </span>
                </div>
                <Slider
                  value={[config.graph_depth]}
                  onValueChange={handleGraphDepthChange}
                  min={1}
                  max={3}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  从锚点节点向外遍历 {config.graph_depth} 层关系
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Advanced Settings */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">高级选项</Label>
            
            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="traceability" className="text-sm cursor-pointer">
                    来源溯源
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    在回复中附加引用来源
                  </p>
                </div>
              </div>
              <Switch
                id="traceability"
                checked={config.source_traceability}
                onCheckedChange={handleTraceabilityChange}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label htmlFor="auto-inject" className="text-sm cursor-pointer">
                    自动注入上下文
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    对话时自动检索并注入相关内容
                  </p>
                </div>
              </div>
              <Switch
                id="auto-inject"
                checked={config.auto_inject_context}
                onCheckedChange={handleAutoInjectChange}
              />
            </div>
          </div>

          {/* MPLP Policy Notice */}
          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <div className="flex items-start gap-2">
              <Network className="h-4 w-4 text-purple-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                  MPLP 策略自动注入
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  挂载知识库后，将自动启用长期记忆 (long_term_memory) 
                  并添加"来源溯源"治理策略
                </p>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default RAGConfigPanel;
