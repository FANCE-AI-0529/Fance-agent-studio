import { memo } from "react";
import {
  CheckCircle,
  Circle,
  Clock,
  Loader2,
  XCircle,
  Pause,
  ChevronDown,
  ChevronRight,
  Variable,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type {
  ExecutionLogEntry,
  EdgeBreakpoint,
  VariableSnapshot,
} from "@/stores/canvasDebugStore";
import { useState } from "react";

interface CanvasDebugPanelProps {
  executionLogs: ExecutionLogEntry[];
  breakpoints: Record<string, EdgeBreakpoint>;
  variableSnapshots: VariableSnapshot[];
  currentVariables: Record<string, unknown>;
  onClose: () => void;
}

const statusIcons = {
  pending: <Circle className="h-3 w-3 text-muted-foreground" />,
  running: <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />,
  completed: <CheckCircle className="h-3 w-3 text-green-500" />,
  failed: <XCircle className="h-3 w-3 text-destructive" />,
  paused: <Pause className="h-3 w-3 text-blue-500" />,
};

const CanvasDebugPanel = memo(
  ({
    executionLogs,
    breakpoints,
    variableSnapshots,
    currentVariables,
    onClose,
  }: CanvasDebugPanelProps) => {
    const [pathOpen, setPathOpen] = useState(true);
    const [varsOpen, setVarsOpen] = useState(true);
    const [bpOpen, setBpOpen] = useState(true);

    const breakpointList = Object.values(breakpoints);

    const formatValue = (value: unknown): string => {
      if (value === null) return "null";
      if (value === undefined) return "undefined";
      if (typeof value === "object") {
        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return String(value);
        }
      }
      return String(value);
    };

    return (
      <div className="w-80 h-full border-l border-border bg-card flex flex-col">
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Variable className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">调试面板</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            关闭
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Execution Path */}
            <Collapsible open={pathOpen} onOpenChange={setPathOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                {pathOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium text-sm">执行路径</span>
                <Badge variant="secondary" className="ml-auto text-xs">
                  {executionLogs.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-1 pl-2">
                  {executionLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      尚未开始执行
                    </p>
                  ) : (
                    executionLogs.map((log, index) => (
                      <div
                        key={log.id}
                        className={cn(
                          "flex items-center gap-2 py-1.5 px-2 rounded text-xs",
                          log.status === "running" && "bg-yellow-500/10",
                          log.status === "paused" && "bg-blue-500/10"
                        )}
                      >
                        <span className="text-muted-foreground w-4">
                          {index + 1}.
                        </span>
                        {statusIcons[log.status]}
                        <span className="flex-1 truncate">{log.nodeName}</span>
                        {log.duration && (
                          <span className="text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {log.duration}ms
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Current Variables */}
            <Collapsible open={varsOpen} onOpenChange={setVarsOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                {varsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium text-sm">当前变量</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-1 pl-2">
                  {Object.keys(currentVariables).length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      暂无变量数据
                    </p>
                  ) : (
                    Object.entries(currentVariables).map(([key, value]) => (
                      <div
                        key={key}
                        className="py-1.5 px-2 rounded bg-muted/50 text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-primary">{key}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {typeof value}
                          </span>
                        </div>
                        <pre className="font-mono text-[10px] text-muted-foreground overflow-auto max-h-16 whitespace-pre-wrap">
                          {formatValue(value)}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Breakpoints */}
            <Collapsible open={bpOpen} onOpenChange={setBpOpen}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                {bpOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span className="font-medium text-sm">断点</span>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-auto text-xs",
                    breakpointList.length > 0 &&
                      "border-red-500/30 text-red-500"
                  )}
                >
                  {breakpointList.length}
                </Badge>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="space-y-1 pl-2">
                  {breakpointList.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">
                      点击连线设置断点
                    </p>
                  ) : (
                    breakpointList.map((bp) => (
                      <div
                        key={bp.edgeId}
                        className="flex items-center gap-2 py-1.5 px-2 rounded text-xs"
                      >
                        <Circle
                          className={cn(
                            "h-2 w-2",
                            bp.enabled
                              ? "fill-red-500 text-red-500"
                              : "text-muted-foreground"
                          )}
                        />
                        <span className="flex-1 truncate font-mono text-[10px]">
                          {bp.edgeId}
                        </span>
                        {bp.hitCount > 0 && (
                          <Badge variant="secondary" className="text-[10px]">
                            {bp.hitCount}
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Variable Snapshots */}
            {variableSnapshots.length > 0 && (
              <div className="space-y-2">
                <span className="font-medium text-sm">变量快照</span>
                <div className="space-y-2">
                  {variableSnapshots.slice(-3).map((snapshot, index) => (
                    <div
                      key={`${snapshot.timestamp}-${index}`}
                      className="p-2 rounded bg-muted/50 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-muted-foreground">
                          {new Date(snapshot.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-mono text-[10px]">
                          @ {snapshot.nodeId}
                        </span>
                      </div>
                      <pre className="font-mono text-[10px] overflow-auto max-h-20">
                        {JSON.stringify(snapshot.variables, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }
);

CanvasDebugPanel.displayName = "CanvasDebugPanel";

export default CanvasDebugPanel;
