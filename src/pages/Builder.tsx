import { useState, useCallback, useRef, DragEvent, useEffect } from "react";
import { motion } from "framer-motion";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  Brain,
  Save,
  Loader2,
  LogIn,
  Sparkles,
  Wand2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  ZoomIn,
  Maximize2,
  Key,
  Webhook,
  Bell,
  Cpu,
  BarChart3,
  CheckCircle,
  Play,
  FileCode,
  Mic,
  MessageSquare,
  TestTube2,
  Variable,
  Bug,
  FlaskConical,
  Activity,
  Target,
  ArrowLeft,
  MessageCircle,
  History as HistoryIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

import SkillNode, { SkillNodeData } from "@/components/builder/SkillNode";
import AgentNode, { AgentNodeData } from "@/components/builder/AgentNode";
import KnowledgeBaseNode, { KnowledgeBaseNodeData } from "@/components/builder/KnowledgeBaseNode";
import TriggerNode from "@/components/builder/nodes/TriggerNode";
import OutputNode from "@/components/builder/nodes/OutputNode";
import IntentRouterNode, { IntentRouterNodeData } from "@/components/builder/nodes/IntentRouterNode";
import ConditionNode, { ConditionNodeData } from "@/components/builder/nodes/ConditionNode";
import ParallelNode, { ParallelNodeData } from "@/components/builder/nodes/ParallelNode";
import MCPActionNode, { MCPActionNodeData } from "@/components/builder/nodes/MCPActionNode";
import InterventionNode, { InterventionNodeData } from "@/components/builder/nodes/InterventionNode";
import ManusKernelNode from "@/components/builder/nodes/ManusKernelNode";
import GeneratedSkillNode from "@/components/builder/nodes/GeneratedSkillNode";
import PlaceholderNode from "@/components/builder/nodes/PlaceholderNode";
// Phase 1: Dify-inspired core nodes
import LLMNode from "@/components/builder/nodes/LLMNode";
import HTTPRequestNode from "@/components/builder/nodes/HTTPRequestNode";
import CodeNode from "@/components/builder/nodes/CodeNode";
import ParameterExtractorNode from "@/components/builder/nodes/ParameterExtractorNode";
// Phase 2: Dify-inspired auxiliary nodes
import TemplateNode from "@/components/builder/nodes/TemplateNode";
import VariableAggregatorNode from "@/components/builder/nodes/VariableAggregatorNode";
import VariableAssignerNode from "@/components/builder/nodes/VariableAssignerNode";
import DocExtractorNode from "@/components/builder/nodes/DocExtractorNode";
import IteratorNode from "@/components/builder/nodes/IteratorNode";
import LoopNode from "@/components/builder/nodes/LoopNode";
import AnimatedFlowEdge, { ANIMATED_FLOW_EDGE } from "@/components/builder/edges/AnimatedFlowEdge";
import ManusLifecycleEdge, { MANUS_LIFECYCLE_EDGE } from "@/components/builder/edges/ManusLifecycleEdge";
import { SkillMarketplace, Skill, KnowledgeBaseItem } from "@/components/builder/SkillMarketplace";
import { MCPActionDragItem, InterventionDragItem } from "@/components/builder/MCPActionsPanel";
import { SimplifiedConfigPanel, SimpleAgentConfig } from "@/components/builder/SimplifiedConfigPanel";
import { ManifestPreview } from "@/components/builder/ManifestPreview";
import { BuilderWizard } from "@/components/builder/BuilderWizard";
import { ConversationalCreator } from "@/components/builder/ConversationalCreator";
import { AgentApiPanel } from "@/components/builder/AgentApiPanel";
import { WebhookPanel } from "@/components/builder/WebhookPanel";
import { ApiAlertPanel } from "@/components/builder/ApiAlertPanel";
import { LLMConfigPanel } from "@/components/builder/LLMConfigPanel";
import { ApiStatsDashboard } from "@/components/builder/ApiStatsDashboard";
import CreationModeSelector, { CreationMode } from "@/components/builder/CreationModeSelector";
import LiveTestPanel from "@/components/builder/LiveTestPanel";
import PersonalityConfigurator from "@/components/builder/PersonalityConfigurator";
import RAGConfigPanel, { RAGConfig } from "@/components/builder/RAGConfigPanel";
import { VariablePoolPanel } from "@/components/builder/variables/VariablePoolPanel";
import { EdgeMappingPanel } from "@/components/builder/variables/EdgeMappingPanel";
import { useVariableStore } from "@/stores/variableStore";
import { useCanvasDebug } from "@/hooks/useCanvasDebug";
import CanvasDebugToolbar from "@/components/builder/debug/CanvasDebugToolbar";
import { CanvasHighlightControls } from "@/components/builder/CanvasHighlightControls";
import { NodeDataSnapshotPanel } from "@/components/builder/snapshot/NodeDataSnapshotPanel";
import { useCanvasHighlight } from "@/hooks/useCanvasHighlight";
import NodeConfigDrawer from "@/components/builder/config-panels/NodeConfigDrawer";
import CanvasDebugPanel from "@/components/builder/debug/CanvasDebugPanel";
import { useWorkflowExecution } from "@/hooks/useWorkflowExecution";
import { RunHistoryPanel } from "@/components/builder/RunHistoryPanel";
import { WorkflowRunDialog } from "@/components/builder/WorkflowRunDialog";
import { AIAgentGenerator } from "@/components/builder/AIAgentGenerator";
import { EnhancedAIGenerator } from "@/components/builder/EnhancedAIGenerator";
import { GenerationVerificationPanel } from "@/components/builder/verification";
import { AgentMonitoringDashboard } from "@/components/builder/AgentMonitoringDashboard";
import { EvaluationCenter } from "@/components/builder/evaluation/EvaluationCenter";
import { useSaveAgentWithSkills, useDeployAgent, useAgent, useDeleteAgent } from "@/hooks/useAgents";
import { useAgentBuildReplay } from "@/hooks/useAgentBuildReplay";
import { BuildReplayOverlay } from "@/components/builder/BuildReplayOverlay";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePublishedSkills } from "@/hooks/useSkills";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { findTemplateById } from "@/data/agentTemplates";
import { PersonalityConfig, getDefaultPersonalityConfig, mergePersonalityWithPrompt } from "@/utils/personalityToPrompt";
import { useConfigAdjustment } from "@/hooks/useConfigAdjustment";
import { useBuilderKnowledge, MountedKnowledgeBase } from "@/hooks/useBuilderKnowledge";
import { useAppModeStore } from "@/stores/appModeStore";
import { NodeTypes, EdgeTypes } from "@xyflow/react";

