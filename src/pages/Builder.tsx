import { useState, useCallback, useRef, DragEvent, useEffect } from "react";
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

import { Brain, Save, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

import SkillNode, { SkillNodeData } from "@/components/builder/SkillNode";
import AgentNode, { AgentNodeData } from "@/components/builder/AgentNode";
import { SkillMarketplace, Skill } from "@/components/builder/SkillMarketplace";
import { AgentConfigPanel } from "@/components/builder/AgentConfigPanel";
import { ManifestPreview } from "@/components/builder/ManifestPreview";
import { useSaveAgentWithSkills, useDeployAgent, useMyAgents } from "@/hooks/useAgents";
import { usePublishedSkills } from "@/hooks/useSkills";

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
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([createAgentNode()]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [showManifest, setShowManifest] = useState(false);
  const [draggingSkill, setDraggingSkill] = useState<Skill | null>(null);
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);

  const [agentConfig, setAgentConfig] = useState({
    name: "",
    department: "",
    model: "claude-3.5" as "claude-3.5" | "gpt-4",
  });

  const { data: publishedSkills = [] } = usePublishedSkills();
  const { data: myAgents = [] } = useMyAgents();
  const saveAgent = useSaveAgentWithSkills();
  const deployAgent = useDeployAgent();

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

  // Update agent node on config/skills change
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
          (e) =>
            !e.source.includes(skillId) && !e.target.includes(skillId)
        )
      );
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

  // Generate manifest
  const generateManifest = () => {
    return {
      version: "1.0.0",
      metadata: {
        name: agentConfig.name,
        department: agentConfig.department,
        created_at: new Date().toISOString(),
      },
      runtime: {
        model: agentConfig.model,
        provider: agentConfig.model === "claude-3.5" ? "anthropic" : "openai",
      },
      mounts: addedSkills.map((s) => ({ skill_id: s.id, version: s.version })),
      skills: addedSkills.map((s) => ({
        id: s.id,
        name: s.name,
        permissions: s.permissions,
      })),
      mplp: {
        policy: "default",
        require_confirm: ["write", "network", "execute"],
        audit_log: true,
      },
    };
  };

  // Handle save
  const handleSave = async () => {
    if (!agentConfig.name.trim()) {
      toast({ title: "请输入 Agent 名称", variant: "destructive" });
      return;
    }

    const manifest = generateManifest();

    await saveAgent.mutateAsync({
      agent: {
        id: currentAgentId || undefined,
        name: agentConfig.name,
        department: agentConfig.department || null,
        model: agentConfig.model,
      },
      skillIds: addedSkillIds,
      manifest,
    });
  };

  // Handle deploy
  const handleDeploy = async () => {
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
      await deployAgent.mutateAsync(agentId);
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
            {draggingSkill && (
              <Badge className="text-xs bg-cognitive/10 text-cognitive border-0">
                拖拽中: {draggingSkill.name}
              </Badge>
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
      />

      {/* Manifest Preview Modal */}
      <ManifestPreview
        isOpen={showManifest}
        onClose={() => setShowManifest(false)}
        agentName={agentConfig.name}
        department={agentConfig.department}
        model={agentConfig.model}
        skills={addedSkills}
      />
    </div>
  );
};

export default Builder;
