import { Loader2, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BackgroundTaskIndicatorProps {
  pendingCount: number;
  runningCount: number;
  failedCount: number;
  onClick?: () => void;
  className?: string;
}

export function BackgroundTaskIndicator({
  pendingCount,
  runningCount,
  failedCount,
  onClick,
  className,
}: BackgroundTaskIndicatorProps) {
  const totalActive = pendingCount + runningCount;
  
  if (totalActive === 0 && failedCount === 0) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
            "bg-muted/50 hover:bg-muted transition-colors",
            failedCount > 0 && "border border-destructive/30",
            className
          )}
        >
          {runningCount > 0 ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          ) : pendingCount > 0 ? (
            <Clock className="h-3 w-3 text-muted-foreground" />
          ) : failedCount > 0 ? (
            <AlertTriangle className="h-3 w-3 text-destructive" />
          ) : (
            <CheckCircle className="h-3 w-3 text-status-executing" />
          )}
          
          {totalActive > 0 && (
            <span className="text-muted-foreground">
              {totalActive} 任务
            </span>
          )}
          
          {failedCount > 0 && (
            <Badge variant="destructive" className="h-4 px-1 text-[9px]">
              {failedCount}
            </Badge>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          {runningCount > 0 && (
            <p className="flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {runningCount} 个任务执行中
            </p>
          )}
          {pendingCount > 0 && (
            <p className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {pendingCount} 个任务等待中
            </p>
          )}
          {failedCount > 0 && (
            <p className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              {failedCount} 个任务失败
            </p>
          )}
          <p className="text-muted-foreground pt-1 border-t">点击查看详情</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
