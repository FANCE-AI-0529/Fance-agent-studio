import { useState } from "react";
import { History, Play, CheckCircle, XCircle, Clock, ChevronRight, Trash2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useChainExecutions, useDeleteExecution, executionStatusColors, executionStatusLabels, type ChainExecution } from "@/hooks/useChainExecutions";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ExecutionStepTimeline } from "./ExecutionStepTimeline";

interface ChainExecutionHistoryProps {
  chainId?: string | null;
  onSelectExecution?: (execution: ChainExecution) => void;
}

export function ChainExecutionHistory({
  chainId,
  onSelectExecution,
}: ChainExecutionHistoryProps) {
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const { data: executions = [], isLoading } = useChainExecutions(chainId);
  const deleteExecution = useDeleteExecution();

  const selectedExecution = executions.find((e) => e.id === selectedExecutionId);

  const handleSelectExecution = (execution: ChainExecution) => {
    setSelectedExecutionId(execution.id);
    onSelectExecution?.(execution);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-status-executing" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "running":
        return <Play className="h-4 w-4 text-primary animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            执行历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 执行列表 */}
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              执行历史
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {executions.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            {executions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">暂无执行记录</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {executions.map((execution) => (
                  <button
                    key={execution.id}
                    onClick={() => handleSelectExecution(execution)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-muted/50 transition-colors",
                      selectedExecutionId === execution.id && "bg-muted"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        {getStatusIcon(execution.status)}
                        <div>
                          <p className="font-medium text-sm">{execution.chain_name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(parseISO(execution.started_at), "M月d日 HH:mm:ss", {
                              locale: zhCN,
                            })}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px]", executionStatusColors[execution.status])}
                            >
                              {executionStatusLabels[execution.status]}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {execution.completed_steps}/{execution.total_steps} 步
                            </span>
                            {execution.duration_ms && (
                              <span className="text-xs text-muted-foreground">
                                {execution.duration_ms}ms
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 步骤时间线 */}
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              执行详情
            </CardTitle>
            {selectedExecution && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => {
                      deleteExecution.mutate(selectedExecution.id);
                      setSelectedExecutionId(null);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>删除记录</TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {selectedExecution ? (
            <ExecutionStepTimeline execution={selectedExecution} />
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">选择一条记录查看详情</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
