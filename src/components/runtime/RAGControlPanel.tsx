import { useState } from "react";
import { Database, GitBranch, Layers, Search, Settings2, BarChart3 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type RAGRetrievalMode = "vector" | "graph" | "hybrid";

export interface RAGConfig {
  enabled: boolean;
  knowledgeBaseIds: string[];
  retrievalMode: RAGRetrievalMode;
  topK: number;
  graphDepth: number;
}

export interface RAGStats {
  searchCount: number;
  chunksFound: number;
  entitiesMatched: number;
  edgesTraversed: number;
}

interface RAGControlPanelProps {
  config: RAGConfig;
  onConfigChange: (config: RAGConfig) => void;
  stats: RAGStats;
  knowledgeBases?: { id: string; name: string }[];
  className?: string;
}

export function RAGControlPanel({
  config,
  onConfigChange,
  stats,
  knowledgeBases = [],
  className,
}: RAGControlPanelProps) {
  const updateConfig = (updates: Partial<RAGConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="space-y-4 p-1">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium">RAG 检索设置</h3>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(enabled) => updateConfig({ enabled })}
          />
        </div>

        <Separator />

        {/* Retrieval Mode */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">检索模式</Label>
          <div className="grid grid-cols-3 gap-1">
            {(["vector", "graph", "hybrid"] as RAGRetrievalMode[]).map((mode) => (
              <Button
                key={mode}
                variant={config.retrievalMode === mode ? "default" : "outline"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => updateConfig({ retrievalMode: mode })}
                disabled={!config.enabled}
              >
                {mode === "vector" && <Database className="h-3 w-3 mr-1" />}
                {mode === "graph" && <GitBranch className="h-3 w-3 mr-1" />}
                {mode === "hybrid" && <Layers className="h-3 w-3 mr-1" />}
                {mode === "vector" ? "向量" : mode === "graph" ? "图谱" : "混合"}
              </Button>
            ))}
          </div>
        </div>

        {/* GraphRAG Toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-xs">启用 GraphRAG 增强</Label>
          <Switch
            checked={config.retrievalMode !== "vector"}
            onCheckedChange={(checked) =>
              updateConfig({ retrievalMode: checked ? "hybrid" : "vector" })
            }
            disabled={!config.enabled}
          />
        </div>

        {/* Top-K Setting */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">检索 Top-K</Label>
            <Badge variant="secondary" className="h-5 px-2 text-xs">
              {config.topK}
            </Badge>
          </div>
          <Slider
            value={[config.topK]}
            onValueChange={([value]) => updateConfig({ topK: value })}
            min={1}
            max={20}
            step={1}
            disabled={!config.enabled}
            className="py-2"
          />
        </div>

        {/* Graph Depth */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">图谱遍历深度</Label>
            <Badge variant="secondary" className="h-5 px-2 text-xs">
              {config.graphDepth}
            </Badge>
          </div>
          <Slider
            value={[config.graphDepth]}
            onValueChange={([value]) => updateConfig({ graphDepth: value })}
            min={1}
            max={5}
            step={1}
            disabled={!config.enabled || config.retrievalMode === "vector"}
            className="py-2"
          />
        </div>

        <Separator />

        {/* Session Stats */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <Label className="text-xs text-muted-foreground">本次会话统计</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-lg font-semibold text-primary">{stats.searchCount}</div>
              <div className="text-[10px] text-muted-foreground">检索次数</div>
            </div>
            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-lg font-semibold text-blue-500">{stats.chunksFound}</div>
              <div className="text-[10px] text-muted-foreground">命中切片</div>
            </div>
            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-lg font-semibold text-purple-500">{stats.entitiesMatched}</div>
              <div className="text-[10px] text-muted-foreground">关联实体</div>
            </div>
            <div className="rounded-lg border bg-card p-2 text-center">
              <div className="text-lg font-semibold text-cognitive">{stats.edgesTraversed}</div>
              <div className="text-[10px] text-muted-foreground">遍历边</div>
            </div>
          </div>
        </div>

        {/* Knowledge Base Selection */}
        {knowledgeBases.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">已挂载知识库</Label>
              <div className="space-y-1">
                {knowledgeBases.map((kb) => (
                  <div
                    key={kb.id}
                    className="flex items-center justify-between rounded-lg border bg-card/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs">{kb.name}</span>
                    </div>
                    <Switch
                      checked={config.knowledgeBaseIds.includes(kb.id)}
                      onCheckedChange={(checked) => {
                        const ids = checked
                          ? [...config.knowledgeBaseIds, kb.id]
                          : config.knowledgeBaseIds.filter((id) => id !== kb.id);
                        updateConfig({ knowledgeBaseIds: ids });
                      }}
                      disabled={!config.enabled}
                    />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}
