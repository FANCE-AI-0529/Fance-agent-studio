/**
 * OpenCodeStatusBar - Full-width Status Bar for OpenCode Mode
 * Displays current mode prominently with warnings for BUILD mode
 */

import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Wrench, 
  AlertTriangle, 
  FileCode, 
  CheckCircle2, 
  XCircle,
  Shield,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { OpenCodeMode } from '@/types/openCode';

interface OpenCodeStatusBarProps {
  mode: OpenCodeMode;
  currentFile?: string;
  styleCheckPassed?: boolean;
  styleViolationsCount?: number;
  onSwitchMode?: (mode: OpenCodeMode) => void;
  onViewPlan?: () => void;
  className?: string;
}

export function OpenCodeStatusBar({
  mode,
  currentFile,
  styleCheckPassed = true,
  styleViolationsCount = 0,
  onSwitchMode,
  onViewPlan,
  className,
}: OpenCodeStatusBarProps) {
  const isPlanMode = mode === 'plan';

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      className={cn(
        "h-10 flex items-center justify-between px-4 border-b",
        "font-mono text-sm",
        isPlanMode 
          ? "bg-blue-500/5 border-blue-500/20" 
          : "bg-orange-500/5 border-orange-500/20",
        className
      )}
    >
      {/* Left: Mode Indicator */}
      <div className="flex items-center gap-3">
        {/* Mode Badge */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-md",
          isPlanMode
            ? "bg-blue-500/10 border border-blue-500/30"
            : "bg-orange-500/10 border border-orange-500/30 animate-pulse"
        )}>
          {isPlanMode ? (
            <>
              <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs tracking-wider">
                MODE: PLAN
              </span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-orange-600 dark:text-orange-400 font-semibold text-xs tracking-wider">
                MODE: BUILD
              </span>
              <Wrench className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            </>
          )}
        </div>

        {/* Mode description */}
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {isPlanMode 
            ? '只读模式 - 浏览文件和生成计划' 
            : '读写模式 - 执行代码变更'}
        </span>
      </div>

      {/* Center: Current File */}
      {currentFile && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileCode className="h-3.5 w-3.5" />
          <span className="font-mono truncate max-w-[200px]">{currentFile}</span>
        </div>
      )}

      {/* Right: Status indicators and actions */}
      <div className="flex items-center gap-3">
        {/* Style Check Status */}
        {!isPlanMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded text-xs",
                styleCheckPassed
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 text-destructive"
              )}>
                {styleCheckPassed ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>风格检查通过</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5" />
                    <span>{styleViolationsCount} 个违规</span>
                  </>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {styleCheckPassed 
                ? '代码符合 OpenCode 风格规范' 
                : `发现 ${styleViolationsCount} 个风格违规，需要修复`}
            </TooltipContent>
          </Tooltip>
        )}

        {/* View Plan Button (in BUILD mode) */}
        {!isPlanMode && onViewPlan && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewPlan}
            className="h-7 text-xs gap-1"
          >
            <Shield className="h-3.5 w-3.5" />
            查看计划
          </Button>
        )}

        {/* Runtime indicator */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className="text-xs gap-1 border-primary/30 text-primary cursor-default"
            >
              <Zap className="h-3 w-3" />
              OpenCode
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            OpenCode 编程引擎已激活
          </TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}

/**
 * Compact mode indicator for inline use
 */
interface CompactModeIndicatorProps {
  mode: OpenCodeMode;
  className?: string;
}

export function CompactModeIndicator({
  mode,
  className,
}: CompactModeIndicatorProps) {
  const isPlanMode = mode === 'plan';

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono",
      isPlanMode
        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
        : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
      className
    )}>
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
    </div>
  );
}
