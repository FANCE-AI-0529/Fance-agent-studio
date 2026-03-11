/**
 * @file IntentAnalysisPanel.tsx
 * @description 意图分析面板 - 增强版意图追踪
 */

import { useState, useMemo } from 'react';
import { 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  History,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Progress } from '../ui/progress.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible.tsx';
import { IntentHeatmap } from './IntentHeatmap.tsx';
import { useIntentDrift } from '../../hooks/useIntentDrift.ts';
import { cn } from '../../lib/utils.ts';

interface IntentAnalysisPanelProps {
  agentId?: string;
  className?: string;
}

interface IntentRecord {
  turn: number;
  intent: string;
  confidence: number;
  driftScore: number;
  timestamp: string;
}

export function IntentAnalysisPanel({ agentId, className }: IntentAnalysisPanelProps) {
  const { analyzeIntentHistory, resetSession, currentTurn, hasOriginalIntent } = useIntentDrift(agentId);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{
    totalTurns: number;
    driftEvents: number;
    avgDeltaScore: number;
    trend: string;
    recentHistory: Array<{
      turnNumber: number;
      originalIntent: string;
      currentIntent: string;
      deltaScore: number;
      driftDetected: boolean;
    }>;
  } | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    realtime: true,
    history: true,
    heatmap: false,
  });

  // 模拟实时意图数据
  const realtimeIntents: IntentRecord[] = useMemo(() => [
    { turn: 1, intent: '产品咨询', confidence: 0.92, driftScore: 1.0, timestamp: '10:30:15' },
    { turn: 2, intent: '产品咨询', confidence: 0.88, driftScore: 0.95, timestamp: '10:30:45' },
    { turn: 3, intent: '价格询问', confidence: 0.75, driftScore: 0.78, timestamp: '10:31:20' },
    { turn: 4, intent: '竞品对比', confidence: 0.82, driftScore: 0.65, timestamp: '10:32:00' },
    { turn: 5, intent: '购买决策', confidence: 0.70, driftScore: 0.55, timestamp: '10:33:10' },
  ], []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeIntentHistory();
      if (result) {
        setAnalysis(result);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 计算统计数据
  const stats = useMemo(() => {
    const driftCount = realtimeIntents.filter(i => i.driftScore < 0.7).length;
    const avgConfidence = realtimeIntents.reduce((acc, i) => acc + i.confidence, 0) / realtimeIntents.length;
    const avgDrift = realtimeIntents.reduce((acc, i) => acc + i.driftScore, 0) / realtimeIntents.length;
    
    return {
      totalTurns: realtimeIntents.length,
      driftCount,
      avgConfidence: Math.round(avgConfidence * 100),
      avgDrift: Math.round(avgDrift * 100),
      trend: avgDrift > 0.7 ? 'stable' : avgDrift > 0.5 ? 'drifting' : 'diverged',
    };
  }, [realtimeIntents]);

  const trendConfig = {
    stable: { label: '稳定', color: 'text-green-500', bg: 'bg-green-500/10' },
    drifting: { label: '偏移', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    diverged: { label: '偏离', color: 'text-red-500', bg: 'bg-red-500/10' },
  };

  const trend = trendConfig[stats.trend as keyof typeof trendConfig];

  return (
    <div className={cn('space-y-4', className)}>
      {/* 概览卡片 */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              意图分析
            </CardTitle>
            <Badge variant="outline" className={trend.color}>
              {trend.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-bold">{stats.totalTurns}</div>
              <div className="text-xs text-muted-foreground">对话轮次</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-bold">{stats.avgConfidence}%</div>
              <div className="text-xs text-muted-foreground">平均置信度</div>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <div className={cn('text-lg font-bold', trend.color)}>
                {stats.avgDrift}%
              </div>
              <div className="text-xs text-muted-foreground">意图一致性</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 实时意图追踪 */}
      <Collapsible 
        open={expandedSections.realtime} 
        onOpenChange={() => toggleSection('realtime')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  实时意图置信度
                </CardTitle>
                {expandedSections.realtime ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-2">
                {realtimeIntents.map((record, index) => (
                  <div 
                    key={index}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg',
                      record.driftScore < 0.7 ? 'bg-yellow-500/10' : 'bg-muted/50'
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                      {record.turn}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{record.intent}</span>
                        <span className="text-xs text-muted-foreground">{record.timestamp}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Progress 
                          value={record.confidence * 100} 
                          className="h-1 flex-1"
                        />
                        <span className="text-xs w-10 text-right">
                          {Math.round(record.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    {record.driftScore < 0.7 && (
                      <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 意图热力图 */}
      <Collapsible 
        open={expandedSections.heatmap} 
        onOpenChange={() => toggleSection('heatmap')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  意图分类热力图
                </CardTitle>
                {expandedSections.heatmap ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <IntentHeatmap data={realtimeIntents} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 历史分析 */}
      <Collapsible 
        open={expandedSections.history} 
        onOpenChange={() => toggleSection('history')}
      >
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" />
                  历史模式分析
                </CardTitle>
                {expandedSections.history ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              <Button 
                size="sm" 
                variant="outline" 
                className="w-full"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !agentId}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-3 w-3 mr-1" />
                    运行历史分析
                  </>
                )}
              </Button>

              {analysis ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">总对话轮次</span>
                    <span className="font-medium">{analysis.totalTurns}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">漂移事件</span>
                    <span className="font-medium">{analysis.driftEvents}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
                    <span className="text-muted-foreground">平均偏离得分</span>
                    <span className="font-medium">{Math.round(analysis.avgDeltaScore * 100)}%</span>
                  </div>
                  <div className="p-2 rounded bg-primary/5 border border-primary/20">
                    <div className="flex items-center gap-1 text-sm font-medium mb-1">
                      <Info className="h-3 w-3" />
                      趋势分析
                    </div>
                    <p className="text-xs text-muted-foreground">{analysis.trend}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  点击上方按钮运行历史分析
                </p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-1"
          onClick={resetSession}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          重置会话
        </Button>
      </div>
    </div>
  );
}
