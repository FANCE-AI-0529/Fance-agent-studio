import { FileText, MapPin, Target, Network, X, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import type { Citation } from "./CitationCard";

interface CitationDetailDialogProps {
  citation: Citation | null;
  onClose: () => void;
}

export function CitationDetailDialog({ citation, onClose }: CitationDetailDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!citation) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(citation.content);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <Dialog open={!!citation} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            文档切片详情
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">来源:</span>
              <span className="font-medium truncate">{citation.documentName}</span>
            </div>
            {citation.pageNumber && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">位置:</span>
                <span className="font-medium">第 {citation.pageNumber} 页</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">相似度:</span>
              <Badge 
                variant="secondary"
                className={cn(
                  "h-5",
                  citation.similarity >= 0.9 && "bg-status-executing/20 text-status-executing",
                  citation.similarity >= 0.7 && citation.similarity < 0.9 && "bg-primary/20 text-primary",
                  citation.similarity < 0.7 && "bg-muted text-muted-foreground"
                )}
              >
                {(citation.similarity * 100).toFixed(1)}%
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">知识库:</span>
              <Badge variant="outline" className="h-5">
                {citation.knowledgeBaseName}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">原文内容</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5"
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-status-executing" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    复制
                  </>
                )}
              </Button>
            </div>
            <ScrollArea className="h-48 rounded-lg border bg-muted/30 p-3">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {citation.content}
              </p>
            </ScrollArea>
          </div>

          {/* Related Nodes */}
          {citation.relatedNodes && citation.relatedNodes.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-cognitive" />
                  <span className="text-sm font-medium">关联实体</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {citation.relatedNodes.map((node) => (
                    <div
                      key={node.id}
                      className="flex items-center gap-2 rounded-lg border border-cognitive/20 bg-cognitive/5 px-3 py-1.5"
                    >
                      <span className="text-sm font-medium">{node.name}</span>
                      <Badge variant="outline" className="h-4 text-[10px]">
                        {node.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
