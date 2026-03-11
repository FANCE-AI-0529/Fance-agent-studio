/**
 * OpenCode Test Page
 * Interactive testing interface for the OpenCode style checker and validation
 */

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info,
  Sparkles,
  FileCode,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  BookOpen,
  Hammer
} from "lucide-react";
import { Button } from "../components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.tsx";
import { ScrollArea } from "../components/ui/scroll-area.tsx";
import { Progress } from "../components/ui/progress.tsx";
import { 
  checkOpenCodeStyle, 
  getStyleRulesConfig, 
  refactorToCompliant,
  type StyleCheckResult
} from "../utils/openCodeStyleChecker.ts";
import { BAD_CODE_SAMPLE, EXPECTED_COMPLIANT_CODE } from "../test-fixtures/bad-code-sample.ts";
import { CodeDiffViewer } from "../components/runtime/CodeDiffViewer.tsx";
import { OpenCodeStatusBar, CompactModeIndicator } from "../components/runtime/OpenCodeStatusBar.tsx";
import { toast } from "sonner";
import type { FileDiff } from "../types/openCode.ts";

type TestPhase = 'idle' | 'plan' | 'confirm' | 'build' | 'complete';

export default function OpenCodeTestPage() {
  const [code, setCode] = useState(BAD_CODE_SAMPLE.trim());
  const [testPhase, setTestPhase] = useState<TestPhase>('idle');
  const [checkResult, setCheckResult] = useState<StyleCheckResult | null>(null);
  const [refactoredCode, setRefactoredCode] = useState<string>("");
  const [showDiff, setShowDiff] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const styleRules = useMemo(() => getStyleRulesConfig(), []);
  
  const runStyleCheck = useCallback(() => {
    setTestPhase('plan');
    const result = checkOpenCodeStyle(code);
    setCheckResult(result);
    
    setTimeout(() => {
      toast.success("Style analysis complete", {
        description: result.passed ? "No violations found!" : `Found ${result.violations.length} issues`
      });
    }, 500);
  }, [code]);
  
  const confirmAndRefactor = useCallback(() => {
    setTestPhase('confirm');
    
    setTimeout(() => {
      setTestPhase('build');
      const { refactored } = refactorToCompliant(code);
      setRefactoredCode(refactored);
      
      setTimeout(() => {
        setTestPhase('complete');
        setShowDiff(true);
        toast.success("Refactoring complete", {
          description: "Code has been transformed to comply with OpenCode standards"
        });
      }, 1000);
    }, 500);
  }, [code]);
  
  const reset = useCallback(() => {
    setTestPhase('idle');
    setCheckResult(null);
    setRefactoredCode("");
    setShowDiff(false);
    setCode(BAD_CODE_SAMPLE.trim());
  }, []);
  
  const loadSampleCode = useCallback(() => {
    setCode(BAD_CODE_SAMPLE.trim());
    setTestPhase('idle');
    setCheckResult(null);
  }, []);
  
  const copyRefactored = useCallback(async () => {
    await navigator.clipboard.writeText(refactoredCode);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [refactoredCode]);
  
  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
    }
  };
  
  const getSeverityBadge = (severity: 'error' | 'warning' | 'info') => {
    const variants: Record<string, 'destructive' | 'secondary' | 'outline'> = {
      error: 'destructive',
      warning: 'secondary',
      info: 'outline'
    };
    return <Badge variant={variants[severity]}>{severity}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Status Bar */}
      <OpenCodeStatusBar
        mode={testPhase === 'idle' ? 'plan' : testPhase === 'build' || testPhase === 'complete' ? 'build' : 'plan'}
        currentFile="test-input.ts"
        styleCheckPassed={checkResult?.passed ?? true}
        styleViolationsCount={checkResult?.violations.length ?? 0}
        onViewPlan={() => setShowDiff(true)}
      />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileCode className="h-8 w-8 text-primary" />
              OpenCode 验收测试
            </h1>
            <p className="text-muted-foreground mt-1">
              测试 PLAN → CONFIRM → BUILD 工作流和代码风格检查
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <CompactModeIndicator 
              mode={testPhase === 'build' || testPhase === 'complete' ? 'build' : 'plan'} 
            />
          </div>
        </div>
        
        {/* Test Phase Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              {(['idle', 'plan', 'confirm', 'build', 'complete'] as TestPhase[]).map((phase, idx) => (
                <div key={phase} className="flex items-center">
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                    ${testPhase === phase ? 'bg-primary text-primary-foreground' : 
                      ['plan', 'confirm', 'build', 'complete'].indexOf(testPhase) >= idx 
                        ? 'bg-primary/20 text-primary' 
                        : 'bg-muted text-muted-foreground'}
                  `}>
                    {idx + 1}
                  </div>
                  <span className={`ml-2 text-sm ${testPhase === phase ? 'font-semibold' : ''}`}>
                    {phase === 'idle' ? '准备' : 
                     phase === 'plan' ? 'PLAN' : 
                     phase === 'confirm' ? '确认' : 
                     phase === 'build' ? 'BUILD' : '完成'}
                  </span>
                  {idx < 4 && <ArrowRight className="mx-4 h-4 w-4 text-muted-foreground" />}
                </div>
              ))}
            </div>
            <Progress 
              value={
                testPhase === 'idle' ? 0 : 
                testPhase === 'plan' ? 25 : 
                testPhase === 'confirm' ? 50 : 
                testPhase === 'build' ? 75 : 100
              } 
              className="h-2"
            />
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Code Input */}
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    输入代码
                  </CardTitle>
                  <CardDescription>粘贴待测试的 TypeScript 代码</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadSampleCode}>
                  加载示例
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-80 font-mono text-sm bg-muted/50 rounded-lg p-4 border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="// 在此粘贴代码..."
                spellCheck={false}
              />
              
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={runStyleCheck} 
                  disabled={!code.trim() || testPhase !== 'idle'}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  运行风格检查
                </Button>
                <Button variant="outline" onClick={reset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Right: Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                分析结果
              </CardTitle>
              <CardDescription>
                {checkResult 
                  ? `得分: ${checkResult.score}/100 - ${checkResult.summary}`
                  : '运行检查以查看结果'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!checkResult ? (
                <div className="h-80 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>等待风格检查...</p>
                  </div>
                </div>
              ) : (
                <Tabs defaultValue="violations" className="h-80">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="violations">
                      违规项 ({checkResult.violations.length})
                    </TabsTrigger>
                    <TabsTrigger value="rules">规则说明</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="violations" className="h-[calc(100%-40px)]">
                    <ScrollArea className="h-full pr-4">
                      {checkResult.violations.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center text-green-600">
                            <CheckCircle2 className="h-12 w-12 mx-auto mb-2" />
                            <p className="font-semibold">所有检查通过!</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {checkResult.violations.map((v, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="p-3 rounded-lg border bg-card"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {getSeverityIcon(v.severity)}
                                  <code className="text-sm font-mono text-primary">{v.rule}</code>
                                </div>
                                {getSeverityBadge(v.severity)}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{v.message}</p>
                              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                <span>行 {v.line}</span>
                                <span>•</span>
                                <span>列 {v.column}</span>
                              </div>
                              {v.original && (
                                <code className="block mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {v.original}
                                </code>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="rules" className="h-[calc(100%-40px)]">
                    <ScrollArea className="h-full pr-4">
                      <div className="space-y-3">
                        {styleRules.map((rule, idx) => (
                          <div key={rule.rule} className="p-3 rounded-lg border bg-card">
                            <div className="flex items-center justify-between">
                              <code className="text-sm font-mono text-primary">{rule.rule}</code>
                              {getSeverityBadge(rule.severity)}
                            </div>
                            <p className="text-sm font-medium mt-1">{rule.name}</p>
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              )}
              
              {checkResult && checkResult.violations.length > 0 && testPhase === 'plan' && (
                <div className="mt-4 pt-4 border-t">
                  <Button onClick={confirmAndRefactor} className="w-full">
                    <Hammer className="h-4 w-4 mr-2" />
                    批准并执行重构
                  </Button>
                </div>
              )}
              
              {testPhase === 'complete' && refactoredCode && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      重构完成
                    </span>
                    <Button variant="outline" size="sm" onClick={copyRefactored}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={() => setShowDiff(true)}
                  >
                    查看代码差异
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Expected Output Reference */}
        <Card>
          <CardHeader>
            <CardTitle>预期符合规范的代码</CardTitle>
            <CardDescription>重构后的代码应符合以下标准</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted/50 rounded-lg p-4 overflow-x-auto text-sm font-mono">
              {EXPECTED_COMPLIANT_CODE.trim()}
            </pre>
          </CardContent>
        </Card>
      </div>
      
      {/* Diff Viewer Dialog */}
      <CodeDiffViewer
        isOpen={showDiff}
        onClose={() => setShowDiff(false)}
        diff={{
          id: 'test-diff',
          filePath: 'test-input.ts',
          originalContent: code,
          modifiedContent: refactoredCode || code,
          language: 'typescript',
          action: 'modify',
          timestamp: new Date()
        }}
        onAccept={() => {
          setCode(refactoredCode);
          setShowDiff(false);
          toast.success("已应用重构代码");
        }}
        onReject={() => {
          setShowDiff(false);
          toast.info("已取消");
        }}
      />
    </div>
  );
}
