import { Database, GitBranch, Layers, Target, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TraceEvent, TraceEventType } from "./trace/traceTypes";

// RAG-specific event configuration
const ragEventConfig: Record<string, {
  icon: React.ElementType;
  label: string;
  prefix: string;
  color: string;
  bgColor: string;
}> = {
  rag_vector_search: {
    icon: Database,
    label: "[RAG:Vector]",
    prefix: "Found",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  rag_graph_traverse: {
    icon: GitBranch,
    label: "[RAG:Graph]",
    prefix: "Traversing",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  rag_context_inject: {
    icon: Layers,
    label: "[MPLP:Trace]",
    prefix: "Context enriched",
    color: "text-cognitive",
    bgColor: "bg-cognitive/10",
  },
  rag_entity_match: {
    icon: Target,
    label: "[RAG:Entity]",
    prefix: "Matched",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  rag_source_found: {
    icon: FileText,
    label: "[RAG:Source]",
    prefix: "Found",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
};

interface RAGTraceEventProps {
  event: TraceEvent;
  isLast?: boolean;
}

export function RAGTraceEvent({ event, isLast = false }: RAGTraceEventProps) {
  const config = ragEventConfig[event.type];
  if (!config) return null;

  const Icon = config.icon;
  const data = event.data;

  return (
    <div className="flex gap-2">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
            config.bgColor,
            "ring-1 ring-border"
          )}
        >
          <Icon className={cn("h-2.5 w-2.5", config.color)} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border min-h-[12px]" />}
      </div>

      {/* Content */}
      <div className="flex-1 pb-2 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn("text-[11px] font-mono font-medium", config.color)}>
            {config.label}
          </span>
          <span className="text-[9px] text-muted-foreground">
            {new Date(event.timestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className="mt-0.5 space-y-0.5">
          {/* Vector Search Results */}
          {event.type === "rag_vector_search" && (
            <>
              {/* 显示 Collection ID */}
              {data.ragCollectionId && (
                <p className="text-[10px] text-muted-foreground font-mono">
                  Collection: <span className="text-primary">{data.ragCollectionId.slice(0, 8)}...</span>
                </p>
              )}
              {data.ragKnowledgeBaseName && (
                <p className="text-[10px] text-muted-foreground">
                  Searching <span className="text-foreground font-medium">"{data.ragKnowledgeBaseName}"</span>...
                </p>
              )}
              {/* 显示查询预览 */}
              {data.ragQueryPreview && (
                <p className="text-[10px] text-muted-foreground truncate">
                  Query: "{data.ragQueryPreview}"
                </p>
              )}
              {/* 显示匹配结果 */}
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {data.ragActualMatches !== undefined && (
                  <Badge 
                    variant={data.ragActualMatches > 0 ? "secondary" : "destructive"}
                    className="text-[9px] h-4 px-1.5"
                  >
                    {data.ragActualMatches} matches
                  </Badge>
                )}
                {data.ragChunksCount !== undefined && data.ragActualMatches === undefined && (
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                    Found {data.ragChunksCount} chunks
                  </Badge>
                )}
                {data.ragSearchDuration !== undefined && (
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5">
                    {data.ragSearchDuration}ms
                  </Badge>
                )}
              </div>
              {/* 空结果警告 */}
              {data.ragActualMatches === 0 && data.ragWarning && (
                <p className="text-[9px] text-amber-500 mt-1">
                  ⚠️ {data.ragWarning}
                </p>
              )}
            </>
          )}

          {/* Entity Match */}
          {event.type === "rag_entity_match" && data.ragNodeName && (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Matched entity</span>
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-green-500/30 text-green-500">
                {data.ragNodeName}
              </Badge>
              {data.ragNodeType && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  {data.ragNodeType}
                </Badge>
              )}
            </div>
          )}

          {/* Graph Traversal */}
          {event.type === "rag_graph_traverse" && data.ragRelationPath && (
            <div className="mt-1 p-2 rounded bg-purple-500/5 border border-purple-500/20">
              <code className="text-[10px] text-purple-400 font-mono">
                {data.ragRelationPath}
              </code>
              {data.ragTraversalDepth !== undefined && (
                <span className="ml-2 text-[9px] text-muted-foreground">
                  (depth: {data.ragTraversalDepth})
                </span>
              )}
            </div>
          )}

          {/* Context Injection */}
          {event.type === "rag_context_inject" && (
            <div className="flex flex-wrap gap-1.5">
              {data.ragNodesCount !== undefined && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  {data.ragNodesCount} nodes
                </Badge>
              )}
              {data.ragChunksCount !== undefined && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  {data.ragChunksCount} chunks
                </Badge>
              )}
            </div>
          )}

          {/* Source Found */}
          {event.type === "rag_source_found" && (
            <div className="flex items-center gap-1.5">
              {data.ragSourceDocumentName && (
                <span className="text-[10px] text-muted-foreground truncate">
                  📄 {data.ragSourceDocumentName}
                </span>
              )}
              {data.ragSimilarity !== undefined && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "text-[9px] h-4 px-1.5",
                    data.ragSimilarity >= 0.9 && "bg-status-executing/20 text-status-executing",
                    data.ragSimilarity >= 0.7 && data.ragSimilarity < 0.9 && "bg-primary/20 text-primary"
                  )}
                >
                  {(data.ragSimilarity * 100).toFixed(1)}%
                </Badge>
              )}
            </div>
          )}

          {/* Generic message */}
          {data.message && (
            <p className="text-[10px] text-muted-foreground truncate">{data.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Check if an event is a RAG event
export function isRAGEvent(type: TraceEventType): boolean {
  return type.startsWith("rag_");
}