// Custom node types - including Manus Kernel, Generated Skills, and Dify-inspired nodes
const nodeTypes: NodeTypes = {
  skill: SkillNode,
  agent: AgentNode,
  knowledge: KnowledgeBaseNode,
  trigger: TriggerNode,
  output: OutputNode,
  intentRouter: IntentRouterNode,
  condition: ConditionNode,
  parallel: ParallelNode,
  mcpAction: MCPActionNode,
  intervention: InterventionNode,
  manus: ManusKernelNode,
  generatedSkill: GeneratedSkillNode,
  placeholder: PlaceholderNode,
  // Phase 1: Dify-inspired core nodes
  llm: LLMNode,
  httpRequest: HTTPRequestNode,
  code: CodeNode,
  parameterExtractor: ParameterExtractorNode,
  // Phase 2: Dify-inspired auxiliary nodes
  template: TemplateNode,
  variableAggregator: VariableAggregatorNode,
  variableAssigner: VariableAssignerNode,
  docExtractor: DocExtractorNode,
  iterator: IteratorNode,
  loop: LoopNode,
};

// Custom edge types - including Manus Lifecycle edge
const edgeTypes: EdgeTypes = {
  [ANIMATED_FLOW_EDGE]: AnimatedFlowEdge,
  [MANUS_LIFECYCLE_EDGE]: ManusLifecycleEdge, // Golden thinking bus edge
};

// Initial agent node in center
const createAgentNode = (
  name = "",
  department = "",
  model = "Claude 3.5",
  skillCount = 0
): Node<AgentNodeData> => ({
  id: "agent-central",
  type: "agent",
  position: { x: 400, y: 250 },
  data: { name, department, model, skillCount },
  draggable: false,
});

