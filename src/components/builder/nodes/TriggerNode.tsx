import React, { memo } from "react";
import { Position } from "@xyflow/react";
import { 
  MessageSquare, 
  Timer, 
  Webhook, 
  Zap,
  Settings,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MultiPortHandle from "../ports/MultiPortHandle";
import { PortConfig, standardPorts } from "../ports/portTypes";

export type TriggerType = "chat" | "timer" | "webhook" | "event";

export interface TriggerNodeData {
  id: string;
  name: string;
  triggerType: TriggerType;
  description?: string;
  config?: {
    // Chat trigger
    startMessage?: string;
    // Timer trigger
    schedule?: string;
    interval?: number;
    // Webhook trigger
    webhookUrl?: string;
    secret?: string;
    // Event trigger
    eventName?: string;
  };
  isActive?: boolean;
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  [key: string]: unknown;
}

interface TriggerNodeProps {
  id: string;
  data: TriggerNodeData;
  selected?: boolean;
}

const triggerTypeConfig: Record<TriggerType, {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
}> = {
  chat: {
    icon: MessageSquare,
    label: "用户对话",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  timer: {
    icon: Timer,
    label: "定时任务",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  webhook: {
    icon: Webhook,
    label: "Webhook",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  event: {
    icon: Zap,
    label: "系统事件",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
};

const TriggerNode: React.FC<TriggerNodeProps> = memo(({ id, data, selected }) => {
  const config = triggerTypeConfig[data.triggerType] || triggerTypeConfig.chat;
  const Icon = config.icon;

  // Output ports only (right side)
  const outputPorts: PortConfig[] = standardPorts.trigger.outputs;

  return (
    <div
      className={cn(
        "relative bg-card border-2 rounded-xl shadow-lg min-w-[200px] transition-all duration-200",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border",
        "hover:shadow-xl"
      )}
    >
      {/* Output ports on right side */}
      <MultiPortHandle
        ports={outputPorts}
        position={Position.Right}
        nodeId={id}
      />

      {/* Header */}
      <div className={cn("flex items-center gap-3 p-3 rounded-t-lg", config.bgColor)}>
        <div className={cn("p-2 rounded-lg bg-background/80", config.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {data.name || config.label}
          </h3>
          <Badge variant="secondary" className="text-[10px] mt-0.5">
            <Zap className="h-2.5 w-2.5 mr-1" />
            触发器
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

        {/* Trigger-specific info */}
        <div className="text-xs text-muted-foreground space-y-1">
          {data.triggerType === "chat" && (
            <div>触发条件: 任何用户消息</div>
          )}
          {data.triggerType === "timer" && data.config?.schedule && (
            <div>计划: {data.config.schedule}</div>
          )}
          {data.triggerType === "webhook" && (
            <div>等待外部调用</div>
          )}
          {data.triggerType === "event" && data.config?.eventName && (
            <div>事件: {data.config.eventName}</div>
          )}
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            data.isActive ? "bg-green-500 animate-pulse" : "bg-muted"
          )} />
          <span className="text-xs text-muted-foreground">
            {data.isActive ? "监听中" : "未激活"}
          </span>
        </div>
      </div>

      {/* Port labels on right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-3 space-y-4 text-xs text-muted-foreground">
        {outputPorts.map((port, i) => (
          <div 
            key={port.id}
            className="flex items-center gap-1.5"
            style={{ marginTop: i === 0 ? 0 : 12 }}
          >
            <span>{port.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

TriggerNode.displayName = "TriggerNode";

export default TriggerNode;
