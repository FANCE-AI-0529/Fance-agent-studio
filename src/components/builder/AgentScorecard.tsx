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
  X,
  History,
  Wrench,
  Loader2,
  Stethoscope,
  ArrowUp,
  CircleDot
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { EvaluationResult, AgentScore, TestRunResult, SpeedGrade, TestCategory } from '@/types/agentEvals';
import RedTeamResultsPanel from './RedTeamResultsPanel';
import EvalHistoryPanel from './EvalHistoryPanel';
import type { DiagnosisResult, AutoFixProgress } from '@/hooks/useEvalDiagnosis';

interface AgentScorecardProps {
  evaluationResult: EvaluationResult;
  agentId?: string;
  onClose?: () => void;
  onRerun?: () => void;
  showHistory?: boolean;
  onSelectHistoryEval?: (result: EvaluationResult) => void;
  // Diagnosis & auto-fix props
  diagnosisResult?: DiagnosisResult | null;
  isDiagnosing?: boolean;
  autoFixProgress?: AutoFixProgress;
  onAutoFix?: () => void;
  onDiagnose?: () => void;
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

// Diagnosis Panel Component
interface DiagnosisPanelProps {
  diagnosis: DiagnosisResult;
  autoFixProgress?: AutoFixProgress;
  onAutoFix?: () => void;
  isDiagnosing?: boolean;
}

const DiagnosisPanel: React.FC<DiagnosisPanelProps> = ({
  diagnosis,
  autoFixProgress,
  onAutoFix,
  isDiagnosing,
}) => {
  const areaIcons: Record<string, React.ElementType> = {
    security: Shield,
    logic: Brain,
    quality: MessageSquare,
    unknown: AlertTriangle,
  };

  const areaColors: Record<string, string> = {
    security: 'text-red-400 bg-red-500/10 border-red-500/20',
    logic: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    quality: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    unknown: 'text-muted-foreground bg-muted/50 border-border',
  };

  const isAutoFixing = autoFixProgress && autoFixProgress.phase !== 'idle' && autoFixProgress.phase !== 'complete' && autoFixProgress.phase !== 'escalated';

  const phaseLabels: Record<string, string> = {
    diagnosing: '诊断中',
    patching: '修补提示词',
    regenerating: '重新生成',
    revalidating: '重新验证',
    retesting: '重新质检',
    complete: '修复完成',
    escalated: '需人工介入',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Summary */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
        <Stethoscope className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">AI 诊断结果</p>
          <p className="text-xs text-muted-foreground mt-1">{diagnosis.summary}</p>
        </div>
      </div>

      {/* Critical Issues */}
      {diagnosis.criticalIssues.length > 0 && (
        <div className="space-y-2">
          {diagnosis.criticalIssues.map((issue, idx) => {
            const Icon = areaIcons[issue.area] || AlertTriangle;
            const colors = areaColors[issue.area] || areaColors.unknown;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={cn('p-3 rounded-lg border text-sm', colors)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="font-medium">{issue.issue}</span>
                  {issue.estimatedImprovement > 0 && (
                    <Badge variant="outline" className="text-[10px] ml-auto gap-0.5 shrink-0">
                      <ArrowUp className="h-2.5 w-2.5" />
                      +{issue.estimatedImprovement}
                    </Badge>
                  )}
                </div>
                <p className="text-xs opacity-80 pl-5">{issue.fix}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Estimated improvement */}
      {diagnosis.estimatedImprovement.overall > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <ArrowUp className="h-3 w-3 text-green-500" />
          预估提升: 综合 +{diagnosis.estimatedImprovement.overall}
          {diagnosis.estimatedImprovement.security > 0 && ` | 安全 +${diagnosis.estimatedImprovement.security}`}
          {diagnosis.estimatedImprovement.quality > 0 && ` | 质量 +${diagnosis.estimatedImprovement.quality}`}
        </div>
      )}

      {/* Auto-fix progress */}
      {isAutoFixing && autoFixProgress && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="text-sm font-medium text-primary">
              {phaseLabels[autoFixProgress.phase] || autoFixProgress.phase}
            </span>
            <span className="text-xs text-muted-foreground ml-auto">
              {autoFixProgress.attempt}/{autoFixProgress.maxAttempts}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{autoFixProgress.message}</p>
          <Progress value={(autoFixProgress.attempt / autoFixProgress.maxAttempts) * 100} className="h-1" />
        </div>
      )}

      {/* Auto-fix complete */}
      {autoFixProgress?.phase === 'complete' && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          {autoFixProgress.message}
        </div>
      )}

      {/* Escalated */}
      {autoFixProgress?.phase === 'escalated' && (
        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {autoFixProgress.message}
        </div>
      )}

      {/* Auto-fix button */}
      {diagnosis.autoFixable && onAutoFix && !isAutoFixing && autoFixProgress?.phase !== 'complete' && (
        <Button
          onClick={onAutoFix}
          className="w-full gap-2"
          variant="default"
          size="sm"
        >
          <Wrench className="h-4 w-4" />
          🔧 AI 自动修复
        </Button>
      )}
    </motion.div>
  );
};

// Main AgentScorecard Component
const AgentScorecard: React.FC<AgentScorecardProps> = ({
  evaluationResult,
  agentId,
  onClose,
  onRerun,
  showHistory = false,
  onSelectHistoryEval,
  diagnosisResult,
  isDiagnosing,
  autoFixProgress,
  onAutoFix,
  onDiagnose,
  className,
}) => {
  const { score, testRuns, redTeamResults, passed, duration } = evaluationResult;
  const [showRedTeam, setShowRedTeam] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

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
            {showHistory && agentId && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowHistoryPanel(!showHistoryPanel)}
              >
                <History className="h-4 w-4 mr-1" />
                历史
              </Button>
            )}
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

        {/* History Panel */}
        <AnimatePresence>
          {showHistoryPanel && agentId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="border rounded-lg p-4 overflow-hidden"
            >
              <EvalHistoryPanel
                agentId={agentId}
                currentEvaluationId={evaluationResult.id}
                onSelectEvaluation={(result) => {
                  onSelectHistoryEval?.(result);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Diagnosis Panel - shown when eval failed */}
        {!passed && (diagnosisResult || isDiagnosing) && (
          <DiagnosisPanel
            diagnosis={diagnosisResult || { summary: '正在分析...', criticalIssues: [], promptPatches: [], estimatedImprovement: { security: 0, logic: 0, quality: 0, overall: 0 }, autoFixable: false }}
            autoFixProgress={autoFixProgress}
            onAutoFix={onAutoFix}
            isDiagnosing={isDiagnosing}
          />
        )}

        {/* Diagnose button when no diagnosis yet and failed */}
        {!passed && !diagnosisResult && !isDiagnosing && onDiagnose && (
          <Button
            onClick={onDiagnose}
            variant="outline"
            className="w-full gap-2"
            size="sm"
          >
            <Stethoscope className="h-4 w-4" />
            AI 智能诊断
          </Button>
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
