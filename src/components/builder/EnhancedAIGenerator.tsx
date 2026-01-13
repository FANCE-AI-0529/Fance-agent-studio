// =====================================================
// 增强版 AI 智能体生成器
// Enhanced AI Agent Generator with Workflow DSL
// =====================================================

import { useState, useCallback } from "react";
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
import { cn } from "@/lib/utils";
import { useWorkflowGenerator } from "@/hooks/useWorkflowGenerator";
import { WorkflowPreview } from "./WorkflowPreview";
import { aiAgentScenarios, AIAgentScenario } from "@/data/aiAgentScenarios";
import type { Node, Edge } from "@xyflow/react";
import type { SimpleAgentConfig } from "@/components/builder/SimplifiedConfigPanel";
import type { MountedKnowledgeBase } from "@/hooks/useBuilderKnowledge";
import type { MPLPPolicy, InjectedIntervention, GenerationWarning, RiskLevel, ComplianceReport } from "@/types/workflowDSL";

// ========== 类型定义 ==========

interface RiskAssessment {
  overallRisk: RiskLevel;
  highRiskNodes: string[];
  mediumRiskNodes: string[];
}

interface GenerationResult {
  nodes: Node[];
  edges: Edge[];
  warnings: GenerationWarning[];
  interventions: InjectedIntervention[];
  riskAssessment: RiskAssessment;
  dsl: any;
  complianceReport?: ComplianceReport;
  requiredPermissions?: string[];
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
}

// ========== 主组件 ==========

export function EnhancedAIGenerator({
  isOpen,
  onClose,
  onApply,
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

  const handleScenarioSelect = (scenario: AIAgentScenario) => {
    setSelectedScenario(scenario);
    setDescription(scenario.prompt);
  };

  const handleGenerate = useCallback(async () => {
    if (!description.trim()) return;

    try {
      await generate(description, {
        mplpPolicy,
        includeKnowledge,
        maxNodes,
        autoApplyPolicies,
      });
    } catch (err) {
      console.error("Generation failed:", err);
    }
  }, [description, mplpPolicy, includeKnowledge, maxNodes, autoApplyPolicies, generate]);

  const handleApply = useCallback(() => {
    if (!lastResult) return;

    // 从 DSL 提取 agent 配置
    const agentConfig: SimpleAgentConfig = {
      name: lastResult.dsl?.name || "AI 生成的智能体",
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
  }, [lastResult, onApply]);

  const handleClose = () => {
    reset();
    setDescription("");
    setSelectedScenario(null);
    onClose();
  };

  const handleRegenerate = () => {
    reset();
    handleGenerate();
  };

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
                        disabled={isGenerating}
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
                  disabled={isGenerating}
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
                      disabled={isGenerating}
                    />
                  </div>

                  {/* Toggles */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">包含知识库检索</Label>
                      <Switch
                        checked={includeKnowledge}
                        onCheckedChange={setIncludeKnowledge}
                        disabled={isGenerating}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">自动应用治理策略</Label>
                      <Switch
                        checked={autoApplyPolicies}
                        onCheckedChange={setAutoApplyPolicies}
                        disabled={isGenerating}
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
                  disabled={isGenerating}
                >
                  <Mic className="h-4 w-4" />
                  语音输入
                </Button>
                <div className="flex-1" />
                <Button
                  onClick={handleGenerate}
                  disabled={!description.trim() || isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      生成中...
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

            {/* Right: Preview Area */}
            <div className="w-[420px] flex flex-col bg-muted/30">
              <div className="p-4 border-b border-border">
                <p className="text-sm font-medium">工作流预览</p>
              </div>

              <div className="flex-1 overflow-hidden">
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
              </div>

              {/* Apply Button */}
              {lastResult && (
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
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default EnhancedAIGenerator;
