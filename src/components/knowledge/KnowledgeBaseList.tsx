import { Database, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { KnowledgeBase } from "@/hooks/useKnowledgeBases";

interface KnowledgeBaseListProps {
  knowledgeBases: KnowledgeBase[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function KnowledgeBaseList({
  knowledgeBases,
  isLoading,
  selectedId,
  onSelect,
}: KnowledgeBaseListProps) {
  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 rounded-lg border border-border">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (knowledgeBases.length === 0) {
    return (
      <div className="p-6 text-center">
        <Database className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          暂无知识库
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          点击上方"新建"按钮创建
        </p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      {knowledgeBases.map((kb) => (
        <button
          key={kb.id}
          onClick={() => onSelect(kb.id)}
          className={cn(
            "w-full p-3 rounded-lg text-left transition-all",
            "hover:bg-accent/50",
            selectedId === kb.id
              ? "bg-primary/10 border border-primary/30"
              : "border border-transparent"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-sm truncate">{kb.name}</h3>
              {kb.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {kb.description}
                </p>
              )}
            </div>
            <IndexStatusBadge status={kb.index_status} />
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {kb.documents_count || 0} 文档
            </span>
            <span>{kb.chunks_count || 0} 切片</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function IndexStatusBadge({ status }: { status: string | null }) {
  switch (status) {
    case "ready":
      return (
        <Badge variant="outline" className="text-xs bg-status-executing/10 text-status-executing border-status-executing/30">
          已索引
        </Badge>
      );
    case "indexing":
      return (
        <Badge variant="outline" className="text-xs bg-status-thinking/10 text-status-thinking border-status-thinking/30">
          <Loader2 className="h-3 w-3 animate-spin mr-1" />
          索引中
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
          失败
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          待处理
        </Badge>
      );
  }
}
