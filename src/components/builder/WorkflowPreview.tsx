// =====================================================
// 工作流预览组件
// Workflow Preview Component
// =====================================================

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  GitBranch,
  Zap,
  Database,
  Brain,
  ArrowRight,
  Info,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  WorkflowDSL,
  StageSpec,
  NodeSpec,
  InjectedIntervention,
  GenerationWarning,
  RiskLevel,
} from "@/types/workflowDSL";

// ========== 类型定义 ==========

interface RiskAssessment {
  overallRisk: RiskLevel;
  highRiskNodes: string[];
  mediumRiskNodes: string[];
}

interface WorkflowPreviewProps {
  dsl: WorkflowDSL | null;
  riskAssessment: RiskAssessment | null;
  interventions: InjectedIntervention[];
  warnings: GenerationWarning[];
  isLoading?: boolean;
  progress?: number;
  currentStep?: string;
}

// ========== 风险级别配置 ==========

const RISK_LEVEL_CONFIG: Record<RiskLevel, { color: string; bgColor: string; icon: typeof ShieldCheck }> = {
  low: { color: "text-green-500", bgColor: "bg-green-500/10", icon: ShieldCheck },
  medium: { color: "text-yellow-500", bgColor: "bg-yellow-500/10", icon: AlertTriangle },
  high: { color: "text-red-500", bgColor: "bg-red-500/10", icon: ShieldAlert },
};

// ========== 主组件 ==========

export function WorkflowPreview({
  dsl,
  riskAssessment,
  interventions,
  warnings,
  isLoading,
  progress = 0,
  currentStep,
}: WorkflowPreviewProps) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(new Set());
  const [animationComplete, setAnimationComplete] = useState(false);

  // 渐进式节点显示动画
  useEffect(() => {
    if (!dsl?.stages || isLoading) {
      setVisibleNodes(new Set());
      setAnimationComplete(false);
      return;
    }

    // 收集所有节点 ID
    const allNodeIds: string[] = [];
    dsl.stages.forEach((stage) => {
      stage.nodes.forEach((node) => {
        allNodeIds.push(node.id);
      });
    });

    // 渐进式显示节点
    allNodeIds.forEach((nodeId, index) => {
      setTimeout(() => {
        setVisibleNodes((prev) => new Set([...prev, nodeId]));
        if (index === allNodeIds.length - 1) {
          setAnimationComplete(true);
        }
      }, 100 + index * 80); // 每个节点延迟 80ms 出现
    });

    // 动画完成后自动展开所有阶段
    setTimeout(() => {
      setExpandedStages(new Set(dsl.stages.map((s) => s.id)));
    }, 100 + allNodeIds.length * 80 + 200);

    return () => {
      setVisibleNodes(new Set());
      setAnimationComplete(false);
    };
  }, [dsl, isLoading]);

  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        <div className="text-center py-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-primary border-t-transparent"
          />
          <p className="text-sm font-medium text-foreground">{currentStep || "生成中..."}</p>
        </div>
        <Progress value={progress} className="h-2" />
        <GenerationSteps progress={progress} />
      </div>
    );
  }

  if (!dsl) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p className="text-sm">描述你的需求后</p>
        <p className="text-sm">AI 将在这里展示工作流结构</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* 工作流头部信息 */}
        <WorkflowHeader dsl={dsl} />

        {/* 风险评估仪表盘 */}
        {riskAssessment && (
          <RiskAssessmentPanel assessment={riskAssessment} />
        )}

        {/* 干预节点列表 */}
        {interventions.length > 0 && (
          <InterventionsList interventions={interventions} />
        )}

        {/* 警告信息 */}
        {warnings.length > 0 && (
          <WarningsList warnings={warnings} />
        )}

        {/* 阶段视图 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            执行阶段 ({dsl.stages.length})
          </h4>
          {dsl.stages.map((stage, index) => (
            <StageCard
              key={stage.id}
              stage={stage}
              index={index}
              isExpanded={expandedStages.has(stage.id)}
              onToggle={() => toggleStage(stage.id)}
              riskAssessment={riskAssessment}
              visibleNodes={visibleNodes}
            />
          ))}
        </div>

        {/* 数据流预览 */}
        <DataFlowPreview dsl={dsl} />
      </div>
    </ScrollArea>
  );
}

