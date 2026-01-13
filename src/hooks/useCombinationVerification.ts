// =====================================================
// 组合能力验收 Hook - Combination Verification Hook
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  HellTestScenario,
  VerificationResult,
} from '@/types/verificationTypes';
import { HELL_TEST_SCENARIOS } from '@/types/verificationTypes';
import { verifyTopology } from '@/utils/topologyVerifier';
import { verifyManusCompliance } from '@/utils/manusComplianceVerifier';
import { verifyWiring } from '@/utils/wiringVerifier';
import { analyzeDataFlow } from '@/utils/dataFlowAnalyzer';

interface UseCombinationVerificationReturn {
  scenarios: typeof HELL_TEST_SCENARIOS;
  isRunning: boolean;
  currentScenario: HellTestScenario | null;
  result: VerificationResult | null;
  progress: {
    phase: string;
    percent: number;
  };
  runVerification: (scenarioId: string) => Promise<void>;
  runAllVerifications: () => Promise<VerificationResult[]>;
  reset: () => void;
}

export function useCombinationVerification(): UseCombinationVerificationReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<HellTestScenario | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [progress, setProgress] = useState({ phase: '', percent: 0 });

  // 使用导入的场景列表
  const scenarios = HELL_TEST_SCENARIOS;

  /**
   * 运行单个验证场景
   */
  const runVerification = useCallback(async (scenarioId: string) => {
    const scenario = scenarios.find((s: HellTestScenario) => s.id === scenarioId);
    if (!scenario) {
      toast.error('未找到测试场景');
      return;
    }

    setIsRunning(true);
    setCurrentScenario(scenario);
    setResult(null);
    const startTime = Date.now();

    try {
      // Phase 1: 调用工作流生成器
      setProgress({ phase: '生成工作流', percent: 10 });
      
      const { data: generatorData, error: generatorError } = await supabase.functions.invoke(
        'workflow-generator',
        {
          body: {
            description: scenario.input,
            userId: 'anonymous',
            mplpPolicy: 'default',
            useBlueprintMode: true,
          },
        }
      );

      if (generatorError) {
        throw new Error(`工作流生成失败: ${generatorError.message}`);
      }

      const generatedDSL = generatorData?.dsl || generatorData;
      
      // Phase 2: 拓扑验证
      setProgress({ phase: '拓扑验证', percent: 30 });
      const topologyResult = verifyTopology(generatedDSL, scenario.expectedTopology);

      // Phase 3: Manus 合规验证
      setProgress({ phase: 'Manus 合规检查', percent: 50 });
      const manusResult = verifyManusCompliance(generatedDSL, scenario.expectedManus);

      // Phase 4: 连线验证
      setProgress({ phase: '连线验证', percent: 70 });
      const wiringResult = verifyWiring(generatedDSL, scenario.expectedWiring);

      // Phase 5: 数据流分析
      setProgress({ phase: '数据流分析', percent: 90 });
      const dataFlowResult = analyzeDataFlow(generatedDSL);

      // 计算总分
      const score = calculateScore(topologyResult, manusResult, wiringResult);
      const passed = score >= 0.7;

      // 生成建议
      const suggestions = generateSuggestions(topologyResult, manusResult, wiringResult);
      const warnings = [
        ...topologyResult.details.filter(d => d.startsWith('❌') || d.startsWith('⚠️')),
        ...manusResult.details.filter(d => d.startsWith('❌') || d.startsWith('⚠️')),
        ...wiringResult.warnings,
      ];

      const verificationResult: VerificationResult = {
        scenario,
        passed,
        score,
        topologyCheck: topologyResult,
        manusCheck: manusResult,
        wiringCheck: wiringResult,
        dataFlow: dataFlowResult,
        generatedDSL,
        blueprintUsed: generatorData?.blueprintUsed,
        warnings,
        suggestions,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      };

      setProgress({ phase: '完成', percent: 100 });
      setResult(verificationResult);

      if (passed) {
        toast.success(`验证通过! 得分: ${Math.round(score * 100)}%`);
      } else {
        toast.warning(`验证未通过, 得分: ${Math.round(score * 100)}%`);
      }

    } catch (error) {
      console.error('Verification error:', error);
      toast.error(error instanceof Error ? error.message : '验证过程出错');
    } finally {
      setIsRunning(false);
    }
  }, [scenarios]);

  /**
   * 运行所有验证场景
   */
  const runAllVerifications = useCallback(async (): Promise<VerificationResult[]> => {
    const results: VerificationResult[] = [];

    for (const scenario of scenarios) {
      await runVerification(scenario.id);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }, [scenarios, runVerification]);

  /**
   * 重置状态
   */
  const reset = useCallback(() => {
    setIsRunning(false);
    setCurrentScenario(null);
    setResult(null);
    setProgress({ phase: '', percent: 0 });
  }, []);

  return {
    scenarios,
    isRunning,
    currentScenario,
    result,
    progress,
    runVerification,
    runAllVerifications,
    reset,
  };
}

/**
 * 计算总分
 */
function calculateScore(
  topologyResult: { passed: boolean; foundNodes: unknown[]; missingNodes: string[] },
  manusResult: { passed: boolean; operationsCovered: string[]; missingOperations: string[] },
  wiringResult: { coveragePercent: number }
): number {
  // 拓扑分数 (40%)
  const topologyScore = topologyResult.passed ? 1 : 
    topologyResult.foundNodes.length / 
    (topologyResult.foundNodes.length + topologyResult.missingNodes.length);

  // Manus 分数 (30%)
  const totalOps = manusResult.operationsCovered.length + manusResult.missingOperations.length;
  const manusScore = totalOps > 0 
    ? manusResult.operationsCovered.length / totalOps 
    : (manusResult.passed ? 1 : 0);

  // 连线分数 (30%)
  const wiringScore = wiringResult.coveragePercent;

  return topologyScore * 0.4 + manusScore * 0.3 + wiringScore * 0.3;
}

/**
 * 生成改进建议
 */
function generateSuggestions(
  topologyResult: { missingNodes: string[]; branchesCorrect: boolean },
  manusResult: { planningEnabled: boolean; missingOperations: string[] },
  wiringResult: { missingConnections: string[]; draftEdges: number }
): string[] {
  const suggestions: string[] = [];

  // 拓扑建议
  if (topologyResult.missingNodes.length > 0) {
    suggestions.push(
      `添加缺失的节点: ${topologyResult.missingNodes.join(', ')}`
    );
  }

  if (!topologyResult.branchesCorrect) {
    suggestions.push('检查条件分支配置，确保所有分支路径正确');
  }

  // Manus 建议
  if (!manusResult.planningEnabled) {
    suggestions.push('为 Agent Core 启用 planning-with-files 功能');
  }

  if (manusResult.missingOperations.length > 0) {
    suggestions.push(
      `添加缺失的 MCP 操作: ${manusResult.missingOperations.join(', ')}`
    );
  }

  // 连线建议
  if (wiringResult.missingConnections.length > 0) {
    suggestions.push(
      `完善节点连线: ${wiringResult.missingConnections.join('; ')}`
    );
  }

  if (wiringResult.draftEdges > 0) {
    suggestions.push(
      `${wiringResult.draftEdges} 条连线需要确认，请检查置信度较低的连接`
    );
  }

  return suggestions;
}
