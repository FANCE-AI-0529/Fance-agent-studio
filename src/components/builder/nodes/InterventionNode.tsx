import React, { memo } from "react";
import { Position } from "@xyflow/react";
import { 
  Hand,
  Settings,
  X,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MultiPortHandle from "../ports/MultiPortHandle";
import { PortConfig, standardPorts } from "../ports/portTypes";

export interface InterventionNodeData {
  id: string;
  name: string;
  description?: string;
  confirmationType: "simple" | "detailed";
  timeoutSeconds: number;
  defaultAction: "approve" | "reject" | "timeout";
  promptTitle?: string;
  promptMessage?: string;
  showInputPreview: boolean;
  requiredPermissions?: string[];
  riskLevel?: "low" | "medium" | "high";
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  [key: string]: unknown;
}

interface InterventionNodeProps {
  id: string;
  data: InterventionNodeData;
  selected?: boolean;
}

const defaultActionConfig: Record<"approve" | "reject" | "timeout", {
  label: string;
  color: string;
}> = {
  approve: { label: "批准", color: "text-green-500" },
  reject: { label: "拒绝", color: "text-red-500" },
  timeout: { label: "超时", color: "text-yellow-500" },
};

const InterventionNode: React.FC<InterventionNodeProps> = memo(({ id, data, selected }) => {
  const defaultConfig = defaultActionConfig[data.defaultAction] || defaultActionConfig.reject;

  // Input ports
  const inputPorts: PortConfig[] = standardPorts.intervention?.inputs || [
    { id: "control-in", type: "control" as const, direction: "input" as const, label: "触发" },
    { id: "data-preview", type: "data" as const, direction: "input" as const, label: "预览数据" },
  ];

  // Output ports with branch colors
  const outputPorts: PortConfig[] = standardPorts.intervention?.outputs || [
    { id: "approved-out", type: "control" as const, direction: "output" as const, label: "已批准" },
    { id: "rejected-out", type: "control" as const, direction: "output" as const, label: "已拒绝" },
    { id: "user-input", type: "data" as const, direction: "output" as const, label: "用户输入" },
  ];

  return (
    <div
      className={cn(
        "relative bg-card border-2 rounded-xl shadow-lg min-w-[220px] transition-all duration-200",
        selected ? "border-primary ring-2 ring-primary/30" : "border-orange-500/30",
        "hover:shadow-xl"
      )}
    >
      {/* Input ports on left side */}
      <MultiPortHandle
        ports={inputPorts}
        position={Position.Left}
        nodeId={id}
      />

      {/* Output ports on right side */}
      <MultiPortHandle
        ports={outputPorts}
        position={Position.Right}
        nodeId={id}
      />

      {/* Header */}
      <div className="flex items-center gap-3 p-3 rounded-t-lg bg-orange-500/10">
        <div className="p-2 rounded-lg bg-background/80 text-orange-500">
          <Hand className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {data.name || "用户介入"}
          </h3>
          <Badge variant="secondary" className="text-[10px] mt-0.5">
            <MessageSquare className="h-2.5 w-2.5 mr-1" />
            Intervention
          </Badge>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {data.onConfigure && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                data.onConfigure?.(data.id);
              }}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}
          {data.onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                data.onRemove?.(data.id);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {data.description}
          </p>
        )}

        {data.promptMessage && (
          <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md line-clamp-2">
            "{data.promptMessage}"
          </div>
        )}

        {/* Timeout and default action */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">
            <Clock className="h-3 w-3 mr-1" />
            {data.timeoutSeconds}s
          </Badge>
          <Badge variant="outline" className={cn("text-[10px]", defaultConfig.color)}>
            默认: {defaultConfig.label}
          </Badge>
        </div>

        {/* Output indicators */}
        <div className="flex items-center gap-2 text-[10px]">
          <div className="flex items-center gap-1 text-green-500">
            <CheckCircle className="h-3 w-3" />
            <span>批准</span>
          </div>
          <div className="flex items-center gap-1 text-red-500">
            <XCircle className="h-3 w-3" />
            <span>拒绝</span>
          </div>
        </div>
      </div>

      {/* Port labels on left */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-3 space-y-4 text-xs text-muted-foreground">
        {inputPorts.map((port, i) => (
          <div 
            key={port.id}
            className="flex items-center justify-end gap-1.5"
            style={{ marginTop: i === 0 ? 0 : 12 }}
          >
            <span>{port.label}</span>
          </div>
        ))}
      </div>

      {/* Port labels on right with colors */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-3 space-y-3 text-xs">
        <div className="flex items-center gap-1.5 text-green-500">
          <span>已批准</span>
        </div>
        <div className="flex items-center gap-1.5 text-red-500" style={{ marginTop: 8 }}>
          <span>已拒绝</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground" style={{ marginTop: 8 }}>
          <span>用户输入</span>
        </div>
      </div>
    </div>
  );
});

InterventionNode.displayName = "InterventionNode";

export default InterventionNode;
