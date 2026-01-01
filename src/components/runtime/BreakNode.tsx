import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  XCircle,
  Trash2,
  Settings,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreakNodeData {
  id?: string;
  name: string;
  description?: string;
  condition?: string; // 可选的中断条件
  targetLoopId?: string; // 要中断的目标循环ID（用于嵌套循环）
  breakType: "current" | "all"; // 中断当前循环还是所有循环
  status: "pending" | "triggered" | "skipped";
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  hasBreakpoint?: boolean;
  isDebugging?: boolean;
}

const statusConfig: Record<string, { color: string; label: string; bgColor: string }> = {
  pending: { color: "text-muted-foreground", label: "待触发", bgColor: "bg-muted/30" },
  triggered: { color: "text-red-500", label: "已中断", bgColor: "bg-red-500/10" },
  skipped: { color: "text-muted-foreground", label: "已跳过", bgColor: "bg-muted/20" },
};

function BreakNode({ data, id, selected }: NodeProps) {
  const nodeData = data as unknown as BreakNodeData;
  const { color, label, bgColor } = statusConfig[nodeData.status] || statusConfig.pending;

  const isTriggered = nodeData.status === "triggered";

  return (
    <div
      className={cn(
        "bg-card border-2 rounded-lg shadow-lg min-w-[200px] max-w-[280px]",
        "transition-all duration-300",
        selected ? "border-red-500 ring-2 ring-red-500/20" : "border-border",
        isTriggered && "border-red-500 ring-4 ring-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.4)]",
        nodeData.isDebugging && "ring-2 ring-blue-500 ring-offset-2",
        nodeData.hasBreakpoint && "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:-translate-x-1 before:w-3 before:h-3 before:bg-red-500 before:rounded-full before:border-2 before:border-red-300"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !border-2 !border-primary-foreground transition-all duration-300",
          isTriggered ? "!bg-red-500" : "!bg-red-400"
        )}
      />

      {/* Header */}
      <div className={cn(
        "px-3 py-2 border-b border-border rounded-t-lg transition-colors duration-300",
        isTriggered ? "bg-red-500/10" : "bg-red-500/5"
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "p-1.5 rounded-md transition-all duration-300",
              isTriggered ? "bg-red-500/20" : "bg-red-500/10"
            )}>
              <XCircle className={cn(
                "h-4 w-4 transition-all duration-300",
                isTriggered ? "text-red-500" : "text-red-400"
              )} />
            </div>
            <span className={cn(
              "font-medium text-sm truncate transition-colors duration-300",
              isTriggered && "text-red-500"
            )}>
              {nodeData.name || "Break"}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0 border-red-500/50 text-red-500">
            中断
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {nodeData.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{nodeData.description}</p>
        )}

        {/* Break Type */}
        <div className={cn(
          "flex items-center gap-2 text-[10px] p-1.5 rounded border",
          nodeData.breakType === "all" 
            ? "bg-red-500/10 border-red-500/30 text-red-500" 
            : "bg-muted/30 border-border"
        )}>
          {nodeData.breakType === "all" ? (
            <>
              <AlertTriangle className="h-3 w-3" />
              <span>中断所有循环</span>
            </>
          ) : (
            <span>中断当前循环</span>
          )}
        </div>

        {/* Condition (if set) */}
        {nodeData.condition && (
          <div className="text-[10px] p-1.5 rounded bg-muted/30 border border-border">
            <span className="text-muted-foreground">条件: </span>
            <span className="font-mono text-red-400">{nodeData.condition}</span>
          </div>
        )}

        {/* Target Loop (for nested) */}
        {nodeData.targetLoopId && (
          <div className="text-[10px] p-1.5 rounded bg-muted/30 border border-border">
            <span className="text-muted-foreground">目标循环: </span>
            <span className="font-mono text-red-400">{nodeData.targetLoopId}</span>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className={cn(
        "px-3 py-2 border-t border-border flex items-center justify-between rounded-b-lg",
        bgColor
      )}>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] transition-all duration-300",
            color,
            isTriggered && "border-red-500/50 bg-red-500/10"
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

      {/* No output handle - break terminates the flow */}
    </div>
  );
}

export default memo(BreakNode);
