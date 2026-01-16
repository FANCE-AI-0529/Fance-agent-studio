/**
 * OpenCode E2E Test Component
 * Automated end-to-end testing for the OpenCode workflow
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  FileCode,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  checkOpenCodeStyle, 
  refactorToCompliant,
  getDetailedAnalysis
} from "@/utils/openCodeStyleChecker";
import { BAD_CODE_SAMPLE, EXPECTED_COMPLIANT_CODE } from "@/test-fixtures/bad-code-sample";

interface TestCase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  error?: string;
  duration?: number;
}

interface TestResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  testCases: TestCase[];
}

const INITIAL_TEST_CASES: TestCase[] = [
  {
    id: 'style-check-detection',
    name: '风格检查 - 违规检测',
    description: '验证所有已定义规则的违规能被检测',
    status: 'pending'
  },
  {
    id: 'style-check-no-let',
    name: '规则检查 - no-let',
    description: '检测 let 语句使用',
    status: 'pending'
  },
  {
    id: 'style-check-no-else',
    name: '规则检查 - no-else',
    description: '检测 else 块使用',
    status: 'pending'
  },
  {
    id: 'style-check-no-any',
    name: '规则检查 - no-any',
    description: '检测 any 类型使用',
    status: 'pending'
  },
  {
    id: 'refactor-transform',
    name: '重构 - 代码转换',
    description: '验证重构函数能正确转换代码',
    status: 'pending'
  },
  {
    id: 'refactor-removes-let',
    name: '重构 - 移除 let',
    description: '验证重构后代码不包含 let',
    status: 'pending'
  },
  {
    id: 'refactor-removes-any',
    name: '重构 - 移除 any',
    description: '验证重构后代码不包含 any',
    status: 'pending'
  },
  {
    id: 'score-calculation',
    name: '评分系统',
    description: '验证违规评分计算正确',
    status: 'pending'
  },
  {
    id: 'analysis-suggestions',
    name: '分析建议',
    description: '验证详细分析提供有用建议',
    status: 'pending'
  }
];

export function OpenCodeE2ETest() {
  const [isRunning, setIsRunning] = useState(false);
  const [testCases, setTestCases] = useState<TestCase[]>(INITIAL_TEST_CASES);
  const [result, setResult] = useState<TestResult | null>(null);
  
  const updateTestCase = useCallback((id: string, update: Partial<TestCase>) => {
    setTestCases(prev => prev.map(tc => 
      tc.id === id ? { ...tc, ...update } : tc
    ));
  }, []);
  
  const runTests = useCallback(async () => {
    setIsRunning(true);
    setTestCases(INITIAL_TEST_CASES);
    setResult(null);
    
    const startTime = Date.now();
    const results: TestCase[] = [];
    
    // Helper to run a single test
    const runTest = async (
      id: string, 
      testFn: () => boolean | Promise<boolean>
    ): Promise<TestCase> => {
      updateTestCase(id, { status: 'running' });
      const testStart = Date.now();
      
      try {
        await new Promise(r => setTimeout(r, 200)); // Simulate async
        const passed = await testFn();
        const duration = Date.now() - testStart;
        
        const result: TestCase = {
          ...INITIAL_TEST_CASES.find(tc => tc.id === id)!,
          status: passed ? 'passed' : 'failed',
          duration,
          error: passed ? undefined : 'Assertion failed'
        };
        
        updateTestCase(id, result);
        return result;
      } catch (error) {
        const duration = Date.now() - testStart;
        const result: TestCase = {
          ...INITIAL_TEST_CASES.find(tc => tc.id === id)!,
          status: 'failed',
          duration,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        
        updateTestCase(id, result);
        return result;
      }
    };
    
    // Test 1: Style check detection
    results.push(await runTest('style-check-detection', () => {
      const result = checkOpenCodeStyle(BAD_CODE_SAMPLE);
      return result.violations.length >= 4; // At least 4 violations expected
    }));
    
    // Test 2: no-let detection
    results.push(await runTest('style-check-no-let', () => {
      const result = checkOpenCodeStyle(BAD_CODE_SAMPLE);
      return result.violations.some(v => v.rule === 'no-let');
    }));
    
    // Test 3: no-else detection
    results.push(await runTest('style-check-no-else', () => {
      const result = checkOpenCodeStyle(BAD_CODE_SAMPLE);
      return result.violations.some(v => v.rule === 'no-else');
    }));
    
    // Test 4: no-any detection
    results.push(await runTest('style-check-no-any', () => {
      const result = checkOpenCodeStyle(BAD_CODE_SAMPLE);
      return result.violations.some(v => v.rule === 'no-any');
    }));
    
    // Test 5: Refactor transform
    results.push(await runTest('refactor-transform', () => {
      const { refactored } = refactorToCompliant(BAD_CODE_SAMPLE);
      return refactored.length > 0 && refactored !== BAD_CODE_SAMPLE;
    }));
    
    // Test 6: Refactor removes let
    results.push(await runTest('refactor-removes-let', () => {
      const { refactored } = refactorToCompliant(BAD_CODE_SAMPLE);
      return !refactored.includes('let ');
    }));
    
    // Test 7: Refactor removes any
    results.push(await runTest('refactor-removes-any', () => {
      const { refactored } = refactorToCompliant(BAD_CODE_SAMPLE);
      return !refactored.includes(': any');
    }));
    
    // Test 8: Score calculation
    results.push(await runTest('score-calculation', () => {
      const badResult = checkOpenCodeStyle(BAD_CODE_SAMPLE);
      const goodResult = checkOpenCodeStyle(EXPECTED_COMPLIANT_CODE);
      return badResult.score < goodResult.score;
    }));
    
    // Test 9: Analysis suggestions
    results.push(await runTest('analysis-suggestions', () => {
      const analysis = getDetailedAnalysis(BAD_CODE_SAMPLE);
      return analysis.suggestions.length > 0;
    }));
    
    // Calculate final result
    const totalDuration = Date.now() - startTime;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    
    setResult({
      totalTests: results.length,
      passedTests: passed,
      failedTests: failed,
      duration: totalDuration,
      testCases: results
    });
    
    setIsRunning(false);
  }, [updateTestCase]);
  
  const getStatusIcon = (status: TestCase['status']) => {
    switch (status) {
      case 'pending': return <div className="w-4 h-4 rounded-full bg-muted" />;
      case 'running': return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'passed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              端到端测试套件
            </CardTitle>
            <CardDescription>
              自动化验证 OpenCode 引擎的所有核心功能
            </CardDescription>
          </div>
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                运行中...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                运行所有测试
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Results Summary */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-lg border bg-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`
                  w-16 h-16 rounded-full flex items-center justify-center
                  ${result.failedTests === 0 ? 'bg-green-500/10' : 'bg-destructive/10'}
                `}>
                  {result.failedTests === 0 ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : (
                    <XCircle className="w-8 h-8 text-destructive" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">
                    {result.failedTests === 0 ? '所有测试通过!' : '部分测试失败'}
                  </h3>
                  <p className="text-muted-foreground">
                    {result.passedTests}/{result.totalTests} 通过 • 
                    耗时 {result.duration}ms
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Badge variant="outline" className="text-green-600">
                  {result.passedTests} 通过
                </Badge>
                {result.failedTests > 0 && (
                  <Badge variant="destructive">
                    {result.failedTests} 失败
                  </Badge>
                )}
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Test Cases List */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {testCases.map((tc, idx) => (
                <motion.div
                  key={tc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`
                    p-3 rounded-lg border transition-colors
                    ${tc.status === 'running' ? 'border-primary bg-primary/5' : ''}
                    ${tc.status === 'passed' ? 'border-green-500/30 bg-green-500/5' : ''}
                    ${tc.status === 'failed' ? 'border-destructive/30 bg-destructive/5' : ''}
                  `}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(tc.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tc.name}</span>
                        {tc.duration !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            ({tc.duration}ms)
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{tc.description}</p>
                      {tc.error && (
                        <p className="text-sm text-destructive mt-1">{tc.error}</p>
                      )}
                    </div>
                    {tc.status !== 'pending' && (
                      <Badge 
                        variant={tc.status === 'passed' ? 'outline' : tc.status === 'failed' ? 'destructive' : 'secondary'}
                      >
                        {tc.status}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
