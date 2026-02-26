import { useState, useEffect } from "react";
import { FileText, Hash } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useKnowledgeDocument } from "@/hooks/useKnowledgeDocuments";

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
        setChunks(data as DocumentChunk[]);
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
            return (
              <ChunkCard
                key={chunk.id}
                chunk={chunk}
                isExpanded={isExpanded}
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
  onToggleExpand: () => void;
}

function ChunkCard({ chunk, isExpanded, onToggleExpand }: ChunkCardProps) {
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
      <div>
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
    </div>
  );
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