const Builder = () => {
  const { id: agentIdFromRoute } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Support both /builder/:id (legacy) and /hive?tab=builder&agentId=xxx
  const agentIdParam = agentIdFromRoute || searchParams.get("agentId") || undefined;
  const { user } = useAuth();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([createAgentNode()]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [showManifest, setShowManifest] = useState(false);
  const [draggingSkill, setDraggingSkill] = useState<Skill | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(agentIdParam || null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showConversational, setShowConversational] = useState(false);
  const [showVoiceCreator, setShowVoiceCreator] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showLiveTest, setShowLiveTest] = useState(false);
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [showWebhookPanel, setShowWebhookPanel] = useState(false);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [showLLMConfig, setShowLLMConfig] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [templateApplied, setTemplateApplied] = useState(false);
  const [showDeploySuccessDialog, setShowDeploySuccessDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [personalityConfig, setPersonalityConfig] = useState<PersonalityConfig>(getDefaultPersonalityConfig());
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<string | null>(null);
  const [draggingKnowledge, setDraggingKnowledge] = useState<KnowledgeBaseItem | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [leftPanelTab, setLeftPanelTab] = useState<"skills" | "variables">("skills");
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showVerificationPanel, setShowVerificationPanel] = useState(false);
  const [showMonitoringPanel, setShowMonitoringPanel] = useState(false);
  const [showEvaluationPanel, setShowEvaluationPanel] = useState(false);
  const [configDrawerNode, setConfigDrawerNode] = useState<Node | null>(null);
  const [showRunHistory, setShowRunHistory] = useState(false);
  const [showRunDialog, setShowRunDialog] = useState(false);

  // Workflow execution hook
  const workflowExecution = useWorkflowExecution();
  
  // Inspiration auto-generation state
  const [inspirationDescription, setInspirationDescription] = useState<string | null>(null);
  const [autoGenerateFromInspiration, setAutoGenerateFromInspiration] = useState(false);
  const [inspirationTitle, setInspirationTitle] = useState<string | null>(null);
  const [showDeployConfirmDialog, setShowDeployConfirmDialog] = useState(false);

  // Eject context - check if we came from Consumer mode
  const { ejectContext, returnToConsumer, clearEjectContext } = useAppModeStore();
  const isFromConsumerMode = ejectContext?.agentId === agentIdParam && ejectContext?.targetPage === 'builder';

  // Build replay hook for Consumer → Studio transition
  const {
    state: replayState,
    startReplay,
    skipReplay,
    pauseReplay,
    resumeReplay,
  } = useAgentBuildReplay(isFromConsumerMode ? agentIdParam || null : null);

  // Note: replay effects are defined after existingAgent declaration below

  const { setSelectedEdgeId, mockData: currentVariables } = useVariableStore();

  const { parseAdjustment, applyAdjustment } = useConfigAdjustment();
  const { 
    mountedKnowledgeBases, 
    addKnowledgeBase, 
    removeKnowledgeBase, 
    updateConfig: updateKnowledgeConfig,
    getKnowledgeBase,
    getConfig: getKnowledgeConfig,
    generateKnowledgeManifest,
    generateGovernancePolicies,
    hasLongTermMemory,
  } = useBuilderKnowledge();

  // Canvas debug hook
  const handleNodeDebugUpdate = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
  }, [setNodes]);

  const handleEdgeDebugUpdate = useCallback((edgeId: string, data: Record<string, unknown>) => {
    setEdges((eds) => eds.map((e) => e.id === edgeId ? { ...e, data: { ...e.data, ...data } } : e));
  }, [setEdges]);

  const {
    isDebugMode,
    isRunning,
    isPaused,
    currentNodeId,
    executionLogs,
    breakpoints,
    variableSnapshots,
    simulationSpeed,
    setDebugMode,
    setSimulationSpeed,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    stopSimulation,
    stepOver,
    toggleBreakpoint,
    clearAllBreakpoints,
  } = useCanvasDebug({
    nodes,
    edges,
    onNodeUpdate: handleNodeDebugUpdate,
    onEdgeUpdate: handleEdgeDebugUpdate,
  });

  // Canvas highlight hook for data flow animation
  const {
    isAnimating: isHighlightAnimating,
    startAnimation: startHighlightAnimation,
    getNodeHighlightClass,
    getEdgeHighlightData,
  } = useCanvasHighlight();

  // Update edges with debug mode info
  useEffect(() => {
    if (isDebugMode) {
      setEdges((eds) => eds.map((e) => ({
        ...e,
        data: {
          ...e.data,
          isDebugMode: true,
          hasBreakpoint: !!breakpoints[e.id],
          breakpointEnabled: breakpoints[e.id]?.enabled,
          onBreakpointToggle: toggleBreakpoint,
        },
      })));
    } else {
      setEdges((eds) => eds.map((e) => ({
        ...e,
        data: { ...e.data, isDebugMode: false, hasBreakpoint: false },
      })));
    }
  }, [isDebugMode, breakpoints, toggleBreakpoint, setEdges]);

  // Check URL params for wizard mode
  useEffect(() => {
    if (searchParams.get("wizard") === "true") {
      setShowConversational(true);
    }
  }, [searchParams]);

  // Check if first time user
  useEffect(() => {
    const hasSeenBuilder = localStorage.getItem("hasSeenBuilder");
    if (!hasSeenBuilder && !agentIdParam) {
      setShowWizard(true);
      localStorage.setItem("hasSeenBuilder", "true");
    }
  }, [agentIdParam]);

  const [agentConfig, setAgentConfig] = useState<SimpleAgentConfig>({
    name: "",
    department: "",
    model: "google/gemini-2.5-flash",
    systemPrompt: "",
    avatar: { iconId: "bot", colorId: "primary" },
  });

  const { data: publishedSkills = [] } = usePublishedSkills();
  const { data: existingAgent } = useAgent(agentIdParam || null);
  const saveAgent = useSaveAgentWithSkills();
  const deployAgent = useDeployAgent();
  const deleteAgent = useDeleteAgent();

  // Start replay when coming from Consumer mode
  useEffect(() => {
    if (isFromConsumerMode && existingAgent && !replayState.isComplete && !replayState.isReplaying) {
      startReplay();
    }
  }, [isFromConsumerMode, existingAgent, replayState.isComplete, replayState.isReplaying, startReplay]);

  // Apply replay nodes/edges to canvas when complete
  useEffect(() => {
    if (replayState.isComplete && replayState.visibleNodes.length > 0) {
      setNodes(replayState.visibleNodes);
      setEdges(replayState.visibleEdges);
      clearEjectContext();
    }
  }, [replayState.isComplete, replayState.visibleNodes, replayState.visibleEdges, setNodes, setEdges, clearEjectContext]);

  // Load existing agent data
  useEffect(() => {
    if (existingAgent) {
      const manifest = existingAgent.manifest as any;
      setAgentConfig({
        name: existingAgent.name,
        department: existingAgent.department || "",
        model: existingAgent.model as "claude-3.5" | "gpt-4",
        systemPrompt: manifest?.system_prompt || "",
        avatar: manifest?.avatar || { iconId: "bot", colorId: "primary" },
      });
      setCurrentAgentId(existingAgent.id);

      // Load skills as nodes
      if (existingAgent.skills && existingAgent.skills.length > 0) {
        const skillNodes: Node<SkillNodeData>[] = existingAgent.skills.map(
          (skill, index) => ({
            id: `skill-${skill.id}-${Date.now()}-${index}`,
            type: "skill",
            position: {
              x: 100 + (index % 3) * 180,
              y: 80 + Math.floor(index / 3) * 140,
            },
            data: {
              id: skill.id,
              name: skill.name,
              category: skill.category,
              description: skill.description || "",
              permissions: skill.permissions || [],
            },
          })
        );

        const skillEdges: Edge[] = skillNodes.map((node) => ({
          id: `edge-${node.id}`,
          source: node.id,
          target: "agent-central",
          animated: true,
          style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
        }));

        setNodes([
          createAgentNode(
            existingAgent.name,
            existingAgent.department || "",
            existingAgent.model,
            existingAgent.skills.length
          ),
          ...skillNodes,
        ]);
        setEdges(skillEdges);
      }
    }
  }, [existingAgent, setNodes, setEdges]);

  // Apply template from URL parameter
  useEffect(() => {
    const templateId = searchParams.get("template");
    
    // Only apply template if:
    // 1. There's a template ID in the URL
    // 2. We're not editing an existing agent
    // 3. Template hasn't been applied yet
    // 4. Published skills are loaded (for skill matching)
    if (templateId && !agentIdParam && !templateApplied && publishedSkills.length >= 0) {
      const template = findTemplateById(templateId);
      
      if (template) {
        // Apply template config
        setAgentConfig({
          name: template.name,
          department: template.config.department,
          model: template.config.model.includes("gpt") ? "gpt-4" : "claude-3.5",
          systemPrompt: template.config.systemPrompt,
          avatar: template.config.avatar,
        });

        // Match and add skills based on template categories
        const matchedSkills = publishedSkills.filter((skill) => {
          const skillText = `${skill.name} ${skill.description || ""} ${skill.category}`.toLowerCase();
          return template.config.suggestedSkillCategories.some((category) => {
            const keywords = [category, ...getCategoryKeywords(category)];
            return keywords.some((kw) => skillText.includes(kw.toLowerCase()));
          });
        }).slice(0, 5);

        if (matchedSkills.length > 0) {
          const skillNodes: Node<SkillNodeData>[] = matchedSkills.map(
            (skill, index) => ({
              id: `skill-${skill.id}-${Date.now()}-${index}`,
              type: "skill",
              position: {
                x: 100 + (index % 3) * 180,
                y: 80 + Math.floor(index / 3) * 140,
              },
              data: {
                id: skill.id,
                name: skill.name,
                category: skill.category,
                description: skill.description || "",
                permissions: skill.permissions || [],
              },
            })
          );

          const skillEdges: Edge[] = skillNodes.map((node) => ({
            id: `edge-${node.id}`,
            source: node.id,
            target: "agent-central",
            animated: true,
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
          }));

          setNodes([
            createAgentNode(template.name, template.config.department, template.config.model, matchedSkills.length),
            ...skillNodes,
          ]);
          setEdges(skillEdges);

          toast({
            title: `已应用「${template.name}」模板`,
            description: `已自动添加 ${matchedSkills.length} 个推荐技能`,
          });
        } else {
          setNodes([createAgentNode(template.name, template.config.department, template.config.model, 0)]);
          
          toast({
            title: `已应用「${template.name}」模板`,
            description: "你可以在左侧技能市场选择需要的技能",
          });
        }

        setTemplateApplied(true);
        
        // Clear template param from URL to prevent re-applying
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("template");
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [searchParams, agentIdParam, templateApplied, publishedSkills, setNodes, setEdges, setSearchParams]);

  // Handle inspiration auto-generation from URL parameters
  useEffect(() => {
    const inspirationId = searchParams.get("inspiration");
    const autoGenerate = searchParams.get("autoGenerate") === "true";
    const description = searchParams.get("desc");
    const title = searchParams.get("title");
    const category = searchParams.get("category");

    if (inspirationId && autoGenerate && description && !templateApplied && !agentIdParam) {
      const decodedDesc = decodeURIComponent(description);
      const decodedTitle = title ? decodeURIComponent(title) : "灵感智能体";
      const decodedCategory = category ? decodeURIComponent(category) : "通用";

      // Store inspiration data for EnhancedAIGenerator
      setInspirationDescription(decodedDesc);
      setInspirationTitle(decodedTitle);
      setAutoGenerateFromInspiration(true);

      // Set basic agent config from inspiration
      setAgentConfig((prev) => ({
        ...prev,
        name: decodedTitle,
        department: decodedCategory,
      }));

      // Open AI Generator and trigger generation
      setShowAIGenerator(true);
      
      // Clear URL params to prevent re-triggering
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("inspiration");
      newParams.delete("autoGenerate");
      newParams.delete("desc");
      newParams.delete("title");
      newParams.delete("category");
      setSearchParams(newParams, { replace: true });
      
      setTemplateApplied(true);

      // Toast notification
      toast({
        title: "正在生成智能体",
        description: `基于「${decodedTitle}」灵感自动配置中...`,
      });
    }
  }, [searchParams, agentIdParam, templateApplied, setSearchParams]);

  // Helper function to get category keywords
  function getCategoryKeywords(category: string): string[] {
    const mapping: Record<string, string[]> = {
      "text-generation": ["文本生成", "内容创作", "文案写作", "生成"],
      "summarization": ["总结", "摘要", "概括"],
      "translation": ["翻译", "多语言"],
      "data-analysis": ["数据分析", "统计", "分析"],
      "faq": ["FAQ", "问答", "常见问题"],
      "auto-reply": ["自动回复", "回复"],
      "code-execution": ["代码", "编程", "执行"],
      "document-parsing": ["文档", "解析", "PDF"],
      "web-search": ["搜索", "网页", "查询"],
      "education": ["教育", "学习", "辅导"],
      "效率提升": ["文档处理", "任务", "会议", "效率"],
      "生活助手": ["日程", "健康", "购物", "旅行"],
      "学习成长": ["知识", "语言", "学习", "教育"],
      "创意灵感": ["头脑风暴", "创意", "设计", "故事"],
    };
    return mapping[category] || [];
  }

  // UUID 格式校验函数
  const isValidUUID = (str: string | undefined | null): boolean => {
    if (!str) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  };

  // Extract skill IDs directly from nodes (stable source, doesn't depend on publishedSkills loading)
  // 关键修复：优先使用 assetId，并严格过滤非 UUID 值（如 "node-0"）
  const rawSkillIds = Array.from(
    new Set(
      nodes
        .filter((n) => n.type === "skill" || n.type === "generatedSkill")
        .map((n) => {
          const data = n.data as SkillNodeData & { assetId?: string };
          // 优先使用 assetId，其次使用 data.id
          return data.assetId || data.id;
        })
        .filter((id): id is string => isValidUUID(id))
    )
  );

  // Get added skills from nodes (for UI display and manifest)
  const addedSkills = nodes
    .filter((n) => n.type === "skill" || n.type === "generatedSkill")
    .map((n) => {
      const data = n.data as SkillNodeData & { assetId?: string };
      // 优先使用 assetId 进行匹配
      const skillId = data.assetId || data.id;
      const published = publishedSkills.find((s) => s.id === skillId);
      if (published) {
        return {
          id: published.id,
          name: published.name,
          category: published.category,
          description: published.description || "",
          permissions: published.permissions || [],
          version: published.version,
          inputs: (published.inputs as Skill["inputs"]) || [],
          outputs: (published.outputs as Skill["outputs"]) || [],
        };
      }
      // Fallback to node data if publishedSkills not loaded yet
      // 但仅在 skillId 是有效 UUID 时返回
      if (isValidUUID(skillId)) {
        return {
          id: skillId,
          name: data.name,
          category: data.category,
          description: data.description || "",
          permissions: data.permissions || [],
          version: "1.0.0",
          inputs: [],
          outputs: [],
        };
      }
      // 如果不是有效 UUID，返回 null 后过滤掉
      return null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null) as Skill[];

  const addedSkillIds = rawSkillIds;

  // Update agent node when config or skills change
  const updateAgentNode = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === "agent-central") {
          return {
            ...node,
            data: {
              ...node.data,
              name: agentConfig.name,
              department: agentConfig.department,
              model: agentConfig.model === "claude-3.5" ? "Claude 3.5" : "GPT-4",
              skillCount: addedSkillIds.length,
            },
          };
        }
        return node;
      })
    );
  }, [agentConfig, addedSkillIds.length, setNodes]);

  useEffect(() => {
    updateAgentNode();
  }, [updateAgentNode]);

  // Handle connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Remove skill node
  const handleRemoveSkill = useCallback(
    (skillId: string) => {
      setNodes((nds) => nds.filter((n) => n.data?.id !== skillId));
      setEdges((eds) =>
        eds.filter(
          (e) => !e.source.includes(skillId) && !e.target.includes(skillId)
        )
      );
      toast({
        title: "技能已移除",
        description: "已从智能体配置中移除该技能",
      });
    },
    [setNodes, setEdges]
  );

  // Handle drag over
  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  // Handle edge click for mapping panel
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedEdgeId(edge.id);
  }, [setSelectedEdgeId]);

  // Handle node click to open config drawer
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const configurableTypes = ["llm", "code", "httpRequest", "condition", "template", "parameterExtractor", "iterator", "knowledge", "variableAggregator", "trigger"];
    if (configurableTypes.includes(node.type || "")) {
      setConfigDrawerNode(node);
    }
  }, []);

  // Handle node config update from drawer
  const handleNodeConfigUpdate = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
  }, [setNodes]);

  const handleCloseEdgeMapping = useCallback(() => {
    setSelectedEdge(null);
    setSelectedEdgeId(null);
  }, [setSelectedEdgeId]);

  // Handle drop
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const itemData = event.dataTransfer.getData("application/json");
      if (!itemData) return;

      const item = JSON.parse(itemData);
      
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      // Check if it's an MCP action
      if (item.type === 'mcp_action') {
        const action = item as MCPActionDragItem;
        const newNode: Node<MCPActionNodeData> = {
          id: `mcp-action-${action.tool.name}-${Date.now()}`,
          type: "mcpAction",
          position,
          data: {
            id: `action-${Date.now()}`,
            name: action.tool.name,
            serverName: action.serverName,
            description: action.tool.description,
            inputSchema: action.tool.inputSchema as MCPActionNodeData['inputSchema'],
            permissions: action.permissions,
            riskLevel: action.riskLevel,
            requiresConfirmation: action.riskLevel !== 'low',
            onRemove: (id) => {
              setNodes((nds) => nds.filter((n) => n.data?.id !== id));
              setEdges((eds) => eds.filter((e) => !e.source.includes(id) && !e.target.includes(id)));
            },
          },
        };
        setNodes((nds) => [...nds, newNode]);
        toast({ title: "MCP 动作已添加", description: `${action.tool.name}` });
        return;
      }

      // Check if it's an intervention node
      if (item.type === 'intervention') {
        const newNode: Node<InterventionNodeData> = {
          id: `intervention-${Date.now()}`,
          type: "intervention",
          position,
          data: {
            id: `intervention-${Date.now()}`,
            name: "用户介入",
            confirmationType: "detailed",
            timeoutSeconds: 30,
            defaultAction: "reject",
            showInputPreview: true,
            riskLevel: "medium",
            onRemove: (id) => {
              setNodes((nds) => nds.filter((n) => n.data?.id !== id));
              setEdges((eds) => eds.filter((e) => !e.source.includes(id) && !e.target.includes(id)));
            },
          },
        };
        setNodes((nds) => [...nds, newNode]);
        toast({ title: "介入节点已添加", description: "MPLP 确认节点" });
        return;
      }

      // Check if it's a knowledge base
      if (item.type === 'knowledge_base') {
        const kb = item as KnowledgeBaseItem;
        
        if (mountedKnowledgeBases.some(m => m.id === kb.id)) {
          toast({ title: "知识库已存在", variant: "destructive" });
          return;
        }

        // Add to knowledge store
        addKnowledgeBase({
          id: kb.id,
          name: kb.name,
          description: kb.description,
          documents_count: kb.documents_count,
          chunks_count: kb.chunks_count,
          nodes_count: kb.nodes_count,
          edges_count: kb.edges_count,
          index_status: kb.index_status,
          graph_enabled: kb.graph_enabled,
        });

        const newNode: Node<KnowledgeBaseNodeData> = {
          id: `knowledge-${kb.id}-${Date.now()}`,
          type: "knowledge",
          position,
          data: {
            id: kb.id,
            name: kb.name,
            description: kb.description || "",
            documents_count: kb.documents_count,
            chunks_count: kb.chunks_count,
            nodes_count: kb.nodes_count,
            edges_count: kb.edges_count,
            index_status: kb.index_status,
            graph_enabled: kb.graph_enabled,
            retrieval_mode: 'hybrid',
            top_k: 5,
            graph_depth: 2,
            onRemove: (id) => {
              removeKnowledgeBase(id);
              setNodes((nds) => nds.filter((n) => n.data?.id !== id));
              setEdges((eds) => eds.filter((e) => !e.source.includes(id)));
            },
            onConfigure: (id) => setSelectedKnowledgeBaseId(id),
          },
        };

        setNodes((nds) => [...nds, newNode]);

        const newEdge: Edge = {
          id: `edge-kb-${kb.id}-${Date.now()}`,
          source: newNode.id,
          target: "agent-central",
          animated: true,
          style: { stroke: "hsl(280 60% 60%)", strokeWidth: 2 },
        };
        setEdges((eds) => [...eds, newEdge]);

        toast({ title: "知识库已挂载", description: `${kb.name} 已成功装载` });
        setDraggingKnowledge(null);
        return;
      }

      // Handle skill drop (existing logic)
      const skill: Skill = item;

      if (addedSkillIds.includes(skill.id)) {
        toast({
          title: "技能已存在",
          description: "该技能已添加到智能体配置中",
          variant: "destructive",
        });
        return;
      }

      const newNode: Node<SkillNodeData> = {
        id: `skill-${skill.id}-${Date.now()}`,
        type: "skill",
        position,
        data: {
          id: skill.id,
          name: skill.name,
          category: skill.category,
          description: skill.description,
          permissions: skill.permissions,
          onRemove: handleRemoveSkill,
        },
      };

      setNodes((nds) => [...nds, newNode]);

      const newEdge: Edge = {
        id: `edge-${skill.id}-${Date.now()}`,
        source: newNode.id,
        target: "agent-central",
        animated: true,
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      };
      setEdges((eds) => [...eds, newEdge]);

      toast({
        title: "技能已添加",
        description: `${skill.name} 已成功装载`,
      });

      setDraggingSkill(null);
    },
    [reactFlowInstance, addedSkillIds, setNodes, setEdges, handleRemoveSkill, mountedKnowledgeBases, addKnowledgeBase, removeKnowledgeBase]
  );

  // Generate manifest with knowledge bases
  const generateManifest = () => {
    const knowledgeManifest = generateKnowledgeManifest();
    const governancePolicies = generateGovernancePolicies();
    
    return {
      version: "1.0.0",
      metadata: {
        name: agentConfig.name || "未命名智能体",
        department: agentConfig.department || "未指定",
        description: `${agentConfig.name} - ${agentConfig.department || "通用"} 智能体`,
        created_at: existingAgent?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      avatar: { iconId: agentConfig.avatar.iconId, colorId: agentConfig.avatar.colorId },
      runtime: {
        provider: agentConfig.model === "claude-3.5" ? "anthropic" : "openai",
        model:
          agentConfig.model === "claude-3.5"
            ? "claude-3-5-sonnet-20241022"
            : "gpt-4-turbo",
        model_config: {
          temperature: 0.7,
          max_tokens: 4096,
        },
      },
      system_prompt: agentConfig.systemPrompt || "",
      skills: {
        mounts: addedSkills.map((s) => ({
          skill_id: s.id,
          version: s.version,
          enabled: true,
          priority: 1,
          config_overrides: {},
        })),
        details: addedSkills.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category,
          permissions: s.permissions,
        })),
      },
      knowledge: knowledgeManifest,
      knowledgeBases: knowledgeManifest.enabled ? knowledgeManifest.bases.map(b => ({
        id: b.id,
        name: b.name,
        retrieval_mode: b.retrieval_mode,
        top_k: b.top_k,
      })) : [],
      mplp: {
        policy: "default",
        context: {
          role: agentConfig.systemPrompt ? "custom" : "assistant",
          department: agentConfig.department || "general",
          long_term_memory: hasLongTermMemory ? "enabled" : "disabled",
        },
        require_confirm: ["write", "delete", "network", "execute"],
        audit_log: true,
        trace_enabled: true,
        governance: {
          policies: governancePolicies,
        },
      },
    };
  };

  // Handle save
  const handleSave = async () => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "保存智能体需要登录账号",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!agentConfig.name.trim()) {
      toast({ title: "请输入智能体名称", variant: "destructive" });
      return;
    }

    try {
      const manifest = generateManifest();

      const agentId = await saveAgent.mutateAsync({
        agent: {
          id: currentAgentId || undefined,
          name: agentConfig.name,
          department: agentConfig.department || null,
          model: agentConfig.model,
        },
        skillIds: rawSkillIds,
        manifest,
      });

      if (agentId) {
        setCurrentAgentId(agentId);
        if (!agentIdParam) {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("agentId", agentId);
          setSearchParams(newParams, { replace: true });
        }
      }
    } catch (err: any) {
      console.error("Save failed:", err);
      toast({
        title: "保存失败",
        description: err?.message || "未知错误",
        variant: "destructive",
      });
    }
  };

  // Handle deploy
  const handleDeploy = async () => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "部署智能体需要登录账号",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!agentConfig.name.trim()) {
      toast({ title: "请输入智能体名称", variant: "destructive" });
      return;
    }

    try {
      const manifest = generateManifest();

      const agentId = await saveAgent.mutateAsync({
        agent: {
          id: currentAgentId || undefined,
          name: agentConfig.name,
          department: agentConfig.department || null,
          model: agentConfig.model,
        },
        skillIds: rawSkillIds,
        manifest,
      });

      if (agentId) {
        setCurrentAgentId(agentId);
        if (!agentIdParam) {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("agentId", agentId);
          setSearchParams(newParams, { replace: true });
        }
        await deployAgent.mutateAsync(agentId);

        // Show deploy success dialog instead of auto-navigating
        setShowDeploySuccessDialog(true);
      }
    } catch (err: any) {
      console.error("Deploy failed:", err);
      toast({
        title: "部署失败",
        description: err?.message || "未知错误",
        variant: "destructive",
      });
    }
  };

  // Handle wizard complete
  const handleWizardComplete = (config: {
    name: string;
    department: string;
    systemPrompt: string;
    selectedSkillIds: string[];
    personalityConfig?: PersonalityConfig;
  }) => {
    setAgentConfig({
      name: config.name,
      department: config.department,
      model: "claude-3.5",
      systemPrompt: config.systemPrompt,
      avatar: { iconId: "bot", colorId: "primary" },
    });

    if (config.personalityConfig) {
      setPersonalityConfig(config.personalityConfig);
    }

    // Add selected skills as nodes
    const selectedSkills = publishedSkills.filter((s) =>
      config.selectedSkillIds.includes(s.id)
    );

    if (selectedSkills.length > 0) {
      const skillNodes: Node<SkillNodeData>[] = selectedSkills.map(
        (skill, index) => ({
          id: `skill-${skill.id}-${Date.now()}-${index}`,
          type: "skill",
          position: {
            x: 100 + (index % 3) * 180,
            y: 80 + Math.floor(index / 3) * 140,
          },
          data: {
            id: skill.id,
            name: skill.name,
            category: skill.category,
            description: skill.description || "",
            permissions: skill.permissions || [],
          },
        })
      );

      const skillEdges: Edge[] = skillNodes.map((node) => ({
        id: `edge-${node.id}`,
        source: node.id,
        target: "agent-central",
        animated: true,
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      }));

      setNodes([
        createAgentNode(config.name, config.department, "Claude 3.5", selectedSkills.length),
        ...skillNodes,
      ]);
      setEdges(skillEdges);
    } else {
      setNodes([createAgentNode(config.name, config.department, "Claude 3.5", 0)]);
    }

    setShowWizard(false);
    setShowConversational(false);
    setShowVoiceCreator(false);
    toast({
      title: "配置完成",
      description: "你可以继续在画布中调整智能体配置",
    });
  };

  // Handle mode selection
  const handleModeSelect = (mode: CreationMode) => {
    setShowModeSelector(false);
    switch (mode) {
      case "voice":
        setShowVoiceCreator(true);
        break;
      case "chat":
        setShowConversational(true);
        break;
      case "visual":
        // Stay in current visual mode
        break;
    }
  };

  // Handle adjustment from live test panel
  const handleAdjustmentRequest = (adjustment: string) => {
    const result = parseAdjustment(adjustment, personalityConfig);
    if (result) {
      const newConfig = applyAdjustment(personalityConfig, result.adjustedConfig);
      setPersonalityConfig(newConfig);
      toast({
        title: "已调整性格",
        description: result.description,
      });
    }
  };

  // Handle delete agent
  const handleDeleteAgent = async () => {
    if (!currentAgentId) return;
    
    try {
      await deleteAgent.mutateAsync(currentAgentId);
      toast({
        title: "智能体已删除",
        description: "正在返回首页...",
      });
      navigate("/");
    } catch (error) {
      // Error already handled in hook
    }
  };

  // Allow deployment without skills - only require a name
  const canDeploy = agentConfig.name.trim() !== "";
  const isSaving = saveAgent.isPending || deployAgent.isPending;
  const isDeleting = deleteAgent.isPending;

  // Fit view helper
  const handleFitView = () => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.3, duration: 300 });
    }
  };

  // Convert published skills to wizard format
  const availableSkillsForWizard: Skill[] = publishedSkills.map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    description: s.description || "",
    permissions: s.permissions || [],
    version: s.version,
    inputs: (s.inputs as Skill["inputs"]) || [],
    outputs: (s.outputs as Skill["outputs"]) || [],
  }));

  return (
    <TooltipProvider>
      <div className="h-[100vh] flex overflow-hidden bg-background">
        {/* Left Panel - Skill Marketplace */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out flex-shrink-0",
            leftPanelCollapsed ? "w-0" : "w-80"
          )}
        >
          {!leftPanelCollapsed && (
            <SkillMarketplace
              onDragStart={setDraggingSkill}
              onKnowledgeDragStart={setDraggingKnowledge}
              addedSkillIds={addedSkillIds}
              addedKnowledgeBaseIds={mountedKnowledgeBases.map(kb => kb.id)}
            />
          )}
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Toolbar */}
          <div className="h-12 px-3 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              {/* Return to Chat button - only show if came from Consumer mode */}
              {isFromConsumerMode && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 border-primary/30 text-primary hover:bg-primary/5"
                      onClick={() => {
                        const returnUrl = ejectContext?.returnUrl || '/runtime';
                        returnToConsumer(returnUrl);
                        setTimeout(() => navigate(returnUrl), 800);
                      }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      返回对话
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>返回 Consumer 模式</TooltipContent>
                </Tooltip>
              )}

              {isFromConsumerMode && <div className="h-5 w-px bg-border" />}

              {/* Left panel toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                  >
                    {leftPanelCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronLeft className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {leftPanelCollapsed ? "显示能力市场" : "隐藏能力市场"}
                </TooltipContent>
              </Tooltip>

              <div className="h-5 w-px bg-border" />

              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">
                  {agentConfig.name || "智能体构建器"}
                </span>
              </div>

              {currentAgentId && (
                <Badge variant="secondary" className="text-[10px]">
                  已保存
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {(draggingSkill || draggingKnowledge) && (
                <Badge className="text-xs bg-primary/10 text-primary border-0 animate-pulse">
                  拖拽中: {draggingSkill?.name || draggingKnowledge?.name}
                </Badge>
              )}

              <Badge variant="outline" className="text-xs">
                {addedSkills.length} 技能
              </Badge>
              {mountedKnowledgeBases.length > 0 && (
                <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-600">
                  {mountedKnowledgeBases.length} 知识库
                </Badge>
              )}

              <div className="h-5 w-px bg-border" />

              {/* Creation mode buttons */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowVoiceCreator(true)}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>语音创建</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowConversational(true)}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>对话创建</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowWizard(true)}
                  >
                    <Wand2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>向导模式</TooltipContent>
              </Tooltip>

              {/* AI Generator Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 h-8"
                    onClick={() => setShowAIGenerator(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI生成
                  </Button>
                </TooltipTrigger>
                <TooltipContent>AI一键生成完整智能体</TooltipContent>
              </Tooltip>

              {/* Debug Mode Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isDebugMode ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setDebugMode(!isDebugMode);
                      if (!isDebugMode) setShowDebugPanel(true);
                    }}
                  >
                    <Bug className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>调试模式</TooltipContent>
              </Tooltip>

              {/* Verification Test Button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showVerificationPanel ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowVerificationPanel(true)}
                  >
                    <FlaskConical className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>验证测试</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleFitView}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>适应画布</TooltipContent>
              </Tooltip>

              {/* Live Test Button */}
              {agentConfig.name && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={showLiveTest ? "default" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setShowLiveTest(!showLiveTest)}
                    >
                      <TestTube2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>实时测试</TooltipContent>
                </Tooltip>
              )}

              {/* API Management Button */}
              {currentAgentId && existingAgent?.status === 'deployed' && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowApiPanel(true)}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>API 管理</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowWebhookPanel(true)}
                      >
                        <Webhook className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Webhook 管理</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowAlertPanel(true)}
                      >
                        <Bell className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>告警管理</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowLLMConfig(true)}
                      >
                        <Cpu className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>大模型配置</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowStatsPanel(true)}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>API 统计</TooltipContent>
                  </Tooltip>

                  {/* Monitoring Dashboard */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={showMonitoringPanel ? "default" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowMonitoringPanel(true)}
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>监控仪表板</TooltipContent>
                  </Tooltip>

                  {/* Evaluation Center */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={showEvaluationPanel ? "default" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowEvaluationPanel(true)}
                      >
                        <Target className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>评估中心</TooltipContent>
                  </Tooltip>
                </>
              )}

              {!user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/auth")}
                  className="gap-1.5 h-8 text-muted-foreground"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  登录
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !agentConfig.name.trim()}
                className="gap-1.5 h-8"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                保存
              </Button>

              {/* Run Workflow Button */}
              <Button
                size="sm"
                className="gap-1.5 h-8"
                disabled={workflowExecution.status === "running" || nodes.length === 0}
                onClick={() => setShowRunDialog(true)}
              >
                {workflowExecution.status === "running" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {workflowExecution.status === "running" ? "运行中" : "运行"}
              </Button>

              {/* Run History Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={showRunHistory ? "secondary" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowRunHistory(!showRunHistory)}
                  >
                    <HistoryIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>运行历史</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                  >
                    {rightPanelCollapsed ? (
                      <ChevronLeft className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {rightPanelCollapsed ? "显示配置面板" : "隐藏配置面板"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Debug Toolbar */}
          {isDebugMode && (
            <CanvasDebugToolbar
              isRunning={isRunning}
              isPaused={isPaused}
              simulationSpeed={simulationSpeed}
              breakpointCount={Object.keys(breakpoints).length}
              currentNodeName={nodes.find((n) => n.id === currentNodeId)?.data?.name as string}
              onStart={startSimulation}
              onPause={pauseSimulation}
              onResume={resumeSimulation}
              onStop={stopSimulation}
              onStepOver={stepOver}
              onSpeedChange={setSimulationSpeed}
              onClearBreakpoints={clearAllBreakpoints}
              onExitDebug={() => {
                stopSimulation();
                setDebugMode(false);
                setShowDebugPanel(false);
              }}
            />
          )}

          {/* Canvas Area - Explicit height to prevent production collapse */}
          <div
            ref={reactFlowWrapper}
            className="flex-1 min-h-0"
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onEdgeClick={onEdgeClick}
              onNodeClick={onNodeClick}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.4 }}
              defaultEdgeOptions={{
                animated: true,
                style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
              }}
              proOptions={{ hideAttribution: true }}
              className="bg-background"
              minZoom={0.3}
              maxZoom={2}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1.5}
                color="hsl(var(--border))"
              />
              <Controls
                className="!bg-card !border-border !rounded-lg !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-secondary"
                showFitView={false}
              />
              <MiniMap
                nodeColor={(node) =>
                  node.type === "agent"
                    ? "hsl(var(--primary))"
                    : "hsl(var(--cognitive))"
                }
                maskColor="hsl(var(--background) / 0.8)"
                className="!bg-card !border-border !rounded-lg"
              />

              {/* Compact empty state hint */}
              {addedSkills.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto"
                >
                  <div className="flex items-center gap-3 bg-card/95 backdrop-blur-sm border border-border rounded-full px-4 py-2 shadow-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ChevronLeft className="h-4 w-4 text-primary animate-pulse" />
                      <span>从左侧拖拽技能到画布</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => setShowVoiceCreator(true)}
                      >
                        <Mic className="h-3.5 w-3.5" />
                        语音
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => setShowConversational(true)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        对话
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </ReactFlow>

            {/* Canvas Highlight Controls - for data flow animation */}
            <CanvasHighlightControls />
            
            {/* Node Data Snapshot Panel - shows input/output data during animation */}
            <NodeDataSnapshotPanel />

            {/* Build Replay Overlay */}
            {replayState.isReplaying && (
              <BuildReplayOverlay
                state={replayState}
                agentName={existingAgent?.name}
                onSkip={skipReplay}
                onPause={pauseReplay}
                onResume={resumeReplay}
              />
            )}
          </div>
        </div>

        {/* Debug Panel - shows when debug mode is active */}
        {isDebugMode && showDebugPanel && (
          <CanvasDebugPanel
            executionLogs={executionLogs}
            breakpoints={breakpoints}
            variableSnapshots={variableSnapshots}
            currentVariables={currentVariables}
            onClose={() => setShowDebugPanel(false)}
          />
        )}

        {/* Right Panel - Config (hidden in debug mode with debug panel open) */}
        {!(isDebugMode && showDebugPanel) && (
          <SimplifiedConfigPanel
          config={agentConfig}
          onConfigChange={setAgentConfig}
          skills={addedSkills}
          onRemoveSkill={handleRemoveSkill}
          onDeploy={handleDeploy}
          onShowManifest={() => setShowManifest(true)}
          onSave={handleSave}
          canDeploy={canDeploy}
          isSaving={isSaving}
          isCollapsed={rightPanelCollapsed}
          onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
          agentId={currentAgentId}
          onDelete={() => setShowDeleteConfirm(true)}
          isDeleting={isDeleting}
        />
        )}

        {/* Run History Panel */}
        {showRunHistory && (
          <div className="w-80 border-l border-border bg-card overflow-hidden">
            <RunHistoryPanel
              workflowId={currentAgentId}
              onReplayRun={(run) => {
                // Highlight nodes based on run results
                const statuses: Record<string, string> = {};
                for (const r of run.node_results || []) {
                  statuses[r.nodeId] = r.status;
                }
                // Could apply to canvas highlighting in future
              }}
            />
          </div>
        )}

        {/* Workflow Run Dialog */}
        <WorkflowRunDialog
          open={showRunDialog}
          onOpenChange={setShowRunDialog}
          isRunning={workflowExecution.status === "running"}
          nodes={nodes}
          onRun={(inputs) => {
            const wfId = currentAgentId || "draft-" + Date.now();
            workflowExecution.executeWorkflow(wfId, nodes, edges, inputs);
            setShowRunDialog(false);
            toast({ title: "工作流已启动", description: "正在执行节点..." });
          }}
        />

        <BuilderWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
          availableSkills={availableSkillsForWizard}
        />

        {/* Conversational Creator (Chat Mode) */}
        <ConversationalCreator
          isOpen={showConversational}
          onClose={() => setShowConversational(false)}
          onComplete={handleWizardComplete}
          useVoice={false}
        />

        {/* Voice Creator Mode */}
        <ConversationalCreator
          isOpen={showVoiceCreator}
          onClose={() => setShowVoiceCreator(false)}
          onComplete={handleWizardComplete}
          useVoice={true}
        />

        {/* Live Test Panel */}
        {showLiveTest && (
          <div className="fixed bottom-4 right-4 z-50">
            <LiveTestPanel
              agentName={agentConfig.name}
              systemPrompt={mergePersonalityWithPrompt(agentConfig.systemPrompt, personalityConfig)}
              personalityConfig={personalityConfig}
              isOpen={showLiveTest}
              onClose={() => setShowLiveTest(false)}
              onAdjustmentRequest={handleAdjustmentRequest}
            />
          </div>
        )}

        {/* Manifest Preview Modal */}
        <ManifestPreview
          isOpen={showManifest}
          onClose={() => setShowManifest(false)}
          manifest={showManifest ? generateManifest() : null}
        />

        {/* API Management Panel */}
        <AgentApiPanel
          agentId={currentAgentId}
          agentName={agentConfig.name}
          isOpen={showApiPanel}
          onClose={() => setShowApiPanel(false)}
        />

        {/* Webhook Panel */}
        <WebhookPanel
          agentId={currentAgentId}
          agentName={agentConfig.name}
          isOpen={showWebhookPanel}
          onClose={() => setShowWebhookPanel(false)}
        />

        {/* Alert Panel */}
        <ApiAlertPanel
          agentId={currentAgentId}
          agentName={agentConfig.name}
          isOpen={showAlertPanel}
          onClose={() => setShowAlertPanel(false)}
        />

        {/* LLM Config Panel */}
        <LLMConfigPanel
          agentId={currentAgentId}
          agentName={agentConfig.name}
          isOpen={showLLMConfig}
          onClose={() => setShowLLMConfig(false)}
        />

        {/* API Stats Dialog */}
        {showStatsPanel && currentAgentId && (
          <Dialog open={showStatsPanel} onOpenChange={setShowStatsPanel}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>API 调用统计</DialogTitle>
              </DialogHeader>
              <ApiStatsDashboard
                agentId={currentAgentId}
                apiKeyIds={[]}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Deploy Success Dialog */}
        <Dialog open={showDeploySuccessDialog} onOpenChange={setShowDeploySuccessDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-status-success/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-status-success" />
                </div>
                <div>
                  <DialogTitle>智能体部署成功！</DialogTitle>
                  <DialogDescription className="mt-1">
                    「{agentConfig.name}」已成功部署到云端
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                下一步，您可以选择：
              </p>
              <div className="space-y-3">
                <Button
                  className="w-full justify-start gap-3"
                  variant="outline"
                  onClick={() => {
                    setShowDeploySuccessDialog(false);
                    setShowApiPanel(true);
                  }}
                >
                  <Key className="h-4 w-4 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">生成 API 密钥</div>
                    <div className="text-xs text-muted-foreground">创建密钥以便通过 API 调用智能体</div>
                  </div>
                </Button>
                <Button
                  className="w-full justify-start gap-3"
                  variant="outline"
                  onClick={() => {
                    setShowDeploySuccessDialog(false);
                    navigate("/api-hub");
                  }}
                >
                  <FileCode className="h-4 w-4 text-cognitive" />
                  <div className="text-left">
                    <div className="font-medium">查看 API 文档</div>
                    <div className="text-xs text-muted-foreground">获取接口说明和代码示例</div>
                  </div>
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeploySuccessDialog(false);
                  navigate(currentAgentId ? `/hive?tab=runtime&agentId=${currentAgentId}` : "/hive?tab=runtime");
                }}
              >
                稍后设置，前往运行环境
                <Play className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确定删除此智能体？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作将永久删除「{agentConfig.name}」及其所有配置和关联数据。此操作不可撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteAgent}
                disabled={isDeleting}
              >
                {isDeleting ? "删除中..." : "确认删除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Enhanced AI Workflow Generator Modal */}
        <EnhancedAIGenerator
          isOpen={showAIGenerator}
          onClose={() => {
            setShowAIGenerator(false);
            // Clear inspiration state when closing
            setInspirationDescription(null);
            setAutoGenerateFromInspiration(false);
            setInspirationTitle(null);
          }}
          initialDescription={inspirationDescription}
          autoGenerate={autoGenerateFromInspiration}
          inspirationTitle={inspirationTitle}
          onApply={async (nodes, edges, config, knowledgeBases, result) => {
            // Update canvas nodes and edges
            setNodes(nodes);
            setEdges(edges);
            
            // Update agent config (preserve inspiration title if set)
            setAgentConfig(prev => ({
              ...config,
              name: inspirationTitle || config.name,
              department: prev.department || config.department,
            }));
            
            // Mount knowledge bases if provided
            knowledgeBases?.forEach(kb => addKnowledgeBase(kb));
            
            // Show auto-fix notification if interventions were added
            if (result?.complianceReport?.autoFixedOperations?.length > 0) {
              toast({
                title: "已自动添加安全确认",
                description: `为了安全，系统已为 ${result.complianceReport.autoFixedOperations.length} 个高危操作添加了人工审批流程`,
                duration: 6000,
              });
            } else if (result?.riskAssessment?.overallRisk === 'high') {
              // Show risk warning if high risk
              toast({
                title: "检测到高风险操作",
                description: `已自动添加 ${result.interventions.length} 个干预节点`,
                variant: "destructive",
              });
            }
            
            // Fit view after a short delay
            setTimeout(() => {
              reactFlowInstance?.fitView({ padding: 0.2 });
            }, 100);
            
            toast({
              title: "工作流已生成",
              description: `已创建 ${nodes.length} 个节点和 ${edges.length} 条连线`,
            });
            
            // If from inspiration, auto-save and show deploy confirmation
            if (autoGenerateFromInspiration && user) {
              setTimeout(async () => {
                try {
                  await handleSave();
                  toast({
                    title: "智能体已保存",
                    description: "基于灵感生成的智能体已保存到您的账户",
                  });
                  // Show deploy confirmation dialog
                  setShowDeployConfirmDialog(true);
                } catch (err) {
                  console.error("Auto-save failed:", err);
                }
                
                // Clear inspiration state
                setInspirationDescription(null);
                setAutoGenerateFromInspiration(false);
                setInspirationTitle(null);
              }, 500);
            }
          }}
        />

        {/* Deploy Confirmation Dialog (after inspiration generation) */}
        <Dialog open={showDeployConfirmDialog} onOpenChange={setShowDeployConfirmDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-status-success/10 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-status-success" />
                </div>
                <div>
                  <DialogTitle>智能体生成完成！</DialogTitle>
                  <DialogDescription className="mt-1">
                    「{agentConfig.name}」已成功创建并保存
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground mb-4">
                是否立即部署使其可以真实使用？
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-status-success" />
                  <span>画布已显示完整工作流</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-status-success" />
                  <span>Manus 规划内核已集成</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-status-success" />
                  <span>智能体配置已保存</span>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowDeployConfirmDialog(false)}>
                稍后部署
              </Button>
              <Button 
                onClick={async () => {
                  setShowDeployConfirmDialog(false);
                  await handleDeploy();
                }}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                立即部署
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Verification Test Panel Dialog */}
        <Dialog open={showVerificationPanel} onOpenChange={setShowVerificationPanel}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>一键生成链路验证</DialogTitle>
              <DialogDescription>
                验证语义搜索、拓扑生成、自动布线和合规注入的完整流程
              </DialogDescription>
            </DialogHeader>
            <GenerationVerificationPanel />
          </DialogContent>
        </Dialog>

        {/* Monitoring Dashboard Dialog */}
        <Dialog open={showMonitoringPanel} onOpenChange={setShowMonitoringPanel}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Agent 监控仪表板</DialogTitle>
              <DialogDescription>
                实时监控 Agent 运行状态、调用统计和健康指标
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh]">
              <AgentMonitoringDashboard agentId={currentAgentId} />
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Evaluation Center Dialog */}
        <Dialog open={showEvaluationPanel} onOpenChange={setShowEvaluationPanel}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0">
            <EvaluationCenter 
              agentId={currentAgentId || ''}
              agentConfig={{
                name: agentConfig.name,
                systemPrompt: agentConfig.systemPrompt,
                department: agentConfig.department,
                model: agentConfig.model,
              }}
              onClose={() => setShowEvaluationPanel(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Node Config Drawer */}
        <NodeConfigDrawer
          selectedNode={configDrawerNode}
          onClose={() => setConfigDrawerNode(null)}
          onUpdateNodeData={handleNodeConfigUpdate}
          nodes={nodes}
        />
      </div>
    </TooltipProvider>
  );
};

export default Builder;
