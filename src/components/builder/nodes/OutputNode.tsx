import React, { memo } from "react";
import { Position } from "@xyflow/react";
import { 
  Send, 
  Database, 
  Globe, 
  Webhook,
  Settings,
  X,
  ArrowRight
} from "lucide-react";
import { cn } from "../../../lib/utils.ts";
import { Badge } from "../../ui/badge.tsx";
import { Button } from "../../ui/button.tsx";
import MultiPortHandle from "../ports/MultiPortHandle.tsx";
import { PortConfig, standardPorts } from "../ports/portTypes.ts";

export type OutputType = "message" | "database" | "api" | "webhook";

export interface OutputNodeData {
  id: string;
  name: string;
  outputType: OutputType;
  description?: string;
  config?: {
    // Message output
    targetChannel?: string;
    format?: "text" | "markdown" | "json";
    // Database output
    tableName?: string;
    operation?: "insert" | "update" | "upsert";
    // API output
    apiUrl?: string;
    method?: "GET" | "POST" | "PUT" | "DELETE";
    // Webhook output
    webhookUrl?: string;
    headers?: Record<string, string>;
  };
  lastTriggered?: string;
  successCount?: number;
  errorCount?: number;
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  [key: string]: unknown;
}

interface OutputNodeProps {
  id: string;
  data: OutputNodeData;
  selected?: boolean;
}

const outputTypeConfig: Record<OutputType, {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
}> = {
  message: {
    icon: Send,
    label: "发送消息",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  database: {
    icon: Database,
    label: "写入数据库",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  api: {
    icon: Globe,
    label: "调用 API",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  webhook: {
    icon: Webhook,
    label: "触发 Webhook",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
};

const OutputNode: React.FC<OutputNodeProps> = memo(({ id, data, selected }) => {
  const config = outputTypeConfig[data.outputType] || outputTypeConfig.message;
  const Icon = config.icon;

  // Input ports only (left side)
  const inputPorts: PortConfig[] = standardPorts.output.inputs;

  return (
    <div
      className={cn(
        "relative bg-card border-2 rounded-xl shadow-lg min-w-[200px] transition-all duration-200",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border",
        "hover:shadow-xl"
      )}
    >
      {/* Input ports on left side */}
      <MultiPortHandle
        ports={inputPorts}
        position={Position.Left}
        nodeId={id}
      />

      {/* Port labels on left */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-3 space-y-4 text-xs text-muted-foreground text-right">
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
            <ArrowRight className="h-2.5 w-2.5 mr-1" />
            输出
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

        {/* Output-specific info */}
        <div className="text-xs text-muted-foreground space-y-1">
          {data.outputType === "message" && (
            <>
              <div>目标: {data.config?.targetChannel || "用户聊天"}</div>
              <div>格式: {data.config?.format || "markdown"}</div>
            </>
          )}
          {data.outputType === "database" && data.config?.tableName && (
            <>
              <div>表: {data.config.tableName}</div>
              <div>操作: {data.config.operation || "insert"}</div>
            </>
          )}
          {data.outputType === "api" && data.config?.apiUrl && (
            <>
              <div className="truncate">URL: {data.config.apiUrl}</div>
              <div>方法: {data.config.method || "POST"}</div>
            </>
          )}
          {data.outputType === "webhook" && data.config?.webhookUrl && (
            <div className="truncate">URL: {data.config.webhookUrl}</div>
          )}
        </div>

        {/* Stats */}
        {(data.successCount !== undefined || data.errorCount !== undefined) && (
          <div className="flex items-center gap-3 text-xs pt-1">
            {data.successCount !== undefined && (
              <span className="text-green-500">✓ {data.successCount}</span>
            )}
            {data.errorCount !== undefined && data.errorCount > 0 && (
              <span className="text-destructive">✗ {data.errorCount}</span>
            )}
          </div>
        )}

        {/* Last triggered */}
        {data.lastTriggered && (
          <div className="text-[10px] text-muted-foreground">
            上次触发: {new Date(data.lastTriggered).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
});

OutputNode.displayName = "OutputNode";

export default OutputNode;
