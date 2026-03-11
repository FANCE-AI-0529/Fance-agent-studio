import { useState, useCallback } from "react";
import { Node, Edge } from "@xyflow/react";
import { supabase } from "../integrations/supabase/client.ts";
import { 
  convertToReactFlowNodes, 
  convertToReactFlowEdges,
  CanvasNodeConfig,
  CanvasEdgeConfig,
  distributeSkillsAroundAgent,
  distributeKnowledgeAroundAgent,
  getManusPosition,
} from "../utils/canvasLayoutEngine.ts";
import { toast } from "./use-toast.ts";
import type { SimpleAgentConfig } from "../components/builder/SimplifiedConfigPanel.tsx";
import type { Skill } from "../components/builder/SkillMarketplace.tsx";
import type { MountedKnowledgeBase } from "./useBuilderKnowledge.ts";
import { MANUS_KERNEL } from "../data/manusKernel.ts";

export interface GeneratedCanvasResult {
  nodes: Node[];
  edges: Edge[];
  agentConfig: SimpleAgentConfig;
  skills: Skill[];
  mcpActions: MCPActionSuggestion[];
  knowledgeBases: KnowledgeBaseSuggestion[];
  manifest: Record<string, unknown>;
}

export interface MCPActionSuggestion {
  serverId: string;
  serverName: string;
  toolName: string;
  reason: string;
  riskLevel: "low" | "medium" | "high";
}

export interface KnowledgeBaseSuggestion {
  name: string;
  description: string;
  retrievalMode: "vector" | "graph" | "hybrid";
}

interface AIGeneratedConfig {
  name: string;
  department: string;
  systemPrompt: string;
  suggestedSkills: string[];
  personalityConfig: {
    professional: number;
    detailed: number;
    humor: number;
    creative: number;
    preset?: string;
  };
  canvasNodes?: CanvasNodeConfig[];
  canvasEdges?: CanvasEdgeConfig[];
  suggestedMCPActions?: MCPActionSuggestion[];
  suggestedKnowledgeBases?: KnowledgeBaseSuggestion[];
}

export interface UseAICanvasGeneratorReturn {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  generatedResult: GeneratedCanvasResult | null;
  generateFromDescription: (description: string, generateFullWorkflow?: boolean) => Promise<void>;
  applyToCanvas: (
    setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void,
    setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void,
    setAgentConfig: (config: SimpleAgentConfig) => void,
    addKnowledgeBase?: (kb: MountedKnowledgeBase) => void
  ) => void;
  reset: () => void;
}

const GENERATION_STEPS = [
  { id: "analyze", label: "分析需求..." },
  { id: "generate_config", label: "生成配置..." },
  { id: "build_workflow", label: "构建工作流..." },
  { id: "layout", label: "优化布局..." },
  { id: "validate", label: "验证完成..." },
];

