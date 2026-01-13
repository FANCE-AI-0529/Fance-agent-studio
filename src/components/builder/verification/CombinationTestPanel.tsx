// =====================================================
// 组合测试面板 - Combination Test Panel
// 地狱级组合能力验收界面
// =====================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Skull, 
  Flame, 
  Play, 
  CheckCircle2, 
  XCircle,
  Loader2,
  RotateCcw,
  FileText,
  Lightbulb,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useCombinationVerification } from '@/hooks/useCombinationVerification';
import { TopologyCheckResult } from './TopologyCheckResult';
import { DataFlowVisualization } from './DataFlowVisualization';
import type { HellTestScenario, VerificationResult, NodeSpec } from '@/types/verificationTypes';

interface CombinationTestPanelProps {
  className?: string;
  onApplyResult?: (result: VerificationResult) => void;
}

export function CombinationTestPanel({ className, onApplyResult }: CombinationTestPanelProps) {
  const {
    scenarios,
    isRunning,
    currentScenario,
    result,
    progress,
    runVerification,
    reset,
  } = useCombinationVerification();

  const [selectedTab, setSelectedTab] = useState('overview');

  // 从 DSL 提取节点
  const extractNodes = (dsl: any): NodeSpec[] => {
    const nodes: NodeSpec[] = [];
    for (const stage of dsl?.stages || []) {
      nodes.push(...(stage.nodes || []));
      if (stage.branches) {
        for (const branch of stage.branches) {
          nodes.push(...(branch.nodes || []));
        }
      }
    }
    return nodes;
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-destructive" />
              地狱级组合测试
            </CardTitle>
            <CardDescription className="mt-1">
              验证系统是否能同时调动所有模块生成复杂工作流
            </CardDescription>
          </div>
          {result && (
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              重新测试
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 场景选择 */}
        {!result && !isRunning && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scenarios.map((scenario: HellTestScenario) => (
              <motion.div
                key={scenario.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card 
                  className="cursor-pointer transition-all hover:border-primary/50 h-full"
                  onClick={() => runVerification(scenario.id)}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Flame className="h-4 w-4 text-orange-500" />
                      {scenario.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {scenario.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {scenario.expectedTopology.requiredNodes.slice(0, 3).map((node, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px]">
                          {node.type}
                        </Badge>
                      ))}
                      {scenario.expectedTopology.requiredNodes.length > 3 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{scenario.expectedTopology.requiredNodes.length - 3}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* 验证进度 */}
        {isRunning && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{progress.phase}</span>
                  <span className="text-sm text-muted-foreground">{progress.percent}%</span>
                </div>
                <Progress value={progress.percent} className="h-2" />
              </div>
            </div>
            
            {currentScenario && (
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-sm">{currentScenario.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {currentScenario.input.slice(0, 150)}...
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 验证结果 */}
        {result && (
          <div className="space-y-6">
            {/* 总分 */}
            <div className="flex items-center gap-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
                className={cn(
                  "text-5xl font-bold",
                  result.passed ? "text-green-400" : "text-red-400"
                )}
              >
                {Math.round(result.score * 100)}%
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge 
                    variant={result.passed ? "default" : "destructive"}
                    className="text-sm"
                  >
                    {result.passed ? (
                      <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> 通过</>
                    ) : (
                      <><XCircle className="h-3.5 w-3.5 mr-1" /> 未通过</>
                    )}
                  </Badge>
                  {result.blueprintUsed && (
                    <Badge variant="secondary" className="text-xs">
                      蓝图: {result.blueprintUsed}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {result.scenario.name} · {result.duration}ms
                </p>
              </div>
              {onApplyResult && result.passed && (
                <Button onClick={() => onApplyResult(result)}>
                  应用结果
                </Button>
              )}
            </div>

            {/* 详细结果标签页 */}
            <Tabs value={selectedTab} onValueChange={setSelectedTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="overview" className="text-xs">
                  <BarChart3 className="h-3.5 w-3.5 mr-1" />
                  概览
                </TabsTrigger>
                <TabsTrigger value="topology" className="text-xs">
                  拓扑
                </TabsTrigger>
                <TabsTrigger value="dataflow" className="text-xs">
                  数据流
                </TabsTrigger>
                <TabsTrigger value="suggestions" className="text-xs">
                  <Lightbulb className="h-3.5 w-3.5 mr-1" />
                  建议
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                {/* 三项检查概览 */}
                <div className="grid grid-cols-3 gap-4">
                  {/* 拓扑检查 */}
                  <Card className={cn(
                    "border-2",
                    result.topologyCheck.passed 
                      ? "border-green-500/30 bg-green-500/5" 
                      : "border-red-500/30 bg-red-500/5"
                  )}>
                    <CardContent className="pt-4 text-center">
                      {result.topologyCheck.passed ? (
                        <CheckCircle2 className="h-8 w-8 mx-auto text-green-400 mb-2" />
                      ) : (
                        <XCircle className="h-8 w-8 mx-auto text-red-400 mb-2" />
                      )}
                      <div className="text-sm font-medium">拓扑检查</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {result.topologyCheck.foundNodes.length}/{result.topologyCheck.foundNodes.length + result.topologyCheck.missingNodes.length} 节点
                      </div>
                    </CardContent>
                  </Card>

                  {/* Manus 检查 */}
                  <Card className={cn(
                    "border-2",
                    result.manusCheck.passed 
                      ? "border-green-500/30 bg-green-500/5" 
                      : "border-yellow-500/30 bg-yellow-500/5"
                  )}>
                    <CardContent className="pt-4 text-center">
                      {result.manusCheck.passed ? (
                        <CheckCircle2 className="h-8 w-8 mx-auto text-green-400 mb-2" />
                      ) : (
                        <AlertTriangle className="h-8 w-8 mx-auto text-yellow-400 mb-2" />
                      )}
                      <div className="text-sm font-medium">Manus 合规</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {result.manusCheck.operationsCovered.length} 操作已覆盖
                      </div>
                    </CardContent>
                  </Card>

                  {/* 连线检查 */}
                  <Card className={cn(
                    "border-2",
                    result.wiringCheck.passed 
                      ? "border-green-500/30 bg-green-500/5" 
                      : "border-red-500/30 bg-red-500/5"
                  )}>
                    <CardContent className="pt-4 text-center">
                      {result.wiringCheck.passed ? (
                        <CheckCircle2 className="h-8 w-8 mx-auto text-green-400 mb-2" />
                      ) : (
                        <XCircle className="h-8 w-8 mx-auto text-red-400 mb-2" />
                      )}
                      <div className="text-sm font-medium">连线验证</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {Math.round(result.wiringCheck.coveragePercent * 100)}% 覆盖
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* 警告列表 */}
                {result.warnings.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                        警告 ({result.warnings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-1">
                          {result.warnings.map((warning, idx) => (
                            <div 
                              key={idx}
                              className="text-xs py-1.5 px-2 rounded bg-yellow-500/10 text-yellow-400"
                            >
                              {warning}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="topology" className="mt-4">
                <TopologyCheckResult result={result.topologyCheck} />
              </TabsContent>

              <TabsContent value="dataflow" className="mt-4">
                <DataFlowVisualization
                  paths={result.dataFlow.paths}
                  nodes={extractNodes(result.generatedDSL)}
                  highlightedPath={result.dataFlow.highlightedPath}
                />
              </TabsContent>

              <TabsContent value="suggestions" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-400" />
                      改进建议
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {result.suggestions.length > 0 ? (
                      <div className="space-y-2">
                        {result.suggestions.map((suggestion, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-start gap-2 p-2 rounded-lg bg-muted/30"
                          >
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[10px] font-medium text-primary">
                                {idx + 1}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {suggestion}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
                        <p className="text-sm">太棒了！没有需要改进的地方。</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CombinationTestPanel;
