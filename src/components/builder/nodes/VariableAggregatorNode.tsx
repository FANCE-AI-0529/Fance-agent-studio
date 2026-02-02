import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Layers, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface VariableAggregatorNodeData {
  label?: string;
  aggregationMode?: "merge" | "concat" | "pick_first" | "pick_last";
  inputCount?: number;
  fieldMappings?: Array<{ sourceField: string; targetField: string }>;
  [key: string]: unknown;
}

const aggregationModes = [
  { value: "merge", label: "合并对象", description: "深度合并所有输入对象" },
  { value: "concat", label: "连接数组", description: "将数组类型输入连接为一个数组" },
  { value: "pick_first", label: "取第一个", description: "返回第一个非空输入" },
  { value: "pick_last", label: "取最后一个", description: "返回最后一个非空输入" },
];

const VariableAggregatorNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as VariableAggregatorNodeData;
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState(nodeData.aggregationMode || "merge");
  const [inputCount, setInputCount] = useState(nodeData.inputCount || 2);

  const addInput = () => {
    if (inputCount < 8) {
      setInputCount(prev => prev + 1);
    }
  };

  const removeInput = () => {
    if (inputCount > 2) {
      setInputCount(prev => prev - 1);
    }
  };

  return (
    <div
      className={cn(
        "bg-card rounded-xl border-2 shadow-lg min-w-[260px] max-w-[300px] transition-all duration-200",
        selected ? "border-cyan-500 ring-2 ring-cyan-500/20" : "border-border/50 hover:border-cyan-400/50"
      )}
    >
      {/* Multiple Input Handles */}
      {Array.from({ length: inputCount }).map((_, i) => (
        <Handle
          key={`data-in-${i}`}
          type="target"
          position={Position.Left}
          id={`data-in-${i}`}
          className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
          style={{ top: 24 + i * 20 }}
        />
      ))}

      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
          <Layers className="w-5 h-5 text-cyan-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {nodeData.label || "变量聚合器"}
          </h3>
          <p className="text-xs text-muted-foreground">合并多源数据</p>
        </div>
        <Badge variant="outline" className="text-cyan-500 border-cyan-500/30 text-[10px]">
          AGG
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Input Count Control */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">输入数量</span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={removeInput}
              disabled={inputCount <= 2}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
            <span className="w-6 text-center text-sm font-medium">{inputCount}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-6 w-6"
              onClick={addInput}
              disabled={inputCount >= 8}
            >
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Aggregation Mode */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">聚合模式</label>
          <Select value={mode} onValueChange={(v: typeof mode) => setMode(v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aggregationModes.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-xs">
                  <div className="flex flex-col">
                    <span>{m.label}</span>
                    <span className="text-[10px] text-muted-foreground">{m.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Field Mappings */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs h-7 px-2"
            >
              <span>字段映射</span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            <div className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded">
              配置输入字段到输出字段的映射关系
            </div>
            {/* Placeholder for field mapping UI */}
            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="text-[10px]">input_0 → result</Badge>
              <Badge variant="secondary" className="text-[10px]">input_1 → result</Badge>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Mode Description */}
        <div className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded">
          {aggregationModes.find(m => m.value === mode)?.description}
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="aggregated-out"
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-background"
        style={{ top: "50%" }}
      />
    </div>
  );
});

VariableAggregatorNode.displayName = "VariableAggregatorNode";
export default VariableAggregatorNode;
