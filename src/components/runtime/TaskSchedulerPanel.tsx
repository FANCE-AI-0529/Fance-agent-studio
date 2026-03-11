import { useState } from "react";
import { Clock, Zap, AlertTriangle, CheckCircle, Loader2, Play, Pause, RotateCcw, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { Progress } from "../ui/progress.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.tsx";
import { PRIORITY_CONFIG, type TaskPriority, type TaskResult, type QueuedTask } from "../../hooks/useTaskScheduler.ts";
import { cn } from "../../lib/utils.ts";

interface TaskItem {
  id: string;
  priority: TaskPriority;
  taskType: string;
  status: "pending" | "running" | "completed" | "failed" | "queued";
  startedAt?: Date;
  completedAt?: Date;
  executionTimeMs?: number;
  error?: string;
  estimatedCompletion?: string;
}

interface TaskSchedulerPanelProps {
  tasks?: TaskItem[];
  onRetryTask?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
}

export function TaskSchedulerPanel({
  tasks = [],
  onRetryTask,
  onCancelTask,
}: TaskSchedulerPanelProps) {
  const [filter, setFilter] = useState<TaskPriority | "all">("all");

  const filteredTasks = filter === "all" 
    ? tasks 
    : tasks.filter((t) => t.priority === filter);

  const pendingCount = tasks.filter((t) => t.status === "pending" || t.status === "queued").length;
  const runningCount = tasks.filter((t) => t.status === "running").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const failedCount = tasks.filter((t) => t.status === "failed").length;

  const getStatusIcon = (status: TaskItem["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "queued":
        return <Timer className="h-4 w-4 text-amber-500" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-status-executing" />;
      case "failed":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: TaskItem["status"]) => {
    const labels: Record<string, string> = {
      pending: "等待中",
      queued: "已排队",
      running: "执行中",
      completed: "已完成",
      failed: "失败",
    };
    return labels[status] || status;
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    const config = PRIORITY_CONFIG[priority];
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px]",
          priority === "hrt" && "border-destructive/50 text-destructive bg-destructive/10",
          priority === "srt" && "border-amber-500/50 text-amber-500 bg-amber-500/10",
          priority === "dt" && "border-status-executing/50 text-status-executing bg-status-executing/10"
        )}
      >
        {config.icon} {priority.toUpperCase()}
      </Badge>
    );
  };

  const taskTypeLabels: Record<string, string> = {
    compliance_check: "合规检查",
    content_filter: "内容过滤",
    memory_update: "记忆更新",
    log_archive: "日志归档",
    model_inference: "模型推理",
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            任务调度器
          </CardTitle>
          <div className="flex items-center gap-2">
            {runningCount > 0 && (
              <Badge variant="default" className="text-[10px] animate-pulse">
                {runningCount} 执行中
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {pendingCount} 等待
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
        {/* 优先级统计 */}
        <div className="grid grid-cols-3 gap-2">
          {(["hrt", "srt", "dt"] as TaskPriority[]).map((priority) => {
            const config = PRIORITY_CONFIG[priority];
            const count = tasks.filter((t) => t.priority === priority).length;
            return (
              <Tooltip key={priority}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setFilter(filter === priority ? "all" : priority)}
                    className={cn(
                      "p-2 rounded-lg border transition-colors text-center",
                      filter === priority
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="text-lg mb-1">{config.icon}</div>
                    <p className="text-xs font-medium">{priority.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{count} 个</p>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{config.name}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                  <p className="text-xs mt-1">最大延迟: {config.maxLatencyMs}ms</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* 状态概览 */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-status-executing" />
            完成 {completedCount}
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-destructive" />
            失败 {failedCount}
          </span>
        </div>

        {/* 任务列表 */}
        <ScrollArea className="flex-1">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">暂无任务</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "p-3 border rounded-lg transition-colors",
                    task.status === "running" && "border-primary/50 bg-primary/5",
                    task.status === "failed" && "border-destructive/50 bg-destructive/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {getStatusIcon(task.status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {taskTypeLabels[task.taskType] || task.taskType}
                          </span>
                          {getPriorityBadge(task.priority)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getStatusLabel(task.status)}
                          {task.executionTimeMs && ` · ${task.executionTimeMs}ms`}
                        </p>
                        {task.error && (
                          <p className="text-xs text-destructive mt-1 truncate max-w-48">
                            {task.error}
                          </p>
                        )}
                        {task.estimatedCompletion && task.status === "queued" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            预计完成: {task.estimatedCompletion}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-1">
                      {task.status === "failed" && onRetryTask && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onRetryTask(task.id)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>重试</TooltipContent>
                        </Tooltip>
                      )}
                      {(task.status === "pending" || task.status === "queued") && onCancelTask && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => onCancelTask(task.id)}
                            >
                              <Pause className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>取消</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {/* 进度条（运行中的任务） */}
                  {task.status === "running" && (
                    <Progress value={50} className="h-1 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
