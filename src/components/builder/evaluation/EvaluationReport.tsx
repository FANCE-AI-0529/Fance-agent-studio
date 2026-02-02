/**
 * @file EvaluationReport.tsx
 * @description 评估报告展示组件
 */

import { 
  CheckCircle, 
  XCircle, 
  Shield, 
  Target, 
  Clock,
  TrendingUp,
  AlertTriangle,
  Download,
  RefreshCw,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EvaluationResult, TestRunResult, RedTeamAttackResult } from '@/types/agentEvals';
import { cn } from '@/lib/utils';

interface EvaluationReportProps {
  result: EvaluationResult;
  onRerun?: () => void;
  onSave?: () => void;
}

export function EvaluationReport({ result, onRerun, onSave }: EvaluationReportProps) {
  const { score, testSummary, redTeamResults, passed, duration } = result;

  return (
    <div className="space-y-4">
      {/* 总体结果 */}
      <Card className={cn(
        'border-2',
        passed ? 'border-green-500/50' : 'border-destructive/50'
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {passed ? (
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold">
                  {passed ? '评估通过' : '评估未通过'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  综合评分: {score.overall}分 | 耗时: {Math.round(duration / 1000)}秒
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{score.overall}</div>
              <Badge variant={passed ? 'default' : 'destructive'}>
                {score.responseSpeedGrade}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 评分维度 */}
      <div className="grid grid-cols-3 gap-3">
        <ScoreCard 
          icon={Target}
          title="逻辑自洽"
          score={score.logicCoherence}
          threshold={70}
        />
        <ScoreCard 
          icon={Shield}
          title="安全合规"
          score={score.securityCompliance}
          threshold={95}
        />
        <ScoreCard 
          icon={TrendingUp}
          title="响应质量"
          score={score.responseQuality}
          threshold={60}
        />
      </div>

      {/* 响应速度 */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">平均响应时间</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold">{score.avgResponseTime}ms</span>
              <Badge variant="outline">{score.responseSpeedGrade}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 详细结果 Tabs */}
      <Tabs defaultValue="tests">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="tests" className="text-xs">
            功能测试 ({testSummary.passed}/{testSummary.total})
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs">
            安全测试 ({redTeamResults.attacksBlocked}/{redTeamResults.totalAttacks})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tests" className="mt-2">
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {result.testRuns.map((test) => (
                <TestResultItem key={test.testCaseId} result={test} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="security" className="mt-2">
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {redTeamResults.attacks.map((attack) => (
                <AttackResultItem key={attack.attackId} result={attack} />
              ))}
              {redTeamResults.vulnerabilities.length > 0 && (
                <Card className="border-destructive/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium">发现漏洞</span>
                    </div>
                    <ul className="text-xs space-y-1">
                      {redTeamResults.vulnerabilities.map((v, i) => (
                        <li key={i} className="text-destructive">{v}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        {onRerun && (
          <Button variant="outline" size="sm" onClick={onRerun} className="flex-1">
            <RefreshCw className="h-3 w-3 mr-1" />
            重新评估
          </Button>
        )}
        {onSave && (
          <Button size="sm" onClick={onSave} className="flex-1">
            <Save className="h-3 w-3 mr-1" />
            保存报告
          </Button>
        )}
      </div>
    </div>
  );
}

// 评分卡片
function ScoreCard({ 
  icon: Icon, 
  title, 
  score, 
  threshold 
}: { 
  icon: React.ElementType;
  title: string;
  score: number;
  threshold: number;
}) {
  const passed = score >= threshold;

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={cn(
            'h-4 w-4',
            passed ? 'text-green-500' : 'text-destructive'
          )} />
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold">{score}%</span>
          {passed ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
        <Progress 
          value={score} 
          className={cn('h-1 mt-2', !passed && '[&>div]:bg-destructive')}
        />
      </CardContent>
    </Card>
  );
}

// 测试结果项
function TestResultItem({ result }: { result: TestRunResult }) {
  return (
    <Card className={cn(
      result.passed ? 'border-green-500/30' : 'border-destructive/30'
    )}>
      <CardContent className="p-2">
        <div className="flex items-start gap-2">
          {result.passed ? (
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{result.testName}</p>
            <p className="text-xs text-muted-foreground">
              {result.duration}ms | 质量分: {result.qualityScore || 'N/A'}
            </p>
            {result.violations && result.violations.length > 0 && (
              <p className="text-xs text-destructive mt-1">
                违规: {result.violations.join(', ')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 攻击结果项
function AttackResultItem({ result }: { result: RedTeamAttackResult }) {
  return (
    <Card className={cn(
      result.blocked ? 'border-green-500/30' : 'border-destructive/30'
    )}>
      <CardContent className="p-2">
        <div className="flex items-start gap-2">
          {result.blocked ? (
            <Shield className="h-4 w-4 text-green-500 mt-0.5" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{result.attackName}</p>
              <Badge 
                variant={result.blocked ? 'outline' : 'destructive'} 
                className="text-xs"
              >
                {result.blocked ? '已拦截' : '未拦截'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              类型: {result.attackType} | {result.duration}ms
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
