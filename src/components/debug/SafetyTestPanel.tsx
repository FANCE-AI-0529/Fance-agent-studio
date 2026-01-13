import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  ShieldX,
  AlertTriangle,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  FileWarning
} from 'lucide-react';
import { 
  SAFETY_TEST_CASES, 
  SafetyTestCase,
  DANGEROUS_KEYWORDS,
  DRIFT_PATTERNS,
  calculateSafetyScore 
} from '@/tests/safetyTests';

interface TestResult {
  testId: string;
  passed: boolean;
  status: 'pending' | 'running' | 'passed' | 'failed';
  executionTime?: number;
  agentResponse?: string;
  traceLog?: string[];
  checks: { check: string; passed: boolean }[];
}

export function SafetyTestPanel() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const runTest = useCallback(async (testCase: SafetyTestCase) => {
    setResults(prev => ({
      ...prev,
      [testCase.id]: {
        testId: testCase.id,
        passed: false,
        status: 'running',
        checks: testCase.validationChecks.map(check => ({ check, passed: false })),
      },
    }));

    const startTime = Date.now();

    // 模拟测试执行
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // 模拟测试结果 - 实际应该调用真实的 MPLP 检测
    const mockPassed = Math.random() > 0.3; // 70% 通过率用于演示

    setResults(prev => ({
      ...prev,
      [testCase.id]: {
        testId: testCase.id,
        passed: mockPassed,
        status: mockPassed ? 'passed' : 'failed',
        executionTime: Date.now() - startTime,
        agentResponse: mockPassed 
          ? testCase.expectedBehavior.expectedResponse || '操作已被安全拦截'
          : '测试失败：安全检测未触发',
        traceLog: [
          `[${new Date().toISOString()}] Test started: ${testCase.name}`,
          `[${new Date().toISOString()}] Malicious prompt: ${testCase.scenario.maliciousPrompt}`,
          mockPassed 
            ? `[${new Date().toISOString()}] ✓ ${testCase.expectedBehavior.traceLogEntry}`
            : `[${new Date().toISOString()}] ✗ Security check not triggered`,
        ],
        checks: testCase.validationChecks.map((check, i) => ({
          check,
          passed: mockPassed || i < 2, // 模拟部分通过
        })),
      },
    }));
  }, []);

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    
    const filteredTests = selectedCategory === 'all' 
      ? SAFETY_TEST_CASES 
      : SAFETY_TEST_CASES.filter(t => t.category === selectedCategory);

    for (const testCase of filteredTests) {
      await runTest(testCase);
    }

    setIsRunning(false);
  }, [selectedCategory, runTest]);

  const getResultStats = () => {
    const allResults = Object.values(results);
    const passed = allResults.filter(r => r.passed).length;
    const failed = allResults.filter(r => !r.passed && r.status !== 'pending').length;
    const pending = SAFETY_TEST_CASES.length - passed - failed;

    return { passed, failed, pending };
  };

  const stats = getResultStats();
  const safetyScore = calculateSafetyScore(
    Object.values(results)
      .filter(r => r.status !== 'pending' && r.status !== 'running')
      .map(r => ({
        passed: r.passed,
        riskLevel: SAFETY_TEST_CASES.find(t => t.id === r.testId)?.riskLevel || 'medium',
      }))
  );

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">High</Badge>;
      default:
        return <Badge variant="secondary">Medium</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'dangerous_operation':
        return <ShieldAlert className="h-4 w-4 text-red-500" />;
      case 'intent_drift':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'policy_violation':
        return <FileWarning className="h-4 w-4 text-yellow-500" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            MPLP 安全合规测试
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span>{stats.passed}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span>{stats.failed}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-full bg-muted" />
                <span>{stats.pending}</span>
              </div>
            </div>
            <Badge variant={safetyScore >= 80 ? 'default' : safetyScore >= 60 ? 'secondary' : 'destructive'}>
              安全评分: {safetyScore}%
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="flex-1">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="dangerous_operation">危险操作</TabsTrigger>
              <TabsTrigger value="intent_drift">意图漂移</TabsTrigger>
              <TabsTrigger value="policy_violation">策略违规</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={runAllTests} disabled={isRunning} size="sm">
            <Play className="h-4 w-4 mr-1" />
            {isRunning ? '运行中...' : '运行测试'}
          </Button>
        </div>

        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {SAFETY_TEST_CASES
              .filter(t => selectedCategory === 'all' || t.category === selectedCategory)
              .map(testCase => {
                const result = results[testCase.id];
                const status = result?.status || 'pending';

                return (
                  <Card key={testCase.id} className={`
                    border-l-4 
                    ${status === 'passed' ? 'border-l-green-500' : ''}
                    ${status === 'failed' ? 'border-l-red-500' : ''}
                    ${status === 'running' ? 'border-l-blue-500' : ''}
                    ${status === 'pending' ? 'border-l-muted' : ''}
                  `}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getCategoryIcon(testCase.category)}
                            <span className="font-medium">{testCase.name}</span>
                            {getRiskBadge(testCase.riskLevel)}
                            {status === 'running' && (
                              <Clock className="h-4 w-4 animate-spin text-blue-500" />
                            )}
                            {status === 'passed' && (
                              <ShieldCheck className="h-4 w-4 text-green-500" />
                            )}
                            {status === 'failed' && (
                              <ShieldX className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {testCase.description}
                          </p>
                          <div className="text-xs bg-muted/50 p-2 rounded mb-2">
                            <strong>恶意输入：</strong> {testCase.scenario.maliciousPrompt}
                          </div>

                          {result && result.status !== 'pending' && (
                            <div className="mt-3 space-y-2">
                              <div className="text-xs">
                                <strong>验证项：</strong>
                                <ul className="mt-1 space-y-1">
                                  {result.checks.map((check, i) => (
                                    <li key={i} className="flex items-center gap-1">
                                      {check.passed 
                                        ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        : <XCircle className="h-3 w-3 text-red-500" />
                                      }
                                      <span className={check.passed ? '' : 'text-muted-foreground'}>
                                        {check.check}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              
                              {result.agentResponse && (
                                <div className="text-xs bg-muted p-2 rounded">
                                  <strong>Agent 响应：</strong> {result.agentResponse}
                                </div>
                              )}

                              {result.traceLog && (
                                <details className="text-xs">
                                  <summary className="cursor-pointer text-muted-foreground">
                                    Trace Log ({result.traceLog.length} entries)
                                  </summary>
                                  <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-x-auto">
                                    {result.traceLog.join('\n')}
                                  </pre>
                                </details>
                              )}

                              {result.executionTime && (
                                <div className="text-xs text-muted-foreground">
                                  执行时间: {result.executionTime}ms
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => runTest(testCase)}
                          disabled={status === 'running'}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </ScrollArea>

        {/* 关键词检测参考 */}
        <details className="text-xs">
          <summary className="cursor-pointer font-medium">危险关键词库参考</summary>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {Object.entries(DANGEROUS_KEYWORDS).map(([category, keywords]) => (
              <div key={category} className="p-2 bg-muted rounded">
                <strong className="capitalize">{category}:</strong>
                <div className="text-muted-foreground">
                  {keywords.join(', ')}
                </div>
              </div>
            ))}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
