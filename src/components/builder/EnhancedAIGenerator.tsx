// =====================================================
// 增强版 AI 智能体生成器
// Enhanced AI Agent Generator with Workflow DSL
// 集成构建计划可视化 + 沙箱验证 + 错误自愈
// =====================================================

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Mic,
  Wand2,
  Loader2,
  CheckCircle,
  Settings2,
  RefreshCw,
  AlertTriangle,
  SkipForward,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useWorkflowGenerator } from "@/hooks/useWorkflowGenerator";
import { WorkflowPreview } from "./WorkflowPreview";
import { BuildPlanViewer } from "./BuildPlanViewer";
import { ValidationProgressPanel, ValidationPhase } from "./ValidationProgressPanel";
import AgentScorecard from "./AgentScorecard";
import EvalProgressPanel from "./EvalProgressPanel";
import { useBuildPlanStore } from "@/stores/buildPlanStore";
import { useSandboxValidation } from "@/hooks/useSandboxValidation";
import { useSelfHealing } from "@/hooks/useSelfHealing";
import { useAgentEvals } from "@/hooks/useAgentEvals";
import { aiAgentScenarios, AIAgentScenario } from "@/data/aiAgentScenarios";
import type { Node, Edge } from "@xyflow/react";
import type { SimpleAgentConfig } from "@/components/builder/SimplifiedConfigPanel";
import type { MountedKnowledgeBase } from "@/hooks/useBuilderKnowledge";
import type { MPLPPolicy, InjectedIntervention, GenerationWarning, RiskLevel, ComplianceReport } from "@/types/workflowDSL";
import type { GenerationResult } from "@/hooks/useWorkflowGenerator";

// ========== 类型定义 ==========

// 简化的技能类型 (用于验证流程)
interface SimpleSkill {
  id: string;
  name: string;
  isGenerated?: boolean;
}

interface EnhancedAIGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (
    nodes: Node[],
    edges: Edge[],
    config: SimpleAgentConfig,
    knowledgeBases?: MountedKnowledgeBase[],
    result?: GenerationResult
  ) => void;
  // New props for inspiration auto-generation
  initialDescription?: string | null;
  autoGenerate?: boolean;
  inspirationTitle?: string | null;
}

// ========== 主组件 ==========

