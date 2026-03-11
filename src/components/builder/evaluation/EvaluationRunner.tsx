/**
 * @file EvaluationRunner.tsx
 * @description 评估执行进度组件
 */

import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  FileText,
  Shield,
  BarChart,
  Save,
} from 'lucide-react';
import { Card, CardContent } from '../../ui/card.tsx';
import { Progress } from '../../ui/progress.tsx';
import { Badge } from '../../ui/badge.tsx';
import { ScrollArea } from '../../ui/scroll-area.tsx';
import type { EvalPipelineStep, EvalPipelineEvent } from '../../../types/agentEvals.ts';
import { cn } from '../../../lib/utils.ts';

interface EvaluationRunnerProps {
  isRunning: boolean;
  currentStep: EvalPipelineStep | null;
  progress: number;
  events: EvalPipelineEvent[];
}

const stepConfig: Record<EvalPipelineStep, {
  label: string;
  icon: React.ElementType;
  description: string;
}> = {
  generating_tests: {
    label: '生成测试',
    icon: FileText,
    description: 'AI 正在生成测试用例...',
  },
  running_tests: {
    label: '执行测试',
    icon: Clock,
    description: '正在运行功能和边界测试...',
  },
  running_red_team: {
    label: '安全测试',
    icon: Shield,
    description: '正在执行红队对抗测试...',
  },
  calculating_scores: {
    label: '计算评分',
    icon: BarChart,
    description: '正在计算综合评分...',
  },
  saving_results: {
    label: '保存结果',
    icon: Save,
    description: '正在保存评估结果...',
  },
};

const stepOrder: EvalPipelineStep[] = [
  'generating_tests',
  'running_tests',
  'running_red_team',
  'calculating_scores',
  'saving_results',
];

export function EvaluationRunner({ 
  isRunning, 
  currentStep, 
  progress, 
  events 
}: EvaluationRunnerProps) {
  const currentStepIndex = currentStep ? stepOrder.indexOf(currentStep) : -1;

  return (
    <div className="space-y-4">
      {/* 总体进度 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">评估进度</span>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {isRunning && currentStep && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {stepConfig[currentStep].description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 步骤列表 */}
      <div className="space-y-2">
        {stepOrder.map((step, index) => {
          const config = stepConfig[step];
          const Icon = config.icon;
          const isCompleted = index < currentStepIndex;
          const isCurrent = step === currentStep;
          const isPending = index > currentStepIndex;
          
          // 获取该步骤的事件
          const stepEvents = events.filter(e => e.step === step);
          const lastEvent = stepEvents[stepEvents.length - 1];
          const hasError = lastEvent?.status === 'failed';

          return (
            <Card 
              key={step}
              className={cn(
                'transition-all',
                isCurrent && 'border-primary shadow-sm',
                hasError && 'border-destructive'
              )}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* 状态图标 */}
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    isCompleted && 'bg-green-500/10',
                    isCurrent && 'bg-primary/10',
                    isPending && 'bg-muted',
                    hasError && 'bg-destructive/10'
                  )}>
                    {isCompleted && !hasError && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {isCurrent && !hasError && (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    )}
                    {isPending && (
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    )}
                    {hasError && (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                  </div>

                  {/* 步骤信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-sm font-medium',
                        isPending && 'text-muted-foreground'
                      )}>
                        {config.label}
                      </span>
                      {isCurrent && (
                        <Badge variant="outline" className="text-xs">
                          进行中
                        </Badge>
                      )}
                    </div>
                    {lastEvent?.message && (
                      <p className={cn(
                        'text-xs truncate',
                        hasError ? 'text-destructive' : 'text-muted-foreground'
                      )}>
                        {lastEvent.message}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 事件日志 */}
      {events.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-medium mb-2">执行日志</p>
            <ScrollArea className="h-32">
              <div className="space-y-1">
                {events.map((event, index) => (
                  <div 
                    key={index}
                    className={cn(
                      'text-xs px-2 py-1 rounded',
                      event.status === 'completed' && 'bg-green-500/10 text-green-600',
                      event.status === 'running' && 'bg-blue-500/10 text-blue-600',
                      event.status === 'failed' && 'bg-destructive/10 text-destructive'
                    )}
                  >
                    <span className="opacity-50">
                      [{new Date(event.timestamp).toLocaleTimeString()}]
                    </span>{' '}
                    {event.message || stepConfig[event.step]?.label}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
