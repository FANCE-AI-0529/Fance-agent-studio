import React, { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { Layers } from "lucide-react";
import { Label } from "../../ui/label.tsx";
import { Input } from "../../ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select.tsx";
import { Separator } from "../../ui/separator.tsx";

interface Props {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  nodes: Node[];
}

export default function AggregatorConfigPanel({ node, onUpdate }: Props) {
  const data = node.data as any;
  const [mode, setMode] = useState(data?.aggregationMode || "merge");
  const [inputCount, setInputCount] = useState(data?.inputCount ?? 2);

  useEffect(() => {
    onUpdate({ aggregationMode: mode, inputCount });
  }, [mode, inputCount]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium"><Layers className="h-3.5 w-3.5" /> 聚合模式</Label>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="merge">合并对象</SelectItem>
            <SelectItem value="concat">连接数组</SelectItem>
            <SelectItem value="pick_first">取第一个</SelectItem>
            <SelectItem value="pick_last">取最后一个</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-medium">输入数量</Label>
        <Input type="number" value={inputCount} onChange={(e) => setInputCount(Math.max(2, Math.min(8, parseInt(e.target.value) || 2)))} min={2} max={8} />
        <p className="text-[10px] text-muted-foreground">支持 2-8 个输入源</p>
      </div>
    </div>
  );
}