export function useAICanvasGenerator(): UseAICanvasGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [generatedResult, setGeneratedResult] = useState<GeneratedCanvasResult | null>(null);

  const generateFromDescription = useCallback(async (
    description: string, 
    generateFullWorkflow: boolean = true
  ) => {
    setIsGenerating(true);
    setProgress(0);
    setGeneratedResult(null);

    try {
      // Step 1: Analyze
      setCurrentStep(GENERATION_STEPS[0].label);
      setProgress(10);
      await new Promise(r => setTimeout(r, 300));

      // Step 2: Call AI to generate config
      setCurrentStep(GENERATION_STEPS[1].label);
      setProgress(30);

      const { data, error } = await supabase.functions.invoke("agent-config-generator", {
        body: { 
          description, 
          generateFullWorkflow,
        },
      });

      if (error) throw error;

      const aiConfig = data as AIGeneratedConfig;
      setProgress(50);

      // Step 3: Build workflow nodes
      setCurrentStep(GENERATION_STEPS[2].label);
      setProgress(60);

      const { nodes, edges, mcpActions, knowledgeBases } = buildWorkflowFromConfig(
        aiConfig, 
        description,
        generateFullWorkflow
      );

      setProgress(80);

      // Step 4: Layout
      setCurrentStep(GENERATION_STEPS[3].label);
      const layoutedNodes = convertToReactFlowNodes(
        nodes.map(n => ({ 
          id: n.id, 
          type: n.type as any, 
          data: n.data as Record<string, unknown> 
        })),
        edges.map(e => ({ id: e.id, source: e.source, target: e.target }))
      );
      setProgress(90);

      // Step 5: Validate
      setCurrentStep(GENERATION_STEPS[4].label);

      const result: GeneratedCanvasResult = {
        nodes: layoutedNodes,
        edges: convertToReactFlowEdges(edges.map(e => ({
          id: e.id,
          source: e.source,
          sourceHandle: e.sourceHandle,
          target: e.target,
          targetHandle: e.targetHandle,
          animated: true,
          label: typeof e.label === 'string' ? e.label : undefined,
        }))),
        agentConfig: {
          name: aiConfig.name,
          department: aiConfig.department,
          model: "google/gemini-2.5-flash",
          systemPrompt: aiConfig.systemPrompt,
          avatar: { iconId: "bot", colorId: "primary" },
        },
        skills: [],
        mcpActions,
        knowledgeBases,
        manifest: generateManifest(aiConfig),
      };

      setGeneratedResult(result);
      setProgress(100);
      
      toast({
        title: "生成完成",
        description: `已生成 ${result.nodes.length} 个节点和 ${result.edges.length} 条连线`,
      });

    } catch (err: any) {
      console.error("AI generation failed:", err);
      toast({
        title: "生成失败",
        description: err.message || "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const applyToCanvas = useCallback((
    setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void,
    setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void,
    setAgentConfig: (config: SimpleAgentConfig) => void,
    addKnowledgeBase?: (kb: MountedKnowledgeBase) => void
  ) => {
    if (!generatedResult) return;

    // Update agent config
    setAgentConfig(generatedResult.agentConfig);

    // Set nodes and edges
    setNodes(generatedResult.nodes);
    setEdges(generatedResult.edges);

    toast({
      title: "画布已更新",
      description: "AI生成的智能体配置已应用到画布",
    });
  }, [generatedResult]);

  const reset = useCallback(() => {
    setGeneratedResult(null);
    setProgress(0);
    setCurrentStep("");
  }, []);

  return {
    isGenerating,
    progress,
    currentStep,
    generatedResult,
    generateFromDescription,
    applyToCanvas,
    reset,
  };
}

// Helper function to build workflow nodes from AI config
function buildWorkflowFromConfig(
  config: AIGeneratedConfig,
  description: string,
  generateFullWorkflow: boolean
): {
  nodes: Node[];
  edges: Edge[];
  mcpActions: MCPActionSuggestion[];
  knowledgeBases: KnowledgeBaseSuggestion[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const mcpActions: MCPActionSuggestion[] = config.suggestedMCPActions || [];
  const knowledgeBases: KnowledgeBaseSuggestion[] = config.suggestedKnowledgeBases || [];

  // Position agent lower to accommodate Manus Kernel above
  const agentPosition = { x: 400, y: 350 };
  const manusPosition = getManusPosition(agentPosition);

  // 1. MANDATORY: Add Manus Kernel node first (Kernel-First Architecture)
  const manusNodeId = `manus-kernel-${Date.now()}`;
  nodes.push({
    id: manusNodeId,
    type: "manus",
    position: manusPosition,
    data: {
      id: manusNodeId,
      name: "Manus Planning Core",
      version: MANUS_KERNEL.version,
      files: Object.keys(MANUS_KERNEL.fileTemplates),
      rules: MANUS_KERNEL.rules,
      status: 'active',
    },
    draggable: false, // Cannot be moved
    deletable: false, // Cannot be deleted
  });

  // 2. Add agent central node
  nodes.push({
    id: "agent-central",
    type: "agent",
    position: agentPosition,
    data: {
      name: config.name,
      department: config.department,
      model: "Gemini 2.5 Flash",
      skillCount: 0,
      hasManusKernel: true, // Mark as having Manus Kernel injected
    },
    draggable: false,
  });

  // 3. Add golden lifecycle edge (Manus -> Agent) - the "Thinking Bus"
  edges.push({
    id: `edge-manus-lifecycle`,
    source: manusNodeId,
    sourceHandle: "lifecycle",
    target: "agent-central",
    targetHandle: "lifecycle_hook",
    type: "manusLifecycle", // Special golden edge type
    animated: true,
    data: {
      edgeType: "manus_bus",
      label: "思维主总线",
    },
  });

  if (!generateFullWorkflow) {
    return { nodes, edges, mcpActions, knowledgeBases };
  }

  // Add trigger node
  const triggerId = `trigger-${Date.now()}`;
  nodes.push({
    id: triggerId,
    type: "trigger",
    position: { x: 50, y: 250 },
    data: {
      id: triggerId,
      triggerType: "chat",
      name: "对话触发器",
    },
  });
  edges.push({
    id: `edge-trigger-agent`,
    source: triggerId,
    target: "agent-central",
    animated: true,
  });

  // Analyze description for intent routing
  const needsIntentRouter = analyzeNeedsIntentRouter(description);
  const needsIntervention = analyzeNeedsIntervention(description);
  
  if (needsIntentRouter) {
    const routerId = `router-${Date.now()}`;
    const routes = extractIntentRoutes(description);
    
    nodes.push({
      id: routerId,
      type: "intentRouter",
      position: { x: 650, y: 250 },
      data: {
        id: routerId,
        name: "意图路由器",
        routes: routes,
        defaultRoute: "general",
      },
    });
    edges.push({
      id: `edge-agent-router`,
      source: "agent-central",
      target: routerId,
      animated: true,
    });

    // Add output nodes for each route
    routes.forEach((route, index) => {
      const outputId = `output-${route.id}-${Date.now()}`;
      nodes.push({
        id: outputId,
        type: "output",
        position: { x: 900, y: 100 + index * 120 },
        data: {
          id: outputId,
          name: route.name,
          outputType: "message",
        },
      });
      edges.push({
        id: `edge-router-${route.id}`,
        source: routerId,
        sourceHandle: route.id,
        target: outputId,
        animated: true,
        label: route.name,
      });
    });
  } else {
    // Simple flow: agent -> output
    const outputId = `output-${Date.now()}`;
    nodes.push({
      id: outputId,
      type: "output",
      position: { x: 650, y: 250 },
      data: {
        id: outputId,
        name: "回复输出",
        outputType: "message",
      },
    });
    edges.push({
      id: `edge-agent-output`,
      source: "agent-central",
      target: outputId,
      animated: true,
    });
  }

  // Add intervention node if needed (for high-risk operations)
  if (needsIntervention) {
    const interventionId = `intervention-${Date.now()}`;
    nodes.push({
      id: interventionId,
      type: "intervention",
      position: { x: 750, y: 400 },
      data: {
        id: interventionId,
        name: "用户确认",
        confirmationType: "detailed",
        timeoutSeconds: 30,
        defaultAction: "reject",
        showInputPreview: true,
        riskLevel: "high",
      },
    });
  }

  // Find intervention node if exists
  const interventionNode = nodes.find(n => n.type === "intervention");

  // Add MCP action nodes with proper connections
  mcpActions.forEach((action, index) => {
    const mcpId = `mcp-${action.toolName}-${Date.now()}-${index}`;
    nodes.push({
      id: mcpId,
      type: "mcpAction",
      position: { x: 150 + index * 200, y: 450 },
      data: {
        id: mcpId,
        name: action.toolName,
        serverName: action.serverName,
        serverId: action.serverId,
        description: action.reason,
        riskLevel: action.riskLevel,
        requiresConfirmation: action.riskLevel !== "low",
        inputSchema: {},
        outputMapping: {},
      },
    });
    
    // Connect agent to MCP action
    edges.push({
      id: `edge-agent-mcp-${index}`,
      source: "agent-central",
      target: mcpId,
      animated: true,
    });
    
    // If high-risk action and intervention node exists, connect them
    if (action.riskLevel === "high" && interventionNode) {
      edges.push({
        id: `edge-mcp-intervention-${index}`,
        source: mcpId,
        target: interventionNode.id,
        animated: true,
        label: "需确认",
      });
    }
  });

  // Add knowledge base nodes
  const kbPositions = distributeKnowledgeAroundAgent(knowledgeBases.length, agentPosition, 180);
  knowledgeBases.forEach((kb, index) => {
    const kbId = `knowledge-${index}-${Date.now()}`;
    nodes.push({
      id: kbId,
      type: "knowledge",
      position: kbPositions[index] || { x: 200, y: 100 + index * 100 },
      data: {
        id: kbId,
        name: kb.name,
        description: kb.description,
        documents_count: 0,
        chunks_count: 0,
        retrieval_mode: kb.retrievalMode,
      },
    });
    edges.push({
      id: `edge-kb-${index}`,
      source: kbId,
      target: "agent-central",
      animated: true,
    });
  });

  return { nodes, edges, mcpActions, knowledgeBases };
}

// Analyze if description needs intent routing
function analyzeNeedsIntentRouter(description: string): boolean {
  const routingKeywords = [
    "不同", "多种", "分别", "或者", "要么",
    "查询", "处理", "回答", "创建",
    "意图", "路由", "分发", "区分",
    "1.", "2.", "3.",
    "第一", "第二", "第三",
  ];
  return routingKeywords.some(kw => description.includes(kw));
}

// Analyze if description needs user intervention
function analyzeNeedsIntervention(description: string): boolean {
  const interventionKeywords = [
    "确认", "人工", "审核", "批准",
    "删除", "退款", "支付", "转账",
    "高风险", "敏感", "重要",
  ];
  return interventionKeywords.some(kw => description.includes(kw));
}

// Extract intent routes from description
function extractIntentRoutes(description: string): Array<{ id: string; name: string; keywords: string[] }> {
  const routes: Array<{ id: string; name: string; keywords: string[] }> = [];
  
  // Common patterns
  if (description.includes("FAQ") || description.includes("常见问题") || description.includes("回答")) {
    routes.push({ id: "faq", name: "FAQ回答", keywords: ["问题", "咨询", "怎么"] });
  }
  if (description.includes("订单") || description.includes("查询")) {
    routes.push({ id: "query", name: "订单查询", keywords: ["订单", "查询", "状态"] });
  }
  if (description.includes("退款") || description.includes("处理")) {
    routes.push({ id: "refund", name: "退款处理", keywords: ["退款", "退货", "申请"] });
  }
  if (description.includes("文章") || description.includes("内容")) {
    routes.push({ id: "content", name: "内容生成", keywords: ["写", "生成", "创作"] });
  }
  
  // Add default route if we have others
  if (routes.length > 0) {
    routes.push({ id: "general", name: "通用处理", keywords: [] });
  }
  
  return routes.length > 0 ? routes : [
    { id: "general", name: "通用处理", keywords: [] },
  ];
}

// Generate manifest from config with Manus Kernel injection
function generateManifest(config: AIGeneratedConfig): Record<string, unknown> {
  // Manus Protocol role prefix - injected into all agents
  const MANUS_ROLE_PREFIX = `You work like Manus. You MUST maintain your state in \`task_plan.md\`, \`findings.md\`, and \`progress.md\`. Never rely solely on context window. Read \`SKILL.md\` for strict protocols.

`;

  return {
    version: "1.0.0",
    metadata: {
      name: config.name,
      department: config.department,
      description: `${config.name} - Manus-powered AI Agent`,
      created_at: new Date().toISOString(),
    },
    // Manus Kernel configuration - mandatory for all agents
    kernel: {
      type: 'manus-planning',
      version: MANUS_KERNEL.version,
      config: {
        autoInitialize: true,
        twoActionRule: true,
        threeStrikeProtocol: true,
        fiveQuestionReboot: true,
      },
    },
    runtime: {
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
    },
    // Inject Manus role prefix into system prompt
    system_prompt: MANUS_ROLE_PREFIX + config.systemPrompt,
    personality: config.personalityConfig,
  };
}
