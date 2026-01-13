// =====================================================
// 构建计划实时可视化组件
// Build Plan Viewer - Real-time Markdown Style Display
// =====================================================

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Circle,
  Loader2,
  XCircle,
  SkipForward,
  ChevronRight,
  FileCode2,
  Database,
  Sparkles,
  Package,
  TestTube2,
  AlertTriangle,
  ClipboardCheck,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBuildPlanStore } from '@/stores/buildPlanStore';
import { BuildPlan, BuildPhaseStatus } from '@/types/buildPlan';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

// 阶段图标映射
const PHASE_ICONS: Record<keyof BuildPlan['phases'], React.ElementType> = {
  intentAnalysis: Sparkles,
  assetCheck: Database,
  gapAnalysis: AlertTriangle,
  skillGeneration: FileCode2,
  assembly: Package,
  validation: TestTube2,
  evaluation: ClipboardCheck,
};

// 状态颜色映射
const STATUS_STYLES: Record<BuildPhaseStatus, { icon: React.ElementType; color: string }> = {
  pending: { icon: Circle, color: 'text-muted-foreground' },
  running: { icon: Loader2, color: 'text-primary' },
  completed: { icon: CheckCircle2, color: 'text-green-500' },
  failed: { icon: XCircle, color: 'text-destructive' },
  skipped: { icon: SkipForward, color: 'text-muted-foreground' },
};

interface BuildPlanViewerProps {
  className?: string;
  showEvents?: boolean;
  compact?: boolean;
}

