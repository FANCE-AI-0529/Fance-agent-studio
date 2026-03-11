import { useState, useCallback, useEffect } from "react";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Separator } from "../ui/separator.tsx";
import { Switch } from "../ui/switch.tsx";
import { Label } from "../ui/label.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible.tsx";
import {
  Play,
  Pause,
  SkipForward,
  StepForward,
  Square,
  Bug,
  Circle,
  CircleDot,
  ChevronDown,
  ChevronRight,
  Variable,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "../../lib/utils.ts";

export interface Breakpoint {
  nodeId: string;
  enabled: boolean;
  condition?: string;
  hitCount: number;
}

export interface DebugVariable {
  name: string;
  value: unknown;
  type: string;
  scope: "input" | "output" | "context";
}

export interface StepExecutionLog {
  stepId: string;
  stepName: string;
  startTime: number;
  endTime?: number;
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "paused";
  input?: Record<string, unknown>;
  output?: unknown;
  error?: string;
}

export interface DebugState {
  isDebugging: boolean;
  isPaused: boolean;
  currentStepId: string | null;
  breakpoints: Map<string, Breakpoint>;
  executionLogs: StepExecutionLog[];
  variables: DebugVariable[];
  callStack: string[];
}

interface DebugControlPanelProps {
  debugState: DebugState;
  onStartDebug: () => void;
  onPauseDebug: () => void;
  onResumeDebug: () => void;
  onStopDebug: () => void;
  onStepOver: () => void;
  onStepInto: () => void;
  onToggleBreakpoint: (nodeId: string) => void;
  onClearBreakpoints: () => void;
}

export function DebugControlPanel({
  debugState,
  onStartDebug,
  onPauseDebug,
  onResumeDebug,
  onStopDebug,
  onStepOver,
  onStepInto,
  onToggleBreakpoint,
  onClearBreakpoints,
}: DebugControlPanelProps) {
  const [showVariables, setShowVariables] = useState(true);
  const [showCallStack, setShowCallStack] = useState(true);
  const [showLogs, setShowLogs] = useState(true);
  const [autoScrollLogs, setAutoScrollLogs] = useState(true);

  const { isDebugging, isPaused, currentStepId, breakpoints, executionLogs, variables, callStack } = debugState;

  const formatDuration = (start: number, end?: number) => {
    const duration = (end || Date.now()) - start;
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const getStatusIcon = (status: StepExecutionLog["status"]) => {
    switch (status) {
      case "running":
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      case "completed":
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      case "paused":
        return <Pause className="h-3 w-3 text-yellow-500" />;
      case "skipped":
        return <SkipForward className="h-3 w-3 text-muted-foreground" />;
      default:
        return <Circle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return `"${value}"`;
    if (typeof value === "object") {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return "[Object]";
      }
    }
    return String(value);
  };

  const getValueType = (value: unknown): string => {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Debug Toolbar */}
      <div className="p-2 border-b border-border flex items-center gap-1">
        <div className="flex items-center gap-1 mr-2">
          <Bug className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">调试</span>
        </div>
        
        <Separator orientation="vertical" className="h-6" />
        
        {!isDebugging ? (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onStartDebug} title="开始调试 (F5)">
            <Play className="h-4 w-4 text-green-500" />
          </Button>
        ) : (
          <>
            {isPaused ? (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onResumeDebug} title="继续执行 (F5)">
                <Play className="h-4 w-4 text-green-500" />
              </Button>
            ) : (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPauseDebug} title="暂停 (F6)">
                <Pause className="h-4 w-4 text-yellow-500" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onStopDebug} title="停止调试 (Shift+F5)">
              <Square className="h-4 w-4 text-red-500" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={onStepOver} 
              disabled={!isPaused}
              title="单步跳过 (F10)"
            >
              <StepForward className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7" 
              onClick={onStepInto}
              disabled={!isPaused}
              title="单步进入 (F11)"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </>
        )}
        
        <div className="flex-1" />
        
        {breakpoints.size > 0 && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearBreakpoints}>
            清除断点 ({breakpoints.size})
          </Button>
        )}
      </div>

      {/* Debug Status */}
      {isDebugging && (
        <div className="px-3 py-2 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">状态:</span>
            <Badge variant={isPaused ? "secondary" : "default"} className="text-xs">
              {isPaused ? "已暂停" : "运行中"}
            </Badge>
            {currentStepId && (
              <>
                <span className="text-muted-foreground">当前步骤:</span>
                <Badge variant="outline" className="text-xs font-mono">
                  {currentStepId}
                </Badge>
              </>
            )}
          </div>
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Variables Section */}
          <Collapsible open={showVariables} onOpenChange={setShowVariables}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded text-sm font-medium">
              {showVariables ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Variable className="h-4 w-4" />
              变量
              <Badge variant="secondary" className="ml-auto text-xs">
                {variables.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 pr-2 space-y-1">
                {variables.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2">暂无变量</div>
                ) : (
                  variables.map((variable, index) => (
                    <div key={index} className="flex items-start gap-2 py-1 text-xs font-mono">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px] px-1",
                          variable.scope === "input" && "border-blue-500/50 text-blue-500",
                          variable.scope === "output" && "border-green-500/50 text-green-500",
                          variable.scope === "context" && "border-purple-500/50 text-purple-500"
                        )}
                      >
                        {variable.scope}
                      </Badge>
                      <span className="text-foreground">{variable.name}</span>
                      <span className="text-muted-foreground">=</span>
                      <span className="text-primary truncate flex-1" title={formatValue(variable.value)}>
                        {formatValue(variable.value).slice(0, 50)}
                        {formatValue(variable.value).length > 50 && "..."}
                      </span>
                      <span className="text-muted-foreground">({getValueType(variable.value)})</span>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Call Stack Section */}
          <Collapsible open={showCallStack} onOpenChange={setShowCallStack}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded text-sm font-medium">
              {showCallStack ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              调用栈
              <Badge variant="secondary" className="ml-auto text-xs">
                {callStack.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 pr-2 space-y-1">
                {callStack.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2">调用栈为空</div>
                ) : (
                  callStack.map((frame, index) => (
                    <div 
                      key={index} 
                      className={cn(
                        "flex items-center gap-2 py-1 px-2 rounded text-xs font-mono cursor-pointer hover:bg-muted/50",
                        index === 0 && "bg-primary/10"
                      )}
                    >
                      <span className="text-muted-foreground">{callStack.length - index}</span>
                      <span className={index === 0 ? "text-primary" : "text-foreground"}>{frame}</span>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Execution Logs Section */}
          <Collapsible open={showLogs} onOpenChange={setShowLogs}>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded text-sm font-medium">
              {showLogs ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <Clock className="h-4 w-4" />
              执行日志
              <Badge variant="secondary" className="ml-auto text-xs">
                {executionLogs.length}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-4 pr-2">
                <div className="flex items-center gap-2 py-1 mb-1">
                  <Switch
                    id="auto-scroll"
                    checked={autoScrollLogs}
                    onCheckedChange={setAutoScrollLogs}
                    className="scale-75"
                  />
                  <Label htmlFor="auto-scroll" className="text-xs text-muted-foreground">
                    自动滚动
                  </Label>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {executionLogs.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-2">暂无日志</div>
                  ) : (
                    executionLogs.map((log, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "flex items-start gap-2 py-1.5 px-2 rounded text-xs border-l-2",
                          log.status === "running" && "border-l-blue-500 bg-blue-500/5",
                          log.status === "completed" && "border-l-green-500 bg-green-500/5",
                          log.status === "failed" && "border-l-red-500 bg-red-500/5",
                          log.status === "paused" && "border-l-yellow-500 bg-yellow-500/5",
                          log.status === "pending" && "border-l-muted-foreground",
                          log.status === "skipped" && "border-l-muted-foreground opacity-60"
                        )}
                      >
                        {getStatusIcon(log.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{log.stepName}</span>
                            <span className="text-muted-foreground flex-shrink-0">
                              {formatDuration(log.startTime, log.endTime)}
                            </span>
                          </div>
                          {log.error && (
                            <div className="text-red-500 mt-0.5 truncate" title={log.error}>
                              {log.error}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Breakpoints Section */}
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-muted/50 rounded text-sm font-medium">
              <ChevronRight className="h-4 w-4" />
              <CircleDot className="h-4 w-4 text-red-500" />
              断点
              <Badge variant="secondary" className="ml-auto text-xs">
                {breakpoints.size}
              </Badge>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pl-6 pr-2 space-y-1">
                {breakpoints.size === 0 ? (
                  <div className="text-xs text-muted-foreground py-2">
                    点击节点左侧添加断点
                  </div>
                ) : (
                  Array.from(breakpoints.entries()).map(([nodeId, bp]) => (
                    <div 
                      key={nodeId} 
                      className="flex items-center gap-2 py-1 px-2 rounded text-xs hover:bg-muted/50"
                    >
                      <button
                        onClick={() => onToggleBreakpoint(nodeId)}
                        className={cn(
                          "w-3 h-3 rounded-full border-2",
                          bp.enabled 
                            ? "bg-red-500 border-red-500" 
                            : "bg-transparent border-muted-foreground"
                        )}
                      />
                      <span className="font-mono flex-1">{nodeId}</span>
                      {bp.hitCount > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {bp.hitCount}次
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Keyboard Shortcuts Help */}
      <div className="p-2 border-t border-border text-[10px] text-muted-foreground">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">F5</kbd> 开始/继续</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">F6</kbd> 暂停</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">F10</kbd> 单步</span>
          <span><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">F9</kbd> 断点</span>
        </div>
      </div>
    </div>
  );
}

export default DebugControlPanel;
