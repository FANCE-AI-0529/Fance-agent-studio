import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import {
  SkipForward,
  Trash2,
  Settings,
  FastForward,
} from "lucide-react";
import { cn } from "../../lib/utils.ts";

export interface ContinueNodeData {
  id?: string;
  name: string;
  description?: string;
  condition?: string; // 可选的跳过条件
  targetLoopId?: string; // 要跳到下一迭代的目标循环ID（用于嵌套循环）
  skipCount: number; // 跳过的迭代次数（默认为1）
  status: "pending" | "triggered" | "skipped";
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
  hasBreakpoint?: boolean;
  isDebugging?: boolean;
}

const statusConfig: Record<string, { color: string; label: string; bgColor: string }> = {
  pending: { color: "text-muted-foreground", label: "待触发", bgColor: "bg-muted/30" },
  triggered: { color: "text-amber-500", label: "已跳过", bgColor: "bg-amber-500/10" },
  skipped: { color: "text-muted-foreground", label: "未触发", bgColor: "bg-muted/20" },
};

function ContinueNode({ data, id, selected }: NodeProps) {
  const nodeData = data as unknown as ContinueNodeData;
  const { color, label, bgColor } = statusConfig[nodeData.status] || statusConfig.pending;

  const isTriggered = nodeData.status === "triggered";

  return (
    <div
      className={cn(
        "bg-card border-2 rounded-lg shadow-lg min-w-[200px] max-w-[280px]",
        "transition-all duration-300",
        selected ? "border-amber-500 ring-2 ring-amber-500/20" : "border-border",
        isTriggered && "border-amber-500 ring-4 ring-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.4)]",
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
          isTriggered ? "!bg-amber-500" : "!bg-amber-400"
        )}
      />

      {/* Header */}
      <div className={cn(
        "px-3 py-2 border-b border-border rounded-t-lg transition-colors duration-300",
        isTriggered ? "bg-amber-500/10" : "bg-amber-500/5"
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "p-1.5 rounded-md transition-all duration-300",
              isTriggered ? "bg-amber-500/20" : "bg-amber-500/10"
            )}>
              <SkipForward className={cn(
                "h-4 w-4 transition-all duration-300",
                isTriggered ? "text-amber-500" : "text-amber-400"
              )} />
            </div>
            <span className={cn(
              "font-medium text-sm truncate transition-colors duration-300",
              isTriggered && "text-amber-500"
            )}>
              {nodeData.name || "Continue"}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0 border-amber-500/50 text-amber-500">
            跳过
          </Badge>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {nodeData.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{nodeData.description}</p>
        )}

        {/* Skip Count */}
        {nodeData.skipCount > 1 && (
          <div className="flex items-center gap-2 text-[10px] p-1.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-500">
            <FastForward className="h-3 w-3" />
            <span>跳过 {nodeData.skipCount} 次迭代</span>
          </div>
        )}

        {/* Condition (if set) */}
        {nodeData.condition && (
          <div className="text-[10px] p-1.5 rounded bg-muted/30 border border-border">
            <span className="text-muted-foreground">条件: </span>
            <span className="font-mono text-amber-400">{nodeData.condition}</span>
          </div>
        )}

        {/* Target Loop (for nested) */}
        {nodeData.targetLoopId && (
          <div className="text-[10px] p-1.5 rounded bg-muted/30 border border-border">
            <span className="text-muted-foreground">目标循环: </span>
            <span className="font-mono text-amber-400">{nodeData.targetLoopId}</span>
          </div>
        )}

        {/* Info about behavior */}
        <div className="text-[10px] text-muted-foreground p-1.5 rounded bg-muted/20 border border-dashed border-border">
          跳到当前循环的下一次迭代
        </div>
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
            isTriggered && "border-amber-500/50 bg-amber-500/10"
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

      {/* No output handle - continue jumps to next iteration */}
    </div>
  );
}

export default memo(ContinueNode);
