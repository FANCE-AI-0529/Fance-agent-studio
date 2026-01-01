import React from "react";
import {
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings2,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  useCircuitBreakerState,
  useResetCircuit,
  useRecordFailure,
  useRecordSuccess,
} from "@/hooks/useCircuitBreaker";

interface CircuitBreakerContentProps {
  agentId?: string;
  agentName?: string;
  onWarningChange?: (hasWarning: boolean) => void;
}

export function CircuitBreakerContent({
  agentId,
  agentName,
  onWarningChange,
}: CircuitBreakerContentProps) {
  const { data: circuitState, isLoading, refetch } = useCircuitBreakerState(agentId);
  const resetCircuit = useResetCircuit();
  const recordFailure = useRecordFailure();
  const recordSuccess = useRecordSuccess();

  React.useEffect(() => {
    if (onWarningChange && circuitState) {
      onWarningChange(circuitState.state === "open");
    }
  }, [circuitState, onWarningChange]);

  const getCircuitIcon = () => {
    if (!circuitState) return <ShieldCheck className="h-5 w-5" />;
    switch (circuitState.state) {
      case "closed":
        return <ShieldCheck className="h-5 w-5 text-status-executing" />;
      case "open":
        return <ShieldOff className="h-5 w-5 text-destructive" />;
      case "half_open":
        return <ShieldAlert className="h-5 w-5 text-amber-500" />;
      default:
        return <ShieldCheck className="h-5 w-5" />;
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case "closed":
        return "正常";
      case "open":
        return "熔断";
      case "half_open":
        return "半开";
      default:
        return state;
    }
  };

  const getStateBgColor = (state: string) => {
    switch (state) {
      case "closed":
        return "bg-status-executing/10 border-status-executing/30";
      case "open":
        return "bg-destructive/10 border-destructive/30";
      case "half_open":
        return "bg-amber-500/10 border-amber-500/30";
      default:
        return "bg-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const failureRate = circuitState
    ? circuitState.failure_count / Math.max(circuitState.failure_threshold, 1) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getCircuitIcon()}
          <div>
            <h3 className="text-sm font-medium">
              {agentName || "默认"} 熔断器
            </h3>
            {circuitState && (
              <Badge
                variant="outline"
                className={cn("text-xs mt-1", getStateBgColor(circuitState.state))}
              >
                {getStateLabel(circuitState.state)}
              </Badge>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Stats */}
      {circuitState && (
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">失败次数</span>
              <Badge variant="destructive" className="text-xs">
                {circuitState.failure_count}
              </Badge>
            </div>
            <Progress
              value={failureRate}
              className="h-1.5 mt-2"
            />
            <div className="text-[10px] text-muted-foreground mt-1">
              阈值: {circuitState.failure_threshold}
            </div>
          </Card>

          <Card className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">成功次数</span>
              <Badge variant="secondary" className="text-xs bg-status-executing/20">
                {circuitState.success_count}
              </Badge>
            </div>
            <Progress
              value={(circuitState.success_count / Math.max(circuitState.success_threshold, 1)) * 100}
              className="h-1.5 mt-2"
            />
            <div className="text-[10px] text-muted-foreground mt-1">
              阈值: {circuitState.success_threshold}
            </div>
          </Card>
        </div>
      )}

      {/* Actions */}
      {circuitState && (
        <div className="flex gap-2">
          {circuitState.state !== "closed" && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => agentId && resetCircuit.mutate(agentId)}
            >
              重置熔断器
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => agentId && recordSuccess.mutate(agentId)}
          >
            模拟成功
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => agentId && recordFailure.mutate(agentId)}
          >
            模拟失败
          </Button>
        </div>
      )}

      {/* Warning */}
      {circuitState?.state === "open" && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-destructive">熔断器已开启</p>
            <p className="text-muted-foreground mt-1">
              请求将被拒绝，直到熔断器恢复。检查服务状态或手动重置。
            </p>
          </div>
        </div>
      )}

      {!circuitState && (
        <div className="text-center text-muted-foreground text-sm py-8">
          <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>选择一个 Agent 以查看熔断器状态</p>
        </div>
      )}
    </div>
  );
}
