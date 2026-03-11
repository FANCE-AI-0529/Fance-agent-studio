import { useState } from "react";
import {
  Brain,
  Save,
  Loader2,
  LogIn,
  Sparkles,
  Wand2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Bug,
  FlaskConical,
  Play,
  Mic,
  MessageSquare,
  TestTube2,
  ArrowLeft,
  HistoryIcon,
  MoreHorizontal,
  Key,
  Webhook,
  Bell,
  Cpu,
  BarChart3,
  Activity,
  Target,
  History as HistoryLucide,
} from "lucide-react";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import { cn } from "../../lib/utils.ts";
import { SimpleAgentConfig } from "./SimplifiedConfigPanel.tsx";
import { MountedKnowledgeBase } from "../../hooks/useBuilderKnowledge.ts";
import { Skill } from "./SkillMarketplace.tsx";

interface BuilderToolbarProps {
  agentConfig: SimpleAgentConfig;
  currentAgentId: string | null;
  isDeployed: boolean;
  addedSkills: Skill[];
  mountedKnowledgeBases: MountedKnowledgeBase[];
  draggingSkill: any;
  draggingKnowledge: any;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  isFromConsumerMode: boolean;
  ejectContext: any;
  isSaving: boolean;
  isDebugMode: boolean;
  isWorkflowRunning: boolean;
  nodeCount: number;
  showLiveTest: boolean;
  showRunHistory: boolean;
  showVerificationPanel: boolean;
  showMonitoringPanel: boolean;
  showEvaluationPanel: boolean;
  user: any;
  // Callbacks
  onToggleLeftPanel: () => void;
  onToggleRightPanel: () => void;
  onReturnToConsumer: () => void;
  onSave: () => void;
  onShowWizard: () => void;
  onShowConversational: () => void;
  onShowVoiceCreator: () => void;
  onShowAIGenerator: () => void;
  onToggleDebug: () => void;
  onShowVerification: () => void;
  onFitView: () => void;
  onToggleLiveTest: () => void;
  onShowApiPanel: () => void;
  onShowWebhookPanel: () => void;
  onShowAlertPanel: () => void;
  onShowLLMConfig: () => void;
  onShowStatsPanel: () => void;
  onShowMonitoring: () => void;
  onShowEvaluation: () => void;
  onShowRunDialog: () => void;
  onToggleRunHistory: () => void;
  onNavigateToAuth: () => void;
}

