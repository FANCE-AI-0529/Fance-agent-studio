import { FileText, Trash2, RefreshCw, Eye, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useKnowledgeDocuments,
  useDeleteDocument,
  useIngestDocument,
} from "@/hooks/useKnowledgeDocuments";
import { useKnowledgeStore } from "@/stores/knowledgeStore";
import { cn } from "@/lib/utils";
import { DocumentProcessingProgress } from "./DocumentProcessingProgress";

interface DocumentListProps {
  knowledgeBaseId: string;
}

export function DocumentList({ knowledgeBaseId }: DocumentListProps) {
  const { data: documents = [], isLoading } = useKnowledgeDocuments(knowledgeBaseId);
  const deleteDocument = useDeleteDocument();
  const ingestDocument = useIngestDocument();
  const { selectedDocumentId, setSelectedDocument, indexingDocumentIds } = useKnowledgeStore();

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "indexed":
        return <Badge variant="outline" className="text-xs bg-status-executing/10 text-status-executing border-status-executing/30">已索引</Badge>;
      case "processing":
        return <Badge variant="outline" className="text-xs bg-status-thinking/10 text-status-thinking border-status-thinking/30"><Loader2 className="h-3 w-3 animate-spin mr-1" />处理中</Badge>;
      case "failed":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  失败
                </Badge>
              </TooltipTrigger>
              <TooltipContent>点击重新索引</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      default:
        return <Badge variant="outline" className="text-xs">待处理</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 rounded-lg border border-border">
            <Skeleton className="h-4 w-48 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">暂无文档</p>
        <p className="text-xs text-muted-foreground mt-1">
          拖拽文件到上方区域开始上传
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pt-4">
      <div className="space-y-2 pr-4">
        {documents.map((doc) => {
          const isIndexing = indexingDocumentIds.has(doc.id) || doc.status === "processing";
          const isSelected = selectedDocumentId === doc.id;

          return (
            <div
              key={doc.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{doc.name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>{doc.chunks_count || 0} 切片</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusIcon(doc.status)}
                  
                  <div className="flex items-center gap-1">
                    {doc.status === "indexed" && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setSelectedDocument(doc.id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>查看切片</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {(doc.status === "failed" || doc.status === "pending") && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => ingestDocument.mutate(doc.id)}
                              disabled={ingestDocument.isPending}
                            >
                              <RefreshCw className={cn("h-3.5 w-3.5", ingestDocument.isPending && "animate-spin")} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>重新索引</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => deleteDocument.mutate({ id: doc.id, knowledgeBaseId })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>删除文档</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              </div>

              {isIndexing && (
                <div className="mt-3">
                  <DocumentProcessingProgress status={doc.status || "pending"} />
                </div>
              )}

              {doc.error_message && (
                <p className="mt-2 text-xs text-destructive">
                  错误: {doc.error_message}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
