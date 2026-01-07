import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { BookOpen, Database, X, Settings, Network, FileText, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface KnowledgeBaseNodeData {
  id: string;
  name: string;
  description: string;
  documents_count: number;
  chunks_count: number;
  nodes_count?: number;
  edges_count?: number;
  index_status: string;
  graph_enabled: boolean;
  retrieval_mode: 'vector' | 'graph' | 'hybrid';
  top_k: number;
  graph_depth?: number;
  source_traceability?: boolean;
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
}

interface KnowledgeBaseNodeProps {
  data: KnowledgeBaseNodeData;
  selected?: boolean;
}

const retrievalModeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  vector: { label: "向量检索", icon: <Layers className="h-3 w-3" /> },
  graph: { label: "图谱检索", icon: <Network className="h-3 w-3" /> },
  hybrid: { label: "混合检索", icon: <Database className="h-3 w-3" /> },
};

const statusColors: Record<string, string> = {
  ready: "bg-green-500",
  indexing: "bg-yellow-500 animate-pulse",
  pending: "bg-gray-400",
  failed: "bg-red-500",
};

const KnowledgeBaseNode: React.FC<KnowledgeBaseNodeProps> = memo(({ data, selected }) => {
  const modeInfo = retrievalModeLabels[data.retrieval_mode] || retrievalModeLabels.hybrid;

  return (
    <div
      className={cn(
        "relative bg-card border-2 rounded-lg shadow-lg min-w-[220px] max-w-[280px] transition-all",
        selected ? "border-primary ring-2 ring-primary/30" : "border-purple-500/50",
        "hover:shadow-xl"
      )}
    >
      {/* Connection Handle - Top */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-500 !border-2 !border-background !w-3 !h-3"
      />

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-t-md border-b border-purple-500/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-500/20 rounded-md">
            <BookOpen className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground line-clamp-1">
              {data.name}
            </span>
            <div className="flex items-center gap-1">
              <span
                className={cn("w-2 h-2 rounded-full", statusColors[data.index_status] || statusColors.pending)}
              />
              <span className="text-xs text-muted-foreground">
                {data.index_status === "ready" ? "已索引" : 
                 data.index_status === "indexing" ? "索引中" :
                 data.index_status === "failed" ? "索引失败" : "待处理"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {data.onConfigure && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                data.onConfigure?.(data.id);
              }}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}
          {data.onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                data.onRemove?.(data.id);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Description */}
        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{data.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span>{data.documents_count} 文档</span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            <span>{data.chunks_count} 切片</span>
          </div>
        </div>

        {/* Graph Stats */}
        {data.graph_enabled && (data.nodes_count || data.edges_count) && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Network className="h-3 w-3 text-purple-500" />
              <span>{data.nodes_count || 0} 节点</span>
            </div>
            <span>•</span>
            <span>{data.edges_count || 0} 关系</span>
          </div>
        )}

        {/* Retrieval Mode Badge */}
        <div className="flex items-center gap-2 pt-1">
          <Badge 
            variant="secondary" 
            className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
          >
            {modeInfo.icon}
            <span className="ml-1">{modeInfo.label}</span>
          </Badge>
          {data.graph_enabled && (
            <Badge 
              variant="outline" 
              className="text-xs border-green-500/30 text-green-600 dark:text-green-400"
            >
              GraphRAG
            </Badge>
          )}
        </div>

        {/* Top-K indicator */}
        <div className="text-xs text-muted-foreground">
          Top-K: {data.top_k} 
          {data.graph_depth && data.retrieval_mode !== 'vector' && (
            <span className="ml-2">| 深度: {data.graph_depth}</span>
          )}
        </div>
      </div>

      {/* Connection Handle - Bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-500 !border-2 !border-background !w-3 !h-3"
      />
    </div>
  );
});

KnowledgeBaseNode.displayName = "KnowledgeBaseNode";

export default KnowledgeBaseNode;
