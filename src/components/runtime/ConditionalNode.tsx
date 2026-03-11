import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import {
  GitBranch,
  Trash2,
  Settings,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn } from "../../lib/utils.ts";

export interface ConditionRule {
  id: string;
  sourceKey: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_empty" | "is_not_empty";
  value: string;
  targetHandle: string;
}

export interface ConditionalNodeData {
  id?: string;
  name: string;
  description?: string;
  conditions: ConditionRule[];
  defaultHandle: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  evaluatedBranch?: string;
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

const operatorLabels: Record<string, string> = {
  equals: "等于",
  not_equals: "不等于",
  contains: "包含",
  greater_than: "大于",
  less_than: "小于",
  is_empty: "为空",
  is_not_empty: "不为空",
};

function ConditionalNode({ data, id, selected }: NodeProps) {
  const nodeData = data as unknown as ConditionalNodeData;
  const isExecuting = nodeData.status === "in_progress";
  const isCompleted = nodeData.status === "completed";

  const handleCount = Math.max(nodeData.conditions.length + 1, 2); // At least default + one condition

  return (
    <div
      className={cn(
        "bg-card border-2 rounded-lg shadow-lg min-w-[220px] max-w-[300px]",
        "transition-all duration-300",
        selected ? "border-primary ring-2 ring-primary/20" : "border-border",
        isExecuting && "border-amber-500 ring-4 ring-amber-500/30 animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.5)]",
        isCompleted && "border-green-500 ring-2 ring-green-500/20"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!w-3 !h-3 !border-2 !border-primary-foreground transition-all duration-300",
          isExecuting ? "!bg-amber-500 !w-4 !h-4" : "!bg-primary"
        )}
      />

      {/* Header */}
      <div className={cn(
        "px-3 py-2 border-b border-border rounded-t-lg transition-colors duration-300",
        isExecuting ? "bg-amber-500/10" : isCompleted ? "bg-green-500/10" : "bg-muted/50"
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              "p-1.5 rounded-md transition-all duration-300",
              isExecuting && "bg-amber-500/20 animate-pulse",
              isCompleted && "bg-green-500/20",
              !isExecuting && !isCompleted && "bg-amber-500/10"
            )}>
              <GitBranch className={cn(
                "h-4 w-4 transition-all duration-300",
                isExecuting ? "text-amber-500" : isCompleted ? "text-green-500" : "text-amber-500"
              )} />
            </div>
            <span className={cn(
              "font-medium text-sm truncate transition-colors duration-300",
              isExecuting && "text-amber-500"
            )}>
              {nodeData.name || "条件分支"}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0 border-amber-500/50 text-amber-500">
            分支
          </Badge>
        </div>
      </div>

      {/* Body - Conditions List */}
      <div className="p-3 space-y-2">
        {nodeData.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{nodeData.description}</p>
        )}

        <div className="space-y-1.5">
          {nodeData.conditions.map((condition, index) => (
            <div
              key={condition.id}
              className={cn(
                "flex items-center gap-2 text-[10px] p-1.5 rounded border transition-colors",
                nodeData.evaluatedBranch === condition.targetHandle
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-muted/30 border-border"
              )}
            >
              {nodeData.evaluatedBranch === condition.targetHandle ? (
                <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
              ) : (
                <div className="h-3 w-3 rounded-full border border-muted-foreground/30 shrink-0" />
              )}
              <span className="font-mono truncate">
                {condition.sourceKey} {operatorLabels[condition.operator]} {condition.value || ""}
              </span>
            </div>
          ))}
          
          {/* Default branch */}
          <div
            className={cn(
              "flex items-center gap-2 text-[10px] p-1.5 rounded border transition-colors",
              nodeData.evaluatedBranch === nodeData.defaultHandle
                ? "bg-green-500/10 border-green-500/30"
                : "bg-muted/30 border-border"
            )}
          >
            {nodeData.evaluatedBranch === nodeData.defaultHandle ? (
              <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
            ) : (
              <XCircle className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
            <span className="text-muted-foreground">默认分支</span>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground">
          {nodeData.conditions.length} 个条件 + 默认分支
        </div>
      </div>

      {/* Footer Actions */}
      <div className={cn(
        "px-3 py-2 border-t border-border flex items-center justify-between rounded-b-lg transition-colors duration-300",
        isExecuting ? "bg-amber-500/5" : "bg-muted/30"
      )}>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] transition-all duration-300",
            isCompleted && "border-green-500/50 text-green-500 bg-green-500/10",
            isExecuting && "border-amber-500/50 text-amber-500 bg-amber-500/10 animate-pulse"
          )}
        >
          {isExecuting ? "评估中" : isCompleted ? "已完成" : "待评估"}
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

      {/* Output Handles - Multiple for each branch */}
      {nodeData.conditions.map((condition, index) => (
        <Handle
          key={condition.id}
          type="source"
          position={Position.Bottom}
          id={condition.targetHandle}
          className={cn(
            "!w-3 !h-3 !border-2 !border-primary-foreground transition-all duration-300",
            nodeData.evaluatedBranch === condition.targetHandle ? "!bg-green-500" : "!bg-amber-500"
          )}
          style={{
            left: `${((index + 1) / (handleCount + 1)) * 100}%`,
          }}
        />
      ))}
      {/* Default handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id={nodeData.defaultHandle || "default"}
        className={cn(
          "!w-3 !h-3 !border-2 !border-primary-foreground transition-all duration-300",
          nodeData.evaluatedBranch === nodeData.defaultHandle ? "!bg-green-500" : "!bg-muted-foreground"
        )}
        style={{
          left: `${(handleCount / (handleCount + 1)) * 100}%`,
        }}
      />
    </div>
  );
}

export default memo(ConditionalNode);
