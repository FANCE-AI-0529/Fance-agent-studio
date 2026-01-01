import { useState, useCallback, useRef, DragEvent, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  Controls,
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

import { Brain, Save, Loader2, LogIn, Network } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

import SkillNode, { SkillNodeData } from "@/components/builder/SkillNode";
import AgentNode, { AgentNodeData } from "@/components/builder/AgentNode";
import { SkillMarketplace, Skill } from "@/components/builder/SkillMarketplace";
import { AgentConfigPanel, AgentConfig, SkillConfigOverride, EnvironmentConfig } from "@/components/builder/AgentConfigPanel";
import { ManifestPreview } from "@/components/builder/ManifestPreview";
import { SemanticGraphPanel } from "@/components/builder/SemanticGraphPanel";
import { useSaveAgentWithSkills, useDeployAgent, useAgent } from "@/hooks/useAgents";
import { usePublishedSkills } from "@/hooks/useSkills";
import { useAuth } from "@/contexts/AuthContext";

// Custom node types
const nodeTypes: NodeTypes = {
  skill: SkillNode,
  agent: AgentNode,
};

// Initial agent node in center
const createAgentNode = (name = "", department = "", model = "Claude 3.5", skillCount = 0): Node<AgentNodeData> => ({
  id: "agent-central",
  type: "agent",
  position: { x: 400, y: 200 },
  data: { name, department, model, skillCount },
  draggable: false,
});

const Builder = () => {
  const { id: agentIdParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([createAgentNode()]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [showManifest, setShowManifest] = useState(false);
  const [draggingSkill, setDraggingSkill] = useState<Skill | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(agentIdParam || null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [skillOverrides, setSkillOverrides] = useState<Record<string, SkillConfigOverride>>({});

  const [agentConfig, setAgentConfig] = useState<AgentConfig>({
    name: "",
    department: "",
    model: "claude-3.5",
    systemPrompt: "",
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
        environments: manifest?.environments || undefined,
      });
      setCurrentAgentId(existingAgent.id);

      // Load skills as nodes
      if (existingAgent.skills && existingAgent.skills.length > 0) {
        const skillNodes: Node<SkillNodeData>[] = existingAgent.skills.map((skill, index) => ({
          id: `skill-${skill.id}-${Date.now()}-${index}`,
          type: "skill",
          position: { x: 100 + (index % 2) * 200, y: 100 + Math.floor(index / 2) * 150 },
          data: {
            id: skill.id,
            name: skill.name,
            category: skill.category,
            description: skill.description || "",
            permissions: skill.permissions || [],
          },
        }));

        const skillEdges: Edge[] = skillNodes.map((node) => ({
          id: `edge-${node.id}`,
          source: node.id,
          target: "agent-central",
          animated: true,
          style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
        }));

        setNodes([createAgentNode(existingAgent.name, existingAgent.department || "", existingAgent.model, existingAgent.skills.length), ...skillNodes]);
        setEdges(skillEdges);
      }
    }
  }, [existingAgent, setNodes, setEdges]);

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

  // Get selected skill if a skill node is selected
  const selectedSkill = selectedNodeId
    ? addedSkills.find((s) => nodes.find((n) => n.id === selectedNodeId && (n.data as SkillNodeData).id === s.id))
    : null;

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

  // Update agent node on config/skills change
  useEffect(() => {
    updateAgentNode();
  }, [updateAgentNode]);

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === "skill") {
      setSelectedNodeId(node.id);
    } else {
      setSelectedNodeId(null);
    }
  }, []);

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

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
          (e) =>
            !e.source.includes(skillId) && !e.target.includes(skillId)
        )
      );
      setSelectedNodeId(null);
      toast({
        title: "技能已移除",
        description: "已从 Agent 配置中移除该技能",
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

      // Check if already added
      if (addedSkillIds.includes(skill.id)) {
        toast({
          title: "技能已存在",
          description: "该技能已添加到 Agent 配置中",
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

      // Auto-connect to agent
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
        description: `${skill.name} 已成功装载到 Agent`,
      });

      setDraggingSkill(null);
    },
    [reactFlowInstance, addedSkillIds, setNodes, setEdges, handleRemoveSkill]
  );

  // Generate manifest - 符合开发逻辑文档 6.4 AgentManifest 结构
  const generateManifest = () => {
    return {
      version: "1.0.0",
      metadata: {
        name: agentConfig.name || "未命名 Agent",
        department: agentConfig.department || "未指定",
        description: `${agentConfig.name} - ${agentConfig.department || "通用"} 智能体`,
        created_at: existingAgent?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      runtime: {
        provider: agentConfig.model === "claude-3.5" ? "anthropic" : "openai",
        model: agentConfig.model === "claude-3.5" ? "claude-3-5-sonnet-20241022" : "gpt-4-turbo",
        model_config: {
          temperature: 0.7,
          max_tokens: 4096,
        },
      },
      system_prompt: agentConfig.systemPrompt || "",
      // 环境变量配置 - 持久化存储 (转换为 JSON 兼容格式)
      environments: agentConfig.environments ? {
        development: agentConfig.environments.development.map(v => ({ key: v.key, value: v.value, isSecret: v.isSecret })),
        staging: agentConfig.environments.staging.map(v => ({ key: v.key, value: v.value, isSecret: v.isSecret })),
        production: agentConfig.environments.production.map(v => ({ key: v.key, value: v.value, isSecret: v.isSecret })),
      } : {
        development: [],
        staging: [],
        production: [],
      },
      skills: {
        mounts: addedSkills.map((s) => {
          const override = skillOverrides[s.id];
          return {
            skill_id: s.id,
            version: s.version,
            enabled: override?.enabled ?? true,
            priority: override?.priority ?? 1,
            config_overrides: override?.parameters ?? {},
          };
        }),
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
        description: "保存 Agent 需要登录账号", 
        variant: "destructive" 
      });
      navigate("/auth");
      return;
    }

    if (!agentConfig.name.trim()) {
      toast({ title: "请输入 Agent 名称", variant: "destructive" });
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
      // Update URL without full navigation
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
        description: "部署 Agent 需要登录账号", 
        variant: "destructive" 
      });
      navigate("/auth");
      return;
    }

    // First save
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
      
      // Navigate to Runtime after successful deploy
      toast({ 
        title: "部署成功", 
        description: "正在跳转到运行环境..." 
      });
      setTimeout(() => {
        navigate("/runtime");
      }, 1000);
    }
  };

  // Can deploy check
  const canDeploy = agentConfig.name.trim() !== "" && addedSkills.length > 0;
  const isSaving = saveAgent.isPending || deployAgent.isPending;

  return (
    <div className="h-full flex">
      {/* Left - Skill Marketplace */}
      <SkillMarketplace
        onDragStart={setDraggingSkill}
        addedSkillIds={addedSkillIds}
      />

      {/* Center - React Flow Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="panel-header border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-cognitive" />
              <span className="font-semibold">Agent 构建画布</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              已装载 {addedSkills.length} 个技能
            </Badge>
            {currentAgentId && (
              <Badge variant="secondary" className="text-xs">
                已保存
              </Badge>
            )}
            {draggingSkill && (
              <Badge className="text-xs bg-cognitive/10 text-cognitive border-0">
                拖拽中: {draggingSkill.name}
              </Badge>
            )}
            <SemanticGraphPanel
              agentId={currentAgentId || undefined}
              agentName={agentConfig.name || undefined}
            />
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
          </div>
        </div>

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
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.5 }}
            defaultEdgeOptions={{
              animated: true,
              style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
            }}
            proOptions={{ hideAttribution: true }}
            className="bg-background"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="hsl(var(--border))"
            />
            <Controls
              className="!bg-card !border-border !shadow-lg [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground [&>button:hover]:!bg-secondary"
            />
            
            {/* Empty state overlay when no skills added */}
            {addedSkills.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="text-center">
                  <div className="text-muted-foreground mb-4">
                    <svg width="200" height="140" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto opacity-50">
                      <rect x="30" y="20" width="140" height="100" rx="8" stroke="currentColor" strokeWidth="2" strokeDasharray="8 4" fill="none" />
                      <circle cx="100" cy="70" r="25" fill="hsl(var(--cognitive) / 0.1)" stroke="hsl(var(--cognitive) / 0.3)" strokeWidth="2" strokeDasharray="4 4" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">从左侧拖拽技能到画布</p>
                </div>
              </div>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* Right - Config Panel */}
      <AgentConfigPanel
        config={agentConfig}
        onConfigChange={setAgentConfig}
        skills={addedSkills}
        onRemoveSkill={handleRemoveSkill}
        onDeploy={handleDeploy}
        onShowManifest={() => setShowManifest(true)}
        canDeploy={canDeploy}
        selectedSkill={selectedSkill || null}
        skillOverrides={skillOverrides}
        onSkillOverrideChange={(skillId, override) => {
          setSkillOverrides((prev) => ({ ...prev, [skillId]: override }));
        }}
      />

      {/* Manifest Preview Modal */}
      <ManifestPreview
        isOpen={showManifest}
        onClose={() => setShowManifest(false)}
        manifest={showManifest ? generateManifest() : null}
      />
    </div>
  );
};

export default Builder;
