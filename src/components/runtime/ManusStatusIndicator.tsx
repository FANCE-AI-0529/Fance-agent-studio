import React from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useManusMemoryStore } from '@/stores/manusMemoryStore';

interface ManusStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function ManusStatusIndicator({ 
  className,
  showDetails = false 
}: ManusStatusIndicatorProps) {
  const store = useManusMemoryStore();

  const getStatusColor = () => {
    if (store.errorStrikes >= 3) return 'text-destructive';
    if (store.needsFindingsUpdate || store.needsRebootCheck) return 'text-warning';
    if (store.isInitialized) return 'text-cognitive';
    return 'text-muted-foreground';
  };

  const getStatusIcon = () => {
    if (store.errorStrikes >= 3) return AlertCircle;
    if (store.needsFindingsUpdate || store.needsRebootCheck) return AlertTriangle;
    if (store.isInitialized) return Brain;
    return Activity;
  };

  const StatusIcon = getStatusIcon();

  const statusContent = (
    <motion.div
      className={cn(
        "flex items-center gap-1.5",
        className
      )}
      animate={store.needsFindingsUpdate || store.errorStrikes >= 3 ? {
        scale: [1, 1.05, 1],
      } : {}}
      transition={{ repeat: store.needsFindingsUpdate ? Infinity : 0, duration: 2 }}
    >
      <StatusIcon className={cn("h-4 w-4", getStatusColor())} />
      
      {showDetails && (
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground">
            P{store.currentPhase}/{store.totalPhases}
          </span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[9px] px-1 py-0 h-4",
              store.phaseProgress >= 100 ? "border-primary text-primary" : ""
            )}
          >
            {store.phaseProgress}%
          </Badge>
          
          {store.needsFindingsUpdate && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-warning text-warning">
              2-Action
            </Badge>
          )}
          
          {store.errorStrikes > 0 && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-[9px] px-1 py-0 h-4",
                store.errorStrikes >= 3 ? "border-destructive text-destructive" : "border-muted-foreground"
              )}
            >
              {store.errorStrikes}/3
            </Badge>
          )}
        </div>
      )}
    </motion.div>
  );

  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {statusContent}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <div className="space-y-1">
              <div className="font-medium">Manus Kernel</div>
              <div className="text-muted-foreground">
                阶段 {store.currentPhase}/{store.totalPhases} • {store.phaseProgress}% 完成
              </div>
              {store.needsFindingsUpdate && (
                <div className="text-warning">⚠ 需要更新 findings.md</div>
              )}
              {store.errorStrikes >= 3 && (
                <div className="text-destructive">⚠ 触发 3-Strike Protocol</div>
              )}
              {store.needsRebootCheck && (
                <div className="text-warning">⚠ 建议进行 5-Question Reboot</div>
              )}
              <div className="text-muted-foreground text-[10px]">
                发现: {store.findingsCount} • 操作: {store.actionCount}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return statusContent;
}

// 紧凑版本，用于聊天头部
export function ManusStatusBadge() {
  const store = useManusMemoryStore();

  if (!store.isInitialized) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px] px-1.5 py-0 h-5 gap-1 cursor-pointer",
              store.errorStrikes >= 3 && "border-destructive text-destructive",
              store.needsFindingsUpdate && "border-warning text-warning"
            )}
          >
            <Brain className="h-3 w-3" />
            P{store.currentPhase}
            {store.phaseProgress >= 100 && <CheckCircle2 className="h-3 w-3 text-primary" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[200px]">
          <p className="font-medium">Manus Planning</p>
          <p className="text-muted-foreground">
            当前阶段 {store.currentPhase}，进度 {store.phaseProgress}%
          </p>
          {store.findingsCount > 0 && (
            <p className="text-muted-foreground">已记录 {store.findingsCount} 个发现</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
