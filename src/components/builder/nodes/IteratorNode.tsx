import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Repeat, Settings2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { cn } from "../../../lib/utils.ts";
import { Badge } from "../../ui/badge.tsx";
import { Button } from "../../ui/button.tsx";
import { Input } from "../../ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select.tsx";
import { Slider } from "../../ui/slider.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible.tsx";

export interface IteratorNodeData {
  label?: string;
  parallelism?: number;
  maxIterations?: number;
  errorStrategy?: "stop" | "skip" | "collect";
  itemVariable?: string;
  indexVariable?: string;
  [key: string]: unknown;
}

const errorStrategies = [
  { value: "stop", label: "停止执行", description: "遇到错误立即停止" },
  { value: "skip", label: "跳过错误", description: "跳过失败项继续执行" },
  { value: "collect", label: "收集错误", description: "记录错误但继续执行" },
];

const IteratorNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as IteratorNodeData;
  const [isExpanded, setIsExpanded] = useState(false);
  const [parallelism, setParallelism] = useState(nodeData.parallelism || 1);
  const [maxIterations, setMaxIterations] = useState(nodeData.maxIterations || 100);
  const [errorStrategy, setErrorStrategy] = useState(nodeData.errorStrategy || "stop");
  const [itemVar, setItemVar] = useState(nodeData.itemVariable || "item");
  const [indexVar, setIndexVar] = useState(nodeData.indexVariable || "index");

  return (
    <div
      className={cn(
        "bg-card rounded-xl border-2 shadow-lg min-w-[280px] max-w-[320px] transition-all duration-200",
        selected ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-border/50 hover:border-indigo-400/50"
      )}
    >
      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="control-in"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
        style={{ top: 24 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="array-in"
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-background"
        style={{ top: 48 }}
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
          <Repeat className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {nodeData.label || "迭代器"}
          </h3>
          <p className="text-xs text-muted-foreground">遍历数组执行</p>
        </div>
        <Badge variant="outline" className="text-indigo-500 border-indigo-500/30 text-[10px]">
          ITER
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Iteration Info */}
        <div className="flex items-center justify-between p-2 bg-indigo-500/5 rounded-lg border border-indigo-500/20">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-mono">
              {itemVar}
            </Badge>
            <span className="text-[10px] text-muted-foreground">当前元素</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] font-mono">
              {indexVar}
            </Badge>
            <span className="text-[10px] text-muted-foreground">索引</span>
          </div>
        </div>

        {/* Parallelism Control */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">并行度</label>
            <span className="text-xs font-medium">{parallelism}</span>
          </div>
          <Slider
            value={[parallelism]}
            onValueChange={([v]) => setParallelism(v)}
            min={1}
            max={10}
            step={1}
            className="w-full"
          />
          <p className="text-[10px] text-muted-foreground">
            {parallelism === 1 ? "顺序执行" : `最多 ${parallelism} 个并行任务`}
          </p>
        </div>

        {/* Error Strategy */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">错误处理</label>
          <Select value={errorStrategy} onValueChange={(v: typeof errorStrategy) => setErrorStrategy(v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {errorStrategies.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  <div className="flex items-center gap-2">
                    {s.value === "stop" && <AlertCircle className="w-3 h-3 text-destructive" />}
                    {s.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Settings */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs h-7 px-2"
            >
              <span className="flex items-center gap-1">
                <Settings2 className="w-3 h-3" />
                高级设置
              </span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {/* Variable Names */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">元素变量名</label>
                <Input
                  value={itemVar}
                  onChange={(e) => setItemVar(e.target.value)}
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">索引变量名</label>
                <Input
                  value={indexVar}
                  onChange={(e) => setIndexVar(e.target.value)}
                  className="h-7 text-xs font-mono"
                />
              </div>
            </div>

            {/* Max Iterations */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">最大迭代次数</span>
              <Input
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(parseInt(e.target.value) || 100)}
                className="h-6 w-20 text-xs text-right"
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="loop-body"
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-background"
        style={{ top: 32 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="control-out"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
        style={{ top: 56 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="results-out"
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-background"
        style={{ top: 80 }}
      />

      {/* Handle Labels */}
      <div className="absolute right-[-4px] top-[26px] text-[8px] text-indigo-400 bg-card px-1">
        body
      </div>
      <div className="absolute right-[-4px] top-[50px] text-[8px] text-purple-400 bg-card px-1">
        done
      </div>
      <div className="absolute right-[-4px] top-[74px] text-[8px] text-cyan-400 bg-card px-1">
        results
      </div>
    </div>
  );
});

IteratorNode.displayName = "IteratorNode";
export default IteratorNode;
