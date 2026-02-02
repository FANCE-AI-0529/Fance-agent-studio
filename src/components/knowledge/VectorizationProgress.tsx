import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Scissors, 
  Sparkles, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Loader2,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ProcessingStage = 'queued' | 'parsing' | 'chunking' | 'embedding' | 'storing' | 'complete' | 'error';

interface VectorizationProgressProps {
  /** Current processing stage */
  stage: ProcessingStage;
  /** Overall progress percentage (0-100) */
  progress: number;
  /** Document name being processed */
  documentName?: string;
  /** Number of chunks created */
  chunksCount?: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Error message if stage is 'error' */
  errorMessage?: string;
  /** Start time of processing */
  startTime?: Date;
  /** Show compact version */
  compact?: boolean;
  /** Processing speed (chunks per second) */
  processingSpeed?: number;
}

interface StageInfo {
  id: ProcessingStage;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const STAGES: StageInfo[] = [
  {
    id: 'parsing',
    label: '解析',
    description: '提取文档内容和结构',
    icon: FileText,
    color: 'text-blue-500',
  },
  {
    id: 'chunking',
    label: '切片',
    description: '将文档分割为语义片段',
    icon: Scissors,
    color: 'text-amber-500',
  },
  {
    id: 'embedding',
    label: '向量化',
    description: '生成语义向量表示',
    icon: Sparkles,
    color: 'text-purple-500',
  },
  {
    id: 'storing',
    label: '入库',
    description: '存储到向量数据库',
    icon: Database,
    color: 'text-green-500',
  },
];

function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)} 秒`;
  } else if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} 分钟`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.ceil((seconds % 3600) / 60);
    return `${hours} 小时 ${minutes} 分钟`;
  }
}

