import { useState, useCallback, useRef, DragEvent } from "react";
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

import { Brain } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

import SkillNode, { SkillNodeData } from "@/components/builder/SkillNode";
import AgentNode, { AgentNodeData } from "@/components/builder/AgentNode";
import { SkillMarketplace, Skill, mockSkills } from "@/components/builder/SkillMarketplace";
import { AgentConfigPanel } from "@/components/builder/AgentConfigPanel";
import { ManifestPreview } from "@/components/builder/ManifestPreview";

// Custom node types
const nodeTypes: NodeTypes = {
  skill: SkillNode,
  agent: AgentNode,
};

// Initial agent node in center
const initialAgentNode: Node<AgentNodeData> = {
  id: "agent-central",
  type: "agent",
  position: { x: 400, y: 200 },
  data: {
    name: "",
    department: "",
    model: "Claude 3.5",
    skillCount: 0,
  },
  draggable: false,
};

const Builder = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([initialAgentNode]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [showManifest, setShowManifest] = useState(false);
  const [draggingSkill, setDraggingSkill] = useState<Skill | null>(null);

  const [agentConfig, setAgentConfig] = useState({
    name: "",
    department: "",
    model: "claude-3.5" as "claude-3.5" | "gpt-4",
  });

  // Get added skills from nodes
  const addedSkills = nodes
    .filter((n) => n.type === "skill")
    .map((n) => {
      const data = n.data as SkillNodeData;
      return mockSkills.find((s) => s.id === data.id);
    })
    .filter(Boolean) as Skill[];

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

  // Effect to update agent node
  useState(() => {
    updateAgentNode();
  });

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

  // Handle deploy
  const handleDeploy = () => {
    toast({
      title: "部署成功",
      description: `${agentConfig.name} 已部署到城市网络`,
    });
  };

  // Can deploy check
  const canDeploy = agentConfig.name.trim() !== "" && addedSkills.length > 0;

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