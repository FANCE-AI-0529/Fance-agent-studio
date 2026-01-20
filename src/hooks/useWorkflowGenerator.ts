// =====================================================
// 工作流生成器 Hook
// useWorkflowGenerator - AI 驱动的工作流生成
// 支持构建计划 (Build Plan) 和沙箱验证
// =====================================================

import { useState, useCallback } from 'react';
import { Node, Edge } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  WorkflowDSL, 
  MPLPPolicy,
  GenerationWarning,
  InjectedIntervention,
  RiskLevel,
  ComplianceReport,
} from '@/types/workflowDSL';
import { convertDSLToGraph, convertToReactFlowFormat } from '@/utils/dslToGraph';
import { 
  validateAndInjectPolicies, 
  assessWorkflowRisk,
  generateComplianceReport,
  extractRequiredPermissions,
  PERMISSION_METADATA,
} from '@/utils/policyInjector';
import { useBuildPlanStore } from '@/stores/buildPlanStore';
import type { GeneratedSkillSpec, AssetMatch } from '@/types/buildPlan';

// ========== 类型定义 ==========

export interface GenerateOptions {
  mplpPolicy?: MPLPPolicy;
  includeKnowledge?: boolean;
  maxNodes?: number;
  autoApplyPolicies?: boolean;
  enableBuildPlan?: boolean; // 启用构建计划可视化
}

export interface RiskAssessment {
  overallRisk: RiskLevel;
  highRiskNodes: string[];
  mediumRiskNodes: string[];
}

// Gap Analysis 结果
export interface GapAnalysisResult {
  coverageScore: number;
  missingCapabilities: string[];
  suggestedSkills: SkillSuggestion[];
  suggestedKnowledgeBases: KnowledgeBaseSuggestion[];
}

export interface SkillSuggestion {
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  reason: string;
}

export interface KnowledgeBaseSuggestion {
  id: string;
  name: string;
  description?: string;
  intentTags: string[];
  contextHook?: string;
  matchScore: number;
}

export interface GenerationResult {
  dsl: WorkflowDSL;
  nodes: Node[];
  edges: Edge[];
  warnings: GenerationWarning[];
  interventions: InjectedIntervention[];
  riskAssessment: RiskAssessment;
  complianceReport: ComplianceReport;
  requiredPermissions: string[];
  // 新增：缺口分析和生成结果
  gapAnalysis?: GapAnalysisResult;
  generatedSkills?: Array<{ id: string; name: string; isGenerated: boolean }>;
  autoMountedKBs?: KnowledgeBaseSuggestion[];
}

export interface UseWorkflowGeneratorReturn {
  generate: (description: string, options?: GenerateOptions) => Promise<GenerationResult>;
  applyToCanvas: (result: GenerationResult, setNodes: (nodes: Node[]) => void, setEdges: (edges: Edge[]) => void) => void;
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  lastResult: GenerationResult | null;
  error: string | null;
  reset: () => void;
}

// ========== 节点类型映射（DSL -> React Flow） ==========

const DSL_TO_CANVAS_NODE_TYPE: Record<string, string> = {
  trigger: 'trigger',
  agent: 'agent',
  skill: 'skill',
  mcp_action: 'mcpAction',
  knowledge: 'knowledge',
  condition: 'condition',
  parallel: 'parallel',
  loop: 'loop',
  intervention: 'intervention',
  output: 'output',
  generatedSkill: 'generatedSkill', // AI 即时生成的技能
  // 从 dslToGraph 生成的类型
  triggerNode: 'trigger',
  agentNode: 'agent',
  skillNode: 'skill',
  mcpActionNode: 'mcpAction',
  knowledgeBaseNode: 'knowledge',
  conditionNode: 'condition',
  parallelNode: 'parallel',
  loopNode: 'loop',
  interventionNode: 'intervention',
  outputNode: 'output',
  generatedSkillNode: 'generatedSkill',
};

// ========== 主 Hook ==========