export function BuildPlanViewer({
  className,
  showEvents = true,
  compact = false,
}: BuildPlanViewerProps) {
  const { currentPlan, events, isBuilding } = useBuildPlanStore();

  const phaseOrder: Array<keyof BuildPlan['phases']> = [
    'intentAnalysis',
    'assetCheck',
    'gapAnalysis',
    'skillGeneration',
    'assembly',
    'validation',
    'evaluation',
  ];

  const completedCount = useMemo(() => {
    if (!currentPlan) return 0;
    return phaseOrder.filter(
      (key) => currentPlan.phases[key].status === 'completed'
    ).length;
  }, [currentPlan]);

  if (!currentPlan) {
    return null;
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">build_plan.md</span>
          </div>
          <Badge variant="outline" className="text-xs">
            {completedCount}/{phaseOrder.length} 完成
          </Badge>
        </div>
        {isBuilding && (
          <motion.div
            className="mt-2 h-1 bg-muted rounded-full overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / phaseOrder.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 font-mono text-sm">
          {/* Plan Header */}
          <div className="text-muted-foreground">
            <span className="text-primary"># Build Plan</span>
            <div className="mt-1 text-xs opacity-70">
              {new Date(currentPlan.createdAt).toLocaleString()}
            </div>
          </div>

          {/* Phases */}
          <div className="space-y-2">
            {phaseOrder.map((phaseKey, index) => {
              const phase = currentPlan.phases[phaseKey];
              const PhaseIcon = PHASE_ICONS[phaseKey];
              const { icon: StatusIcon, color } = STATUS_STYLES[phase.status];

              return (
                <motion.div
                  key={phaseKey}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'group',
                    phase.status === 'running' && 'bg-primary/5 rounded-lg p-2 -mx-2'
                  )}
                >
                  {/* Phase Line */}
                  <div className="flex items-center gap-2">
                    <StatusIcon
                      className={cn(
                        'h-4 w-4 flex-shrink-0',
                        color,
                        phase.status === 'running' && 'animate-spin'
                      )}
                    />
                    <span
                      className={cn(
                        'flex-1',
                        phase.status === 'completed' && 'line-through opacity-60',
                        phase.status === 'running' && 'text-primary font-medium',
                        phase.status === 'failed' && 'text-destructive'
                      )}
                    >
                      {phase.name}
                    </span>
                    <PhaseIcon className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                  </div>

                  {/* Phase Details */}
                  <AnimatePresence>
                    {(phase.details || phase.error) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="ml-6 mt-1 text-xs"
                      >
                        {phase.error ? (
                          <span className="text-destructive">{phase.error}</span>
                        ) : (
                          <span className="text-muted-foreground">{phase.details}</span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* SubTasks */}
                  {phase.subTasks && phase.subTasks.length > 0 && (
                    <div className="ml-6 mt-1 space-y-1">
                      {phase.subTasks.map((subTask) => (
                        <div key={subTask.id} className="flex items-center gap-2 text-xs">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <span
                            className={cn(
                              'text-muted-foreground',
                              subTask.status === 'completed' && 'line-through opacity-60'
                            )}
                          >
                            {subTask.name}
                          </span>
                          {subTask.result && (
                            <span className="text-green-500 ml-auto">→ {subTask.result}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Extracted Intent */}
          {currentPlan.extractedIntent && (
            <div className="pt-2 border-t border-border">
              <div className="text-primary mb-1">## Extracted Intent</div>
              <div className="text-xs space-y-1 text-muted-foreground">
                <div>
                  <span className="text-foreground">Role:</span>{' '}
                  {currentPlan.extractedIntent.role}
                </div>
                <div>
                  <span className="text-foreground">Actions:</span>{' '}
                  {currentPlan.extractedIntent.actions.join(', ')}
                </div>
                <div>
                  <span className="text-foreground">Risk:</span>{' '}
                  <Badge
                    variant={
                      currentPlan.extractedIntent.riskLevel === 'high'
                        ? 'destructive'
                        : currentPlan.extractedIntent.riskLevel === 'medium'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="text-[10px] py-0"
                  >
                    {currentPlan.extractedIntent.riskLevel}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Asset Check Result */}
          {currentPlan.assetCheckResult && (
            <div className="pt-2 border-t border-border">
              <div className="text-primary mb-1">## Asset Check</div>
              <div className="text-xs space-y-1">
                {currentPlan.assetCheckResult.matchedAssets.slice(0, 5).map((asset) => (
                  <div key={asset.id} className="flex items-center gap-2 text-muted-foreground">
                    <span className="uppercase text-[10px] w-8 text-center opacity-60">
                      {asset.type}
                    </span>
                    <span className="flex-1 truncate">{asset.name}</span>
                    <span
                      className={cn(
                        'text-[10px]',
                        asset.score > 0.7 ? 'text-green-500' : 'text-yellow-500'
                      )}
                    >
                      ({(asset.score * 100).toFixed(0)}%)
                    </span>
                    <span className="text-[10px]">
                      → {asset.action === 'use' ? '✓ Use' : asset.action === 'generate' ? '⚡ Gen' : '○ Skip'}
                    </span>
                  </div>
                ))}
                {currentPlan.assetCheckResult.needsGeneration && (
                  <div className="text-yellow-500 flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    <span>需要生成缺失技能</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Generated Skills */}
          {currentPlan.generatedSkills && currentPlan.generatedSkills.length > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="text-primary mb-1">## Generated Skills</div>
              <div className="text-xs space-y-1">
                {currentPlan.generatedSkills.map((skill) => (
                  <div key={skill.id} className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-yellow-500" />
                    <span className="text-foreground">{skill.name}</span>
                    <span className="text-[10px] opacity-60 truncate">
                      - {skill.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Result */}
          {currentPlan.validationResult && (
            <div className="pt-2 border-t border-border">
              <div className="text-primary mb-1">## Validation</div>
              <div className="text-xs">
                {currentPlan.validationResult.passed ? (
                  <div className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>沙箱验证通过</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-3 w-3" />
                    <span>
                      验证失败 (重试 {currentPlan.validationResult.retryCount}/3)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evaluation Result */}
          {currentPlan.evaluationResult && (
            <div className="pt-2 border-t border-border">
              <div className="text-primary mb-1">## Agent 质检报告</div>
              <div className="text-xs space-y-2">
                {/* 综合评分 */}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">综合评分:</span>
                  <span className={cn(
                    'font-bold',
                    currentPlan.evaluationResult.score.overall >= 80 ? 'text-green-500' :
                    currentPlan.evaluationResult.score.overall >= 60 ? 'text-yellow-500' : 'text-destructive'
                  )}>
                    {currentPlan.evaluationResult.score.overall.toFixed(0)}分
                  </span>
                </div>
                
                {/* 分项评分 */}
                <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    逻辑自洽: {currentPlan.evaluationResult.score.logicCoherence.toFixed(0)}%
                  </div>
                  <div className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    安全合规: {currentPlan.evaluationResult.score.securityCompliance.toFixed(0)}%
                  </div>
                </div>
                
                {/* 红队测试 */}
                {currentPlan.evaluationResult.redTeamResults && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">红队测试:</span>
                    <span className={cn(
                      currentPlan.evaluationResult.redTeamResults.securityScore === 100 
                        ? 'text-green-500' : 'text-destructive'
                    )}>
                      {currentPlan.evaluationResult.redTeamResults.attacksBlocked}/
                      {currentPlan.evaluationResult.redTeamResults.totalAttacks} 攻击已拦截
                    </span>
                  </div>
                )}
                
                {/* 通过状态 */}
                <div className={cn(
                  'flex items-center gap-2 pt-1',
                  currentPlan.evaluationResult.passed ? 'text-green-500' : 'text-destructive'
                )}>
                  {currentPlan.evaluationResult.passed ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      <span>质检通过，可安全交付</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3" />
                      <span>质检未通过，需要修复</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event Log */}
        {showEvents && events.length > 0 && !compact && (
          <div className="px-4 pb-4">
            <div className="border-t border-border pt-3">
              <div className="text-xs text-muted-foreground mb-2">事件日志</div>
              <div className="space-y-1 max-h-32 overflow-auto">
                {events.slice(-10).map((event, i) => (
                  <div key={i} className="text-[10px] flex items-start gap-2">
                    <span className="text-muted-foreground opacity-50">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={cn(
                        event.type === 'error' && 'text-destructive',
                        event.type === 'success' && 'text-green-500',
                        event.type === 'warning' && 'text-yellow-500'
                      )}
                    >
                      {event.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default BuildPlanViewer;
