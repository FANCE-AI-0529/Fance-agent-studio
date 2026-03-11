// =====================================================
// 验证进度可视化组件
// Validation Progress Panel - Sandbox Testing UI
// =====================================================

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TestTube2,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Clock,
  Wrench,
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Progress } from '../ui/progress.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import type { SandboxValidationResult, TestRun } from '../../hooks/useSandboxValidation.ts';

export type ValidationPhase = 'idle' | 'building' | 'validating' | 'healing' | 'complete' | 'failed';

interface ValidationProgressPanelProps {
  phase: ValidationPhase;
  validationResult: SandboxValidationResult | null;
  retryCount: number;
  maxRetries: number;
  healingLog?: string[];
  healingProgress?: number;
  onRetry?: () => void;
  onSkipValidation?: () => void;
  className?: string;
}

const PHASE_CONFIG: Record<ValidationPhase, {
  icon: React.ElementType;
  label: string;
  color: string;
}> = {
  idle: { icon: TestTube2, label: '等待验证', color: 'text-muted-foreground' },
  building: { icon: Loader2, label: '构建中', color: 'text-primary' },
  validating: { icon: TestTube2, label: '沙箱验证中', color: 'text-primary' },
  healing: { icon: Wrench, label: '错误自愈中', color: 'text-yellow-500' },
  complete: { icon: CheckCircle2, label: '验证通过', color: 'text-green-500' },
  failed: { icon: XCircle, label: '验证失败', color: 'text-destructive' },
};

export function ValidationProgressPanel({
  phase,
  validationResult,
  retryCount,
  maxRetries,
  healingLog = [],
  healingProgress = 0,
  onRetry,
  onSkipValidation,
  className,
}: ValidationProgressPanelProps) {
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;

  const testSummary = useMemo(() => {
    if (!validationResult) return null;
    
    const passed = validationResult.testRuns.filter(t => !t.error).length;
    const total = validationResult.testRuns.length;
    const avgDuration = total > 0
      ? Math.round(validationResult.testRuns.reduce((sum, t) => sum + t.duration, 0) / total)
      : 0;
    
    return { passed, total, avgDuration };
  }, [validationResult]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon
              className={cn(
                'h-4 w-4',
                config.color,
                (phase === 'validating' || phase === 'healing' || phase === 'building') && 'animate-spin'
              )}
            />
            <span className="text-sm font-medium">{config.label}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            重试 {retryCount}/{maxRetries}
          </Badge>
        </div>

        {/* Progress Bar for Healing */}
        {phase === 'healing' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2"
          >
            <Progress value={healingProgress} className="h-1" />
            <p className="text-xs text-muted-foreground mt-1">
              正在修复问题组件...
            </p>
          </motion.div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Validation Steps */}
          <div className="space-y-2">
            <ValidationStep
              icon={CheckCircle2}
              label="构建完成"
              status={phase !== 'idle' ? 'completed' : 'pending'}
            />
            <ValidationStep
              icon={TestTube2}
              label="沙箱试运行"
              status={
                phase === 'validating'
                  ? 'running'
                  : phase === 'healing' || phase === 'complete' || phase === 'failed'
                  ? validationResult?.success
                    ? 'completed'
                    : 'failed'
                  : 'pending'
              }
              details={
                phase === 'validating'
                  ? '正在发送测试请求...'
                  : testSummary
                  ? `${testSummary.passed}/${testSummary.total} 通过`
                  : undefined
              }
            />
            <ValidationStep
              icon={Wrench}
              label="错误自愈"
              status={
                phase === 'healing'
                  ? 'running'
                  : validationResult?.success
                  ? 'skipped'
                  : phase === 'failed'
                  ? 'failed'
                  : 'pending'
              }
              details={phase === 'healing' ? `第 ${retryCount + 1} 次修复尝试` : undefined}
            />
            <ValidationStep
              icon={CheckCircle2}
              label="交付验证"
              status={phase === 'complete' ? 'completed' : 'pending'}
            />
          </div>

          {/* Test Results */}
          {validationResult && validationResult.testRuns.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-2">测试详情</p>
              <div className="space-y-2">
                {validationResult.testRuns.map((run) => (
                  <TestRunItem key={run.testId} run={run} />
                ))}
              </div>
            </div>
          )}

          {/* Error Analysis */}
          {validationResult?.errorAnalysis && (
            <div className="border-t border-border pt-3">
              <div className="flex items-start gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-medium text-destructive">
                    {validationResult.errorAnalysis.errorType === 'yaml_syntax' && 'YAML 语法错误'}
                    {validationResult.errorAnalysis.errorType === 'tool_not_found' && '工具未找到'}
                    {validationResult.errorAnalysis.errorType === 'prompt_error' && '提示词错误'}
                    {validationResult.errorAnalysis.errorType === 'timeout' && '请求超时'}
                    {validationResult.errorAnalysis.errorType === 'unknown' && '未知错误'}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {validationResult.errorAnalysis.suggestion}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Healing Log */}
          {healingLog.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground mb-2">自愈日志</p>
              <div className="space-y-1 max-h-32 overflow-auto">
                {healingLog.map((log, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground font-mono">
                    {log}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      {phase === 'failed' && (
        <div className="p-4 border-t border-border space-y-2">
          {retryCount < maxRetries && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="w-full gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              重新验证 ({maxRetries - retryCount} 次机会)
            </Button>
          )}
          {onSkipValidation && (
            <Button
              onClick={onSkipValidation}
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
            >
              跳过验证，直接应用
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// 验证步骤组件
function ValidationStep({
  icon: Icon,
  label,
  status,
  details,
}: {
  icon: React.ElementType;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  details?: string;
}) {
  const statusConfig = {
    pending: { icon: Icon, color: 'text-muted-foreground', marker: '○' },
    running: { icon: Loader2, color: 'text-primary', marker: '⏳' },
    completed: { icon: CheckCircle2, color: 'text-green-500', marker: '✓' },
    failed: { icon: XCircle, color: 'text-destructive', marker: '✗' },
    skipped: { icon: Icon, color: 'text-muted-foreground opacity-50', marker: '—' },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="flex items-start gap-2">
      <StatusIcon
        className={cn(
          'h-4 w-4 flex-shrink-0',
          config.color,
          status === 'running' && 'animate-spin'
        )}
      />
      <div className="flex-1 min-w-0">
        <span
          className={cn(
            'text-sm',
            status === 'completed' && 'line-through opacity-60',
            status === 'skipped' && 'line-through opacity-40'
          )}
        >
          {label}
        </span>
        {details && (
          <p className="text-xs text-muted-foreground truncate">{details}</p>
        )}
      </div>
    </div>
  );
}

// 测试运行结果项
function TestRunItem({ run }: { run: TestRun }) {
  return (
    <div
      className={cn(
        'p-2 rounded-lg text-xs',
        run.error ? 'bg-destructive/10' : 'bg-green-500/10'
      )}
    >
      <div className="flex items-center gap-2">
        <MessageSquare className="h-3 w-3 text-muted-foreground" />
        <span className="flex-1 truncate">{run.input}</span>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{run.duration}ms</span>
        </div>
      </div>
      {run.error && (
        <p className="mt-1 text-destructive truncate">{run.error}</p>
      )}
      {run.output && (
        <p className="mt-1 text-green-600 dark:text-green-400 truncate">
          → {run.output.slice(0, 100)}...
        </p>
      )}
    </div>
  );
}

export default ValidationProgressPanel;
