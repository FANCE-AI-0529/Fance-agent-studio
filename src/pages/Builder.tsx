import { useState, useCallback, useRef, DragEvent, useEffect } from "react";
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
  NodeTypes,
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import SkillNode, { SkillNodeData } from "@/components/builder/SkillNode";
import AgentNode, { AgentNodeData } from "@/components/builder/AgentNode";
import { SkillMarketplace, Skill } from "@/components/builder/SkillMarketplace";
import { SimplifiedConfigPanel, SimpleAgentConfig } from "@/components/builder/SimplifiedConfigPanel";
import { ManifestPreview } from "@/components/builder/ManifestPreview";
import { BuilderWizard } from "@/components/builder/BuilderWizard";
import { ConversationalCreator } from "@/components/builder/ConversationalCreator";
import { AgentApiPanel } from "@/components/builder/AgentApiPanel";
import { WebhookPanel } from "@/components/builder/WebhookPanel";
import { ApiAlertPanel } from "@/components/builder/ApiAlertPanel";
import { LLMConfigPanel } from "@/components/builder/LLMConfigPanel";
import { ApiStatsDashboard } from "@/components/builder/ApiStatsDashboard";
import { useSaveAgentWithSkills, useDeployAgent, useAgent } from "@/hooks/useAgents";
import { usePublishedSkills } from "@/hooks/useSkills";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { findTemplateById } from "@/data/agentTemplates";

