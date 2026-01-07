import React, { memo, useMemo } from "react";
import { Position } from "@xyflow/react";
import { 
  Zap,
  Settings,
  X,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MultiPortHandle from "../ports/MultiPortHandle";
import { PortConfig, standardPorts, generatePortsFromSchema } from "../ports/portTypes";

export interface MCPActionNodeData {
  id: string;
  name: string;
  serverName: string;
  description?: string;
  category?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, {
      type: string;
      description?: string;
      required?: boolean;
      default?: unknown;
    }>;
    required?: string[];
  };
  outputSchema?: Record<string, unknown>;
  permissions: string[];
  riskLevel: "low" | "medium" | "high";
  requiresConfirmation: boolean;
  requiredEnvVars?: string[];
  envVarValues?: Record<string, string>;
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  [key: string]: unknown;
}

interface MCPActionNodeProps {
  id: string;
  data: MCPActionNodeData;
  selected?: boolean;
}

const riskLevelConfig: Record<"low" | "medium" | "high", {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  low: {
    icon: ShieldCheck,
    label: "低风险",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
  medium: {
    icon: Shield,
    label: "中风险",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
  },
  high: {
    icon: ShieldAlert,
    label: "高风险",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
  },
};

const MCPActionNode: React.FC<MCPActionNodeProps> = memo(({ id, data, selected }) => {
  const riskConfig = riskLevelConfig[data.riskLevel] || riskLevelConfig.medium;
  const RiskIcon = riskConfig.icon;

  // Generate dynamic input ports from inputSchema
  const inputPorts: PortConfig[] = useMemo(() => {
    const basePorts = [...(standardPorts.mcpAction?.inputs || [
      { id: "control-in", type: "control" as const, direction: "input" as const, label: "触发" },
    ])];
    
    if (data.inputSchema?.properties) {
      const paramPorts = generatePortsFromSchema(data.inputSchema);
      return [...basePorts, ...paramPorts];
    }
    
    return basePorts;
  }, [data.inputSchema]);

  const outputPorts: PortConfig[] = standardPorts.mcpAction?.outputs || [
    { id: "control-out", type: "control" as const, direction: "output" as const, label: "完成" },
    { id: "result-out", type: "data" as const, direction: "output" as const, label: "结果" },
    { id: "error-out", type: "data" as const, direction: "output" as const, label: "错误" },
  ];

  return (
    <div
      className={cn(
        "relative bg-card border-2 rounded-xl shadow-lg min-w-[240px] transition-all duration-200",
        selected ? "border-primary ring-2 ring-primary/30" : riskConfig.borderColor,
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
      <div className={cn("flex items-center gap-3 p-3 rounded-t-lg", riskConfig.bgColor)}>
        <div className={cn("p-2 rounded-lg bg-background/80", riskConfig.color)}>
          <Zap className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {data.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {data.serverName}
          </p>
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

        {/* Risk level and confirmation badge */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn("text-[10px]", riskConfig.color, riskConfig.bgColor)}>
            <RiskIcon className="h-3 w-3 mr-1" />
            {riskConfig.label}
          </Badge>
          {data.requiresConfirmation && (
            <Badge variant="outline" className="text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/30">
              <AlertTriangle className="h-3 w-3 mr-1" />
              需确认
            </Badge>
          )}
        </div>

        {/* Permissions */}
        {data.permissions.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {data.permissions.slice(0, 3).map((perm) => (
              <Badge
                key={perm}
                variant="secondary"
                className="text-[10px] px-1.5 py-0"
              >
                {perm}
              </Badge>
            ))}
            {data.permissions.length > 3 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                +{data.permissions.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Port labels on left */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-3 space-y-3 text-xs text-muted-foreground">
        {inputPorts.map((port, i) => (
          <div 
            key={port.id}
            className="flex items-center justify-end gap-1.5"
            style={{ marginTop: i === 0 ? 0 : 8 }}
          >
            <span className="truncate max-w-[80px]">{port.label}</span>
          </div>
        ))}
      </div>

      {/* Port labels on right */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-3 space-y-3 text-xs text-muted-foreground">
        {outputPorts.map((port, i) => (
          <div 
            key={port.id}
            className="flex items-center gap-1.5"
            style={{ marginTop: i === 0 ? 0 : 8 }}
          >
            <span>{port.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

MCPActionNode.displayName = "MCPActionNode";

export default MCPActionNode;