function formatElapsedTime(startTime: Date): string {
  const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
  if (elapsed < 60) {
    return `${elapsed}s`;
  } else if (elapsed < 3600) {
    return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
  } else {
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

export function VectorizationProgress({
  stage,
  progress,
  documentName,
  chunksCount,
  estimatedTimeRemaining,
  errorMessage,
  startTime,
  compact = false,
  processingSpeed,
}: VectorizationProgressProps) {
  const [elapsedTime, setElapsedTime] = useState<string>('0s');

  // Update elapsed time
  useEffect(() => {
    if (!startTime || stage === 'complete' || stage === 'error') return;

    const interval = setInterval(() => {
      setElapsedTime(formatElapsedTime(startTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, stage]);

  const currentStageIndex = useMemo(() => {
    if (stage === 'queued') return -1;
    if (stage === 'complete') return STAGES.length;
    if (stage === 'error') return STAGES.findIndex(s => s.id === stage);
    return STAGES.findIndex(s => s.id === stage);
  }, [stage]);

  const getStageStatus = (index: number) => {
    if (stage === 'complete') return 'complete';
    if (stage === 'error' && index <= currentStageIndex) return 'error';
    if (index < currentStageIndex) return 'complete';
    if (index === currentStageIndex) return 'active';
    return 'pending';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {stage === 'queued' && (
          <>
            <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
            <span className="text-xs text-muted-foreground">排队中</span>
          </>
        )}
        {stage === 'complete' && (
          <>
            <CheckCircle2 className="h-4 w-4 text-status-executing" />
            <span className="text-xs text-status-executing">已完成</span>
          </>
        )}
        {stage === 'error' && (
          <>
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-xs text-destructive">失败</span>
          </>
        )}
        {!['queued', 'complete', 'error'].includes(stage) && (
          <>
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            <span className="text-xs text-primary">
              {STAGES.find(s => s.id === stage)?.label} ({progress}%)
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with document name and timing */}
      {documentName && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">{documentName}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
            {startTime && stage !== 'complete' && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {elapsedTime}
              </span>
            )}
            {estimatedTimeRemaining && stage !== 'complete' && stage !== 'error' && (
              <Badge variant="outline" className="text-[10px]">
                预计 {formatTimeRemaining(estimatedTimeRemaining)}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Stage progress visualization */}
      <div className="flex items-center justify-between gap-2">
        {STAGES.map((stageInfo, index) => {
          const status = getStageStatus(index);
          const Icon = stageInfo.icon;

          return (
            <div key={stageInfo.id} className="flex items-center flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div
                    className={cn(
                      'flex flex-col items-center gap-1.5 cursor-help',
                      'flex-1'
                    )}
                    initial={false}
                    animate={{
                      scale: status === 'active' ? 1.05 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    {/* Stage icon */}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300',
                        status === 'complete' && 'bg-status-executing/20',
                        status === 'active' && 'bg-primary/20 ring-2 ring-primary/30',
                        status === 'error' && 'bg-destructive/20',
                        status === 'pending' && 'bg-muted'
                      )}
                    >
                      <AnimatePresence mode="wait">
                        {status === 'complete' ? (
                          <motion.div
                            key="complete"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <CheckCircle2 className="h-5 w-5 text-status-executing" />
                          </motion.div>
                        ) : status === 'active' ? (
                          <motion.div
                            key="active"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Loader2 className={cn('h-5 w-5 animate-spin', stageInfo.color)} />
                          </motion.div>
                        ) : status === 'error' ? (
                          <motion.div
                            key="error"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <AlertCircle className="h-5 w-5 text-destructive" />
                          </motion.div>
                        ) : (
                          <motion.div key="pending">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Stage label */}
                    <span
                      className={cn(
                        'text-xs font-medium transition-colors',
                        status === 'complete' && 'text-status-executing',
                        status === 'active' && 'text-primary',
                        status === 'error' && 'text-destructive',
                        status === 'pending' && 'text-muted-foreground'
                      )}
                    >
                      {stageInfo.label}
                    </span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {stageInfo.description}
                </TooltipContent>
              </Tooltip>

              {/* Connector line */}
              {index < STAGES.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-colors duration-300',
                    status === 'complete' ? 'bg-status-executing' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{progress}%</span>
          <div className="flex items-center gap-3">
            {chunksCount !== undefined && chunksCount > 0 && (
              <span className="flex items-center gap-1">
                <Scissors className="h-3 w-3" />
                {chunksCount} 分片
              </span>
            )}
            {processingSpeed !== undefined && processingSpeed > 0 && (
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {processingSpeed.toFixed(1)} 片/秒
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Error message */}
      {stage === 'error' && errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="text-xs text-destructive">
              <p className="font-medium mb-1">处理失败</p>
              <p className="text-destructive/80">{errorMessage}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Success message */}
      {stage === 'complete' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-lg bg-status-executing/10 border border-status-executing/20"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-status-executing" />
            <span className="text-xs text-status-executing font-medium">
              文档已成功索引，共 {chunksCount} 个语义分片
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Hook for simulating/tracking vectorization progress
export function useVectorizationProgress(documentId: string | null) {
  const [stage, setStage] = useState<ProcessingStage>('queued');
  const [progress, setProgress] = useState(0);
  const [chunksCount, setChunksCount] = useState(0);
  const [startTime, setStartTime] = useState<Date | undefined>();
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | undefined>();
  const [processingSpeed, setProcessingSpeed] = useState<number | undefined>();

  // Reset when document changes
  useEffect(() => {
    if (documentId) {
      setStage('queued');
      setProgress(0);
      setChunksCount(0);
      setStartTime(undefined);
      setEstimatedTimeRemaining(undefined);
    }
  }, [documentId]);

  // Simulate progress (replace with real polling in production)
  useEffect(() => {
    if (!documentId || stage === 'complete' || stage === 'error') return;

    const stages: ProcessingStage[] = ['parsing', 'chunking', 'embedding', 'storing', 'complete'];
    let currentStageIndex = 0;
    let currentProgress = 0;

    setStartTime(new Date());

    const interval = setInterval(() => {
      currentProgress += Math.random() * 15 + 5;
      
      if (currentProgress >= 100) {
        currentProgress = 0;
        currentStageIndex++;
        
        if (currentStageIndex >= stages.length) {
          setStage('complete');
          setProgress(100);
          clearInterval(interval);
          return;
        }
        
        setStage(stages[currentStageIndex]);
      }

      const overallProgress = Math.min(
        ((currentStageIndex * 100 + currentProgress) / (stages.length * 100)) * 100,
        100
      );
      
      setProgress(Math.round(overallProgress));
      setChunksCount(Math.floor(overallProgress * 0.5));
      setProcessingSpeed(Math.random() * 2 + 1);
      setEstimatedTimeRemaining(Math.max(0, (100 - overallProgress) * 0.5));
    }, 500);

    return () => clearInterval(interval);
  }, [documentId, stage]);

  return {
    stage,
    progress,
    chunksCount,
    startTime,
    estimatedTimeRemaining,
    processingSpeed,
    setStage,
  };
}

export default VectorizationProgress;