// Custom node types
const nodeTypes: NodeTypes = {
  skill: SkillNode,
  agent: AgentNode,
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
  const { id: agentIdParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [showApiPanel, setShowApiPanel] = useState(false);
  const [showWebhookPanel, setShowWebhookPanel] = useState(false);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  const [showLLMConfig, setShowLLMConfig] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(false);
  const [templateApplied, setTemplateApplied] = useState(false);

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
    model: "claude-3.5",
    systemPrompt: "",
    avatar: { iconId: "bot", colorId: "primary" },
  });

  const { data: publishedSkills = [] } = usePublishedSkills();
  const { data: existingAgent } = useAgent(agentIdParam || null);
  const saveAgent = useSaveAgentWithSkills();
  const deployAgent = useDeployAgent();

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
    };
    return mapping[category] || [];
  }

  // Get added skills from nodes
  const addedSkills = nodes
    .filter((n) => n.type === "skill")
    .map((n) => {
      const data = n.data as SkillNodeData;
      return publishedSkills.find((s) => s.id === data.id);
    })
    .filter(Boolean)
    .map((s) => ({
      id: s!.id,
      name: s!.name,
      category: s!.category,
      description: s!.description || "",
      permissions: s!.permissions || [],
      version: s!.version,
      inputs: (s!.inputs as Skill["inputs"]) || [],
      outputs: (s!.outputs as Skill["outputs"]) || [],
    })) as Skill[];

  const addedSkillIds = addedSkills.map((s) => s.id);

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

  // Handle drop
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const skillData = event.dataTransfer.getData("application/json");
      if (!skillData) return;

      const skill: Skill = JSON.parse(skillData);

      if (addedSkillIds.includes(skill.id)) {
        toast({
          title: "技能已存在",
          description: "该技能已添加到智能体配置中",
          variant: "destructive",
        });
        return;
      }

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

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
    [reactFlowInstance, addedSkillIds, setNodes, setEdges, handleRemoveSkill]
  );

  // Generate manifest
  const generateManifest = () => {
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
      mplp: {
        policy: "default",
        context: {
          role: agentConfig.systemPrompt ? "custom" : "assistant",
          department: agentConfig.department || "general",
        },
        require_confirm: ["write", "delete", "network", "execute"],
        audit_log: true,
        trace_enabled: true,
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

    const manifest = generateManifest();

    const agentId = await saveAgent.mutateAsync({
      agent: {
        id: currentAgentId || undefined,
        name: agentConfig.name,
        department: agentConfig.department || null,
        model: agentConfig.model,
      },
      skillIds: addedSkillIds,
      manifest,
    });

    if (agentId) {
      setCurrentAgentId(agentId);
      if (!agentIdParam) {
        navigate(`/builder/${agentId}`, { replace: true });
      }
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

    const manifest = generateManifest();

    const agentId = await saveAgent.mutateAsync({
      agent: {
        id: currentAgentId || undefined,
        name: agentConfig.name,
        department: agentConfig.department || null,
        model: agentConfig.model,
      },
      skillIds: addedSkillIds,
      manifest,
    });

    if (agentId) {
      setCurrentAgentId(agentId);
      if (!agentIdParam) {
        navigate(`/builder/${agentId}`, { replace: true });
      }
      await deployAgent.mutateAsync(agentId);

      toast({
        title: "部署成功",
        description: "正在跳转到运行环境...",
      });
      setTimeout(() => {
        navigate("/runtime");
      }, 1000);
    }
  };

  // Handle wizard complete
  const handleWizardComplete = (config: {
    name: string;
    department: string;
    systemPrompt: string;
    selectedSkillIds: string[];
  }) => {
    setAgentConfig({
      name: config.name,
      department: config.department,
      model: "claude-3.5",
      systemPrompt: config.systemPrompt,
      avatar: { iconId: "bot", colorId: "primary" },
    });

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
    toast({
      title: "配置完成",
      description: "你可以继续在画布中调整智能体配置",
    });
  };

  const canDeploy = agentConfig.name.trim() !== "" && addedSkills.length > 0;
  const isSaving = saveAgent.isPending || deployAgent.isPending;

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
      <div className="h-full flex overflow-hidden bg-background">
        {/* Left Panel - Skill Marketplace */}
        <div
          className={cn(
            "transition-all duration-300 ease-in-out flex-shrink-0",
            leftPanelCollapsed ? "w-0" : "w-72"
          )}
        >
          {!leftPanelCollapsed && (
            <SkillMarketplace
              onDragStart={setDraggingSkill}
              addedSkillIds={addedSkillIds}
            />
          )}
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Toolbar */}
          <div className="h-12 px-3 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
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
              {draggingSkill && (
                <Badge className="text-xs bg-primary/10 text-primary border-0 animate-pulse">
                  拖拽中: {draggingSkill.name}
                </Badge>
              )}

              <Badge variant="outline" className="text-xs">
                {addedSkills.length} 个技能
              </Badge>

              <div className="h-5 w-px bg-border" />

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

          {/* Canvas Area */}
          <div
            ref={reactFlowWrapper}
            className="flex-1"
            onDragOver={onDragOver}
            onDrop={onDrop}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
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

              {/* Empty state overlay */}
              {addedSkills.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  <div className="text-center max-w-md mx-auto px-8">
                    <div className="relative mb-6">
                      <div className="w-24 h-24 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30">
                        <Sparkles className="h-10 w-10 text-primary/50" />
                      </div>
                      <div className="absolute -top-2 -right-8 animate-bounce">
                        <div className="bg-card px-3 py-1.5 rounded-full border shadow-lg text-xs flex items-center gap-1.5">
                          <ChevronLeft className="h-3 w-3" />
                          拖拽技能到这里
                        </div>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      开始构建你的智能体
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      从左侧技能市场拖拽技能到画布，或使用向导模式快速开始
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 pointer-events-auto"
                      onClick={() => setShowWizard(true)}
                    >
                      <Wand2 className="mr-2 h-4 w-4" />
                      使用向导
                    </Button>
                  </div>
                </div>
              )}
            </ReactFlow>
          </div>
        </div>

        {/* Right Panel - Config */}
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
        />

        {/* Wizard Modal */}
        <BuilderWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
          availableSkills={availableSkillsForWizard}
        />

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
      </div>
    </TooltipProvider>
  );
};

export default Builder;
