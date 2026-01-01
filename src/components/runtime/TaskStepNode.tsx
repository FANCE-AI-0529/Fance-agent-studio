import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  Clock,
  Trash2,
  Settings,
  Bot,
  ArrowRight,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TaskStepNodeData {
  id?: string;
  name: string;
  description?: string;
  taskType: string;
  targetAgentId?: string;
  targetAgentName?: string;
  inputMapping: Record<string, string>;
  outputKey?: string;
  parallelGroup: number;
  stepOrder: number;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "待执行" },
  in_progress: { icon: Loader2, color: "text-blue-500", label: "执行中" },
  completed: { icon: CheckCircle, color: "text-green-500", label: "已完成" },
  failed: { icon: AlertCircle, color: "text-destructive", label: "已失败" },
  skipped: { icon: ArrowRight, color: "text-yellow-500", label: "已跳过" },
};

const taskTypeLabels: Record<string, string> = {
  general: "通用任务",
  analysis: "数据分析",
  generation: "内容生成",
  extraction: "信息提取",
  validation: "数据验证",
  transformation: "数据转换",
  aggregation: "结果汇总",
};

function TaskStepNode({ data, id, selected }: NodeProps) {
  const nodeData = data as unknown as TaskStepNodeData;
  const { icon: StatusIcon, color, label } = statusConfig[nodeData.status] || statusConfig.pending;

  const isExecuting = nodeData.status === "in_progress";
  const isCompleted = nodeData.status === "completed";
  const isFailed = nodeData.status === "failed";

  return (
    <div
      className={cn(
        "bg-card border-2 rounded-lg shadow-lg min-w-[200px] max-w-[280px]",
        "transition-all duration-300",
        selected ? "border-primary ring-2 ring-primary/20" : "border-border",
        // Execution animation styles
        isExecuting && "border-blue-500 ring-4 ring-blue-500/30 animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.5)]",
        isCompleted && "border-green-500 ring-2 ring-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.3)]",
        isFailed && "border-destructive ring-2 ring-destructive/20 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
      )}
    >
      {/* Input Handle with animation */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !border-2 !border-primary-foreground transition-all duration-300",
          isExecuting ? "!bg-blue-500 !w-4 !h-4" : "!bg-primary"
        )}
      />

      {/* Header */}
      <div className={cn(
        "px-3 py-2 border-b border-border rounded-t-lg transition-colors duration-300",
        isExecuting ? "bg-blue-500/10" : isCompleted ? "bg-green-500/10" : "bg-muted/50"
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "p-1.5 rounded-md transition-all duration-300",
              isExecuting && "bg-blue-500/20 animate-pulse",
              isCompleted && "bg-green-500/20",
              isFailed && "bg-destructive/20",
              !isExecuting && !isCompleted && !isFailed && "bg-muted"
            )}>
              <StatusIcon className={cn(
                "h-4 w-4 transition-all duration-300",
                color,
                isExecuting && "animate-spin"
              )} />
            </div>
            <span className={cn(
              "font-medium text-sm truncate transition-colors duration-300",
              isExecuting && "text-blue-500"
            )}>
              {nodeData.name || "未命名步骤"}
            </span>
          </div>
          <Badge variant="secondary" className={cn(
            "text-[10px] shrink-0 transition-colors duration-300",
            isExecuting && "bg-blue-500/20 text-blue-500"
          )}>
            #{nodeData.stepOrder + 1}
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {nodeData.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{nodeData.description}</p>
        )}

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px]">
            {taskTypeLabels[nodeData.taskType] || nodeData.taskType}
          </Badge>
          {nodeData.parallelGroup !== undefined && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Layers className="h-2.5 w-2.5" />
              组 {nodeData.parallelGroup}
            </Badge>
          )}
        </div>

        {nodeData.targetAgentName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Bot className="h-3 w-3" />
            <span className="truncate">{nodeData.targetAgentName}</span>
          </div>
        )}

        {nodeData.outputKey && (
          <div className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded">
            输出: {nodeData.outputKey}
          </div>
        )}

        {Object.keys(nodeData.inputMapping || {}).length > 0 && (
          <div className="text-[10px] text-muted-foreground">
            输入映射: {Object.keys(nodeData.inputMapping).length} 项
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className={cn(
        "px-3 py-2 border-t border-border flex items-center justify-between rounded-b-lg transition-colors duration-300",
        isExecuting ? "bg-blue-500/5" : "bg-muted/30"
      )}>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] transition-all duration-300",
            isCompleted && "border-green-500/50 text-green-500 bg-green-500/10",
            isFailed && "border-destructive/50 text-destructive bg-destructive/10",
            isExecuting && "border-blue-500/50 text-blue-500 bg-blue-500/10 animate-pulse"
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

      {/* Output Handle with animation */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!w-3 !h-3 !border-2 !border-primary-foreground transition-all duration-300",
          isExecuting ? "!bg-blue-500 !w-4 !h-4" : isCompleted ? "!bg-green-500" : "!bg-primary"
        )}
      />
    </div>
  );
}

export default memo(TaskStepNode);