// ========== 子组件 ==========

function GenerationSteps({ progress }: { progress: number }) {
  const steps = [
    { id: "analyze", label: "分析需求描述", threshold: 10 },
    { id: "search", label: "检索相关资产", threshold: 30 },
    { id: "generate", label: "生成工作流结构", threshold: 60 },
    { id: "policy", label: "应用治理策略", threshold: 80 },
    { id: "layout", label: "计算画布布局", threshold: 100 },
  ];

  return (
    <div className="space-y-2">
      {steps.map((step) => {
        const isComplete = progress >= step.threshold;
        const isActive = progress >= step.threshold - 20 && progress < step.threshold;

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-2 text-xs",
              isComplete ? "text-green-500" : isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            {isComplete ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : isActive ? (
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.div>
            ) : (
              <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
            )}
            <span>{step.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function WorkflowHeader({ dsl }: { dsl: WorkflowDSL }) {
  return (
    <div className="p-3 rounded-lg bg-card border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Brain className="h-4 w-4 text-primary" />
        <span className="font-medium">{dsl.name}</span>
      </div>
      {dsl.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {dsl.description}
        </p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <Badge variant="outline" className="text-[10px]">
          v{dsl.version}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {dsl.trigger.type}
        </Badge>
        {dsl.governance?.mplpPolicy && (
          <Badge variant="outline" className="text-[10px]">
            {dsl.governance.mplpPolicy} 模式
          </Badge>
        )}
      </div>
    </div>
  );
}

function RiskAssessmentPanel({ assessment }: { assessment: RiskAssessment }) {
  const config = RISK_LEVEL_CONFIG[assessment.overallRisk];
  const Icon = config.icon;

  return (
    <div className={cn("p-3 rounded-lg border", config.bgColor)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", config.color)} />
        <span className="text-sm font-medium">风险评估</span>
        <Badge
          variant="outline"
          className={cn("ml-auto text-[10px]", config.color)}
        >
          {assessment.overallRisk === "low"
            ? "低风险"
            : assessment.overallRisk === "medium"
            ? "中风险"
            : "高风险"}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span className="text-muted-foreground">高风险节点:</span>
          <span className="font-medium">{assessment.highRiskNodes.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span className="text-muted-foreground">中风险节点:</span>
          <span className="font-medium">{assessment.mediumRiskNodes.length}</span>
        </div>
      </div>
    </div>
  );
}

function InterventionsList({ interventions }: { interventions: InjectedIntervention[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-yellow-500" />
        干预节点 ({interventions.length})
      </h4>
      <div className="space-y-1">
        {interventions.map((intervention, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20 text-xs"
          >
            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">
                {intervention.type === "confirm"
                  ? "用户确认"
                  : intervention.type === "approve"
                  ? "审批节点"
                  : intervention.type === "edit"
                  ? "编辑节点"
                  : "预览节点"}
              </p>
              <p className="text-muted-foreground">{intervention.reason}</p>
              <p className="text-muted-foreground/70">
                插入于: {intervention.beforeNodeId}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WarningsList({ warnings }: { warnings: GenerationWarning[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <Info className="h-4 w-4" />
        生成提示 ({warnings.length})
      </h4>
      <div className="space-y-1">
        {warnings.map((warning, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-start gap-2 p-2 rounded-lg text-xs",
              warning.severity === "error"
                ? "bg-red-500/5 border border-red-500/20"
                : warning.severity === "warning"
                ? "bg-yellow-500/5 border border-yellow-500/20"
                : "bg-blue-500/5 border border-blue-500/20"
            )}
          >
            {warning.severity === "error" ? (
              <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5" />
            ) : warning.severity === "warning" ? (
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 mt-0.5" />
            ) : (
              <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-foreground">[{warning.code}]</p>
              <p className="text-muted-foreground">{warning.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StageCard({
  stage,
  index,
  isExpanded,
  onToggle,
  riskAssessment,
  visibleNodes,
}: {
  stage: StageSpec;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  riskAssessment: RiskAssessment | null;
  visibleNodes: Set<string>;
}) {
  const stageTypeLabel = {
    sequential: "顺序执行",
    parallel: "并行执行",
    conditional: "条件分支",
    loop: "循环执行",
  };

  const stageTypeColor = {
    sequential: "text-blue-500",
    parallel: "text-purple-500",
    conditional: "text-orange-500",
    loop: "text-green-500",
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <span className="text-sm font-medium flex-1 text-left">
          {index + 1}. {stage.name}
        </span>
        <Badge
          variant="outline"
          className={cn("text-[10px]", stageTypeColor[stage.type])}
        >
          {stageTypeLabel[stage.type]}
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {stage.nodes.length} 节点
        </Badge>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border"
          >
            <div className="p-2 space-y-1">
              {stage.nodes.map((node, nodeIndex) => (
                <NodePreviewCard
                  key={node.id}
                  node={node}
                  index={nodeIndex}
                  isHighRisk={riskAssessment?.highRiskNodes.includes(node.id)}
                  isMediumRisk={riskAssessment?.mediumRiskNodes.includes(node.id)}
                  isVisible={visibleNodes.has(node.id)}
                />
              ))}

              {stage.branches && stage.branches.length > 0 && (
                <div className="mt-2 pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground mb-1">分支:</p>
                  {stage.branches.map((branch) => (
                    <div
                      key={branch.id}
                      className="ml-2 p-1.5 rounded bg-muted/30 text-xs"
                    >
                      <p className="font-medium">{branch.name}</p>
                      <p className="text-muted-foreground text-[10px]">
                        条件: {branch.condition}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NodePreviewCard({
  node,
  index,
  isHighRisk,
  isMediumRisk,
  isVisible = true,
}: {
  node: NodeSpec;
  index: number;
  isHighRisk?: boolean;
  isMediumRisk?: boolean;
  isVisible?: boolean;
}) {
  const nodeTypeIcon: Record<string, typeof Brain> = {
    agent: Brain,
    skill: Zap,
    mcp_action: Zap,
    knowledge: Database,
  };

  const Icon = nodeTypeIcon[node.type] || GitBranch;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20, scale: 0.9 }}
      animate={
        isVisible
          ? { opacity: 1, x: 0, scale: 1 }
          : { opacity: 0, x: -20, scale: 0.9 }
      }
      transition={{ 
        type: "spring", 
        stiffness: 300, 
        damping: 25,
        delay: index * 0.05 
      }}
      className={cn(
        "flex items-center gap-2 p-2 rounded text-xs",
        isHighRisk
          ? "bg-red-500/10 border border-red-500/30"
          : isMediumRisk
          ? "bg-yellow-500/10 border border-yellow-500/30"
          : "bg-muted/30"
      )}
    >
      <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{node.name}</p>
        {node.outputKey && (
          <p className="text-[10px] text-muted-foreground">
            输出: {node.outputKey}
          </p>
        )}
      </div>
      <Badge variant="outline" className="text-[10px]">
        {node.type}
      </Badge>
      {node.requiresConfirmation && (
        <ShieldAlert className="h-3 w-3 text-yellow-500" />
      )}
    </motion.div>
  );
}

function DataFlowPreview({ dsl }: { dsl: WorkflowDSL }) {
  // 收集所有输出键
  const outputKeys: string[] = ["trigger"];
  for (const stage of dsl.stages) {
    for (const node of stage.nodes) {
      if (node.outputKey) {
        outputKeys.push(node.outputKey);
      }
    }
  }

  if (outputKeys.length <= 1) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium flex items-center gap-2">
        <ArrowRight className="h-4 w-4" />
        数据流
      </h4>
      <div className="flex items-center gap-1 flex-wrap p-2 rounded-lg bg-muted/30">
        {outputKeys.map((key, idx) => (
          <div key={key} className="flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px]">
              {key}
            </Badge>
            {idx < outputKeys.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorkflowPreview;
