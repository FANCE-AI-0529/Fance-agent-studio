// =====================================================
// 质检诊断与全自动自愈 Hook
// Eval Diagnosis & Auto-Fix State Machine
// =====================================================

import { useState, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client.ts';
import type { EvaluationResult } from '../types/agentEvals.ts';

// 诊断问题
export interface DiagnosisIssue {
  area: 'security' | 'logic' | 'quality' | 'unknown';
  issue: string;
  fix: string;
  estimatedImprovement: number;
}

// Prompt 补丁
export interface PromptPatch {
  type: 'prepend' | 'append';
  content: string;
}

// 诊断结果
export interface DiagnosisResult {
  summary: string;
  criticalIssues: DiagnosisIssue[];
  promptPatches: PromptPatch[];
  estimatedImprovement: {
    security: number;
    logic: number;
    quality: number;
    overall: number;
  };
  autoFixable: boolean;
}

// 自动修复阶段
export type AutoFixPhase =
  | 'idle'
  | 'diagnosing'
  | 'patching'
  | 'regenerating'
  | 'revalidating'
  | 'retesting'
  | 'complete'
  | 'escalated';

// 自动修复进度
export interface AutoFixProgress {
  phase: AutoFixPhase;
  attempt: number;
  maxAttempts: number;
  message: string;
}

const MAX_AUTO_FIX_ATTEMPTS = 3;

export function useEvalDiagnosis() {
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [autoFixProgress, setAutoFixProgress] = useState<AutoFixProgress>({
    phase: 'idle',
    attempt: 0,
    maxAttempts: MAX_AUTO_FIX_ATTEMPTS,
    message: '',
  });
  const [diagnosisError, setDiagnosisError] = useState<string | null>(null);

  /**
   * 调用 AI 诊断评估结果
   */
  const diagnose = useCallback(async (
    evaluationResult: EvaluationResult,
    agentConfig: { name: string; systemPrompt?: string; department?: string; model?: string },
    previousDiagnosis?: string,
    attempt: number = 0
  ): Promise<DiagnosisResult | null> => {
    setIsDiagnosing(true);
    setDiagnosisError(null);
    setAutoFixProgress(prev => ({
      ...prev,
      phase: 'diagnosing',
      message: '正在分析质检结果...',
    }));

    try {
      const { data, error } = await supabase.functions.invoke('eval-diagnosis', {
        body: {
          evaluationResult: {
            score: evaluationResult.score,
            testRuns: evaluationResult.testRuns,
            redTeamResults: evaluationResult.redTeamResults,
            passed: evaluationResult.passed,
          },
          agentConfig,
          previousDiagnosis,
          attempt,
        },
      });

      if (error) throw error;
      if (!data?.success || !data?.diagnosis) {
        throw new Error(data?.error || '诊断返回结果异常');
      }

      const result = data.diagnosis as DiagnosisResult;
      setDiagnosisResult(result);
      setAutoFixProgress(prev => ({
        ...prev,
        phase: 'idle',
        message: '诊断完成',
      }));

      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '诊断失败';
      setDiagnosisError(msg);
      setAutoFixProgress(prev => ({
        ...prev,
        phase: 'idle',
        message: `诊断失败: ${msg}`,
      }));
      return null;
    } finally {
      setIsDiagnosing(false);
    }
  }, []);

  /**
   * 应用 prompt 补丁到系统提示词
   */
  const applyPatches = useCallback((
    currentPrompt: string,
    patches: PromptPatch[]
  ): string => {
    let result = currentPrompt;
    for (const patch of patches) {
      if (patch.type === 'prepend') {
        result = patch.content + '\n\n' + result;
      } else if (patch.type === 'append') {
        result = result + '\n\n' + patch.content;
      }
    }
    return result;
  }, []);

  /**
   * 执行全自动修复循环
   * 
   * callbacks:
   * - onPatchPrompt: 修改系统提示词后的回调
   * - onRegenerate: 触发工作流重新生成
   * - onRevalidate: 触发沙箱验证
   * - onRetest: 触发质检评估
   * - onComplete: 修复成功
   * - onEscalated: 修复失败，需人工介入
   */
  const startAutoFix = useCallback(async (
    evaluationResult: EvaluationResult,
    agentConfig: { name: string; systemPrompt?: string; department?: string; model?: string },
    callbacks: {
      onPatchPrompt: (patchedPrompt: string) => void;
      onRegenerate: () => Promise<void>;
      onRetest: () => Promise<EvaluationResult | null>;
      onComplete: () => void;
      onEscalated: (finalDiagnosis: DiagnosisResult | null) => void;
    }
  ) => {
    let currentPrompt = agentConfig.systemPrompt || '';
    let currentEvalResult = evaluationResult;
    let previousSummary: string | undefined;
    let lastDiagnosis: DiagnosisResult | null = null;

    for (let attempt = 0; attempt < MAX_AUTO_FIX_ATTEMPTS; attempt++) {
      setAutoFixProgress({
        phase: 'diagnosing',
        attempt: attempt + 1,
        maxAttempts: MAX_AUTO_FIX_ATTEMPTS,
        message: `第 ${attempt + 1} 轮修复：正在诊断问题...`,
      });

      // 1. 诊断
      const diagnosis = await diagnose(
        currentEvalResult,
        { ...agentConfig, systemPrompt: currentPrompt },
        previousSummary,
        attempt
      );

      if (!diagnosis) {
        setAutoFixProgress({
          phase: 'escalated',
          attempt: attempt + 1,
          maxAttempts: MAX_AUTO_FIX_ATTEMPTS,
          message: '诊断失败，需要人工介入',
        });
        callbacks.onEscalated(null);
        return;
      }

      lastDiagnosis = diagnosis;

      if (!diagnosis.autoFixable || diagnosis.promptPatches.length === 0) {
        setAutoFixProgress({
          phase: 'escalated',
          attempt: attempt + 1,
          maxAttempts: MAX_AUTO_FIX_ATTEMPTS,
          message: '无法自动修复，需要人工调整',
        });
        callbacks.onEscalated(diagnosis);
        return;
      }

      // 2. 应用补丁
      setAutoFixProgress({
        phase: 'patching',
        attempt: attempt + 1,
        maxAttempts: MAX_AUTO_FIX_ATTEMPTS,
        message: `正在应用 ${diagnosis.promptPatches.length} 个修复补丁...`,
      });

      currentPrompt = applyPatches(currentPrompt, diagnosis.promptPatches);
      callbacks.onPatchPrompt(currentPrompt);

      // 3. 重新生成
      setAutoFixProgress({
        phase: 'regenerating',
        attempt: attempt + 1,
        maxAttempts: MAX_AUTO_FIX_ATTEMPTS,
        message: '正在重新生成工作流...',
      });

      await callbacks.onRegenerate();

      // 4. 重新质检
      setAutoFixProgress({
        phase: 'retesting',
        attempt: attempt + 1,
        maxAttempts: MAX_AUTO_FIX_ATTEMPTS,
        message: '正在重新质检...',
      });

      const newResult = await callbacks.onRetest();

      if (!newResult) {
        previousSummary = diagnosis.summary;
        continue;
      }

      // 5. 检查是否通过
      if (newResult.passed) {
        setAutoFixProgress({
          phase: 'complete',
          attempt: attempt + 1,
          maxAttempts: MAX_AUTO_FIX_ATTEMPTS,
          message: `第 ${attempt + 1} 轮修复成功！质检已通过`,
        });
        callbacks.onComplete();
        return;
      }

      // 未通过，进入下一轮
      currentEvalResult = newResult;
      previousSummary = diagnosis.summary;
    }

    // 所有尝试用尽
    setAutoFixProgress({
      phase: 'escalated',
      attempt: MAX_AUTO_FIX_ATTEMPTS,
      maxAttempts: MAX_AUTO_FIX_ATTEMPTS,
      message: `已尝试 ${MAX_AUTO_FIX_ATTEMPTS} 轮修复，仍未通过质检`,
    });
    callbacks.onEscalated(lastDiagnosis);
  }, [diagnose, applyPatches]);

  /**
   * 重置状态
   */
  const resetDiagnosis = useCallback(() => {
    setIsDiagnosing(false);
    setDiagnosisResult(null);
    setDiagnosisError(null);
    setAutoFixProgress({
      phase: 'idle',
      attempt: 0,
      maxAttempts: MAX_AUTO_FIX_ATTEMPTS,
      message: '',
    });
  }, []);

  return {
    diagnose,
    applyPatches,
    startAutoFix,
    resetDiagnosis,
    isDiagnosing,
    diagnosisResult,
    diagnosisError,
    autoFixProgress,
    MAX_AUTO_FIX_ATTEMPTS,
  };
}
