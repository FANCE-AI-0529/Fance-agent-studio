/**
 * @file PromptABTest.tsx
 * @description Prompt A/B 测试组件
 */

import { useState } from 'react';
import { 
  GitCompare, 
  Play, 
  Loader2,
  CheckCircle,
  XCircle,
  BarChart,
  Clock,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import { Textarea } from '../ui/textarea.tsx';
import { Label } from '../ui/label.tsx';
import { Input } from '../ui/input.tsx';
import { Progress } from '../ui/progress.tsx';
import { cn } from '../../lib/utils.ts';

interface PromptABTestProps {
  currentPrompt: string;
  agentName?: string;
}

interface TestResult {
  promptId: 'A' | 'B';
  response: string;
  latency: number;
  tokenCount: number;
  qualityScore: number;
}

interface TestCase {
  id: string;
  input: string;
  results?: {
    A: TestResult;
    B: TestResult;
  };
}

export function PromptABTest({ currentPrompt, agentName }: PromptABTestProps) {
  const [promptA, setPromptA] = useState(currentPrompt);
  const [promptB, setPromptB] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: '1', input: '你好，请介绍一下你自己' },
    { id: '2', input: '帮我解决一个问题' },
    { id: '3', input: '这个产品怎么样？' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [newTestInput, setNewTestInput] = useState('');

  // 添加测试用例
  const addTestCase = () => {
    if (!newTestInput.trim()) return;
    setTestCases([
      ...testCases,
      { id: String(Date.now()), input: newTestInput },
    ]);
    setNewTestInput('');
  };

  // 运行 A/B 测试
  const runTests = async () => {
    if (!promptA || !promptB) return;
    
    setIsRunning(true);
    setProgress(0);

    const totalTests = testCases.length * 2;
    let completed = 0;

    const newTestCases = [...testCases];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = newTestCases[i];

      // 模拟测试 Prompt A
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      completed++;
      setProgress((completed / totalTests) * 100);

      const resultA: TestResult = {
        promptId: 'A',
        response: `[Prompt A 响应] 针对 "${testCase.input}" 的回复...`,
        latency: Math.round(500 + Math.random() * 1000),
        tokenCount: Math.round(100 + Math.random() * 200),
        qualityScore: Math.round(70 + Math.random() * 25),
      };

      // 模拟测试 Prompt B
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
      completed++;
      setProgress((completed / totalTests) * 100);

      const resultB: TestResult = {
        promptId: 'B',
        response: `[Prompt B 响应] 针对 "${testCase.input}" 的回复...`,
        latency: Math.round(500 + Math.random() * 1000),
        tokenCount: Math.round(100 + Math.random() * 200),
        qualityScore: Math.round(70 + Math.random() * 25),
      };

      newTestCases[i] = {
        ...testCase,
        results: { A: resultA, B: resultB },
      };
      setTestCases([...newTestCases]);
    }

    setIsRunning(false);
  };

  // 计算总体统计
  const stats = testCases.reduce(
    (acc, tc) => {
      if (tc.results) {
        acc.aLatency += tc.results.A.latency;
        acc.bLatency += tc.results.B.latency;
        acc.aTokens += tc.results.A.tokenCount;
        acc.bTokens += tc.results.B.tokenCount;
        acc.aQuality += tc.results.A.qualityScore;
        acc.bQuality += tc.results.B.qualityScore;
        acc.count++;
      }
      return acc;
    },
    { aLatency: 0, bLatency: 0, aTokens: 0, bTokens: 0, aQuality: 0, bQuality: 0, count: 0 }
  );

  const hasResults = stats.count > 0;
  const avgStats = hasResults ? {
    aLatency: Math.round(stats.aLatency / stats.count),
    bLatency: Math.round(stats.bLatency / stats.count),
    aTokens: Math.round(stats.aTokens / stats.count),
    bTokens: Math.round(stats.bTokens / stats.count),
    aQuality: Math.round(stats.aQuality / stats.count),
    bQuality: Math.round(stats.bQuality / stats.count),
  } : null;

  return (
    <div className="space-y-4">
      {/* Prompt 对比编辑器 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-500">A</Badge>
              当前版本
            </Label>
            <Badge variant="secondary" className="text-xs">{promptA.length} 字符</Badge>
          </div>
          <Textarea
            value={promptA}
            onChange={(e) => setPromptA(e.target.value)}
            placeholder="Prompt A..."
            className="min-h-[150px] text-xs font-mono"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1">
              <Badge variant="outline" className="bg-green-500/10 text-green-500">B</Badge>
              对比版本
            </Label>
            <Badge variant="secondary" className="text-xs">{promptB.length} 字符</Badge>
          </div>
          <Textarea
            value={promptB}
            onChange={(e) => setPromptB(e.target.value)}
            placeholder="输入要对比的 Prompt..."
            className="min-h-[150px] text-xs font-mono"
          />
        </div>
      </div>

      {/* 测试用例 */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">测试用例</CardTitle>
            <Badge variant="outline">{testCases.length} 个</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input 
              placeholder="添加测试输入..."
              value={newTestInput}
              onChange={(e) => setNewTestInput(e.target.value)}
              className="flex-1"
            />
            <Button size="sm" onClick={addTestCase}>添加</Button>
          </div>
          <div className="space-y-1">
            {testCases.map((tc, index) => (
              <div 
                key={tc.id}
                className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
              >
                <span className="truncate flex-1">{tc.input}</span>
                {tc.results && (
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={tc.results.A.qualityScore > tc.results.B.qualityScore ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      A: {tc.results.A.qualityScore}
                    </Badge>
                    <Badge 
                      variant={tc.results.B.qualityScore > tc.results.A.qualityScore ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      B: {tc.results.B.qualityScore}
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 运行测试 */}
      <div className="flex gap-2">
        <Button 
          className="flex-1"
          onClick={runTests}
          disabled={isRunning || !promptA || !promptB}
        >
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              测试中...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              运行 A/B 测试
            </>
          )}
        </Button>
      </div>

      {isRunning && (
        <Progress value={progress} className="h-2" />
      )}

      {/* 结果对比 */}
      {hasResults && avgStats && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              测试结果对比
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <ComparisonStat 
                icon={Clock}
                label="平均延迟"
                valueA={`${avgStats.aLatency}ms`}
                valueB={`${avgStats.bLatency}ms`}
                winnerIsLower
              />
              <ComparisonStat 
                icon={Zap}
                label="平均 Token"
                valueA={String(avgStats.aTokens)}
                valueB={String(avgStats.bTokens)}
                winnerIsLower
              />
              <ComparisonStat 
                icon={CheckCircle}
                label="质量评分"
                valueA={`${avgStats.aQuality}%`}
                valueB={`${avgStats.bQuality}%`}
              />
            </div>

            <div className="mt-4 p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium mb-1">推荐</p>
              <p className="text-xs text-muted-foreground">
                {avgStats.aQuality > avgStats.bQuality 
                  ? '版本 A 表现更优，建议保持当前 Prompt'
                  : avgStats.bQuality > avgStats.aQuality
                  ? '版本 B 表现更优，建议采用新版本'
                  : '两个版本表现相近，可根据其他因素决定'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 对比统计项
function ComparisonStat({ 
  icon: Icon, 
  label, 
  valueA, 
  valueB,
  winnerIsLower = false,
}: { 
  icon: React.ElementType;
  label: string;
  valueA: string;
  valueB: string;
  winnerIsLower?: boolean;
}) {
  const numA = parseFloat(valueA);
  const numB = parseFloat(valueB);
  const aWins = winnerIsLower ? numA < numB : numA > numB;
  const bWins = winnerIsLower ? numB < numA : numB > numA;

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-2">
        <Icon className="h-3 w-3" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className={cn(
          'p-2 rounded',
          aWins ? 'bg-green-500/10 text-green-600' : 'bg-muted'
        )}>
          <div className="text-xs text-muted-foreground">A</div>
          <div className="font-bold">{valueA}</div>
        </div>
        <div className={cn(
          'p-2 rounded',
          bWins ? 'bg-green-500/10 text-green-600' : 'bg-muted'
        )}>
          <div className="text-xs text-muted-foreground">B</div>
          <div className="font-bold">{valueB}</div>
        </div>
      </div>
    </div>
  );
}
