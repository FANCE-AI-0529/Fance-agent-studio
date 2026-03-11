import { CheckCircle, XCircle, Clock, SkipForward, Play, AlertTriangle } from "lucide-react";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.tsx";
import { type ChainExecution, type StepLog, stepStatusColors } from "../../hooks/useChainExecutions.ts";
import { cn } from "../../lib/utils.ts";
import { useState } from "react";

interface ExecutionStepTimelineProps {
  execution: ChainExecution;
}

export function ExecutionStepTimeline({ execution }: ExecutionStepTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  const getStepIcon = (status: StepLog["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-status-executing" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "running":
        return <Play className="h-4 w-4 text-primary animate-pulse" />;
      case "skipped":
        return <SkipForward className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStepStatusLabel = (status: StepLog["status"]) => {
    const labels: Record<string, string> = {
      pending: "等待中",
      running: "执行中",
      completed: "已完成",
      failed: "失败",
      skipped: "已跳过",
    };
    return labels[status] || status;
  };

  const steps = execution.step_logs.sort((a, b) => a.stepOrder - b.stepOrder);

  return (
    <div className="space-y-4">
      {/* 执行概览 */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">总步骤</p>
          <p className="font-semibold">{execution.total_steps}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">已完成</p>
          <p className="font-semibold text-status-executing">{execution.completed_steps}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">失败</p>
          <p className="font-semibold text-destructive">{execution.failed_steps}</p>
        </div>
      </div>

      {/* 错误信息 */}
      {execution.error_message && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{execution.error_message}</p>
        </div>
      )}

      {/* 步骤时间线 */}
      <ScrollArea className="h-[280px]">
        <div className="relative pl-6 space-y-3">
          {/* 时间线 */}
          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />

          {steps.map((step, idx) => (
            <Collapsible
              key={step.stepId}
              open={expandedSteps.has(step.stepId)}
              onOpenChange={() => toggleStep(step.stepId)}
            >
              <div className="relative">
                {/* 节点 */}
                <div className="absolute -left-4 top-3 w-3 h-3 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    step.status === "completed" && "bg-status-executing",
                    step.status === "failed" && "bg-destructive",
                    step.status === "running" && "bg-primary animate-pulse",
                    step.status === "skipped" && "bg-muted-foreground",
                    step.status === "pending" && "bg-muted"
                  )} />
                </div>

                <CollapsibleTrigger asChild>
                  <button className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {getStepIcon(step.status)}
                        <div>
                          <p className="font-medium text-sm">{step.stepName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {step.taskType}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", stepStatusColors[step.status])}
                            >
                              {getStepStatusLabel(step.status)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      {step.durationMs && (
                        <span className="text-xs text-muted-foreground">
                          {step.durationMs}ms
                        </span>
                      )}
                    </div>
                  </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-2 ml-6 p-3 bg-muted/50 rounded-lg text-xs space-y-2">
                    {step.errorMessage && (
                      <div className="text-destructive">
                        <span className="font-medium">错误: </span>
                        {step.errorMessage}
                      </div>
                    )}
                    {step.result && (
                      <div>
                        <span className="font-medium">结果: </span>
                        <pre className="mt-1 p-2 bg-background rounded text-[10px] overflow-auto max-h-24">
                          {JSON.stringify(step.result, null, 2)}
                        </pre>
                      </div>
                    )}
                    {step.retryCount !== undefined && step.retryCount > 0 && (
                      <div className="text-muted-foreground">
                        重试次数: {step.retryCount}
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </ScrollArea>

      {/* 使用的变量 */}
      {Object.keys(execution.variables_used).length > 0 && (
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-2">使用的变量</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(execution.variables_used).map(([key, value]) => (
              <Badge key={key} variant="outline" className="text-[10px]">
                {key}: {String(value).slice(0, 20)}
                {String(value).length > 20 && "..."}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
