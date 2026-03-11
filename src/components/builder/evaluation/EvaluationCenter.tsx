/**
 * @file EvaluationCenter.tsx
 * @description Agent 评估中心 - 提供系统性的评估 UI
 */

import { useState } from 'react';
import { 
  FlaskConical, 
  Play, 
  History, 
  Settings, 
  Shield, 
  Target,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card.tsx';
import { Button } from '../../ui/button.tsx';
import { Badge } from '../../ui/badge.tsx';
import { Progress } from '../../ui/progress.tsx';
import { ScrollArea } from '../../ui/scroll-area.tsx';
import { useAgentEvals } from '../../../hooks/useAgentEvals.ts';
import { TestSetManager } from './TestSetManager.tsx';
import { EvaluationRunner } from './EvaluationRunner.tsx';
import { EvaluationReport } from './EvaluationReport.tsx';
import { cn } from '../../../lib/utils.ts';

interface EvaluationCenterProps {
  agentId: string;
  agentConfig: {
    name: string;
    systemPrompt?: string;
    department?: string;
    model?: string;
  };
  onClose?: () => void;
}

export function EvaluationCenter({ agentId, agentConfig, onClose }: EvaluationCenterProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const {
    isEvaluating,
    currentStep,
    progress,
    events,
    evaluationResult,
    evaluationHistory,
    isLoadingHistory,
    runEvaluation,
    runRedTeamTests,
    generateTestCases,
    reset,
    fetchEvaluationHistory,
    saveEvaluation,
  } = useAgentEvals();

  // 开始完整评估
  const handleStartEvaluation = async (evalType: 'pre_deploy' | 'scheduled' | 'manual') => {
    setActiveTab('running');
    await runEvaluation({
      agentId,
      agentConfig,
      evalType,
      includeRedTeam: true,
    });
    setActiveTab('report');
  };

  // 快速红队测试
  const handleQuickRedTeam = async () => {
    setActiveTab('running');
    await runRedTeamTests(agentConfig);
    setActiveTab('report');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Agent 评估中心</h2>
        </div>
        <Badge variant="outline">{agentConfig.name}</Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid grid-cols-4">
          <TabsTrigger value="overview" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            概览
          </TabsTrigger>
          <TabsTrigger value="tests" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            测试集
          </TabsTrigger>
          <TabsTrigger value="running" className="text-xs" disabled={!isEvaluating}>
            <Play className="h-3 w-3 mr-1" />
            执行中
          </TabsTrigger>
          <TabsTrigger value="report" className="text-xs" disabled={!evaluationResult}>
            <TrendingUp className="h-3 w-3 mr-1" />
            报告
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="flex-1">
          {/* 概览 */}
          <TabsContent value="overview" className="p-4 space-y-4">
            {/* 快速操作 */}
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => handleStartEvaluation('pre_deploy')}
                disabled={isEvaluating}
                className="h-auto py-4 flex-col gap-2"
              >
                <Play className="h-5 w-5" />
                <div className="text-center">
                  <div className="text-sm font-medium">完整评估</div>
                  <div className="text-xs opacity-70">功能 + 安全 + 性能</div>
                </div>
              </Button>
              <Button 
                variant="outline"
                onClick={handleQuickRedTeam}
                disabled={isEvaluating}
                className="h-auto py-4 flex-col gap-2"
              >
                <Shield className="h-5 w-5" />
                <div className="text-center">
                  <div className="text-sm font-medium">安全扫描</div>
                  <div className="text-xs opacity-70">红队对抗测试</div>
                </div>
              </Button>
            </div>

            {/* 评估维度说明 */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">评估维度</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <DimensionItem 
                  icon={Target}
                  title="逻辑自洽度"
                  description="验证回答的准确性和一致性"
                  weight={35}
                />
                <DimensionItem 
                  icon={Shield}
                  title="安全合规度"
                  description="检测并拦截危险请求"
                  weight={40}
                />
                <DimensionItem 
                  icon={CheckCircle}
                  title="响应质量"
                  description="评估回答的完整性和相关性"
                  weight={25}
                />
                <DimensionItem 
                  icon={Clock}
                  title="响应速度"
                  description="测量平均响应时间"
                  weight={0}
                  extra="附加指标"
                />
              </CardContent>
            </Card>

            {/* 最近评估历史 */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">最近评估</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => fetchEvaluationHistory(agentId)}>
                    <History className="h-3 w-3 mr-1" />
                    刷新
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {evaluationHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    暂无评估记录
                  </p>
                ) : (
                  <div className="space-y-2">
                    {evaluationHistory.slice(0, 3).map((result) => (
                      <div 
                        key={result.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {result.passed ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{result.score.overall}分</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(result.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={result.passed ? 'default' : 'destructive'}>
                          {result.passed ? '通过' : '未通过'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 测试集管理 */}
          <TabsContent value="tests" className="p-4">
            <TestSetManager 
              agentId={agentId}
              agentConfig={agentConfig}
              onGenerateTests={generateTestCases}
            />
          </TabsContent>

          {/* 执行中 */}
          <TabsContent value="running" className="p-4">
            <EvaluationRunner 
              isRunning={isEvaluating}
              currentStep={currentStep}
              progress={progress}
              events={events}
            />
          </TabsContent>

          {/* 报告 */}
          <TabsContent value="report" className="p-4">
            {evaluationResult ? (
              <EvaluationReport 
                result={evaluationResult}
                onRerun={() => handleStartEvaluation('manual')}
                onSave={() => saveEvaluation(evaluationResult)}
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>运行评估后查看报告</p>
              </div>
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// 评估维度项
function DimensionItem({ 
  icon: Icon, 
  title, 
  description, 
  weight,
  extra,
}: { 
  icon: React.ElementType;
  title: string;
  description: string;
  weight: number;
  extra?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 rounded bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {weight > 0 ? (
            <Badge variant="outline" className="text-xs">
              {weight}%
            </Badge>
          ) : (
            extra && <Badge variant="secondary" className="text-xs">{extra}</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
