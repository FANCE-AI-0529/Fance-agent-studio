/**
 * Skill Factory Pipeline — Real-time multi-agent eval loop progress UI
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Hammer,
  ShieldCheck,
  GitCompare,
  FlaskConical,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RotateCcw,
  Sparkles,
  Play,
} from 'lucide-react';
import { runSkillEvalLoop, type EvalLoopProgress, type EvalStage, type StageResult } from '@/services/skillEvalLoop';

const STAGE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  building:   { icon: Hammer,      label: 'Builder 构建',         color: 'text-blue-400' },
  analyzing:  { icon: ShieldCheck,  label: 'Analyzer 静态审查',   color: 'text-amber-400' },
  comparing:  { icon: GitCompare,   label: 'Comparator 冲突检测', color: 'text-purple-400' },
  grading:    { icon: FlaskConical,  label: 'Grader 沙箱测试',    color: 'text-cyan-400' },
  retrying:   { icon: RotateCcw,    label: '反馈重写中…',         color: 'text-orange-400' },
  finalizing: { icon: Sparkles,     label: '认证完成',             color: 'text-emerald-400' },
  complete:   { icon: CheckCircle2, label: '流水线通过 ✓',         color: 'text-emerald-400' },
  failed:     { icon: XCircle,      label: '流水线失败',           color: 'text-destructive' },
  idle:       { icon: Clock,        label: '待启动',               color: 'text-muted-foreground' },
};

function VerdictBadge({ verdict }: { verdict: string }) {
  if (verdict === 'pass') return <Badge variant="default" className="bg-emerald-600/20 text-emerald-400 border-emerald-600/30">PASS</Badge>;
  if (verdict === 'fail') return <Badge variant="destructive">FAIL</Badge>;
  if (verdict === 'pending') return <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin mr-1" />审查中</Badge>;
  return <Badge variant="outline">跳过</Badge>;
}

function StageRow({ result, isActive }: { result: StageResult; isActive: boolean }) {
  const meta = STAGE_META[result.stage] || STAGE_META.idle;
  const Icon = meta.icon;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-accent/10 border border-accent/20' : ''}`}>
      <div className={`mt-0.5 ${meta.color}`}>
        {isActive && result.verdict === 'pending' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-foreground">{meta.label}</span>
          <VerdictBadge verdict={result.verdict} />
          {result.durationMs > 0 && (
            <span className="text-xs text-muted-foreground">{(result.durationMs / 1000).toFixed(1)}s</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{result.report}</p>
      </div>
    </div>
  );
}

export function SkillFactoryPipeline() {
  const [request, setRequest] = useState('');
  const [progress, setProgress] = useState<EvalLoopProgress | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(async () => {
    if (!request.trim() || running) return;
    setRunning(true);
    setProgress(null);

    try {
      await runSkillEvalLoop(request, {
        maxAttempts: 3,
        passThreshold: 70,
        onProgress: (p) => setProgress({ ...p }),
      });
    } catch {
      // error already in progress state
    } finally {
      setRunning(false);
    }
  }, [request, running]);

  const currentMeta = STAGE_META[progress?.currentStage || 'idle'] || STAGE_META.idle;
  const CurrentIcon = currentMeta.icon;

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          技能锻造流水线
          {progress && (
            <Badge variant="outline" className="ml-auto text-xs">
              Attempt {progress.attempt}/{progress.maxAttempts}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Input */}
        <div className="space-y-2">
          <Textarea
            placeholder="描述你想要创建的技能，例如：「创建一个 Telegram 频道消息转发技能，支持关键词过滤」"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            disabled={running}
            rows={3}
            className="resize-none"
          />
          <Button
            onClick={handleRun}
            disabled={running || !request.trim()}
            className="w-full"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <CurrentIcon className={`h-4 w-4 mr-1 ${currentMeta.color}`} />
                {currentMeta.label}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                启动锻造流水线
              </>
            )}
          </Button>
        </div>

        {/* Pipeline Stages */}
        {progress && progress.stages.length > 0 && (
          <>
            <Separator />
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-2">
                {progress.stages.map((stage, i) => (
                  <StageRow
                    key={`${stage.stage}-${stage.timestamp.getTime()}-${i}`}
                    result={stage}
                    isActive={i === progress.stages.length - 1 && running}
                  />
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        {/* Final Result */}
        {progress?.finalVerdict === 'pass' && progress.skill && (
          <>
            <Separator />
            <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-600/10 border border-emerald-600/20">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-400">
                  技能 "{progress.skill.skillName}" 已通过全部审查 🏆
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  可安全部署至生产环境，等待 MPLP 授权确认。
                </p>
              </div>
            </div>
          </>
        )}

        {progress?.finalVerdict === 'fail' && (
          <>
            <Separator />
            <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <XCircle className="h-6 w-6 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  流水线未通过 — {progress.error}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  请根据审查报告调整需求后重试。
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
