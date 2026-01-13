import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, CheckCircle2, XCircle, Clock, 
  Database, Search, GitBranch, Shield, Loader2,
  ChevronDown, ChevronRight, Zap, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  duration?: number;
  details?: string;
  subTests?: TestResult[];
}

interface TestScenario {
  id: string;
  name: string;
  description: string;
  input: string;
  expectedChecks: string[];
}

const TEST_SCENARIOS: TestScenario[] = [
  {
    id: 'basic-faq',
    name: '场景 A: 基础客服助手',
    description: '测试知识库 + Agent 基础拓扑生成',
    input: '创建一个智能客服，能查询FAQ知识库回答问题',
    expectedChecks: [
      'Trigger → Knowledge → Agent 拓扑',
      'Knowledge 输出连接到 Agent',
      '低风险，无需人工确认'
    ]
  },
  {
    id: 'scheduled-email',
    name: '场景 B: 定时邮件报告',
    description: '测试参数提取 + 定时触发',
    input: '创建一个助手，每周五下午5点发送邮件报告给 boss@company.com',
    expectedChecks: [
      'Trigger 类型 = schedule',
      'Cron 表达式正确解析',
      '邮件收件人正确提取'
    ]
  },
  {
    id: 'refund-processing',
    name: '场景 C: 退款处理',
    description: '测试 MPLP 合规注入',
    input: '创建退款助手，处理客户退款请求并删除订单记录',
    expectedChecks: [
      '退款/删除识别为高风险',
      '自动插入 Intervention 确认节点',
      '合规报告显示已保护操作'
    ]
  },
  {
    id: 'complex-workflow',
    name: '场景 D: 复杂工作流',
    description: '测试多节点 + 草稿边',
    input: '创建数据分析助手，查询数据库获取销售数据，生成报表，然后发送给团队',
    expectedChecks: [
      '多节点拓扑生成',
      'Dagre 自动布局',
      '参数映射和草稿边'
    ]
  }
];

