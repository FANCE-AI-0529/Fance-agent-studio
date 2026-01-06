import { useState } from "react";
import {
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Terminal,
  Globe,
  Radio,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useMCPInspect, MCPInspectResult } from "@/hooks/useMCPInspect";
import { MCPTestResults } from "./MCPTestResults";
import type { MCPConfig } from "./MCPConfigEditor";

interface MCPInspectorProps {
  config: MCPConfig;
  onUpdateConfig?: (config: MCPConfig) => void;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

const statusConfig: Record<
  ConnectionStatus,
  { icon: typeof CheckCircle2; color: string; label: string }
> = {
  disconnected: { icon: AlertCircle, color: "text-muted-foreground", label: "未连接" },
  connecting: { icon: Loader2, color: "text-primary", label: "连接中..." },
  connected: { icon: CheckCircle2, color: "text-status-executing", label: "已连接" },
  error: { icon: XCircle, color: "text-destructive", label: "连接失败" },
};

const transportIcons = {
  stdio: Terminal,
  sse: Radio,
  http: Globe,
};

export function MCPInspector({ config, onUpdateConfig }: MCPInspectorProps) {
  const { inspect, reset, isInspecting, result, error } = useMCPInspect();
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  const handleRunTest = async () => {
    setStatus("connecting");
    reset();

    try {
      const inspectResult = await inspect(config);
      setStatus(inspectResult.success ? "connected" : "error");
    } catch (err) {
      setStatus("error");
    }
  };

  const StatusIcon = statusConfig[status].icon;
  const TransportIcon = transportIcons[config.transport.type];

  // Get entry point display
  const getEntryPointDisplay = () => {
    if (config.transport.type === "stdio") {
      const cmd = config.transport.command || "";
      const args = (config.transport.args || []).join(" ");
      return `${cmd} ${args}`.trim() || "未配置";
    }
    return config.transport.url || "未配置";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            🔍 MCP Inspector
          </h3>
          <Button
            size="sm"
            onClick={handleRunTest}
            disabled={isInspecting}
            className="gap-2"
          >
            {isInspecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            运行测试
          </Button>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">连接状态:</span>
          <div className="flex items-center gap-1.5">
            <StatusIcon
              className={cn(
                "h-4 w-4",
                statusConfig[status].color,
                status === "connecting" && "animate-spin"
              )}
            />
            <span className={cn("text-sm", statusConfig[status].color)}>
              {statusConfig[status].label}
            </span>
          </div>
        </div>

        {/* Entry Point */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Label className="text-muted-foreground">Entry Point:</Label>
            <Badge variant="outline" className="gap-1">
              <TransportIcon className="h-3 w-3" />
              {config.transport.type.toUpperCase()}
            </Badge>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 border border-border">
            <code className="text-xs font-mono text-muted-foreground break-all">
              {getEntryPointDisplay()}
            </code>
          </div>
        </div>

        {/* Quick Config */}
        {onUpdateConfig && (
          <div className="grid grid-cols-3 gap-2">
            {(["stdio", "sse", "http"] as const).map((type) => {
              const Icon = transportIcons[type];
              const isActive = config.transport.type === type;
              return (
                <button
                  key={type}
                  onClick={() =>
                    onUpdateConfig({
                      ...config,
                      transport: { ...config.transport, type },
                    })
                  }
                  className={cn(
                    "flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-all",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {type.toUpperCase()}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isInspecting ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">正在探测 MCP Server...</p>
          </div>
        ) : result ? (
          <MCPTestResults result={result} />
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">探测失败</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRunTest} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              重试
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-6">
            <Terminal className="h-10 w-10 opacity-30" />
            <div className="text-center">
              <p className="text-sm">点击"运行测试"探测 MCP Server</p>
              <p className="text-xs mt-1">将模拟调用 list_tools、list_resources 等接口</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
