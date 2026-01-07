import { useState, useEffect } from "react";
import { FileText, Hash, Tag, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useKnowledgeDocument } from "@/hooks/useKnowledgeDocuments";
import { cn } from "@/lib/utils";

interface ChunkPreviewProps {
  documentId: string;
}

interface DocumentChunk {
  id: string;
  content: string;
  chunk_index: number;
  token_count: number | null;
  metadata: Record<string, unknown> | null;
}

export function ChunkPreview({ documentId }: ChunkPreviewProps) {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set());
  
  const { data: document } = useKnowledgeDocument(documentId);

  useEffect(() => {
    const fetchChunks = async () => {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from("document_chunks")
        .select("id, content, chunk_index, token_count, metadata")
        .eq("document_id", documentId)
        .order("chunk_index", { ascending: true });

      if (!error && data) {
        // Add mock semantic weight to metadata
        const chunksWithWeight = data.map((chunk) => ({
          ...chunk,
          metadata: {
            ...(typeof chunk.metadata === 'object' && chunk.metadata !== null ? chunk.metadata : {}),
            semanticWeight: Math.random() * 0.4 + 0.6, // 0.6-1.0
            tags: generateMockTags(chunk.content),
          },
        }));
        setChunks(chunksWithWeight);
      }
      
      setIsLoading(false);
    };

    if (documentId) {
      fetchChunks();
    }
  }, [documentId]);

  const toggleExpand = (chunkId: string) => {
    setExpandedChunks((prev) => {
      const next = new Set(prev);
      if (next.has(chunkId)) {
        next.delete(chunkId);
      } else {
        next.add(chunkId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-border">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-20 w-full mb-3" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">暂无切片数据</p>
        <p className="text-xs text-muted-foreground mt-1">
          文档可能正在处理中
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col pt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{document?.name}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {chunks.length} 个切片
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 pr-4 pb-4">
          {chunks.map((chunk) => {
            const isExpanded = expandedChunks.has(chunk.id);
            const semanticWeight = (chunk.metadata?.semanticWeight as number) || 0.7;
            const tags = (chunk.metadata?.tags as string[]) || [];

            return (
              <ChunkCard
                key={chunk.id}
                chunk={chunk}
                isExpanded={isExpanded}
                semanticWeight={semanticWeight}
                tags={tags}
                onToggleExpand={() => toggleExpand(chunk.id)}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

interface ChunkCardProps {
  chunk: DocumentChunk;
  isExpanded: boolean;
  semanticWeight: number;
  tags: string[];
  onToggleExpand: () => void;
}

function ChunkCard({
  chunk,
  isExpanded,
  semanticWeight,
  tags,
  onToggleExpand,
}: ChunkCardProps) {
  const displayContent = isExpanded
    ? chunk.content
    : chunk.content.slice(0, 200);
  const hasMore = chunk.content.length > 200;

  return (
    <div className="p-4 rounded-xl border border-border bg-card hover:border-muted-foreground/30 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <Hash className="h-3 w-3 mr-1" />
            Chunk #{chunk.chunk_index + 1}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {chunk.token_count || estimateTokens(chunk.content)} tokens
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="mb-3">
        <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {displayContent}
          {!isExpanded && hasMore && "..."}
        </p>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 h-7 text-xs text-primary"
            onClick={onToggleExpand}
          >
            {isExpanded ? "收起" : "展开更多"}
          </Button>
        )}
      </div>

      {/* Semantic Weight */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            语义权重
          </span>
          <span className="text-xs font-medium">{(semanticWeight * 100).toFixed(0)}%</span>
        </div>
        <Progress
          value={semanticWeight * 100}
          className={cn(
            "h-1.5",
            semanticWeight > 0.8 && "[&>div]:bg-status-executing",
            semanticWeight > 0.6 && semanticWeight <= 0.8 && "[&>div]:bg-primary",
            semanticWeight <= 0.6 && "[&>div]:bg-muted-foreground"
          )}
        />
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Tag className="h-3 w-3 text-muted-foreground" />
          {tags.map((tag, index) => (
            <Badge
              key={index}
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5"
            >
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper functions
function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for mixed content
  return Math.ceil(text.length / 4);
}

function generateMockTags(content: string): string[] {
  const allTags = [
    "概念", "定义", "示例", "说明", "功能", "产品",
    "技术", "流程", "规则", "接口", "配置", "指南"
  ];
  
  // Select 2-4 random tags
  const count = Math.floor(Math.random() * 3) + 2;
  const shuffled = allTags.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
