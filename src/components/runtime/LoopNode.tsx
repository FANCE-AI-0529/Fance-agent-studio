import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import {
  Repeat,
  Trash2,
  Settings,
  CheckCircle,
  Loader2,
  AlertCircle,
  Clock,
  List,
  Layers,
} from "lucide-react";
import { cn } from "../../lib/utils.ts";

export interface LoopNodeData {
  id?: string;
  name: string;
  description?: string;
  sourceKey: string; // 列表数据来源键名
  itemKey: string; // 当前迭代项的键名
  indexKey: string; // 当前索引的键名
  maxIterations: number; // 最大迭代次数限制
  variablePrefix: string; // 变量命名空间前缀，用于嵌套循环
  nestingLevel: number; // 嵌套层级
  parentLoopId?: string; // 父循环节点ID
  collectResults: boolean; // 是否收集每次迭代结果
  resultsKey: string; // 收集结果的键名
  status: "pending" | "in_progress" | "completed" | "failed";
  currentIteration?: number;
  totalIterations?: number;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "待执行" },
  in_progress: { icon: Loader2, color: "text-purple-500", label: "迭代中" },
  completed: { icon: CheckCircle, color: "text-green-500", label: "已完成" },
  failed: { icon: AlertCircle, color: "text-destructive", label: "已失败" },
};

function LoopNode({ data, id, selected }: NodeProps) {
  const nodeData = data as unknown as LoopNodeData;
  const { icon: StatusIcon, color, label } = statusConfig[nodeData.status] || statusConfig.pending;

  const isExecuting = nodeData.status === "in_progress";
  const isCompleted = nodeData.status === "completed";
  const isFailed = nodeData.status === "failed";

  const progress = nodeData.totalIterations 
    ? Math.round((nodeData.currentIteration || 0) / nodeData.totalIterations * 100)
    : 0;

  const prefix = nodeData.variablePrefix || "";
  const fullItemKey = prefix ? `${prefix}.${nodeData.itemKey}` : nodeData.itemKey;
  const fullIndexKey = prefix ? `${prefix}.${nodeData.indexKey}` : nodeData.indexKey;

  return (
    <div
      className={cn(
        "bg-card border-2 rounded-lg shadow-lg min-w-[260px] max-w-[340px]",
        "transition-all duration-300",
        selected ? "border-primary ring-2 ring-primary/20" : "border-border",
        isExecuting && "border-purple-500 ring-4 ring-purple-500/30 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.5)]",
        isCompleted && "border-green-500 ring-2 ring-green-500/20",
        isFailed && "border-destructive ring-2 ring-destructive/20"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !border-2 !border-primary-foreground transition-all duration-300",
          isExecuting ? "!bg-purple-500 !w-4 !h-4" : "!bg-primary"
        )}
      />

      {/* Header */}
      <div className={cn(
        "px-3 py-2 border-b border-border rounded-t-lg transition-colors duration-300",
        isExecuting ? "bg-purple-500/10" : isCompleted ? "bg-green-500/10" : "bg-muted/50"
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "p-1.5 rounded-md transition-all duration-300",
              isExecuting && "bg-purple-500/20 animate-pulse",
              isCompleted && "bg-green-500/20",
              isFailed && "bg-destructive/20",
              !isExecuting && !isCompleted && !isFailed && "bg-purple-500/10"
            )}>
              <Repeat className={cn(
                "h-4 w-4 transition-all duration-300",
                isExecuting ? "text-purple-500 animate-spin" : isCompleted ? "text-green-500" : "text-purple-500"
              )} />
            </div>
            <span className={cn(
              "font-medium text-sm truncate transition-colors duration-300",
              isExecuting && "text-purple-500"
            )}>
              {nodeData.name || "循环节点"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {nodeData.nestingLevel > 0 && (
              <Badge variant="outline" className="text-[10px] shrink-0 border-blue-500/50 text-blue-500 gap-0.5">
                <Layers className="h-2.5 w-2.5" />
                L{nodeData.nestingLevel}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] shrink-0 border-purple-500/50 text-purple-500">
              循环
            </Badge>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {nodeData.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{nodeData.description}</p>
        )}

        {/* Source Data Info */}
        <div className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-muted/30 border border-border">
          <List className="h-3 w-3 text-purple-500 shrink-0" />
          <span className="font-mono truncate">
            来源: {nodeData.sourceKey || "(未设置)"}
          </span>
        </div>

        {/* Variable Prefix (if set) */}
        {prefix && (
          <div className="text-[10px] p-1.5 rounded bg-blue-500/10 border border-blue-500/30">
            <span className="text-blue-500">命名空间: </span>
            <span className="font-mono text-blue-400">{prefix}</span>
          </div>
        )}

        {/* Item & Index Keys with full path */}
        <div className="space-y-1">
          <div className="text-[10px] p-1.5 rounded bg-muted/30 border border-border flex items-center justify-between">
            <span className="text-muted-foreground">迭代项:</span>
            <span className="font-mono text-purple-500">{fullItemKey}</span>
          </div>
          <div className="text-[10px] p-1.5 rounded bg-muted/30 border border-border flex items-center justify-between">
            <span className="text-muted-foreground">索引:</span>
            <span className="font-mono text-purple-500">{fullIndexKey}</span>
          </div>
        </div>

        {/* Collect Results Info */}
        {nodeData.collectResults && nodeData.resultsKey && (
          <div className="text-[10px] p-1.5 rounded bg-green-500/10 border border-green-500/30">
            <span className="text-green-500">结果收集: </span>
            <span className="font-mono text-green-400">{nodeData.resultsKey}</span>
          </div>
        )}

        {/* Progress Bar (when executing) */}
        {isExecuting && nodeData.totalIterations && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-purple-500">
                迭代 {nodeData.currentIteration || 0} / {nodeData.totalIterations}
              </span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Max Iterations Limit */}
        <div className="text-[10px] text-muted-foreground">
          最大迭代: {nodeData.maxIterations || "无限制"}
        </div>
      </div>

      {/* Footer Actions */}
      <div className={cn(
        "px-3 py-2 border-t border-border flex items-center justify-between rounded-b-lg transition-colors duration-300",
        isExecuting ? "bg-purple-500/5" : "bg-muted/30"
      )}>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] transition-all duration-300",
            isCompleted && "border-green-500/50 text-green-500 bg-green-500/10",
            isFailed && "border-destructive/50 text-destructive bg-destructive/10",
            isExecuting && "border-purple-500/50 text-purple-500 bg-purple-500/10 animate-pulse"
          )}
        >
          {label}
        </Badge>
        <div className="flex gap-1">
          {nodeData.onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                nodeData.onEdit?.(id);
              }}
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}
          {nodeData.onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                nodeData.onDelete?.(id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Output Handle - for loop body */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="loop-body"
        className={cn(
          "!w-3 !h-3 !border-2 !border-primary-foreground transition-all duration-300",
          isExecuting ? "!bg-purple-500 !w-4 !h-4" : isCompleted ? "!bg-green-500" : "!bg-purple-500"
        )}
        style={{ left: "35%" }}
      />

      {/* Output Handle - for loop completion (next step after loop) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="loop-complete"
        className={cn(
          "!w-3 !h-3 !border-2 !border-primary-foreground transition-all duration-300",
          isCompleted ? "!bg-green-500" : "!bg-muted-foreground"
        )}
        style={{ left: "65%" }}
      />
    </div>
  );
}

export default memo(LoopNode);