export function BuilderToolbar({
  agentConfig,
  currentAgentId,
  isDeployed,
  addedSkills,
  mountedKnowledgeBases,
  draggingSkill,
  draggingKnowledge,
  leftPanelCollapsed,
  rightPanelCollapsed,
  isFromConsumerMode,
  ejectContext,
  isSaving,
  isDebugMode,
  isWorkflowRunning,
  nodeCount,
  showLiveTest,
  showRunHistory,
  showVerificationPanel,
  showMonitoringPanel,
  showEvaluationPanel,
  user,
  onToggleLeftPanel,
  onToggleRightPanel,
  onReturnToConsumer,
  onSave,
  onShowWizard,
  onShowConversational,
  onShowVoiceCreator,
  onShowAIGenerator,
  onToggleDebug,
  onShowVerification,
  onFitView,
  onToggleLiveTest,
  onShowApiPanel,
  onShowWebhookPanel,
  onShowAlertPanel,
  onShowLLMConfig,
  onShowStatsPanel,
  onShowMonitoring,
  onShowEvaluation,
  onShowRunDialog,
  onToggleRunHistory,
  onNavigateToAuth,
}: BuilderToolbarProps) {
  return (
    <div className="h-12 px-3 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm">
      {/* Left section */}
      <div className="flex items-center gap-2">
        {isFromConsumerMode && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  onClick={onReturnToConsumer}
                >
                  <ArrowLeft className="h-4 w-4" />
                  返回对话
                </Button>
              </TooltipTrigger>
              <TooltipContent>返回 Consumer 模式</TooltipContent>
            </Tooltip>
            <div className="h-5 w-px bg-border" />
          </>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleLeftPanel}
            >
              {leftPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{leftPanelCollapsed ? "显示能力市场" : "隐藏能力市场"}</TooltipContent>
        </Tooltip>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">{agentConfig.name || "智能体构建器"}</span>
        </div>

        {currentAgentId && <Badge variant="secondary" className="text-[10px]">已保存</Badge>}
      </div>

      {/* Right section - Progressive disclosure */}
      <div className="flex items-center gap-1.5">
        {(draggingSkill || draggingKnowledge) && (
          <Badge className="text-xs bg-primary/10 text-primary border-0 animate-pulse">
            拖拽中: {draggingSkill?.name || draggingKnowledge?.name}
          </Badge>
        )}

        <Badge variant="outline" className="text-xs">{addedSkills.length} 技能</Badge>
        {mountedKnowledgeBases.length > 0 && (
          <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-600">
            {mountedKnowledgeBases.length} 知识库
          </Badge>
        )}

        <div className="h-5 w-px bg-border" />

        {/* Tier 1: Primary actions - always visible */}
        <Button
          variant="default"
          size="sm"
          className="gap-1.5 h-8"
          onClick={onShowAIGenerator}
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI生成
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving || !agentConfig.name.trim()}
          className="gap-1.5 h-8"
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          保存
        </Button>

        <Button
          size="sm"
          className="gap-1.5 h-8"
          disabled={isWorkflowRunning || nodeCount === 0}
          onClick={onShowRunDialog}
        >
          {isWorkflowRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {isWorkflowRunning ? "运行中" : "运行"}
        </Button>

        {/* Tier 2: Secondary actions in dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onShowConversational}>
              <MessageSquare className="h-4 w-4 mr-2" />
              对话创建
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShowVoiceCreator}>
              <Mic className="h-4 w-4 mr-2" />
              语音创建
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShowWizard}>
              <Wand2 className="h-4 w-4 mr-2" />
              向导模式
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleDebug}>
              <Bug className="h-4 w-4 mr-2" />
              {isDebugMode ? "退出调试" : "调试模式"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onShowVerification}>
              <FlaskConical className="h-4 w-4 mr-2" />
              验证测试
            </DropdownMenuItem>
            {agentConfig.name && (
              <DropdownMenuItem onClick={onToggleLiveTest}>
                <TestTube2 className="h-4 w-4 mr-2" />
                实时测试
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onFitView}>
              <Maximize2 className="h-4 w-4 mr-2" />
              适应画布
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleRunHistory}>
              <HistoryLucide className="h-4 w-4 mr-2" />
              运行历史
            </DropdownMenuItem>

            {/* Deployed agent actions */}
            {currentAgentId && isDeployed && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onShowApiPanel}>
                  <Key className="h-4 w-4 mr-2" />
                  API 管理
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowWebhookPanel}>
                  <Webhook className="h-4 w-4 mr-2" />
                  Webhook
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowAlertPanel}>
                  <Bell className="h-4 w-4 mr-2" />
                  告警管理
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowLLMConfig}>
                  <Cpu className="h-4 w-4 mr-2" />
                  大模型配置
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowStatsPanel}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  API 统计
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowMonitoring}>
                  <Activity className="h-4 w-4 mr-2" />
                  监控仪表板
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onShowEvaluation}>
                  <Target className="h-4 w-4 mr-2" />
                  评估中心
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {!user && (
          <Button variant="ghost" size="sm" onClick={onNavigateToAuth} className="gap-1.5 h-8 text-muted-foreground">
            <LogIn className="h-3.5 w-3.5" />
            登录
          </Button>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleRightPanel}>
              {rightPanelCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{rightPanelCollapsed ? "显示配置面板" : "隐藏配置面板"}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
