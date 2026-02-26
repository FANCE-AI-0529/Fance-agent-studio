import React, { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { BookOpen, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface Props {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  nodes: Node[];
}

export default function KnowledgeConfigPanel({ node, onUpdate }: Props) {
  const data = node.data as any;
  const [retrievalMode, setRetrievalMode] = useState(data?.retrieval_mode || "hybrid");
  const [topK, setTopK] = useState(data?.top_k ?? 5);
  const [similarityThreshold, setSimilarityThreshold] = useState(data?.similarity_threshold ?? 0.7);
  const [graphDepth, setGraphDepth] = useState(data?.graph_depth ?? 2);
  const [enableRerank, setEnableRerank] = useState(data?.enable_rerank ?? false);

  useEffect(() => {
    onUpdate({ retrieval_mode: retrievalMode, top_k: topK, similarity_threshold: similarityThreshold, graph_depth: graphDepth, enable_rerank: enableRerank });
  }, [retrievalMode, topK, similarityThreshold, graphDepth, enableRerank]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium"><Search className="h-3.5 w-3.5" /> 检索模式</Label>
        <Select value={retrievalMode} onValueChange={setRetrievalMode}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="vector">向量检索</SelectItem>
            <SelectItem value="graph">图谱检索</SelectItem>
            <SelectItem value="hybrid">混合检索</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Top K</Label>
          <span className="text-xs text-muted-foreground">{topK}</span>
        </div>
        <Slider value={[topK]} onValueChange={([v]) => setTopK(v)} min={1} max={20} step={1} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">相似度阈值</Label>
          <span className="text-xs text-muted-foreground">{similarityThreshold}</span>
        </div>
        <Slider value={[similarityThreshold]} onValueChange={([v]) => setSimilarityThreshold(v)} min={0} max={1} step={0.05} />
      </div>

      {(retrievalMode === "graph" || retrievalMode === "hybrid") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">图谱深度</Label>
            <span className="text-xs text-muted-foreground">{graphDepth}</span>
          </div>
          <Slider value={[graphDepth]} onValueChange={([v]) => setGraphDepth(v)} min={1} max={5} step={1} />
        </div>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <Label className="text-xs">启用重排序</Label>
        <Switch checked={enableRerank} onCheckedChange={setEnableRerank} />
      </div>
    </div>
  );
}
