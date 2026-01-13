// =====================================================
// Meta-Builder 测试面板
// Visual Test Panel for Meta-Builder Capabilities
// =====================================================

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Bug,
  Zap,
  Brain,
  GitBranch,
  FileJson,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { 
  META_BUILDER_TEST_CASES, 
  validateTestResult, 
  generateTestReport,
  type TestCase,
  type TestResult 
} from "@/tests/metaBuilderTests";

interface MetaBuilderTestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MetaBuilderTestPanel({ isOpen, onClose }: MetaBuilderTestPanelProps) {
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [expandedTests, setExpandedTests] = useState<Set<string>>(new Set());

  const runSingleTest = useCallback(async (testCase: TestCase) => {
    setCurrentTest(testCase.id);
    
    // Simulate test execution (in real implementation, this would call the actual builder)
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    
    // Mock result for demonstration
    const mockResult = {
      nodes: testCase.expectedNodes.map(type => ({ type, data: { name: type } })),
      edges: testCase.expectedEdges || [],
      clarificationTriggered: testCase.shouldTriggerClarification,
      clarificationMatches: testCase.expectedKnowledgeBases?.map(name => ({ name })),
    };

    const result = validateTestResult(testCase, mockResult);
    
    setTestResults(prev => new Map(prev).set(testCase.id, result));
    setCurrentTest(null);
    
    return result;
  }, []);

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setTestResults(new Map());

    for (const testCase of META_BUILDER_TEST_CASES) {
      await runSingleTest(testCase);
    }

    setIsRunning(false);
  }, [runSingleTest]);

  const toggleExpanded = (testId: string) => {
    setExpandedTests(prev => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 2: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 3: return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const testReport = generateTestReport(Array.from(testResults.values()));

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 400 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 400 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={cn(
          "fixed right-0 top-0 h-full w-[480px] z-50",
          "bg-background/95 backdrop-blur-xl border-l border-border",
          "flex flex-col shadow-2xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bug className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Meta-Builder 测试</h2>
              <p className="text-xs text-muted-foreground">智能构建能力验收</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XCircle className="w-5 h-5" />
          </Button>
        </div>

        {/* Stats Bar */}
        {testResults.size > 0 && (
          <div className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">{testReport.passed} 通过</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium">{testReport.failed} 失败</span>
                </div>
              </div>
              <Badge variant="outline" className="text-sm">
                {testReport.passRate}
              </Badge>
            </div>
          </div>
        )}

        {/* Test Cases */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {/* Level Groups */}
            {[1, 2, 3].map(level => {
              const levelTests = META_BUILDER_TEST_CASES.filter(t => t.level === level);
              const levelLabel = level === 1 ? '基础单点任务' : level === 2 ? '混合编排任务' : '模糊需求澄清';
              const LevelIcon = level === 1 ? Zap : level === 2 ? GitBranch : Brain;

              return (
                <div key={level} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <LevelIcon className="w-4 h-4" />
                    <span>Level {level}: {levelLabel}</span>
                    <Badge variant="outline" className={cn("ml-auto text-xs", getLevelColor(level))}>
                      {levelTests.length} 个测试
                    </Badge>
                  </div>

                  {levelTests.map(testCase => {
                    const result = testResults.get(testCase.id);
                    const isExpanded = expandedTests.has(testCase.id);
                    const isCurrentlyRunning = currentTest === testCase.id;

                    return (
                      <Collapsible key={testCase.id} open={isExpanded} onOpenChange={() => toggleExpanded(testCase.id)}>
                        <div className={cn(
                          "rounded-lg border bg-card",
                          result?.passed ? "border-green-500/30" : result?.passed === false ? "border-destructive/30" : "border-border"
                        )}>
                          <CollapsibleTrigger asChild>
                            <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                {isCurrentlyRunning ? (
                                  <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                                ) : result?.passed ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : result?.passed === false ? (
                                  <XCircle className="w-4 h-4 text-destructive" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                                )}
                                <div>
                                  <p className="text-sm font-medium">{testCase.name}</p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[280px]">
                                    {testCase.input}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {result && (
                                  <Badge variant="outline" className="text-xs">
                                    {result.executionTimeMs}ms
                                  </Badge>
                                )}
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3">
                              {/* Description */}
                              <p className="text-xs text-muted-foreground">{testCase.description}</p>

                              {/* Expected */}
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">预期节点:</p>
                                <div className="flex flex-wrap gap-1">
                                  {testCase.expectedNodes.map(node => (
                                    <Badge key={node} variant="secondary" className="text-xs">
                                      {node}
                                    </Badge>
                                  ))}
                                  {testCase.expectedNodes.length === 0 && (
                                    <span className="text-xs text-muted-foreground italic">无（应触发澄清）</span>
                                  )}
                                </div>
                              </div>

                              {/* Condition check */}
                              {testCase.shouldHaveCondition && (
                                <div className="space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">预期条件表达式:</p>
                                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                    {testCase.conditionExpression}
                                  </code>
                                </div>
                              )}

                              {/* Result details */}
                              {result && (
                                <div className="space-y-2">
                                  {result.errors.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-destructive">错误:</p>
                                      {result.errors.map((err, i) => (
                                        <p key={i} className="text-xs text-destructive/80 flex items-center gap-1">
                                          <XCircle className="w-3 h-3" />
                                          {err}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {result.warnings.length > 0 && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-yellow-500">警告:</p>
                                      {result.warnings.map((warn, i) => (
                                        <p key={i} className="text-xs text-yellow-500/80 flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3" />
                                          {warn}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Run single test */}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="w-full"
                                onClick={() => runSingleTest(testCase)}
                                disabled={isRunning}
                              >
                                <Play className="w-3 h-3 mr-2" />
                                运行此测试
                              </Button>
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/30">
          <Button 
            className="w-full" 
            onClick={runAllTests}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                运行中...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                运行全部测试 ({META_BUILDER_TEST_CASES.length})
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
