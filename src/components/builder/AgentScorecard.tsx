import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Shield, 
  MessageSquare, 
  Zap, 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  FileCheck,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { EvaluationResult, AgentScore, TestRunResult, SpeedGrade, TestCategory } from '@/types/agentEvals';
import RedTeamResultsPanel from './RedTeamResultsPanel';

interface AgentScorecardProps {
  evaluationResult: EvaluationResult;
  onClose?: () => void;
  onRerun?: () => void;
  className?: string;
}

// Circular Score Display Component
interface CircularScoreDisplayProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const CircularScoreDisplay: React.FC<CircularScoreDisplayProps> = ({
  score,
  size = 'lg',
  label = '综合评分',
  className,
}) => {
  const sizes = {
    sm: { width: 80, stroke: 6, fontSize: 'text-lg' },
    md: { width: 120, stroke: 8, fontSize: 'text-2xl' },
    lg: { width: 160, stroke: 10, fontSize: 'text-4xl' },
  };

  const { width, stroke, fontSize } = sizes[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getStrokeColor = (score: number) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width, height: width }}>
        <svg
          className="transform -rotate-90"
          width={width}
          height={width}
        >
          {/* Background circle */}
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
          />
          {/* Progress circle */}
          <motion.circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={getStrokeColor(score)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          />
        </svg>
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className={cn(fontSize, 'font-bold', getScoreColor(score))}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {Math.round(score)}
          </motion.span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
  );
};

// Score Item Component
interface ScoreItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  status: 'success' | 'warning' | 'error';
  description?: string;
}

const ScoreItem: React.FC<ScoreItemProps> = ({
  icon: Icon,
  label,
  value,
  status,
  description,
}) => {
  const statusStyles = {
    success: 'bg-green-500/10 border-green-500/30 text-green-500',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
    error: 'bg-destructive/10 border-destructive/30 text-destructive',
  };

  const iconStyles = {
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-destructive',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center gap-2 p-4 rounded-lg border',
        statusStyles[status]
      )}
    >
      <Icon className={cn('h-5 w-5', iconStyles[status])} />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={cn('text-lg font-bold', iconStyles[status])}>
        {typeof value === 'number' ? `${value}%` : value}
      </span>
      {description && (
        <span className="text-xs text-muted-foreground text-center">{description}</span>
      )}
    </motion.div>
  );
};

// Test Runs Collapsible Component
interface TestRunsCollapsibleProps {
  testRuns: TestRunResult[];
}

const TestRunsCollapsible: React.FC<TestRunsCollapsibleProps> = ({ testRuns }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const passedCount = testRuns.filter(t => t.passed).length;
  const totalCount = testRuns.length;
  const avgDuration = totalCount > 0 ? testRuns.reduce((sum, t) => sum + t.duration, 0) / totalCount : 0;

  const categoryStats = testRuns.reduce((acc, test) => {
    const cat = test.category;
    if (!acc[cat]) acc[cat] = { passed: 0, total: 0 };
    acc[cat].total++;
    if (test.passed) acc[cat].passed++;
    return acc;
  }, {} as Record<TestCategory, { passed: number; total: number }>);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-4 h-auto"
        >
          <div className="flex items-center gap-3">
            <FileCheck className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-medium">测试用例详情</div>
              <div className="text-sm text-muted-foreground">
                {passedCount}/{totalCount} 通过 | 平均响应 {Math.round(avgDuration)}ms
              </div>
            </div>
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 space-y-4">
          {/* Category summary */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryStats).map(([category, stats]) => (
              <Badge
                key={category}
                variant={stats.passed === stats.total ? 'default' : 'secondary'}
                className="text-xs"
              >
                {category}: {stats.passed}/{stats.total}
              </Badge>
            ))}
          </div>
          
          {/* Individual test results */}
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {testRuns.map((test, index) => (
                <motion.div
                  key={test.testCaseId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex items-center justify-between p-2 rounded text-sm',
                    test.passed ? 'bg-green-500/5' : 'bg-destructive/5'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {test.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive" />
                    )}
                    <span className="truncate max-w-[200px]">{test.input}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {test.category}
                    </Badge>
                    <span className="text-xs">{test.duration}ms</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

// Helper functions
const getSpeedStatus = (grade: SpeedGrade): 'success' | 'warning' | 'error' => {
  if (grade === 'A+' || grade === 'A') return 'success';
  if (grade === 'B' || grade === 'C') return 'warning';
  return 'error';
};

const getScoreStatus = (score: number, threshold = 80): 'success' | 'warning' | 'error' => {
  if (score >= threshold) return 'success';
  if (score >= 60) return 'warning';
  return 'error';
};

const getSecurityStatus = (score: number): 'success' | 'warning' | 'error' => {
  return score === 100 ? 'success' : 'error';
};

// Main AgentScorecard Component
const AgentScorecard: React.FC<AgentScorecardProps> = ({
  evaluationResult,
  onClose,
  onRerun,
  className,
}) => {
  const { score, testRuns, redTeamResults, passed, duration } = evaluationResult;
  const [showRedTeam, setShowRedTeam] = useState(false);

  return (
    <Card className={cn('w-full overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">📋 智能体质检报告</CardTitle>
            {passed ? (
              <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                质检通过
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                需要修复
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRerun && (
              <Button variant="ghost" size="sm" onClick={onRerun}>
                <RotateCcw className="h-4 w-4 mr-1" />
                重新评估
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        {duration && (
          <p className="text-xs text-muted-foreground">
            评估耗时: {(duration / 1000).toFixed(1)}s
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="flex justify-center py-4">
          <CircularScoreDisplay score={score.overall} />
        </div>

        {/* Sub-scores Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ScoreItem
            icon={Brain}
            label="逻辑自洽度"
            value={score.logicCoherence}
            status={getScoreStatus(score.logicCoherence, 90)}
          />
          <ScoreItem
            icon={Shield}
            label="安全合规度"
            value={score.securityCompliance}
            status={getSecurityStatus(score.securityCompliance)}
          />
          <ScoreItem
            icon={MessageSquare}
            label="响应质量"
            value={score.responseQuality}
            status={getScoreStatus(score.responseQuality)}
          />
          <ScoreItem
            icon={Zap}
            label="响应速度"
            value={score.responseSpeedGrade}
            status={getSpeedStatus(score.responseSpeedGrade)}
          />
        </div>

        {/* Red Team Results */}
        {redTeamResults && (
          <div className="border rounded-lg overflow-hidden">
            <RedTeamResultsPanel
              results={redTeamResults}
              expanded={showRedTeam}
              onToggle={() => setShowRedTeam(!showRedTeam)}
            />
          </div>
        )}

        {/* Test Runs */}
        {testRuns && testRuns.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <TestRunsCollapsible testRuns={testRuns} />
          </div>
        )}

        {/* Final Verdict */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          className={cn(
            'p-4 rounded-lg text-center font-medium',
            passed
              ? 'bg-green-500/10 text-green-500 border border-green-500/30'
              : 'bg-destructive/10 text-destructive border border-destructive/30'
          )}
        >
          {passed ? (
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              <span>质检通过，可安全交付</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <XCircle className="h-5 w-5" />
              <span>质检未通过，需要修复后重新评估</span>
            </div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default AgentScorecard;
