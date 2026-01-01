import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  History,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  ChevronRight,
  Timer,
  ArrowRight,
  Layers,
  GitBranch,
  RefreshCw,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  useChainExecutions,
  useDeleteExecution,
  executionStatusColors,
  executionStatusLabels,
  stepStatusColors,
  type ChainExecution,
  type StepLog,
} from "@/hooks/useChainExecutions";

interface ExecutionHistoryPanelProps {
  chainId?: string | null;
  onReplay?: (execution: ChainExecution) => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}秒`;
  return `${Math.floor(ms / 60000)}分${Math.round((ms % 60000) / 1000)}秒`;
}

export function ExecutionHistoryPanel({ chainId, onReplay }: ExecutionHistoryPanelProps) {
  const [selectedExecution, setSelectedExecution] = useState<ChainExecution | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [replayingStep, setReplayingStep] = useState<number | null>(null);

  const { data: executions = [], isLoading, refetch } = useChainExecutions(chainId);
  const deleteExecution = useDeleteExecution();

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteExecution.mutateAsync(deleteId);
    setDeleteId(null);
    if (selectedExecution?.id === deleteId) {
      setSelectedExecution(null);
    }
  };

  const handleReplay = (execution: ChainExecution) => {
    if (onReplay) {
      onReplay(execution);
    } else {
      // Visual replay mode
      setSelectedExecution(execution);
      setReplayingStep(0);
      
      // Animate through steps
      const interval = setInterval(() => {
        setReplayingStep((prev) => {
          if (prev === null || prev >= execution.step_logs.length - 1) {
            clearInterval(interval);
            return null;
          }
          return prev + 1;
        });
      }, 1500);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <RefreshCw className="h-4 w-4 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      case "failed":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getExecutionModeIcon = (mode: string) => {
    switch (mode) {
      case "sequential":
        return <ArrowRight className="h-3 w-3" />;
      case "parallel":
        return <Layers className="h-3 w-3" />;
      case "mixed":
        return <GitBranch className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const runningCount = executions.filter(e => e.status === "running").length;
  const completedCount = executions.filter(e => e.status === "completed").length;

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <History className="h-4 w-4 mr-2" />
            执行历史
            {runningCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full text-[10px] text-white flex items-center justify-center animate-pulse">
                {runningCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[500px] sm:max-w-[500px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              任务链执行历史
              {executions.length > 0 && (
                <Badge variant="secondary">{executions.length}</Badge>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold text-blue-500">{runningCount}</div>
                  <div className="text-xs text-muted-foreground">执行中</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold text-green-500">{completedCount}</div>
                  <div className="text-xs text-muted-foreground">已完成</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <div className="text-xl font-bold">{executions.length}</div>
                  <div className="text-xs text-muted-foreground">总计</div>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-1" />
                刷新
              </Button>
            </div>

            {/* Execution List */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                加载中...
              </div>
            ) : executions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>暂无执行记录</p>
                <p className="text-xs mt-1">执行任务链后将在此显示历史</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-2">
                  {executions.map((execution) => (
                    <Card
                      key={execution.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedExecution(execution)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn("text-[10px]", executionStatusColors[execution.status])}
                              >
                                {getStatusIcon(execution.status)}
                                <span className="ml-1">{executionStatusLabels[execution.status]}</span>
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {execution.completed_steps}/{execution.total_steps} 步骤
                              </span>
                            </div>
                            <p className="text-sm font-medium mt-1 truncate">
                              {execution.chain_name}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Timer className="h-3 w-3" />
                                {execution.duration_ms
                                  ? formatDuration(execution.duration_ms)
                                  : "进行中"}
                              </span>
                              <span>•</span>
                              <span>
                                {formatDistanceToNow(new Date(execution.started_at), {
                                  addSuffix: true,
                                  locale: zhCN,
                                })}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Execution Detail Dialog */}
      <Dialog open={!!selectedExecution} onOpenChange={() => setSelectedExecution(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          {selectedExecution && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(executionStatusColors[selectedExecution.status])}
                  >
                    {getStatusIcon(selectedExecution.status)}
                    <span className="ml-1">{executionStatusLabels[selectedExecution.status]}</span>
                  </Badge>
                  {selectedExecution.chain_name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">总步骤</p>
                    <p className="text-lg font-semibold">{selectedExecution.total_steps}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <p className="text-xs text-green-600">完成</p>
                    <p className="text-lg font-semibold text-green-600">
                      {selectedExecution.completed_steps}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10">
                    <p className="text-xs text-red-600">失败</p>
                    <p className="text-lg font-semibold text-red-600">
                      {selectedExecution.failed_steps}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">总耗时</p>
                    <p className="text-lg font-semibold">
                      {selectedExecution.duration_ms
                        ? formatDuration(selectedExecution.duration_ms)
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* Execution Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {getExecutionModeIcon(selectedExecution.execution_mode)}
                    {selectedExecution.execution_mode === "sequential" && "串行执行"}
                    {selectedExecution.execution_mode === "parallel" && "并行执行"}
                    {selectedExecution.execution_mode === "mixed" && "混合模式"}
                  </span>
                  <span>•</span>
                  <span>
                    开始于 {format(new Date(selectedExecution.started_at), "yyyy-MM-dd HH:mm:ss")}
                  </span>
                </div>

                {/* Error Message */}
                {selectedExecution.error_message && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-sm text-red-600 font-medium">错误信息</p>
                    <p className="text-sm text-red-500 mt-1">{selectedExecution.error_message}</p>
                  </div>
                )}

                {/* Step Logs */}
                <div>
                  <h4 className="text-sm font-medium mb-2">执行步骤</h4>
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-2">
                      {selectedExecution.step_logs.map((step, index) => (
                        <div
                          key={step.stepId || index}
                          className={cn(
                            "p-3 rounded-lg border transition-all",
                            replayingStep === index && "ring-2 ring-primary",
                            stepStatusColors[step.status]
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center text-xs font-medium">
                                {step.stepOrder + 1}
                              </div>
                              <span className="font-medium text-sm">{step.stepName}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {step.taskType}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              {step.durationMs && (
                                <span className="text-muted-foreground">
                                  {formatDuration(step.durationMs)}
                                </span>
                              )}
                              {step.retryCount && step.retryCount > 0 && (
                                <Badge variant="outline" className="text-[10px]">
                                  重试 {step.retryCount} 次
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {step.errorMessage && (
                            <p className="text-xs text-red-500 mt-2 pl-8">
                              {step.errorMessage}
                            </p>
                          )}
                          
                          {step.result && (
                            <details className="mt-2 pl-8">
                              <summary className="text-xs text-muted-foreground cursor-pointer">
                                查看结果
                              </summary>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                                {JSON.stringify(step.result, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Variables Used */}
                {Object.keys(selectedExecution.variables_used).length > 0 && (
                  <details>
                    <summary className="text-sm font-medium cursor-pointer">
                      使用的变量 ({Object.keys(selectedExecution.variables_used).length})
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded-lg">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(selectedExecution.variables_used).map(([key, value]) => (
                          <div key={key} className="flex gap-2">
                            <code className="text-xs bg-background px-1 rounded">{key}</code>
                            <span className="text-muted-foreground truncate">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                )}
              </div>

              <div className="flex justify-between mt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteId(selectedExecution.id)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  删除记录
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setSelectedExecution(null)}>
                    关闭
                  </Button>
                  <Button onClick={() => handleReplay(selectedExecution)}>
                    <Eye className="h-4 w-4 mr-1" />
                    回放执行
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除这条执行记录吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ExecutionHistoryPanel;
