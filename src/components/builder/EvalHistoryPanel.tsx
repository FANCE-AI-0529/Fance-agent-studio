// =====================================================
// Evaluation History Panel - 评估历史列表
// =====================================================

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '../ui/button.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { Skeleton } from '../ui/skeleton.tsx';
import { Badge } from '../ui/badge.tsx';
import { cn } from '../../lib/utils.ts';
import { EvaluationResult } from '../../types/agentEvals.ts';
import { useAgentEvals } from '../../hooks/useAgentEvals.ts';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface EvalHistoryPanelProps {
  agentId: string;
  onSelectEvaluation: (result: EvaluationResult) => void;
  currentEvaluationId?: string;
  className?: string;
}

const EvalHistoryPanel: React.FC<EvalHistoryPanelProps> = ({
  agentId,
  onSelectEvaluation,
  currentEvaluationId,
  className,
}) => {
  const { evaluationHistory, fetchEvaluationHistory, isLoadingHistory } = useAgentEvals();

  useEffect(() => {
    if (agentId) {
      fetchEvaluationHistory(agentId);
    }
  }, [agentId, fetchEvaluationHistory]);

  const getEvalTypeLabel = (evalType: string) => {
    switch (evalType) {
      case 'pre_deploy': return '部署前';
      case 'scheduled': return '定期';
      case 'manual': return '手动';
      default: return evalType;
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <h4 className="text-sm font-medium flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        评估历史
      </h4>

      {isLoadingHistory ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : evaluationHistory.length === 0 ? (
        <div className="text-center py-4 text-muted-foreground">
          <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无历史评估记录</p>
        </div>
      ) : (
        <ScrollArea className="h-48">
          <div className="space-y-2 pr-2">
            {evaluationHistory.map((evalItem, index) => (
              <motion.div
                key={evalItem.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Button
                  variant={evalItem.id === currentEvaluationId ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start h-auto py-2 px-3',
                    evalItem.id === currentEvaluationId && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => onSelectEvaluation(evalItem)}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2">
                      {evalItem.passed ? (
                        <CheckCircle className={cn(
                          'h-4 w-4',
                          evalItem.id === currentEvaluationId ? 'text-primary-foreground' : 'text-green-500'
                        )} />
                      ) : (
                        <XCircle className={cn(
                          'h-4 w-4',
                          evalItem.id === currentEvaluationId ? 'text-primary-foreground' : 'text-destructive'
                        )} />
                      )}
                      <span className="font-medium">{evalItem.score.overall}分</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-xs',
                          evalItem.id === currentEvaluationId && 'border-primary-foreground/30 text-primary-foreground'
                        )}
                      >
                        {getEvalTypeLabel(evalItem.evalType)}
                      </Badge>
                    </div>
                    <span className={cn(
                      'text-xs',
                      evalItem.id === currentEvaluationId ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}>
                      {formatDistanceToNow(new Date(evalItem.createdAt), { 
                        addSuffix: true, 
                        locale: zhCN 
                      })}
                    </span>
                  </div>
                </Button>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default EvalHistoryPanel;
