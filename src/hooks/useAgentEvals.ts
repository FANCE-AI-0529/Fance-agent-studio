// =====================================================
// Agent Evals Hook - 智能体评估管理
// Agent Evaluation System Management Hook
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import {
  TestCase,
  TestRunResult,
  RedTeamResults,
  RedTeamAttackResult,
  AgentScore,
  EvaluationResult,
  EvalPipelineEvent,
  EvalPipelineStep,
  GenerateTestCasesRequest,
  RunEvaluationRequest,
  DEFAULT_SCORING_WEIGHTS,
  SPEED_GRADE_THRESHOLDS,
  PASS_THRESHOLDS,
  RED_TEAM_ATTACK_TEMPLATES,
  SpeedGrade,
} from '@/types/agentEvals';

// =====================================================
// 评分引擎
// =====================================================

function calculateSpeedGrade(avgLatency: number): SpeedGrade {
  if (avgLatency < SPEED_GRADE_THRESHOLDS['A+']) return 'A+';
  if (avgLatency < SPEED_GRADE_THRESHOLDS['A']) return 'A';
  if (avgLatency < SPEED_GRADE_THRESHOLDS['B']) return 'B';
  if (avgLatency < SPEED_GRADE_THRESHOLDS['C']) return 'C';
  return 'D';
}

function calculateAgentScore(
  testRuns: TestRunResult[],
  redTeamResults: RedTeamResults
): AgentScore {
  // 1. 逻辑自洽度 - 基于功能测试和边界测试通过率
  const funcTests = testRuns.filter(t => 
    t.category === 'functionality' || t.category === 'edge_case'
  );
  const funcPassed = funcTests.filter(t => t.passed).length;
  const logicCoherence = funcTests.length > 0 
    ? Math.round((funcPassed / funcTests.length) * 100)
    : 100;

  // 2. 安全合规度 - 红队测试全部拦截 = 100%
  const securityCompliance = redTeamResults.totalAttacks > 0
    ? Math.round((redTeamResults.attacksBlocked / redTeamResults.totalAttacks) * 100)
    : 100;

  // 3. 响应质量 - 基于质量分数
  const qualityScores = testRuns
    .filter(t => t.qualityScore !== undefined)
    .map(t => t.qualityScore as number);
  const responseQuality = qualityScores.length > 0
    ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
    : 80;

  // 4. 平均响应时间和速度等级
  const avgResponseTime = testRuns.length > 0
    ? testRuns.reduce((a, t) => a + t.duration, 0) / testRuns.length
    : 0;
  const responseSpeedGrade = calculateSpeedGrade(avgResponseTime);

  // 5. 综合评分 (加权平均)
  const overall = Math.round(
    logicCoherence * DEFAULT_SCORING_WEIGHTS.logicCoherence +
    securityCompliance * DEFAULT_SCORING_WEIGHTS.securityCompliance +
    responseQuality * DEFAULT_SCORING_WEIGHTS.responseQuality
  );

  return {
    overall,
    logicCoherence,
    securityCompliance,
    responseQuality,
    responseSpeedGrade,
    avgResponseTime: Math.round(avgResponseTime),
  };
}

function checkIfPassed(score: AgentScore): boolean {
  return (
    score.overall >= PASS_THRESHOLDS.overall &&
    score.securityCompliance >= PASS_THRESHOLDS.securityCompliance &&
    score.logicCoherence >= PASS_THRESHOLDS.logicCoherence
  );
}

// =====================================================
// Hook 返回类型
// =====================================================

export interface UseAgentEvalsReturn {
  // 状态
  isEvaluating: boolean;
  currentStep: EvalPipelineStep | null;
  progress: number;
  events: EvalPipelineEvent[];
  evaluationResult: EvaluationResult | null;
  error: string | null;
  
  // 历史状态
  evaluationHistory: EvaluationResult[];
  isLoadingHistory: boolean;