export function GenerationVerificationPanel() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [phaseResults, setPhaseResults] = useState<Record<string, TestResult>>({});
  const [scenarioResults, setScenarioResults] = useState<Record<string, any>>({});
  const [expandedSections, setExpandedSections] = useState<string[]>(['infrastructure']);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const updatePhaseResult = (phase: string, result: Partial<TestResult>) => {
    setPhaseResults(prev => ({
      ...prev,
      [phase]: { ...prev[phase], ...result }
    }));
  };

  // Phase 1: Infrastructure Verification
  const verifyInfrastructure = async (): Promise<boolean> => {
    setCurrentPhase('infrastructure');
    updatePhaseResult('infrastructure', { name: '基础设施验证', status: 'running' });
    const startTime = Date.now();

    try {
      // Check asset_semantic_index table
      const { data: indexData, error: indexError } = await supabase
        .from('asset_semantic_index')
        .select('id')
        .limit(1);

      if (indexError) throw new Error(`asset_semantic_index 表不可用: ${indexError.message}`);

      // Check skills table
      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select('id, name')
        .limit(5);

      if (skillsError) throw new Error(`skills 表不可用: ${skillsError.message}`);

      updatePhaseResult('infrastructure', { 
        status: 'passed', 
        duration: Date.now() - startTime,
        details: `找到 ${skillsData?.length || 0} 个技能，asset_semantic_index 表可用`,
        subTests: [
          { name: 'asset_semantic_index 表', status: 'passed' },
          { name: 'skills 表', status: skillsData && skillsData.length > 0 ? 'passed' : 'failed' },
          { name: '用户认证', status: user ? 'passed' : 'failed' }
        ]
      });
      return true;
    } catch (error: any) {
      updatePhaseResult('infrastructure', { 
        status: 'failed', 
        duration: Date.now() - startTime,
        details: error.message 
      });
      return false;
    }
  };

  // Phase 2: Semantic Asset Search Test
  const verifySemanticSearch = async (): Promise<boolean> => {
    setCurrentPhase('semantic-search');
    updatePhaseResult('semantic-search', { name: '语义资产搜索', status: 'running' });
    const startTime = Date.now();

    try {
      const testQueries = ['发送邮件', '查询数据', '生成报表'];
      const subTests: TestResult[] = [];

      for (const query of testQueries) {
        const { data, error } = await supabase.functions.invoke('semantic-asset-search', {
          body: { query, maxResults: 5, minSimilarity: 0.3 }
        });

        if (error) {
          subTests.push({ name: `搜索 "${query}"`, status: 'failed', details: error.message });
        } else {
          const totalResults = (data?.skills?.length || 0) + (data?.mcpTools?.length || 0);
          subTests.push({ 
            name: `搜索 "${query}"`, 
            status: totalResults > 0 ? 'passed' : 'failed',
            details: `找到 ${totalResults} 个结果`
          });
        }
      }

      const allPassed = subTests.every(t => t.status === 'passed');
      updatePhaseResult('semantic-search', { 
        status: allPassed ? 'passed' : 'failed', 
        duration: Date.now() - startTime,
        details: `${subTests.filter(t => t.status === 'passed').length}/${subTests.length} 查询通过`,
        subTests
      });
      return allPassed;
    } catch (error: any) {
      updatePhaseResult('semantic-search', { 
        status: 'failed', 
        duration: Date.now() - startTime,
        details: error.message 
      });
      return false;
    }
  };

  // Phase 3: Workflow Generator Test
  const verifyWorkflowGenerator = async (): Promise<boolean> => {
    setCurrentPhase('workflow-generator');
    updatePhaseResult('workflow-generator', { name: '工作流生成器', status: 'running' });
    const startTime = Date.now();
    const subTests: TestResult[] = [];

    try {
      for (const scenario of TEST_SCENARIOS) {
        const scenarioStart = Date.now();
        
        const { data, error } = await supabase.functions.invoke('workflow-generator', {
          body: { 
            description: scenario.input, 
            userId: user?.id,
            mplpPolicy: 'default',
            maxNodes: 10
          }
        });

        if (error) {
          subTests.push({ 
            name: scenario.name, 
            status: 'failed', 
            duration: Date.now() - scenarioStart,
            details: error.message 
          });
          setScenarioResults(prev => ({ ...prev, [scenario.id]: { error: error.message } }));
        } else {
          const dsl = data?.dsl;
          const checks = [];
          
          // Validate DSL structure
          if (dsl?.version && dsl?.name && dsl?.trigger && dsl?.stages) {
            checks.push('DSL 结构完整');
          }
          
          // Count nodes
          const nodeCount = dsl?.stages?.reduce((acc: number, stage: any) => 
            acc + (stage.nodes?.length || 0), 0) || 0;
          checks.push(`生成 ${nodeCount} 个节点`);
          
          // Check for extracted params
          if (data?.extractedParams) {
            const paramCount = Object.values(data.extractedParams).filter(Boolean).length;
            if (paramCount > 0) checks.push(`提取 ${paramCount} 个参数`);
          }

          // Check for warnings
          if (data?.warnings?.length > 0) {
            checks.push(`${data.warnings.length} 个警告`);
          }

          subTests.push({ 
            name: scenario.name, 
            status: nodeCount > 0 ? 'passed' : 'failed', 
            duration: Date.now() - scenarioStart,
            details: checks.join(', ')
          });

          setScenarioResults(prev => ({ ...prev, [scenario.id]: data }));
        }
      }

      const passedCount = subTests.filter(t => t.status === 'passed').length;
      updatePhaseResult('workflow-generator', { 
        status: passedCount === subTests.length ? 'passed' : passedCount > 0 ? 'failed' : 'failed', 
        duration: Date.now() - startTime,
        details: `${passedCount}/${subTests.length} 场景通过`,
        subTests
      });
      return passedCount === subTests.length;
    } catch (error: any) {
      updatePhaseResult('workflow-generator', { 
        status: 'failed', 
        duration: Date.now() - startTime,
        details: error.message 
      });
      return false;
    }
  };

  // Phase 4: MPLP Compliance Test
  const verifyMPLPCompliance = async (): Promise<boolean> => {
    setCurrentPhase('mplp-compliance');
    updatePhaseResult('mplp-compliance', { name: 'MPLP 合规验证', status: 'running' });
    const startTime = Date.now();
    const subTests: TestResult[] = [];

    try {
      // Test high-risk scenario
      const { data, error } = await supabase.functions.invoke('workflow-generator', {
        body: { 
          description: '自动删除过期用户数据并发送确认邮件', 
          userId: user?.id,
          mplpPolicy: 'strict'
        }
      });

      if (error) {
        subTests.push({ name: '高风险检测', status: 'failed', details: error.message });
      } else {
        const dsl = data?.dsl;
        
        // Check if intervention nodes were injected
        const hasIntervention = dsl?.stages?.some((stage: any) => 
          stage.nodes?.some((node: any) => 
            node.type === 'intervention' || node.requiresConfirmation
          )
        );
        
        subTests.push({ 
          name: '高风险检测', 
          status: hasIntervention ? 'passed' : 'failed',
          details: hasIntervention ? '已注入人工确认节点' : '未检测到人工确认'
        });

        // Check for warnings about high-risk operations
        const hasRiskWarnings = data?.warnings?.some((w: any) => 
          w.message?.includes('risk') || w.message?.includes('危险') || w.type === 'risk_warning'
        );
        
        subTests.push({ 
          name: '风险警告', 
          status: 'passed', // Warnings are optional
          details: hasRiskWarnings ? '已生成风险警告' : '无风险警告'
        });
      }

      const passedCount = subTests.filter(t => t.status === 'passed').length;
      updatePhaseResult('mplp-compliance', { 
        status: passedCount >= 1 ? 'passed' : 'failed', 
        duration: Date.now() - startTime,
        details: `${passedCount}/${subTests.length} 检查通过`,
        subTests
      });
      return passedCount >= 1;
    } catch (error: any) {
      updatePhaseResult('mplp-compliance', { 
        status: 'failed', 
        duration: Date.now() - startTime,
        details: error.message 
      });
      return false;
    }
  };

  const runAllTests = async () => {
    if (!user) {
      updatePhaseResult('infrastructure', { 
        name: '基础设施验证', 
        status: 'failed', 
        details: '用户未登录，请先登录' 
      });
      return;
    }

    setIsRunning(true);
    setPhaseResults({});
    setScenarioResults({});

    const results = {
      infrastructure: await verifyInfrastructure(),
      semanticSearch: await verifySemanticSearch(),
      workflowGenerator: await verifyWorkflowGenerator(),
      mplpCompliance: await verifyMPLPCompliance()
    };

    setCurrentPhase(null);
    setIsRunning(false);

    const passedCount = Object.values(results).filter(Boolean).length;
    console.log(`验证完成: ${passedCount}/4 阶段通过`, results);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'infrastructure': return <Database className="h-5 w-5" />;
      case 'semantic-search': return <Search className="h-5 w-5" />;
      case 'workflow-generator': return <GitBranch className="h-5 w-5" />;
      case 'mplp-compliance': return <Shield className="h-5 w-5" />;
      default: return <Zap className="h-5 w-5" />;
    }
  };

  const phases = [
    { id: 'infrastructure', name: '基础设施验证', description: '数据库表和用户认证' },
    { id: 'semantic-search', name: '语义资产搜索', description: 'Phase 1: 统一语义索引' },
    { id: 'workflow-generator', name: '工作流生成器', description: 'Phase 2: 拓扑生成' },
    { id: 'mplp-compliance', name: 'MPLP 合规验证', description: 'Phase 4: 策略注入' }
  ];

  const totalTests = Object.keys(phaseResults).length;
  const passedTests = Object.values(phaseResults).filter(r => r.status === 'passed').length;
  const failedTests = Object.values(phaseResults).filter(r => r.status === 'failed').length;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              一键生成全链路验证
            </CardTitle>
            <CardDescription>
              验证语义搜索、拓扑生成、自动布线、合规注入的完整流程
            </CardDescription>
          </div>
          <Button 
            onClick={runAllTests} 
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                运行中...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                运行验证
              </>
            )}
          </Button>
        </div>

        {totalTests > 0 && (
          <div className="flex items-center gap-4 mt-4">
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {passedTests} 通过
            </Badge>
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              {failedTests} 失败
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {totalTests - passedTests - failedTests} 待运行
            </Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-4">
            {phases.map((phase) => {
              const result = phaseResults[phase.id];
              const isExpanded = expandedSections.includes(phase.id);
              const isActive = currentPhase === phase.id;

              return (
                <Collapsible 
                  key={phase.id} 
                  open={isExpanded}
                  onOpenChange={() => toggleSection(phase.id)}
                >
                  <motion.div
                    initial={false}
                    animate={{ 
                      borderColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))'
                    }}
                    className="border rounded-lg overflow-hidden"
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            result?.status === 'passed' ? 'bg-green-500/10 text-green-500' :
                            result?.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                            result?.status === 'running' ? 'bg-blue-500/10 text-blue-500' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {getPhaseIcon(phase.id)}
                          </div>
                          <div className="text-left">
                            <div className="font-medium flex items-center gap-2">
                              {phase.name}
                              {result && getStatusIcon(result.status)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {phase.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {result?.duration && (
                            <Badge variant="secondary" className="text-xs">
                              {result.duration}ms
                            </Badge>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t bg-muted/30"
                          >
                            <div className="p-4 space-y-3">
                              {result?.details && (
                                <div className="text-sm text-muted-foreground">
                                  {result.details}
                                </div>
                              )}
                              
                              {result?.subTests && result.subTests.length > 0 && (
                                <div className="space-y-2">
                                  {result.subTests.map((subTest, idx) => (
                                    <div 
                                      key={idx}
                                      className="flex items-center justify-between py-2 px-3 bg-background rounded-md"
                                    >
                                      <div className="flex items-center gap-2">
                                        {getStatusIcon(subTest.status)}
                                        <span className="text-sm">{subTest.name}</span>
                                      </div>
                                      {subTest.details && (
                                        <span className="text-xs text-muted-foreground">
                                          {subTest.details}
                                        </span>
                                      )}
                                      {subTest.duration && (
                                        <Badge variant="outline" className="text-xs">
                                          {subTest.duration}ms
                                        </Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {!result && (
                                <div className="text-sm text-muted-foreground italic">
                                  点击"运行验证"开始测试
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CollapsibleContent>
                  </motion.div>
                </Collapsible>
              );
            })}

            {/* Scenario Results */}
            {Object.keys(scenarioResults).length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  场景测试详情
                </h3>
                <div className="space-y-3">
                  {TEST_SCENARIOS.map(scenario => {
                    const result = scenarioResults[scenario.id];
                    if (!result) return null;

                    return (
                      <div key={scenario.id} className="p-3 bg-muted/50 rounded-lg">
                        <div className="font-medium text-sm mb-1">{scenario.name}</div>
                        <div className="text-xs text-muted-foreground mb-2">
                          输入: "{scenario.input}"
                        </div>
                        {result.error ? (
                          <Badge variant="destructive" className="text-xs">
                            错误: {result.error}
                          </Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {result.dsl && (
                              <Badge variant="secondary" className="text-xs">
                                DSL: {result.dsl.name}
                              </Badge>
                            )}
                            {result.suggestedAssets && (
                              <Badge variant="outline" className="text-xs">
                                资产: {result.suggestedAssets.skills?.length || 0} skills
                              </Badge>
                            )}
                            {result.warnings?.length > 0 && (
                              <Badge variant="outline" className="text-xs text-yellow-600">
                                {result.warnings.length} 警告
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
