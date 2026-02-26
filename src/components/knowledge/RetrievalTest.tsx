import { useState } from "react";
import { Search, Loader2, FileText, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { useRAGQuery, type RAGChunk } from "@/hooks/useRAGQuery";
import { cn } from "@/lib/utils";

interface RetrievalTestProps {
  knowledgeBaseId: string;
}

export function RetrievalTest({ knowledgeBaseId }: RetrievalTestProps) {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.7);
  const [results, setResults] = useState<RAGChunk[] | null>(null);

  const ragQuery = useRAGQuery();

  const handleSearch = async () => {
    if (!query.trim()) return;
    const result = await ragQuery.mutateAsync({
      query: query.trim(),
      knowledgeBaseId,
      topK,
      threshold,
    });
    setResults(result.chunks || []);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="h-full flex flex-col pt-4 px-4 pb-4">
      {/* Search Input */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <Input
            placeholder="输入测试问题，检验检索效果..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1"
          />
          <Button
            onClick={handleSearch}
            disabled={ragQuery.isPending || !query.trim()}
            size="sm"
          >
            {ragQuery.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Parameters */}
        <div className="flex gap-6 items-center">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">TopK</Label>
            <Slider
              value={[topK]}
              onValueChange={(v) => setTopK(v[0])}
              min={1}
              max={20}
              step={1}
              className="w-20"
            />
            <span className="text-xs font-medium w-6">{topK}</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">阈值</Label>
            <Slider
              value={[threshold * 100]}
              onValueChange={(v) => setThreshold(v[0] / 100)}
              min={0}
              max={100}
              step={5}
              className="w-20"
            />
            <span className="text-xs font-medium w-8">{(threshold * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1">
        {results === null ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Search className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">输入问题并搜索，查看检索到的切片</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">未找到匹配的切片</p>
            <p className="text-xs text-muted-foreground mt-1">尝试降低相似度阈值或修改查询</p>
          </div>
        ) : (
          <div className="space-y-3 pr-4">
            <p className="text-xs text-muted-foreground mb-2">
              找到 {results.length} 个匹配切片
            </p>
            {results.map((chunk, index) => (
              <div
                key={chunk.id}
                className="p-4 rounded-xl border border-border bg-card hover:border-muted-foreground/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      <Hash className="h-3 w-3 mr-1" />
                      #{index + 1}
                    </Badge>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      chunk.similarity >= 0.9 && "bg-status-executing/10 text-status-executing border-status-executing/30",
                      chunk.similarity >= 0.8 && chunk.similarity < 0.9 && "bg-primary/10 text-primary border-primary/30",
                      chunk.similarity < 0.8 && "bg-muted"
                    )}
                  >
                    {(chunk.similarity * 100).toFixed(1)}% 相似
                  </Badge>
                </div>
                <Progress
                  value={chunk.similarity * 100}
                  className={cn(
                    "h-1 mb-3",
                    chunk.similarity >= 0.9 && "[&>div]:bg-status-executing",
                    chunk.similarity >= 0.8 && chunk.similarity < 0.9 && "[&>div]:bg-primary",
                    chunk.similarity < 0.8 && "[&>div]:bg-muted-foreground"
                  )}
                />
                <p className="text-sm text-foreground/90 leading-relaxed line-clamp-4">
                  {chunk.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
