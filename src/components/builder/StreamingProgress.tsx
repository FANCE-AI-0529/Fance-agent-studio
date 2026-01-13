import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenerationPhase, PHASE_MESSAGES } from '@/types/streaming';
import { Progress } from '@/components/ui/progress';

interface StreamingProgressProps {
  progress: number;
  phase: GenerationPhase;
  currentStep: string;
  estimatedRemaining?: number | null;
  isActive: boolean;
  error?: string | null;
  className?: string;
}

const phaseOrder: GenerationPhase[] = [
  'analyzing',
  'planning',
  'generating',
  'connecting',
  'configuring',
  'validating',
  'completed',
];

export function StreamingProgress({
  progress,
  phase,
  currentStep,
  estimatedRemaining,
  isActive,
  error,
  className,
}: StreamingProgressProps) {
  if (!isActive && phase === 'idle') return null;

  const isComplete = phase === 'completed';
  const isError = phase === 'error' || !!error;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg p-4",
          className
        )}
      >
        {/* 头部状态 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : isError ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-5 w-5 text-primary" />
              </motion.div>
            )}
            <span className="font-medium text-sm">
              {isError ? '生成失败' : PHASE_MESSAGES[phase] || '处理中...'}
            </span>
          </div>
          
          {/* 进度百分比 */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {estimatedRemaining && estimatedRemaining > 0 && !isComplete && (
              <span className="text-xs">约 {Math.ceil(estimatedRemaining)}s</span>
            )}
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
        </div>
        
        {/* 进度条 */}
        <Progress 
          value={progress} 
          className={cn(
            "h-2 mb-3",
            isError && "[&>div]:bg-destructive"
          )}
        />
        
        {/* 阶段指示器 */}
        <div className="flex items-center justify-between gap-1">
          {phaseOrder.slice(0, -1).map((p, i) => {
            const currentIndex = phaseOrder.indexOf(phase);
            const isActive = phaseOrder.indexOf(p) === currentIndex;
            const isPast = phaseOrder.indexOf(p) < currentIndex;
            
            return (
              <React.Fragment key={p}>
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    opacity: isPast ? 1 : isActive ? 1 : 0.4,
                  }}
                  className={cn(
                    "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-medium transition-colors",
                    isPast && "bg-primary text-primary-foreground",
                    isActive && "bg-primary/20 text-primary ring-2 ring-primary ring-offset-2 ring-offset-background",
                    !isPast && !isActive && "bg-muted text-muted-foreground"
                  )}
                >
                  {isPast ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : isActive ? (
                    <Sparkles className="h-3 w-3" />
                  ) : (
                    i + 1
                  )}
                </motion.div>
                
                {i < phaseOrder.length - 2 && (
                  <div 
                    className={cn(
                      "flex-1 h-0.5 rounded-full transition-colors",
                      isPast ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
        
        {/* 阶段标签 */}
        <div className="flex items-center justify-between mt-2 text-[10px] text-muted-foreground">
          <span>分析</span>
          <span>规划</span>
          <span>生成</span>
          <span>连接</span>
          <span>配置</span>
          <span>验证</span>
        </div>
        
        {/* 错误信息 */}
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive"
          >
            {error}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default StreamingProgress;