export function EnhancedAIGenerator({
  isOpen,
  onClose,
  onApply,
  initialDescription,
  autoGenerate = false,
  inspirationTitle,
}: EnhancedAIGeneratorProps) {
  // 输入状态
  const [description, setDescription] = useState("");
  const [selectedScenario, setSelectedScenario] = useState<AIAgentScenario | null>(null);

  // 高级选项
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [mplpPolicy, setMplpPolicy] = useState<MPLPPolicy>("default");
  const [includeKnowledge, setIncludeKnowledge] = useState(true);
  const [maxNodes, setMaxNodes] = useState(10);
  const [autoApplyPolicies, setAutoApplyPolicies] = useState(true);

  // 验证阶段状态
  const [validationPhase, setValidationPhase] = useState<ValidationPhase>('idle');
  
  // 评估阶段状态
  const [evalPhase, setEvalPhase] = useState<'idle' | 'running' | 'complete'>('idle');
  
  // 当前激活的预览 Tab
  const [activePreviewTab, setActivePreviewTab] = useState<string>('workflow');
  
  // 生成的技能列表 (用于自愈) - 使用简化类型
  const [generatedSkills, setGeneratedSkills] = useState<SimpleSkill[]>();


  // Auto-generation tracking
  const hasAutoTriggeredRef = useRef(false);
  const hasAutoAppliedRef = useRef(false);

  // 使用新的工作流生成器
  const {
    generate,
    isGenerating,
    progress,
    currentStep,
    lastResult,
    error,
    reset,
  } = useWorkflowGenerator();

  // 构建计划 Store
  const buildPlanStore = useBuildPlanStore();

  // 沙箱验证
  const {
    runDryRun,
    isValidating,
    validationResult,
    retryCount,
    incrementRetryCount,
    resetValidation,
  } = useSandboxValidation();

  // Agent 评估
  const agentEvals = useAgentEvals();

  // 错误自愈
  const {
    heal,
    isHealing,
    healingProgress,
    healingLog,
    resetHealing,
    MAX_RETRIES,
  } = useSelfHealing();

  // Auto-fill description from initialDescription
  useEffect(() => {
    if (initialDescription && isOpen) {
      setDescription(initialDescription);
    }
  }, [initialDescription, isOpen]);

  // Auto-trigger generation when autoGenerate is true
  useEffect(() => {
    if (
      autoGenerate &&
      isOpen &&
      initialDescription &&
      !isGenerating &&
      !lastResult &&
      !hasAutoTriggeredRef.current
    ) {
      hasAutoTriggeredRef.current = true;
      // Small delay to ensure UI is ready
      setTimeout(() => {
        handleGenerateWithValidation();
      }, 300);
    }
  }, [autoGenerate, isOpen, initialDescription, isGenerating, lastResult]);

  // Auto-apply result when generation completes (for inspiration flow)
  useEffect(() => {
    if (
      autoGenerate &&
      lastResult &&
      validationPhase === 'complete' &&
      !hasAutoAppliedRef.current
    ) {
      hasAutoAppliedRef.current = true;
      // Auto-apply after a short delay
      setTimeout(() => {
        handleApplyInternal();
      }, 500);
    }
  }, [autoGenerate, lastResult, validationPhase]);

  // Reset refs when dialog closes
  useEffect(() => {
    if (!isOpen) {
      hasAutoTriggeredRef.current = false;
      hasAutoAppliedRef.current = false;
    }
  }, [isOpen]);

  const handleScenarioSelect = (scenario: AIAgentScenario) => {
    setSelectedScenario(scenario);
    setDescription(scenario.prompt);
  };

  // 带验证的生成流程
  const handleGenerateWithValidation = useCallback(async () => {
    const desc = description.trim() || initialDescription?.trim();
    if (!desc) return;

    try {
      // 1. 切换到构建计划视图
      setActivePreviewTab('buildPlan');
      setValidationPhase('building');
      resetValidation();
      resetHealing();

      // 2. 生成工作流 (启用构建计划)
      const result = await generate(desc, {
        mplpPolicy,
        includeKnowledge,
        maxNodes,
        autoApplyPolicies,
        enableBuildPlan: true,
      });

      if (!result) {
        setValidationPhase('failed');
        return;
      }

      // 3. 提取生成的技能
      const skills = result.generatedSkills || [];
      setGeneratedSkills(skills);

      // 4. 切换到验证视图
      setActivePreviewTab('validation');
      setValidationPhase('validating');

      // 5. 执行沙箱验证
      const agentConfig = {
        name: result.dsl?.name || 'AI 生成的智能体',
        systemPrompt: result.dsl?.stages?.[0]?.nodes?.find(
          (n: any) => n.type === 'agent'
        )?.config?.systemPrompt || '',
        model: 'claude-3.5',
      };

      const validation = await runDryRun(agentConfig, skills);

      // 6. 处理验证结果
      if (validation.success) {
        setValidationPhase('complete');
        buildPlanStore.setValidationResult({ passed: true, testRuns: validation.testRuns, retryCount: 0 });
        
        // 🆕 自动触发质检评估
        setEvalPhase('running');
        setActivePreviewTab('scorecard');
        
        try {
          await agentEvals.runEvaluation({
            agentId: `gen-${Date.now()}`,
            agentConfig: {
              name: result.dsl?.name || 'AI 生成的智能体',
              systemPrompt: agentConfig.systemPrompt,
              department: result.dsl?.metadata?.category,
              model: 'google/gemini-2.5-flash',
            },
            includeRedTeam: true,
            evalType: 'pre_deploy',
          });
          setEvalPhase('complete');
        } catch (evalErr) {
          console.error('Evaluation failed:', evalErr);
          setEvalPhase('complete'); // Still show whatever results we have
        }
      } else if (retryCount < MAX_RETRIES) {
        // 7. 触发自愈
        setValidationPhase('healing');
        const healResult = await heal(
          validation,
          desc,
          skills.filter(s => 
            validation.failedComponents.includes(s.id)
          ) || skills,
          retryCount
        );

        incrementRetryCount();

        if (healResult.success) {
          // 用修复后的技能重新验证
          setGeneratedSkills(healResult.regeneratedSkills as SimpleSkill[]);
          const revalidation = await runDryRun(agentConfig, healResult.regeneratedSkills);
          
          if (revalidation.success) {
            setValidationPhase('complete');
            buildPlanStore.setValidationResult({ 
              passed: true, 
              testRuns: revalidation.testRuns,
              retryCount: healResult.attempts 
            });
          } else {
            setValidationPhase('failed');
            buildPlanStore.setValidationResult({ 
              passed: false, 
              testRuns: revalidation.testRuns,
              retryCount: healResult.attempts 
            });
          }
        } else {
          setValidationPhase('failed');
        }
      } else {
        setValidationPhase('failed');
        buildPlanStore.setValidationResult({ 
          passed: false, 
          testRuns: validation.testRuns,
          retryCount 
        });
      }

    } catch (err) {
      console.error("Generation failed:", err);
      setValidationPhase('failed');
    }
  }, [description, initialDescription, mplpPolicy, includeKnowledge, maxNodes, autoApplyPolicies, generate, runDryRun, heal, retryCount, incrementRetryCount, resetValidation, resetHealing, buildPlanStore, MAX_RETRIES]);

  // 简单生成 (不带验证)
  const handleGenerate = useCallback(async () => {
    handleGenerateWithValidation();
  }, [handleGenerateWithValidation]);

  // 重试验证
  const handleRetryValidation = useCallback(async () => {
    if (!lastResult) return;
    
    setValidationPhase('validating');
    
    const agentConfig = {
      name: lastResult.dsl?.name || 'AI 生成的智能体',
      systemPrompt: lastResult.dsl?.stages?.[0]?.nodes?.find(
        (n: any) => n.type === 'agent'
      )?.config?.systemPrompt || '',
      model: 'claude-3.5',
    };
    
    const validation = await runDryRun(agentConfig, generatedSkills);
    
    if (validation.success) {
      setValidationPhase('complete');
    } else {
      setValidationPhase('failed');
    }
    
    incrementRetryCount();
  }, [lastResult, generatedSkills, runDryRun, incrementRetryCount]);

  // 跳过验证直接应用
  const handleSkipValidation = useCallback(() => {
    if (!lastResult) return;
    setValidationPhase('complete');
  }, [lastResult]);

  const handleApplyInternal = useCallback(() => {
    if (!lastResult) return;

    // 从 DSL 提取 agent 配置
    const agentConfig: SimpleAgentConfig = {
      name: inspirationTitle || lastResult.dsl?.name || "AI 生成的智能体",
      department: lastResult.dsl?.metadata?.category || "",
      model: "claude-3.5",
      systemPrompt: lastResult.dsl?.stages?.[0]?.nodes?.find(
        (n: any) => n.type === "agent"
      )?.config?.systemPrompt || "",
      avatar: { iconId: "bot", colorId: "primary" },
    };

    onApply(
      lastResult.nodes,
      lastResult.edges,
      agentConfig,
      undefined,
      lastResult
    );
    handleClose();
  }, [lastResult, onApply, inspirationTitle]);

  const handleApply = useCallback(() => {
    handleApplyInternal();
  }, [handleApplyInternal]);

  // 重新运行质检评估
  const handleRerunEvaluation = useCallback(async () => {
    if (!lastResult) return;
    
    setEvalPhase('running');
    agentEvals.reset();
    
    try {
      await agentEvals.runEvaluation({
        agentId: `gen-${Date.now()}`,
        agentConfig: {
          name: lastResult.dsl?.name || 'AI 生成的智能体',
          systemPrompt: lastResult.dsl?.stages?.[0]?.nodes?.find(
            (n: any) => n.type === 'agent'
          )?.config?.systemPrompt || '',
          department: lastResult.dsl?.metadata?.category,
          model: 'google/gemini-2.5-flash',
        },
        includeRedTeam: true,
        evalType: 'manual',
      });
      setEvalPhase('complete');
    } catch (err) {
      console.error('Re-evaluation failed:', err);
      setEvalPhase('complete');
    }
  }, [lastResult, agentEvals]);

  const handleClose = () => {
    reset();
    resetValidation();
    resetHealing();
    agentEvals.reset();
    buildPlanStore.reset();
    setDescription("");
    setSelectedScenario(null);
    setValidationPhase('idle');
    setEvalPhase('idle');
    setActivePreviewTab('workflow');
    setGeneratedSkills([]);
    onClose();
  };

  const handleRegenerate = () => {
    reset();
    resetValidation();
    resetHealing();
    agentEvals.reset();
    buildPlanStore.reset();
    hasAutoTriggeredRef.current = false;
    hasAutoAppliedRef.current = false;
    setValidationPhase('idle');
    setEvalPhase('idle');
    setActivePreviewTab('workflow');
    setGeneratedSkills([]);
    handleGenerate();
  };

  // 判断是否正在处理中
  const isProcessing = isGenerating || isValidating || isHealing;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-5xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">AI 工作流生成器</h2>
                <p className="text-sm text-muted-foreground">
                  描述需求，AI 自动生成完整的工作流 DSL 并应用治理策略
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden flex">
            {/* Left: Input Area */}
            <div className="flex-1 flex flex-col p-6 border-r border-border overflow-auto">
              {/* Scenario Quick Select */}
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">快速选择场景</p>
                <div className="flex flex-wrap gap-2">
                  {aiAgentScenarios.slice(0, 6).map((scenario) => {
                    const Icon = scenario.icon;
                    return (
                      <Button
                        key={scenario.id}
                        variant={selectedScenario?.id === scenario.id ? "default" : "outline"}
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleScenarioSelect(scenario)}
                        disabled={isProcessing}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {scenario.name}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Description Input */}
              <div className="flex-1 flex flex-col min-h-0">
                <label className="text-sm font-medium mb-2">
                  描述你想要的智能体工作流
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`例如：\n创建一个智能客服助手，能够：\n1. 自动回答常见问题（需要FAQ知识库）\n2. 查询订单状态（调用订单查询MCP）\n3. 处理退款请求（高风险，需要人工确认）\n4. 发送邮件通知客户`}
                  className="flex-1 min-h-[180px] resize-none"
                  disabled={isProcessing}
                />
              </div>

              {/* Advanced Options */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced} className="mt-4">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 w-full justify-start">
                    <Settings2 className="h-4 w-4" />
                    高级选项
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {showAdvanced ? "收起" : "展开"}
                    </Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-4 pl-6">
                  {/* MPLP Policy */}
                  <div className="space-y-2">
                    <Label className="text-sm">治理策略 (MPLP)</Label>
                    <Select value={mplpPolicy} onValueChange={(v) => setMplpPolicy(v as MPLPPolicy)}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="permissive">宽松模式 - 仅高风险需确认</SelectItem>
                        <SelectItem value="default">默认模式 - 中高风险需确认</SelectItem>
                        <SelectItem value="strict">严格模式 - 所有操作需确认</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Max Nodes */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">最大节点数</Label>
                      <span className="text-sm text-muted-foreground">{maxNodes}</span>
                    </div>
                    <Slider
                      value={[maxNodes]}
                      onValueChange={([v]) => setMaxNodes(v)}
                      min={3}
                      max={20}
                      step={1}
                      disabled={isProcessing}
                    />
                  </div>

                  {/* Toggles */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">包含知识库检索</Label>
                      <Switch
                        checked={includeKnowledge}
                        onCheckedChange={setIncludeKnowledge}
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">自动应用治理策略</Label>
                      <Switch
                        checked={autoApplyPolicies}
                        onCheckedChange={setAutoApplyPolicies}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="mt-4 flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={isProcessing}
                >
                  <Mic className="h-4 w-4" />
                  语音输入
                </Button>
                <div className="flex-1" />
                <Button
                  onClick={handleGenerate}
                  disabled={!description.trim() || isProcessing}
                  className="gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isGenerating ? '生成中...' : isValidating ? '验证中...' : '修复中...'}
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4" />
                      生成工作流
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right: Preview Area with Tabs */}
            <div className="w-[420px] flex flex-col bg-muted/30">
              <Tabs value={activePreviewTab} onValueChange={setActivePreviewTab} className="flex flex-col h-full">
                <div className="px-4 pt-4 border-b border-border">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="workflow" className="text-xs">
                      工作流预览
                    </TabsTrigger>
                    <TabsTrigger value="buildPlan" className="text-xs">
                      构建计划
                    </TabsTrigger>
                    <TabsTrigger value="validation" className="text-xs">
                      验证状态
                    </TabsTrigger>
                    <TabsTrigger value="scorecard" className="text-xs">
                      <FileCheck className="h-3 w-3 mr-1" />
                      质检报告
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="workflow" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                    <WorkflowPreview
                      dsl={lastResult?.dsl || null}
                      riskAssessment={lastResult?.riskAssessment || null}
                      interventions={lastResult?.interventions || []}
                      warnings={lastResult?.warnings || []}
                      isLoading={isGenerating}
                      progress={progress}
                      currentStep={currentStep}
                      complianceReport={lastResult?.complianceReport || null}
                      requiredPermissions={lastResult?.requiredPermissions || []}
                    />
                  </TabsContent>

                  <TabsContent value="buildPlan" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                    <BuildPlanViewer showEvents={true} />
                  </TabsContent>

                  <TabsContent value="validation" className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col">
                    <ValidationProgressPanel
                      phase={validationPhase}
                      validationResult={validationResult}
                      retryCount={retryCount}
                      maxRetries={MAX_RETRIES}
                      healingLog={healingLog}
                      healingProgress={healingProgress}
                      onRetry={handleRetryValidation}
                      onSkipValidation={handleSkipValidation}
                    />
                  </TabsContent>

                  <TabsContent value="scorecard" className="h-full m-0 overflow-auto p-4">
                    {/* 评估进行中 - 显示进度面板 */}
                    {evalPhase === 'running' && (
                      <EvalProgressPanel
                        events={agentEvals.events}
                        currentStep={agentEvals.currentStep}
                        progress={agentEvals.progress}
                        isEvaluating={agentEvals.isEvaluating}
                      />
                    )}
                    
                    {/* 评估完成 - 显示评分卡 */}
                    {evalPhase === 'complete' && agentEvals.evaluationResult && (
                      <AgentScorecard
                        evaluationResult={agentEvals.evaluationResult}
                        onRerun={handleRerunEvaluation}
                      />
                    )}
                    
                    {/* 评估完成但无结果 */}
                    {evalPhase === 'complete' && !agentEvals.evaluationResult && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">评估未产生结果</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={handleRerunEvaluation}
                        >
                          重新评估
                        </Button>
                      </div>
                    )}
                    
                    {/* 空状态 */}
                    {evalPhase === 'idle' && (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">等待验证完成</p>
                        <p className="text-xs mt-1">验证通过后将自动开始质检评估</p>
                      </div>
                    )}
                  </TabsContent>
                </div>

                {/* Apply Button - 仅在验证通过后显示 */}
                {(lastResult && validationPhase === 'complete') && (
                  <div className="p-4 border-t border-border space-y-2">
                    <Button onClick={handleApply} className="w-full gap-2">
                      <CheckCircle className="h-4 w-4" />
                      应用到画布
                    </Button>
                    <Button variant="outline" onClick={handleRegenerate} className="w-full gap-2">
                      <RefreshCw className="h-4 w-4" />
                      重新生成
                    </Button>
                  </div>
                )}

                {/* 验证失败时的操作 */}
                {(lastResult && validationPhase === 'failed') && (
                  <div className="p-4 border-t border-border space-y-2">
                    {retryCount < MAX_RETRIES && (
                      <Button onClick={handleRetryValidation} variant="outline" className="w-full gap-2">
                        <RefreshCw className="h-4 w-4" />
                        重新验证 ({MAX_RETRIES - retryCount} 次机会)
                      </Button>
                    )}
                    <Button onClick={handleSkipValidation} variant="ghost" className="w-full gap-2 text-muted-foreground">
                      <SkipForward className="h-4 w-4" />
                      跳过验证，直接应用
                    </Button>
                  </div>
                )}
              </Tabs>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default EnhancedAIGenerator;
