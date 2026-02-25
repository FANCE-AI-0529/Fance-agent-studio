/**
 * VibeLoopIndicator - Self-healing progress visualization
 * Shows pulsing animation during self-healing attempts,
 * expandable error/analysis/fix details, MPLP escalation card
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Brain,
  Wrench,
  Shield,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VibeLoopPhase, VibeLoopAttempt } from '@/services/vibeLoopEngine';

interface VibeLoopIndicatorProps {
  phase: VibeLoopPhase;
  currentAttempt: number;
  maxRetries: number;
  attempts: VibeLoopAttempt[];
  onApproveEscalation?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const PHASE_CONFIG: Record<VibeLoopPhase, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  pulse: boolean;
}> = {
  executing: {
    label: '执行中',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    pulse: false,
  },
  failed: {
    label: '执行失败',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    icon: <XCircle className="h-4 w-4" />,
    pulse: false,
  },
  analyzing: {
    label: 'AI 分析中',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: <Brain className="h-4 w-4" />,
    pulse: true,
  },
  fixing: {
    label: '自动修复中',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    icon: <Wrench className="h-4 w-4" />,
    pulse: true,
  },
  retrying: {
    label: '重试中',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30',
    icon: <RefreshCw className="h-4 w-4 animate-spin" />,
    pulse: true,
  },
  success: {
    label: '修复成功',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: <CheckCircle2 className="h-4 w-4" />,
    pulse: false,
  },
  escalated: {
    label: '需要人工介入',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    icon: <Shield className="h-4 w-4" />,
    pulse: false,
  },
};

export function VibeLoopIndicator({
  phase,
  currentAttempt,
  maxRetries,
  attempts,
  onApproveEscalation,
  onDismiss,
  className,
}: VibeLoopIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = PHASE_CONFIG[phase];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "border rounded-lg overflow-hidden",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2"
      >
        <div className="flex items-center gap-2">
          <div className={cn(config.color, config.pulse && "animate-pulse")}>
            {config.icon}
          </div>
          <span className={cn("text-sm font-medium", config.color)}>
            Self-Healing {currentAttempt}/{maxRetries}
          </span>
          <Badge variant="outline" className={cn("text-xs", config.color, config.borderColor)}>
            {config.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: maxRetries }, (_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  i < currentAttempt - 1
                    ? attempts[i]?.exitCode === 0
                      ? "bg-emerald-500"
                      : "bg-destructive"
                    : i === currentAttempt - 1
                    ? "bg-primary animate-pulse"
                    : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-border/30 pt-2">
              {attempts.map((attempt, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      "font-mono font-bold",
                      attempt.exitCode === 0 ? "text-emerald-500" : "text-destructive"
                    )}>
                      #{attempt.attemptNumber}
                    </span>
                    <code className="text-muted-foreground truncate flex-1">
                      {attempt.command}
                    </code>
                    <span className="text-muted-foreground">
                      exit {attempt.exitCode}
                    </span>
                  </div>

                  {/* Stderr snippet */}
                  {attempt.stderr && (
                    <pre className="text-xs text-destructive/80 bg-destructive/5 rounded px-2 py-1 max-h-20 overflow-y-auto whitespace-pre-wrap">
                      {attempt.stderr.slice(0, 500)}
                    </pre>
                  )}

                  {/* AI Analysis */}
                  {attempt.reflection && (
                    <div className="text-xs space-y-1 bg-purple-500/5 rounded px-2 py-1.5">
                      <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-medium">
                        <Brain className="h-3 w-3" />
                        AI 分析
                      </div>
                      <p className="text-muted-foreground">{attempt.reflection.analysis}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {attempt.reflection.errorType}
                        </Badge>
                        <span className="text-muted-foreground">
                          置信度: {Math.round(attempt.reflection.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* MPLP Escalation Card */}
              {phase === 'escalated' && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    自动修复失败，需要人工审批
                  </div>
                  <p className="text-xs text-muted-foreground">
                    系统已尝试 {maxRetries} 次自动修复但均未成功。
                    请审查上方的错误日志和 AI 分析结果，选择下一步操作。
                  </p>
                  <div className="flex items-center gap-2">
                    {onApproveEscalation && (
                      <Button size="sm" variant="destructive" onClick={onApproveEscalation}>
                        授权继续尝试
                      </Button>
                    )}
                    {onDismiss && (
                      <Button size="sm" variant="outline" onClick={onDismiss}>
                        手动处理
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
