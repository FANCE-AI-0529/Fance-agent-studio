import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  FlaskConical,
  Shield,
  BarChart3,
  Save,
  CheckCircle2,
  Loader2,
  Circle,
  AlertCircle,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { EvalPipelineEvent, EvalPipelineStep } from '@/types/agentEvals';

interface EvalProgressPanelProps {
  events: EvalPipelineEvent[];
  currentStep: EvalPipelineStep | null;
  progress: number;
  isEvaluating: boolean;
  error?: string | null;
  className?: string;
}

// Step configuration
interface StepConfig {
  id: EvalPipelineStep;
  label: string;
  icon: React.ElementType;
  description: string;
}

const EVAL_STEPS: StepConfig[] = [
  {
    id: 'generating_tests',
    label: '生成测试用例',
    icon: FileText,
    description: '分析 Agent 配置，生成针对性测试...',
  },
  {
    id: 'running_tests',
    label: '执行测试',
    icon: FlaskConical,
    description: '运行功能测试、边界测试...',
  },
  {
    id: 'running_red_team',
    label: '红队对抗',
    icon: Shield,
    description: '执行安全攻击模拟测试...',
  },
  {
    id: 'calculating_scores',
    label: '计算评分',
    icon: BarChart3,
    description: '综合分析测试结果...',
  },
  {
    id: 'saving_results',
    label: '保存结果',
    icon: Save,
    description: '记录评估结果到数据库...',
  },
];

// Individual step component
interface StepItemProps {
  step: StepConfig;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
  isLast: boolean;
}

const StepItem: React.FC<StepItemProps> = ({ step, status, message, isLast }) => {
  const Icon = step.icon;

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground/40" />;
    }
  };

  const getStepStyles = () => {
    switch (status) {
      case 'completed':
        return 'border-green-500/30 bg-green-500/5';
      case 'running':
        return 'border-primary/50 bg-primary/5';
      case 'error':
        return 'border-destructive/30 bg-destructive/5';
      default:
        return 'border-muted bg-muted/20';
    }
  };

  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            'w-10 h-10 rounded-full border-2 flex items-center justify-center',
            getStepStyles()
          )}
        >
          {status === 'running' ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : status === 'completed' ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : status === 'error' ? (
            <AlertCircle className="h-5 w-5 text-destructive" />
          ) : (
            <Icon className="h-5 w-5 text-muted-foreground/50" />
          )}
        </motion.div>
        {!isLast && (
          <div className={cn(
            'w-0.5 h-12 my-1',
            status === 'completed' ? 'bg-green-500/50' : 'bg-muted'
          )} />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2">
          <span className={cn(
            'font-medium',
            status === 'running' ? 'text-primary' :
            status === 'completed' ? 'text-green-500' :
            status === 'error' ? 'text-destructive' :
            'text-muted-foreground'
          )}>
            {step.label}
          </span>
          {getStatusIcon()}
        </div>
        <AnimatePresence mode="wait">
          {status === 'running' && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="text-sm text-muted-foreground mt-1"
            >
              {message || step.description}
            </motion.p>
          )}
          {status === 'completed' && message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-green-500/80 mt-1"
            >
              ✓ {message}
            </motion.p>
          )}
          {status === 'error' && message && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-destructive mt-1"
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Main EvalProgressPanel Component
const EvalProgressPanel: React.FC<EvalProgressPanelProps> = ({
  events,
  currentStep,
  progress,
  isEvaluating,
  error,
  className,
}) => {
  // Determine step status based on events
  const getStepStatus = (stepId: EvalPipelineStep): 'pending' | 'running' | 'completed' | 'error' => {
    const stepEvents = events.filter(e => e.step === stepId);
    
    if (stepEvents.some(e => e.status === 'failed')) return 'error';
    if (stepEvents.some(e => e.status === 'completed')) return 'completed';
    if (stepEvents.some(e => e.status === 'running') || currentStep === stepId) return 'running';
    
    // Check if previous steps are completed
    const stepIndex = EVAL_STEPS.findIndex(s => s.id === stepId);
    const previousSteps = EVAL_STEPS.slice(0, stepIndex);
    const allPreviousCompleted = previousSteps.every(s => 
      events.some(e => e.step === s.id && e.status === 'completed')
    );
    
    if (allPreviousCompleted && currentStep === stepId) return 'running';
    
    return 'pending';
  };

  // Get latest message for a step
  const getStepMessage = (stepId: EvalPipelineStep): string | undefined => {
    const stepEvents = events.filter(e => e.step === stepId);
    return stepEvents[stepEvents.length - 1]?.message;
  };

  if (!isEvaluating && events.length === 0) {
    return null;
  }

  return (
    <div className={cn('p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-medium">智能体质检进度</span>
        </div>
        {isEvaluating && (
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      {/* Progress bar */}
      {isEvaluating && (
        <Progress value={progress} className="h-2" />
      )}

      {/* Error display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive"
        >
          <div className="flex items-center gap-2 font-medium mb-1">
            <AlertCircle className="h-4 w-4" />
            评估失败
          </div>
          {error}
        </motion.div>
      )}

      {/* Steps timeline */}
      <div className="pt-2">
        {EVAL_STEPS.map((step, index) => (
          <StepItem
            key={step.id}
            step={step}
            status={getStepStatus(step.id)}
            message={getStepMessage(step.id)}
            isLast={index === EVAL_STEPS.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

export default EvalProgressPanel;