export function useWorkflowGenerator(): UseWorkflowGeneratorReturn {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [lastResult, setLastResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Build Plan Store
  const buildPlanStore = useBuildPlanStore();

  const generate = useCallback(async (
    description: string,
    options: GenerateOptions = {}
  ): Promise<GenerationResult> => {
    if (!user) {
      throw new Error('用户未登录');
    }

    const {
      mplpPolicy = 'default',
      includeKnowledge = true,
      maxNodes = 10,
      autoApplyPolicies = true,
      enableBuildPlan = true,
    } = options;

    setIsGenerating(true);
    setError(null);
    setProgress(0);

    // 初始化构建计划
    if (enableBuildPlan) {
      buildPlanStore.initializePlan(description);
    }

    try {
      // Phase 1: 意图分析
      if (enableBuildPlan) buildPlanStore.startPhase('intentAnalysis');
      setCurrentStep('正在分析需求...');
      setProgress(10);

      await delay(300);
      
      if (enableBuildPlan) {
        buildPlanStore.completePhase('intentAnalysis', '意图提取完成');
      }

      // Phase 2: 资产检查
      if (enableBuildPlan) buildPlanStore.startPhase('assetCheck');
      setCurrentStep('正在检索相关资产...');
      setProgress(25);

      let data: any;
      let fnError: any;
      
      // 第一次调用
      const firstResponse = await supabase.functions.invoke('workflow-generator', {
        body: {
          description,
          userId: user.id,
          mplpPolicy,
          includeKnowledge,
          maxNodes,
        },
      });
      
      data = firstResponse.data;
      fnError = firstResponse.error;

      if (fnError) {
        throw new Error(fnError.message);
      }

      // 🆕 处理澄清状态 - 自动跳过知识库并重试
      if (data?.status === 'clarification_needed') {
        console.log('[WorkflowGenerator] Clarification needed, auto-retrying with skipKnowledge=true');
        
        // 如果是知识库相关的澄清，自动跳过知识库
        if (data.reason === 'no_match' || data.reason === 'multiple_candidates') {
          const retryResponse = await supabase.functions.invoke('workflow-generator', {
            body: {
              description,
              userId: user.id,
              mplpPolicy,
              includeKnowledge,
              maxNodes,
              skipKnowledge: true, // 跳过知识库挂载
            },
          });
          
          if (retryResponse.error) {
            throw new Error(retryResponse.error.message);
          }
          
          data = retryResponse.data;
        }
      }

      if (!data?.dsl) {
        if (enableBuildPlan) buildPlanStore.failPhase('assetCheck', '生成失败');
        throw new Error('生成失败：未返回有效的工作流 DSL');
      }

      let dsl: WorkflowDSL = data.dsl;
      const apiWarnings: GenerationWarning[] = (data.warnings || []).map((w: string) => ({
        code: 'API_WARNING',
        message: w,
        severity: 'info' as const,
      }));

      // 提取缺口分析结果
      const gapAnalysis: GapAnalysisResult | undefined = data.gapAnalysis;
      const generatedSkills = data.suggestedAssets?.generatedSkills || [];
      const autoMountedKBs = data.suggestedAssets?.autoMountedKBs || [];

      // 更新构建计划
      if (enableBuildPlan) {
        buildPlanStore.completePhase('assetCheck', `找到 ${generatedSkills.length + autoMountedKBs.length} 个相关资产`);
        
        // 设置资产检查结果
        if (gapAnalysis) {
          buildPlanStore.setAssetCheckResult({
            matchedAssets: (data.suggestedAssets?.skills || []).map((s: { id: string; name: string; riskLevel?: string }) => ({
              type: 'skill' as const,
              id: s.id,
              name: s.name,
              score: 0.8,
              action: 'use' as const,
            })),
            missingCapabilities: gapAnalysis.missingCapabilities || [],
            needsGeneration: gapAnalysis.coverageScore < 0.6,
            coverageScore: gapAnalysis.coverageScore,
          });
        }

        // Phase 3: 缺口分析
        buildPlanStore.startPhase('gapAnalysis');
      }

      // 如果有缺口，添加警告
      if (gapAnalysis && gapAnalysis.coverageScore < 0.6) {
        apiWarnings.push({
          code: 'LOW_COVERAGE',
          message: `资产覆盖度较低 (${(gapAnalysis.coverageScore * 100).toFixed(0)}%)，已自动生成 ${generatedSkills.length} 个技能`,
          severity: 'warning' as const,
        });
        
        if (enableBuildPlan) {
          buildPlanStore.completePhase('gapAnalysis', `覆盖度 ${(gapAnalysis.coverageScore * 100).toFixed(0)}%，需生成 ${generatedSkills.length} 技能`);
          
          // Phase 4: 技能生成
          buildPlanStore.startPhase('skillGeneration');
          for (const skill of generatedSkills) {
            buildPlanStore.addGeneratedSkill({
              id: skill.id,
              name: skill.name,
              description: skill.description || '',
              category: skill.category || 'general',
              capabilities: skill.capabilities || [],
              inputSchema: {},
              outputSchema: {},
              generatedAt: new Date().toISOString(),
              isGenerated: true,
            });
          }
          buildPlanStore.completePhase('skillGeneration', `生成 ${generatedSkills.length} 个技能`);
        }
      } else if (enableBuildPlan) {
        buildPlanStore.completePhase('gapAnalysis', '资产覆盖充足');
        buildPlanStore.skipPhase('skillGeneration', '无需生成新技能');
      }

      // 设置自动挂载的知识库
      if (enableBuildPlan && autoMountedKBs.length > 0) {
        buildPlanStore.setAutoMountedKBs(autoMountedKBs);
      }

      setProgress(50);
      
      // Phase 5: 组装
      if (enableBuildPlan) buildPlanStore.startPhase('assembly');
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

      setProgress(70);
      setCurrentStep('正在生成画布布局...');

      // Step 3: 转换为 React Flow 格式
      const graphResult = convertDSLToGraph(dsl);
      const flowFormat = convertToReactFlowFormat(graphResult);

      // 映射节点类型到画布支持的类型
      const nodes: Node[] = flowFormat.nodes.map((node) => {
        const nodeType = DSL_TO_CANVAS_NODE_TYPE[node.type || ''] || node.type;
        const nodeData = node.data as Record<string, unknown> | undefined;
        const isGenerated = nodeData?.isGenerated || nodeType === 'generatedSkill';
        const nodeConfig = nodeData?.config as Record<string, unknown> | undefined;
        
        // 关键修复：正确区分 canvas node ID 和 asset UUID
        // - node.id 是画布节点实例 ID（如 "node-0"），仅用于 React Flow 画布
        // - nodeData.assetId 或 nodeData.id（如果是 UUID）是资源的真实 ID，用于数据库关联
        const assetId = nodeData?.assetId as string | undefined;
        const originalDataId = nodeData?.id as string | undefined;
        
        // UUID 格式校验函数
        const isValidUUID = (str: string | undefined): boolean => {
          if (!str) return false;
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          return uuidRegex.test(str);
        };
        
        // 优先使用 assetId，若无效则尝试 originalDataId，最后才用 node.id（但标记为无效）
        const resolvedAssetId = isValidUUID(assetId) 
          ? assetId 
          : isValidUUID(originalDataId) 
            ? originalDataId 
            : undefined;
        
        return {
          ...node,
          type: nodeType,
          data: {
            ...nodeData,
            // id 字段：存储资产的真实 UUID，用于数据库关联
            // 如果没有有效 UUID，保留原值但后续保存时会被过滤
            id: resolvedAssetId || originalDataId || node.id,
            // assetId 字段：明确存储资产 UUID，供 Builder 优先读取
            assetId: resolvedAssetId,
            // nodeId 字段：存储画布节点实例 ID，仅供 UI 使用
            nodeId: node.id,
            name: nodeData?.label || nodeData?.name || node.id,
            isGenerated,
            // 为知识库节点添加自动挂载标识
            isAutoMounted: nodeConfig?.isAutoMounted || 
              autoMountedKBs.some((kb: KnowledgeBaseSuggestion) => kb.id === nodeData?.assetId),
          },
        };
      });

      const edges: Edge[] = flowFormat.edges.map((edge) => ({
        ...edge,
        type: 'animatedFlow',
        animated: true,
        style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
      }));

      setProgress(80);
      setCurrentStep('正在评估风险...');

      // Step 4: 风险评估
      const riskAssessment = assessWorkflowRisk(dsl);

      setProgress(90);
      setCurrentStep('正在进行合规检查...');

      // Step 5: 生成合规报告和权限提取
      const requiredPermissions = extractRequiredPermissions(dsl);
      const complianceReport = generateComplianceReport(dsl, interventions, mplpPolicy);

      // 如果有未保护的高危操作，添加额外警告
      if (complianceReport.unprotectedOperations.length > 0) {
        policyWarnings.push({
          code: 'UNPROTECTED_OPERATION',
          message: `检测到 ${complianceReport.unprotectedOperations.length} 个未保护的高危操作`,
          severity: 'warning',
        });
      }

      // 完成组装阶段
      if (enableBuildPlan) {
        buildPlanStore.completePhase('assembly', `生成 ${nodes.length} 个节点`);
        // 验证阶段将在 EnhancedAIGenerator 中处理
        buildPlanStore.updatePhase('validation', { status: 'pending' });
      }

      setProgress(100);
      setCurrentStep('生成完成');

      const result: GenerationResult = {
        dsl,
        nodes,
        edges,
        warnings: [...apiWarnings, ...policyWarnings],
        interventions,
        riskAssessment,
        complianceReport,
        requiredPermissions,
        // 新增：缺口分析和生成结果
        gapAnalysis,
        generatedSkills: generatedSkills.map((s: { id: string; name: string }) => ({
          id: s.id,
          name: s.name,
          isGenerated: true,
        })),
        autoMountedKBs,
      };

      // 设置输出到构建计划
      if (enableBuildPlan) {
        buildPlanStore.setOutput({
          nodes,
          edges,
          agentConfig: dsl,
          dsl,
        });
      }

      setLastResult(result);
      return result;

    } catch (err) {
      const message = err instanceof Error ? err.message : '生成失败';
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

// ========== 辅助函数 ==========

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
