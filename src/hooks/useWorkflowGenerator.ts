// =====================================================
// 工作流生成器 Hook
// useWorkflowGenerator - AI 驱动的工作流生成
// =====================================================

import { useState, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  WorkflowDSL, 
  GeneratedWorkflow,
  MPLPPolicy,
  GenerationWarning,
  InjectedIntervention,
} from '@/types/workflowDSL';
import { convertDSLToGraph, convertToReactFlowFormat } from '@/utils/dslToGraph';
import { validateAndInjectPolicies, assessWorkflowRisk } from '@/utils/policyInjector';
import { autoWireWorkflow } from '@/utils/autoWiringEngine';

interface GenerateOptions {
  mplpPolicy?: MPLPPolicy;
  includeKnowledge?: boolean;
  maxNodes?: number;
  autoApplyPolicies?: boolean;
}

interface GenerationResult {
  dsl: WorkflowDSL;
  nodes: Node[];
  edges: Edge[];
  warnings: GenerationWarning[];
  interventions: InjectedIntervention[];
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high';
    highRiskNodes: string[];
    mediumRiskNodes: string[];
  };
}

interface UseWorkflowGeneratorReturn {
  generate: (description: string, options?: GenerateOptions) => Promise<GenerationResult>;
  applyToCanvas: (result: GenerationResult, setNodes: (nodes: Node[]) => void, setEdges: (edges: Edge[]) => void) => void;
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  lastResult: GenerationResult | null;
  error: string | null;
  reset: () => void;
}

export function useWorkflowGenerator(): UseWorkflowGeneratorReturn {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (
    description: string,
    options: GenerateOptions = {}
  ): Promise<GenerationResult> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const {
      mplpPolicy = 'default',
      includeKnowledge = true,
      maxNodes = 10,
      autoApplyPolicies = true,
    } = options;

    setIsGenerating(true);
    setError(null);
    setProgress(0);

    try {
      // Step 1: 调用 AI 生成 DSL
      setCurrentStep('正在分析需求...');
      setProgress(10);

      const { data, error: fnError } = await supabase.functions.invoke('workflow-generator', {
        body: {
          description,
          userId: user.id,
          mplpPolicy,
          includeKnowledge,
          maxNodes,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      let dsl: WorkflowDSL = data.dsl;
      const apiWarnings: GenerationWarning[] = (data.warnings || []).map((w: string) => ({
        code: 'API_WARNING',
        message: w,
        severity: 'info' as const,
      }));

      setProgress(40);
      setCurrentStep('正在应用治理策略...');

      // Step 2: 验证并注入策略
      let interventions: InjectedIntervention[] = [];
      let policyWarnings: GenerationWarning[] = [];

      if (autoApplyPolicies) {
        const policyResult = validateAndInjectPolicies(dsl, mplpPolicy);
        dsl = policyResult.validatedWorkflow;
        interventions = policyResult.injectedInterventions;
        policyWarnings = policyResult.warnings;
      }

      setProgress(60);
      setCurrentStep('正在生成画布布局...');

      // Step 3: 转换为 React Flow 格式
      const graphResult = convertDSLToGraph(dsl);
      const { nodes, edges } = convertToReactFlowFormat(graphResult);

      setProgress(80);
      setCurrentStep('正在评估风险...');

      // Step 4: 风险评估
      const riskAssessment = assessWorkflowRisk(dsl);

      setProgress(100);
      setCurrentStep('生成完成');

      const result: GenerationResult = {
        dsl,
        nodes,
        edges,
        warnings: [...apiWarnings, ...policyWarnings],
        interventions,
        riskAssessment,
      };

      setLastResult(result);
      return result;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Generation failed';
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [user]);

  const applyToCanvas = useCallback((
    result: GenerationResult,
    setNodes: (nodes: Node[]) => void,
    setEdges: (edges: Edge[]) => void
  ) => {
    setNodes(result.nodes);
    setEdges(result.edges);
  }, []);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress(0);
    setCurrentStep('');
    setLastResult(null);
    setError(null);
  }, []);

  return {
    generate,
    applyToCanvas,
    isGenerating,
    progress,
    currentStep,
    lastResult,
    error,
    reset,
  };
}

// ========== 工作流验证 Hook ==========

export function useWorkflowValidation() {
  const validateDSL = useCallback((dsl: WorkflowDSL): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 检查基本结构
    if (!dsl.version) {
      errors.push('缺少版本号');
    }
    if (!dsl.name) {
      errors.push('缺少工作流名称');
    }
    if (!dsl.trigger) {
      errors.push('缺少触发器配置');
    }
    if (!dsl.stages || dsl.stages.length === 0) {
      errors.push('缺少执行阶段');
    }

    // 检查节点连接
    for (const stage of dsl.stages || []) {
      for (const node of stage.nodes || []) {
        if (!node.id) {
          errors.push(`节点缺少 ID`);
        }
        if (!node.type) {
          errors.push(`节点 ${node.id} 缺少类型`);
        }
        if (!node.outputKey) {
          warnings.push(`节点 ${node.name || node.id} 缺少输出键`);
        }
      }
    }

    // 检查变量引用
    const definedOutputs = new Set<string>();
    definedOutputs.add('trigger'); // 触发器始终可用

    for (const stage of dsl.stages || []) {
      for (const node of stage.nodes || []) {
        // 检查输入映射引用
        for (const mapping of node.inputMappings || []) {
          const refMatch = mapping.sourceExpression.match(/\{\{(\w+)\./);
          if (refMatch) {
            const refNode = refMatch[1];
            if (!definedOutputs.has(refNode)) {
              warnings.push(`节点 ${node.name} 引用了未定义的输出: ${refNode}`);
            }
          }
        }
        // 添加当前节点输出
        if (node.outputKey) {
          definedOutputs.add(node.outputKey);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, []);

  return { validateDSL };
}
