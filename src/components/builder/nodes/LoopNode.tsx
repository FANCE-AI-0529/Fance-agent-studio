import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { RefreshCcw, Settings2, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { cn } from "../../../lib/utils.ts";
import { Badge } from "../../ui/badge.tsx";
import { Button } from "../../ui/button.tsx";
import { Input } from "../../ui/input.tsx";
import { Textarea } from "../../ui/textarea.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible.tsx";

export interface LoopNodeData {
  label?: string;
  conditionExpression?: string;
  maxIterations?: number;
  stateVariables?: Array<{ name: string; initialValue: string }>;
  breakOnCondition?: boolean;
  [key: string]: unknown;
}

const defaultCondition = "{{iteration_count}} < 10 && !{{result.completed}}";

const LoopNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as LoopNodeData;
  const [isExpanded, setIsExpanded] = useState(false);
  const [condition, setCondition] = useState(nodeData.conditionExpression || defaultCondition);
  const [maxIterations, setMaxIterations] = useState(nodeData.maxIterations || 100);
  const [breakOnCondition, setBreakOnCondition] = useState(nodeData.breakOnCondition ?? true);

  // Validate condition expression (basic check)
  const isValidCondition = condition.includes("{{") && condition.includes("}}");

  return (
    <div
      className={cn(
        "bg-card rounded-xl border-2 shadow-lg min-w-[280px] max-w-[320px] transition-all duration-200",
        selected ? "border-rose-500 ring-2 ring-rose-500/20" : "border-border/50 hover:border-rose-400/50"
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
        id="initial-state"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
        style={{ top: 48 }}
      />
      {/* Loop back input */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="loop-back"
        className="!w-3 !h-3 !bg-rose-500 !border-2 !border-background"
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
          <RefreshCcw className="w-5 h-5 text-rose-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {nodeData.label || "循环执行"}
          </h3>
          <p className="text-xs text-muted-foreground">条件循环</p>
        </div>
        <Badge variant="outline" className="text-rose-500 border-rose-500/30 text-[10px]">
          LOOP
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Loop Condition */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            循环条件
            {!isValidCondition && (
              <AlertTriangle className="w-3 h-3 text-yellow-500" />
            )}
          </label>
          <Textarea
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="输入循环条件表达式..."
            className={cn(
              "min-h-[60px] font-mono text-xs resize-none",
              !isValidCondition && "border-yellow-500/50"
            )}
          />
          <p className="text-[10px] text-muted-foreground">
            当条件为 true 时继续循环
          </p>
        </div>

        {/* Max Iterations Warning */}
        <div className="flex items-center justify-between p-2 bg-rose-500/5 rounded-lg border border-rose-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span className="text-xs">最大迭代次数</span>
          </div>
          <Input
            type="number"
            value={maxIterations}
            onChange={(e) => setMaxIterations(parseInt(e.target.value) || 100)}
            className="h-6 w-16 text-xs text-right"
            min={1}
            max={1000}
          />
        </div>

        {/* Built-in Variables */}
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground">内置变量：</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px] font-mono">
              iteration_count
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-mono">
              loop_state
            </Badge>
            <Badge variant="secondary" className="text-[10px] font-mono">
              last_result
            </Badge>
          </div>
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
            {/* State Variables */}
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">状态变量</label>
              <div className="p-2 bg-muted/30 rounded text-[10px] font-mono">
                <div className="flex justify-between">
                  <span>counter</span>
                  <span className="text-muted-foreground">0</span>
                </div>
                <div className="flex justify-between">
                  <span>accumulator</span>
                  <span className="text-muted-foreground">[]</span>
                </div>
              </div>
            </div>

            {/* Break Condition Mode */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">条件为 false 时退出</span>
              <Badge variant={breakOnCondition ? "default" : "outline"} className="text-[10px]">
                {breakOnCondition ? "是" : "否"}
              </Badge>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="loop-body"
        className="!w-3 !h-3 !bg-rose-500 !border-2 !border-background"
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
        id="final-state"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
        style={{ top: 80 }}
      />

      {/* Handle Labels */}
      <div className="absolute right-[-4px] top-[26px] text-[8px] text-rose-400 bg-card px-1">
        body
      </div>
      <div className="absolute right-[-4px] top-[50px] text-[8px] text-purple-400 bg-card px-1">
        done
      </div>
      <div className="absolute right-[-4px] top-[74px] text-[8px] text-blue-400 bg-card px-1">
        state
      </div>
    </div>
  );
});

LoopNode.displayName = "LoopNode";
export default LoopNode;