  // 操作
  generateTestCases: (request: GenerateTestCasesRequest) => Promise<TestCase[]>;
  runEvaluation: (request: RunEvaluationRequest) => Promise<EvaluationResult | null>;
  runRedTeamTests: (agentConfig: RunEvaluationRequest['agentConfig']) => Promise<RedTeamResults>;
  reset: () => void;
  
  // 数据库操作
  saveEvaluation: (result: EvaluationResult) => Promise<string | null>;
  fetchEvaluationHistory: (agentId: string) => Promise<EvaluationResult[]>;
}

// =====================================================
// Hook 实现
// =====================================================

export function useAgentEvals(): UseAgentEvalsReturn {
  const { toast } = useToast();

  // 状态
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentStep, setCurrentStep] = useState<EvalPipelineStep | null>(null);
  const [progress, setProgress] = useState(0);
  const [events, setEvents] = useState<EvalPipelineEvent[]>([]);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // 历史状态
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationResult[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // 添加事件
  const addEvent = useCallback((
    step: EvalPipelineStep,
    status: EvalPipelineEvent['status'],
    message?: string
  ) => {
    const event: EvalPipelineEvent = {
      step,
      status,
      message,
      progress,
      timestamp: new Date().toISOString(),
    };
    setEvents(prev => [...prev, event]);
  }, [progress]);

  // 生成测试用例
  const generateTestCases = useCallback(async (
    request: GenerateTestCasesRequest
  ): Promise<TestCase[]> => {
    try {
      setCurrentStep('generating_tests');
      addEvent('generating_tests', 'running', '正在 AI 生成测试用例...');

      const { data, error: funcError } = await supabase.functions.invoke(
        'test-case-generator',
        { body: request }
      );

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to generate test cases');
      }

      addEvent('generating_tests', 'completed', `已生成 ${data.testCases.length} 个测试用例`);
      return data.testCases;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      addEvent('generating_tests', 'failed', message);
      throw err;
    }
  }, [addEvent]);

  // 执行单个测试
  const runSingleTest = useCallback(async (
    testCase: TestCase,
    agentConfig: RunEvaluationRequest['agentConfig']
  ): Promise<TestRunResult> => {
    const startTime = Date.now();

    try {
      const { data, error: funcError } = await supabase.functions.invoke(
        'sandbox-validate',
        {
          body: {
            agentConfig: {
              name: agentConfig.name,
              systemPrompt: agentConfig.systemPrompt || `你是 ${agentConfig.name}，一个智能助手。`,
              model: agentConfig.model || 'google/gemini-2.5-flash',
            },
            testMessage: testCase.input,
            timeoutMs: 15000,
          },
        }
      );

      const duration = Date.now() - startTime;
      const response = data?.response || '';

      // 检查禁止模式
      const violations = testCase.forbiddenPatterns.filter(pattern =>
        response.toLowerCase().includes(pattern.toLowerCase())
      );

      // 检查必需模式
      const matchedPatterns = testCase.requiredPatterns.filter(pattern =>
        response.toLowerCase().includes(pattern.toLowerCase())
      );

      // 判断是否通过
      const passed = data?.success &&
        violations.length === 0 &&
        (testCase.requiredPatterns.length === 0 || matchedPatterns.length > 0);

      // 计算质量分数 (简单启发式)
      let qualityScore = 80;
      if (response.length < 10) qualityScore -= 30;
      if (response.length > 500) qualityScore += 10;
      if (violations.length > 0) qualityScore -= violations.length * 20;
      qualityScore = Math.max(0, Math.min(100, qualityScore));

      return {
        testCaseId: testCase.id,
        testName: testCase.name,
        category: testCase.category,
        input: testCase.input,
        output: response,
        passed,
        duration,
        qualityScore,
        violations,
        matchedPatterns,
        timestamp: new Date().toISOString(),
      };

    } catch (err) {
      return {
        testCaseId: testCase.id,
        testName: testCase.name,
        category: testCase.category,
        input: testCase.input,
        output: '',
        passed: false,
        duration: Date.now() - startTime,
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }, []);

  // 本地红队测试回退方法
  const runLocalRedTeamTests = useCallback(async (
    agentConfig: RunEvaluationRequest['agentConfig']
  ): Promise<RedTeamResults> => {
    const attacks: RedTeamAttackResult[] = [];
    const vulnerabilities: string[] = [];

    for (const attack of RED_TEAM_ATTACK_TEMPLATES) {
      const startTime = Date.now();

      try {
        const { data } = await supabase.functions.invoke('sandbox-validate', {
          body: {
            agentConfig: {
              name: agentConfig.name,
              systemPrompt: agentConfig.systemPrompt || `你是 ${agentConfig.name}，一个智能助手。`,
              model: agentConfig.model || 'google/gemini-2.5-flash',
            },
            testMessage: attack.prompt,
            timeoutMs: 15000,
          },
        });

        const response = data?.response || '';
        const duration = Date.now() - startTime;

        const violations = attack.dangerPatterns.filter(pattern =>
          response.toLowerCase().includes(pattern.toLowerCase())
        );

        const blocked = violations.length === 0;

        if (!blocked) {
          vulnerabilities.push(`${attack.name}: 检测到危险响应模式 - ${violations.join(', ')}`);
        }

        attacks.push({
          attackId: attack.id,
          attackType: attack.type,
          attackName: attack.name,
          prompt: attack.prompt,
          response,
          blocked,
          violations,
          safe: blocked,
          duration,
          timestamp: new Date().toISOString(),
        });

      } catch (err) {
        attacks.push({
          attackId: attack.id,
          attackType: attack.type,
          attackName: attack.name,
          prompt: attack.prompt,
          response: '',
          blocked: true,
          violations: [],
          safe: true,
          duration: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      }
    }

    const attacksBlocked = attacks.filter(a => a.blocked).length;
    return {
      totalAttacks: attacks.length,
      attacksBlocked,
      attacksPassed: attacks.length - attacksBlocked,
      securityScore: attacks.length > 0 ? Math.round((attacksBlocked / attacks.length) * 100) : 100,
      attacks,
      vulnerabilities,
    };
  }, []);

  // 执行红队测试 (优先使用 Edge Function)
  const runRedTeamTests = useCallback(async (
    agentConfig: RunEvaluationRequest['agentConfig']
  ): Promise<RedTeamResults> => {
    setCurrentStep('running_red_team');
    addEvent('running_red_team', 'running', '正在执行红队对抗测试...');

    try {
      // 优先调用 red-team-agent Edge Function
      const { data, error: funcError } = await supabase.functions.invoke(
        'red-team-agent',
        {
          body: {
            agentConfig: {
              name: agentConfig.name,
              systemPrompt: agentConfig.systemPrompt,
              department: agentConfig.department,
              model: agentConfig.model || 'google/gemini-2.5-flash',
            },
            attackCategories: [
              'prompt_injection',
              'data_exfiltration',
              'privilege_escalation',
              'jailbreak_attempt',
              'social_engineering',
            ],
            enableAIAnalysis: true,
          },
        }
      );

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Red team test failed');
      }

      const results = data.results as RedTeamResults;

      addEvent('running_red_team', 'completed',
        `红队测试完成: ${results.attacksBlocked}/${results.totalAttacks} 攻击已拦截 (安全评分: ${results.securityScore}%)`
      );

      return results;

    } catch (err) {
      // 回退到本地测试
      console.warn('Red team Edge Function failed, falling back to local tests:', err);
      addEvent('running_red_team', 'running', '使用本地测试模式...');

      const localResults = await runLocalRedTeamTests(agentConfig);

      addEvent('running_red_team', 'completed',
        `红队测试完成: ${localResults.attacksBlocked}/${localResults.totalAttacks} 攻击已拦截`
      );

      return localResults;
    }
  }, [addEvent, runLocalRedTeamTests]);

  // 完整评估流程
  const runEvaluation = useCallback(async (
    request: RunEvaluationRequest
  ): Promise<EvaluationResult | null> => {
    const startTime = Date.now();
    setIsEvaluating(true);
    setError(null);
    setEvents([]);
    setProgress(0);

    try {
      // Step 1: 生成测试用例
      let testCases = request.testCases || [];
      if (testCases.length === 0) {
        setProgress(10);
        testCases = await generateTestCases({
          agentId: request.agentId,
          agentConfig: {
            name: request.agentConfig.name,
            systemPrompt: request.agentConfig.systemPrompt,
            department: request.agentConfig.department,
          },
          categories: ['functionality', 'edge_case', 'security'],
          count: 3,
        });
      }
      setProgress(25);

      // Step 2: 执行测试用例
      setCurrentStep('running_tests');
      addEvent('running_tests', 'running', `正在执行 ${testCases.length} 个测试用例...`);

      const testRuns: TestRunResult[] = [];
      for (let i = 0; i < testCases.length; i++) {
        const result = await runSingleTest(testCases[i], request.agentConfig);
        testRuns.push(result);
        setProgress(25 + Math.round((i / testCases.length) * 25));
      }

      addEvent('running_tests', 'completed', 
        `测试完成: ${testRuns.filter(t => t.passed).length}/${testRuns.length} 通过`
      );
      setProgress(50);

      // Step 3: 红队测试
      let redTeamResults: RedTeamResults = {
        totalAttacks: 0,
        attacksBlocked: 0,
        attacksPassed: 0,
        securityScore: 100,
        attacks: [],
        vulnerabilities: [],
      };

      if (request.includeRedTeam !== false) {
        redTeamResults = await runRedTeamTests(request.agentConfig);
      }
      setProgress(75);

      // Step 4: 计算评分
      setCurrentStep('calculating_scores');
      addEvent('calculating_scores', 'running', '正在计算综合评分...');

      const score = calculateAgentScore(testRuns, redTeamResults);
      const passed = checkIfPassed(score);

      addEvent('calculating_scores', 'completed', 
        `综合评分: ${score.overall}分 - ${passed ? '通过' : '未通过'}`
      );
      setProgress(90);

      // Step 5: 保存结果
      setCurrentStep('saving_results');
      addEvent('saving_results', 'running', '正在保存评估结果...');

      const result: EvaluationResult = {
        id: `eval-${Date.now()}`,
        agentId: request.agentId,
        evalType: request.evalType || 'pre_deploy',
        status: passed ? 'passed' : 'failed',
        score,
        testRuns,
        testSummary: {
          total: testRuns.length,
          passed: testRuns.filter(t => t.passed).length,
          failed: testRuns.filter(t => !t.passed).length,
          passRate: testRuns.length > 0
            ? Math.round((testRuns.filter(t => t.passed).length / testRuns.length) * 100)
            : 0,
        },
        redTeamResults,
        duration: Date.now() - startTime,
        passed,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      setEvaluationResult(result);
      
      // 自动保存到数据库
      const savedId = await saveEvaluation(result);
      if (savedId) {
        // 更新 result 的 id 为数据库 id
        result.id = savedId;
        setEvaluationResult(result);
        addEvent('saving_results', 'completed', `评估结果已保存 (ID: ${savedId.slice(0, 8)}...)`);
      } else {
        addEvent('saving_results', 'completed', '评估完成 (未登录，结果未保存)');
      }
      setProgress(100);

      toast({
        title: passed ? '✅ 质检通过' : '❌ 质检未通过',
        description: `综合评分 ${score.overall}分，安全合规 ${score.securityCompliance}%`,
        variant: passed ? 'default' : 'destructive',
      });

      return result;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        title: '评估失败',
        description: message,
        variant: 'destructive',
      });
      return null;

    } finally {
      setIsEvaluating(false);
      setCurrentStep(null);
    }
  }, [generateTestCases, runSingleTest, runRedTeamTests, addEvent, toast]);

  // 保存评估结果到数据库
  const saveEvaluation = useCallback(async (
    result: EvaluationResult
  ): Promise<string | null> => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.warn('User not authenticated, skipping save');
        return null;
      }

      // 处理 agent_id - 如果是临时ID或不存在，设为 null
      let validAgentId: string | null = result.agentId;
      if (!validAgentId || validAgentId.startsWith('temp-') || validAgentId.startsWith('draft-')) {
        validAgentId = null;
      } else {
        // 验证 agent 是否存在于数据库中
        const { data: agent } = await supabase
          .from('agents')
          .select('id')
          .eq('id', validAgentId)
          .maybeSingle();
        
        if (!agent) {
          // Agent 不存在，设为 null
          validAgentId = null;
        }
      }

      const { data, error: insertError } = await supabase
        .from('agent_evaluations')
        .insert({
          agent_id: validAgentId, // 可能为 null
          user_id: userData.user.id,
          eval_type: result.evalType,
          status: result.status,
          overall_score: result.score.overall,
          logic_coherence_score: result.score.logicCoherence,
          security_compliance_score: result.score.securityCompliance,
          response_quality_score: result.score.responseQuality,
          response_speed_grade: result.score.responseSpeedGrade,
          test_cases: result.testRuns as unknown as Json,
          red_team_results: result.redTeamResults as unknown as Json,
          passed: result.passed,
          duration_ms: result.duration,
          completed_at: result.completedAt,
        })
        .select('id')
        .single();

      if (insertError) throw insertError;
      return data.id;
    } catch (err) {
      console.error('Failed to save evaluation:', err);
      return null;
    }
  }, []);

  // 查询评估历史
  const fetchEvaluationHistory = useCallback(async (
    agentId: string
  ): Promise<EvaluationResult[]> => {
    setIsLoadingHistory(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('agent_evaluations')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;

      const results: EvaluationResult[] = (data || []).map(row => {
        const testRuns = (row.test_cases as unknown as TestRunResult[]) ?? [];
        return {
          id: row.id,
          agentId: row.agent_id,
          evalType: row.eval_type as EvaluationResult['evalType'],
          status: row.status as EvaluationResult['status'],
          score: {
            overall: Number(row.overall_score) || 0,
            logicCoherence: Number(row.logic_coherence_score) || 0,
            securityCompliance: Number(row.security_compliance_score) || 0,
            responseQuality: Number(row.response_quality_score) || 0,
            responseSpeedGrade: (row.response_speed_grade ?? 'C') as SpeedGrade,
            avgResponseTime: testRuns.length > 0 
              ? Math.round(testRuns.reduce((a, t) => a + (t.duration || 0), 0) / testRuns.length)
              : 0,
          },
          testRuns,
          testSummary: {
            total: testRuns.length,
            passed: testRuns.filter(t => t.passed).length,
            failed: testRuns.filter(t => !t.passed).length,
            passRate: testRuns.length > 0
              ? Math.round((testRuns.filter(t => t.passed).length / testRuns.length) * 100)
              : 0,
          },
          redTeamResults: (row.red_team_results as unknown as RedTeamResults) ?? {
            totalAttacks: 0,
            attacksBlocked: 0,
            attacksPassed: 0,
            securityScore: 100,
            attacks: [],
            vulnerabilities: [],
          },
          duration: row.duration_ms ?? 0,
          passed: row.passed ?? false,
          createdAt: row.created_at,
          completedAt: row.completed_at ?? undefined,
        };
      });

      setEvaluationHistory(results);
      return results;
    } catch (err) {
      console.error('Failed to fetch evaluation history:', err);
      return [];
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // 重置
  const reset = useCallback(() => {
    setIsEvaluating(false);
    setCurrentStep(null);
    setProgress(0);
    setEvents([]);
    setEvaluationResult(null);
    setError(null);
  }, []);

  return {
    isEvaluating,
    currentStep,
    progress,
    events,
    evaluationResult,
    error,
    evaluationHistory,
    isLoadingHistory,
    generateTestCases,
    runEvaluation,
    runRedTeamTests,
    reset,
    saveEvaluation,
    fetchEvaluationHistory,
  };
}

export default useAgentEvals;
