import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip.tsx";
import { BookOpen, Wrench, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils.ts";

export type OpenCodeMode = 'plan' | 'build';

interface OpenCodeModeIndicatorProps {
  mode: OpenCodeMode;
  onModeSwitch?: (newMode: OpenCodeMode) => void;
  pendingApproval?: boolean;
  planSummary?: string;
  className?: string;
}

export function OpenCodeModeIndicator({ 
  mode, 
  onModeSwitch, 
  pendingApproval,
  planSummary,
  className 
}: OpenCodeModeIndicatorProps) {
  const isPlanMode = mode === 'plan';

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={isPlanMode ? "secondary" : "destructive"}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 cursor-default transition-colors",
                isPlanMode && "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20",
                !isPlanMode && "bg-orange-500/10 text-orange-600 hover:bg-orange-500/20"
              )}
            >
              {isPlanMode ? (
                <>
                  <BookOpen className="h-3 w-3" />
                  PLAN
                </>
              ) : (
                <>
                  <Wrench className="h-3 w-3" />
                  BUILD
                </>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            {isPlanMode ? (
              <div className="space-y-1">
                <p className="font-medium">📖 Plan Mode (Read-Only)</p>
                <p className="text-xs text-muted-foreground">
                  Browsing files and generating modification plans. No write operations allowed.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="font-medium">🔧 Build Mode (Read-Write)</p>
                <p className="text-xs text-muted-foreground">
                  Executing approved code changes. Style checks run automatically.
                </p>
              </div>
            )}
          </TooltipContent>
        </Tooltip>

        {pendingApproval && isPlanMode && (
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 animate-pulse" />
            <Button 
              size="sm" 
              variant="outline"
              className="h-7 text-xs bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20"
              onClick={() => onModeSwitch?.('build')}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Approve & Build
            </Button>
          </div>
        )}

        {planSummary && isPlanMode && (
          <span className="text-xs text-muted-foreground max-w-[200px] truncate">
            {planSummary}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
