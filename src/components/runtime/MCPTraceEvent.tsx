import { 
  Brain, 
  Shield, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Database,
  Server,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TraceEvent, TraceEventType } from "./trace/traceTypes";

interface MCPEventConfig {
  icon: React.ElementType;
  label: string;
  prefix: string;
  color: string;
  bgColor: string;
}

const mcpEventConfig: Partial<Record<TraceEventType, MCPEventConfig>> = {
  mcp_plan: {
    icon: Brain,
    label: "Plan",
    prefix: "[MPLP:Plan]",
    color: "text-cognitive",
    bgColor: "bg-cognitive/10",
  },
  mcp_confirm: {
    icon: Shield,
    label: "Confirm",
    prefix: "[MPLP:Confirm]",
    color: "text-governance",
    bgColor: "bg-governance/10",
  },
  mcp_execute: {
    icon: Zap,
    label: "Execute",
    prefix: "[MCP:Execute]",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  mcp_response: {
    icon: CheckCircle2,
    label: "Response",
    prefix: "[MCP:Response]",
    color: "text-status-executing",
    bgColor: "bg-status-executing/10",
  },
  mcp_resource_read: {
    icon: Database,
    label: "Resource",
    prefix: "[MCP:Resource]",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  mcp_error: {
    icon: XCircle,
    label: "Error",
    prefix: "[MCP:Error]",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
};

function formatTime(ts: Date | string | number) {
  const date = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("zh-CN", { 
    hour: "2-digit", 
    minute: "2-digit", 
    second: "2-digit" 
  });
}

interface MCPTraceEventProps {
  event: TraceEvent;
  showDetails?: boolean;
}

export function MCPTraceEvent({ event, showDetails = true }: MCPTraceEventProps) {
  const config = mcpEventConfig[event.type];
  
  if (!config) return null;
  
  const Icon = config.icon;
  const data = event.data;

  // Generate display message based on event type
  const getMessage = () => {
    switch (event.type) {
      case "mcp_plan":
        return `Selected MCP Tool: "${data.mcpTool}"`;
      case "mcp_confirm":
        return "User authorized tool execution";
      case "mcp_execute":
        return "Sending request to server...";
      case "mcp_response":
        return `Received ${data.mcpStatusCode || 200} OK (${data.mcpResponseSize || "N/A"})`;
      case "mcp_resource_read":
        return `Reading resource: ${data.mcpResourceUri}`;
      case "mcp_error":
        return data.message || "MCP call failed";
      default:
        return "";
    }
  };

  return (
    <div className={cn("rounded-md border overflow-hidden", config.bgColor, "border-border")}>
      {/* Header */}
      <div className="flex items-center gap-2 p-2">
        <div className={cn("p-1 rounded", config.bgColor)}>
          <Icon className={cn("h-3 w-3", config.color)} />
        </div>
        <span className={cn("text-[11px] font-mono font-medium", config.color)}>
          {config.prefix}
        </span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {formatTime(event.timestamp)}
        </span>
      </div>

      {/* Content */}
      <div className="px-2 pb-2 space-y-1.5">
        <p className="text-xs">{getMessage()}</p>

        {showDetails && (
          <>
            {/* Server info */}
            {data.mcpServer && (
              <div className="flex items-center gap-1.5">
                <Server className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Server:</span>
                <Badge variant="outline" className="text-[9px] h-4 px-1">
                  {data.mcpServer}
                </Badge>
              </div>
            )}

            {/* Permissions */}
            {data.permissions && data.permissions.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-muted-foreground">Permissions:</span>
                {data.permissions.map((p) => (
                  <Badge key={p} variant="secondary" className="text-[9px] h-4 px-1">
                    {p}
                  </Badge>
                ))}
              </div>
            )}

            {/* Method */}
            {data.mcpMethod && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Method:</span>
                <code className="text-[10px] bg-muted px-1 rounded">{data.mcpMethod}</code>
              </div>
            )}

            {/* Duration */}
            {data.duration !== undefined && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">Duration:</span>
                <span className="text-[10px]">{data.duration}ms</span>
              </div>
            )}

            {/* Inputs */}
            {data.mcpInputs && Object.keys(data.mcpInputs).length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Inputs:</span>
                <pre className="text-[9px] font-mono bg-muted/50 rounded p-1.5 overflow-auto max-h-[80px]">
                  <code>{JSON.stringify(data.mcpInputs, null, 2)}</code>
                </pre>
              </div>
            )}

            {/* Outputs */}
            {data.mcpOutputs && Object.keys(data.mcpOutputs).length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground">Output:</span>
                <pre className="text-[9px] font-mono bg-muted/50 rounded p-1.5 overflow-auto max-h-[80px]">
                  <code>{JSON.stringify(data.mcpOutputs, null, 2)}</code>
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Helper to check if an event is an MCP event
export function isMCPEvent(type: TraceEventType): boolean {
  return type.startsWith("mcp_");
}
