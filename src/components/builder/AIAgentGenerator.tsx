import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Mic,
  Wand2,
  Loader2,
  CheckCircle,
  Brain,
  GitBranch,
  Database,
  Shield,
  ArrowRight,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAICanvasGenerator, GeneratedCanvasResult } from "@/hooks/useAICanvasGenerator";
import { aiAgentScenarios, AIAgentScenario } from "@/data/aiAgentScenarios";
import type { Node, Edge } from "@xyflow/react";
import type { SimpleAgentConfig } from "@/components/builder/SimplifiedConfigPanel";
import type { MountedKnowledgeBase } from "@/hooks/useBuilderKnowledge";

interface AIAgentGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (
    nodes: Node[],
    edges: Edge[],
    config: SimpleAgentConfig,
    knowledgeBases?: MountedKnowledgeBase[]
  ) => void;
}

export function AIAgentGenerator({ isOpen, onClose, onApply }: AIAgentGeneratorProps) {
  const [description, setDescription] = useState("");
  const [selectedScenario, setSelectedScenario] = useState<AIAgentScenario | null>(null);
  const [generateFullWorkflow, setGenerateFullWorkflow] = useState(true);

  const {
    isGenerating,
    progress,
    currentStep,
    generatedResult,
    generateFromDescription,
    reset,
  } = useAICanvasGenerator();

  const handleScenarioSelect = (scenario: AIAgentScenario) => {
    setSelectedScenario(scenario);
    setDescription(scenario.prompt);
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;
    await generateFromDescription(description, generateFullWorkflow);
  };

  const handleApply = () => {
    if (!generatedResult) return;

    onApply(
      generatedResult.nodes,
      generatedResult.edges,
      generatedResult.agentConfig,
      undefined
    );
    handleClose();
  };

  const handleClose = () => {
    reset();
    setDescription("");
    setSelectedScenario(null);
    onClose();
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
          className="w-full max-w-4xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">AI 一键生成智能体</h2>
                <p className="text-sm text-muted-foreground">
                  描述你的需求，AI 将自动生成完整的智能体配置和工作流
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden flex">
            {/* Left: Input Area */}
            <div className="flex-1 flex flex-col p-6 border-r border-border">
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
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {scenario.name}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Description Input */}
              <div className="flex-1 flex flex-col">
                <label className="text-sm font-medium mb-2">
                  描述你想要的智能体功能
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={`例如：\n创建一个智能客服助手，能够：\n1. 自动回答常见问题\n2. 查询订单状态\n3. 处理退款请求（需要人工确认）\n4. 发送邮件通知客户`}
                  className="flex-1 min-h-[200px] resize-none"
                  disabled={isGenerating}
                />
              </div>

              {/* Options */}
              <div className="mt-4 flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateFullWorkflow}
                    onChange={(e) => setGenerateFullWorkflow(e.target.checked)}
                    className="rounded border-border"
                    disabled={isGenerating}
                  />
                  <span className="text-sm">生成完整工作流（包含节点和连线）</span>
                </label>
              </div>

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
                      一键生成
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Right: Preview Area */}
            <div className="w-96 flex flex-col bg-muted/30">
              <div className="p-4 border-b border-border">
                <p className="text-sm font-medium">生成预览</p>
              </div>

              <ScrollArea className="flex-1 p-4">
                {isGenerating ? (
                  <div className="space-y-4">
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                      <p className="text-sm font-medium">{currentStep}</p>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                ) : generatedResult ? (
                  <div className="space-y-4">
                    {/* Success indicator */}
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">生成完成</span>
                    </div>

                    {/* Agent info */}
                    <div className="p-3 rounded-lg bg-card border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <span className="font-medium">{generatedResult.agentConfig.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {generatedResult.agentConfig.systemPrompt}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-card border border-border text-center">
                        <GitBranch className="h-5 w-5 mx-auto mb-1 text-primary" />
                        <p className="text-lg font-bold">{generatedResult.nodes.length}</p>
                        <p className="text-xs text-muted-foreground">节点</p>
                      </div>
                      <div className="p-3 rounded-lg bg-card border border-border text-center">
                        <ArrowRight className="h-5 w-5 mx-auto mb-1 text-primary" />
                        <p className="text-lg font-bold">{generatedResult.edges.length}</p>
                        <p className="text-xs text-muted-foreground">连线</p>
                      </div>
                    </div>

                    {/* MCP Actions */}
                    {generatedResult.mcpActions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Zap className="h-4 w-4" />
                          MCP 动作
                        </p>
                        <div className="space-y-1">
                          {generatedResult.mcpActions.map((action, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-card border border-border">
                              <Badge variant="outline" className={cn(
                                "text-[10px]",
                                action.riskLevel === "high" && "border-red-500 text-red-500",
                                action.riskLevel === "medium" && "border-yellow-500 text-yellow-500",
                                action.riskLevel === "low" && "border-green-500 text-green-500"
                              )}>
                                {action.riskLevel}
                              </Badge>
                              <span>{action.toolName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Knowledge Bases */}
                    {generatedResult.knowledgeBases.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2 flex items-center gap-1">
                          <Database className="h-4 w-4" />
                          建议知识库
                        </p>
                        <div className="space-y-1">
                          {generatedResult.knowledgeBases.map((kb, i) => (
                            <div key={i} className="text-xs p-2 rounded bg-card border border-border">
                              <p className="font-medium">{kb.name}</p>
                              <p className="text-muted-foreground">{kb.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Node types preview */}
                    <div>
                      <p className="text-sm font-medium mb-2">节点类型</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(generatedResult.nodes.map(n => n.type))).map(type => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Wand2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p className="text-sm">描述你的需求后</p>
                    <p className="text-sm">AI 将在这里展示生成结果</p>
                  </div>
                )}
              </ScrollArea>

              {/* Apply Button */}
              {generatedResult && (
                <div className="p-4 border-t border-border space-y-2">
                  <Button onClick={handleApply} className="w-full gap-2">
                    <CheckCircle className="h-4 w-4" />
                    应用到画布
                  </Button>
                  <Button variant="outline" onClick={reset} className="w-full">
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
