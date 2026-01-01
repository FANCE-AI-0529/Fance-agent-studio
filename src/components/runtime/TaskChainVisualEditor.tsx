import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
  Panel,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Plus,
  Save,
  Play,
  Trash2,
  ArrowRight,
  Layers,
  GitBranch,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Upload,
  Bot,
  Link2,
} from "lucide-react";
import { toast } from "sonner";

import TaskStepNode, { type TaskStepNodeData } from "./TaskStepNode";
import { useCreateChain, useExecuteChain, type TaskChain, type ChainStep } from "@/hooks/useTaskChains";
import { useDeployedAgents } from "@/hooks/useAgents";
import { taskTypeLabels } from "@/hooks/useTaskDelegation";

const nodeTypes = {
  taskStep: TaskStepNode,
};

interface TaskChainVisualEditorProps {
  chain?: TaskChain | null;
  onSave?: (chain: TaskChain) => void;
  onClose?: () => void;
  sourceAgentId?: string;
}

interface StepFormData {
  name: string;
  description: string;
  taskType: string;
  targetAgentId: string;
  inputMapping: Record<string, string>;
  outputKey: string;
  parallelGroup: number;
}

const defaultStepForm: StepFormData = {
  name: "",
  description: "",
  taskType: "general",
  targetAgentId: "",
  inputMapping: {},
  outputKey: "",
  parallelGroup: 0,
};

function TaskChainVisualEditorInner({
  chain,
  onSave,
  onClose,
  sourceAgentId,
}: TaskChainVisualEditorProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, zoomIn, zoomOut, getNodes } = useReactFlow();

  // Chain metadata
  const [chainName, setChainName] = useState(chain?.name || "");
  const [chainDescription, setChainDescription] = useState(chain?.description || "");
  const [executionMode, setExecutionMode] = useState<"sequential" | "parallel" | "mixed">(
    chain?.execution_mode || "sequential"
  );

  // Nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // UI state
  const [showStepEditor, setShowStepEditor] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [stepForm, setStepForm] = useState<StepFormData>(defaultStepForm);
  const [inputMappingKey, setInputMappingKey] = useState("");
  const [inputMappingValue, setInputMappingValue] = useState("");

  const { data: agents = [] } = useDeployedAgents();
  const createChain = useCreateChain();
  const executeChain = useExecuteChain();

  // Initialize nodes from existing chain
  useEffect(() => {
    if (chain?.steps) {
      const initialNodes: Node[] = chain.steps.map((step, index) => ({
        id: step.id,
        type: "taskStep",
        position: { x: 150, y: index * 180 },
        data: {
          id: step.id,
          name: step.name,
          description: step.description,
          taskType: step.task_type,
          targetAgentId: step.target_agent_id,
          targetAgentName: step.target_agent?.name,
          inputMapping: step.input_mapping as Record<string, string>,
          outputKey: step.output_key,
          parallelGroup: step.parallel_group,
          stepOrder: step.step_order,
          status: step.status as TaskStepNodeData["status"],
          onEdit: handleEditNode,
          onDelete: handleDeleteNode,
        } satisfies TaskStepNodeData,
      }));

      // Create edges based on step_order
      const initialEdges: Edge[] = [];
      for (let i = 0; i < chain.steps.length - 1; i++) {
        initialEdges.push({
          id: `edge-${chain.steps[i].id}-${chain.steps[i + 1].id}`,
          source: chain.steps[i].id,
          target: chain.steps[i + 1].id,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: 2 },
          animated: chain.status === "running",
        });
      }

      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [chain]);

  const handleEditNode = useCallback((nodeId: string) => {
    const node = getNodes().find((n) => n.id === nodeId);
    if (node) {
      const data = node.data as unknown as TaskStepNodeData;
      setStepForm({
        name: data.name,
        description: data.description || "",
        taskType: data.taskType,
        targetAgentId: data.targetAgentId || "",
        inputMapping: data.inputMapping || {},
        outputKey: data.outputKey || "",
        parallelGroup: data.parallelGroup,
      });
      setEditingNodeId(nodeId);
      setShowStepEditor(true);
    }
  }, [getNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, []);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2 },
          },
          eds
        )
      );
    },
    []
  );

  const addNewStep = useCallback(() => {
    const nodeCount = nodes.length;
    const newNodeId = `step-${Date.now()}`;
    
    const newNode: Node = {
      id: newNodeId,
      type: "taskStep",
      position: { x: 150, y: nodeCount * 180 + 50 },
      data: {
        id: newNodeId,
        name: `步骤 ${nodeCount + 1}`,
        description: "",
        taskType: "general",
        targetAgentId: sourceAgentId,
        targetAgentName: agents.find((a) => a.id === sourceAgentId)?.name,
        inputMapping: {},
        outputKey: `step_${nodeCount}`,
        parallelGroup: executionMode === "parallel" ? 0 : nodeCount,
        stepOrder: nodeCount,
        status: "pending" as const,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode,
      } satisfies TaskStepNodeData,
    };

    setNodes((nds) => [...nds, newNode]);

    // Auto-connect to previous node if sequential
    if (executionMode === "sequential" && nodeCount > 0) {
      const lastNode = nodes[nodeCount - 1];
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-${lastNode.id}-${newNodeId}`,
          source: lastNode.id,
          target: newNodeId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: 2 },
        },
      ]);
    }
  }, [nodes, executionMode, sourceAgentId, agents, handleEditNode, handleDeleteNode]);

  const saveStepChanges = useCallback(() => {
    if (!editingNodeId) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === editingNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              name: stepForm.name,
              description: stepForm.description,
              taskType: stepForm.taskType,
              targetAgentId: stepForm.targetAgentId,
              targetAgentName: agents.find((a) => a.id === stepForm.targetAgentId)?.name,
              inputMapping: stepForm.inputMapping,
              outputKey: stepForm.outputKey,
              parallelGroup: stepForm.parallelGroup,
            },
          };
        }
        return node;
      })
    );

    setShowStepEditor(false);
    setEditingNodeId(null);
    setStepForm(defaultStepForm);
  }, [editingNodeId, stepForm, agents]);

  const addInputMapping = useCallback(() => {
    if (!inputMappingKey || !inputMappingValue) return;
    setStepForm((prev) => ({
      ...prev,
      inputMapping: {
        ...prev.inputMapping,
        [inputMappingKey]: inputMappingValue,
      },
    }));
    setInputMappingKey("");
    setInputMappingValue("");
  }, [inputMappingKey, inputMappingValue]);

  const removeInputMapping = useCallback((key: string) => {
    setStepForm((prev) => {
      const newMapping = { ...prev.inputMapping };
      delete newMapping[key];
      return { ...prev, inputMapping: newMapping };
    });
  }, []);

  const handleSaveChain = async () => {
    if (!chainName) {
      toast.error("请输入任务链名称");
      return;
    }
    if (nodes.length === 0) {
      toast.error("请添加至少一个步骤");
      return;
    }

    // Build step order from edges
    const orderedNodes = [...nodes];
    
    // Sort by vertical position
    orderedNodes.sort((a, b) => a.position.y - b.position.y);

    const steps = orderedNodes.map((node, index) => {
      const data = node.data as TaskStepNodeData;
      return {
        name: data.name,
        description: data.description,
        taskType: data.taskType,
        targetAgentId: data.targetAgentId,
        inputMapping: data.inputMapping,
        outputKey: data.outputKey || `step_${index}`,
        parallelGroup: data.parallelGroup,
      };
    });

    try {
      await createChain.mutateAsync({
        name: chainName,
        description: chainDescription,
        executionMode,
        sourceAgentId,
        steps,
      });
      onClose?.();
    } catch (error) {
      console.error("Failed to save chain:", error);
    }
  };

  const handleExecuteChain = async () => {
    if (chain?.id) {
      await executeChain.mutateAsync({ chainId: chain.id });
    }
  };

  const exportChain = useCallback(() => {
    const chainData = {
      name: chainName,
      description: chainDescription,
      executionMode,
      nodes: nodes.map((n) => ({
        id: n.id,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
    };

    const blob = new Blob([JSON.stringify(chainData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chainName || "task-chain"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("任务链已导出");
  }, [chainName, chainDescription, executionMode, nodes, edges]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <Input
              value={chainName}
              onChange={(e) => setChainName(e.target.value)}
              placeholder="任务链名称"
              className="w-48 font-medium"
            />
          </div>
          <Select value={executionMode} onValueChange={(v: any) => setExecutionMode(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sequential">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  串行
                </div>
              </SelectItem>
              <SelectItem value="parallel">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  并行
                </div>
              </SelectItem>
              <SelectItem value="mixed">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  混合
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">{nodes.length} 步骤</Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addNewStep}>
            <Plus className="h-4 w-4 mr-1" />
            添加步骤
          </Button>
          <Button variant="outline" size="sm" onClick={exportChain}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          {chain?.id && chain.status === "draft" && (
            <Button variant="outline" size="sm" onClick={handleExecuteChain}>
              <Play className="h-4 w-4 mr-1" />
              执行
            </Button>
          )}
          <Button onClick={handleSaveChain} disabled={createChain.isPending}>
            <Save className="h-4 w-4 mr-1" />
            保存
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={reactFlowWrapper} className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          defaultEdgeOptions={{
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
          }}
        >
          <Controls />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as unknown as TaskStepNodeData;
              switch (data.status) {
                case "completed":
                  return "#4CAF50";
                case "in_progress":
                  return "#2196F3";
                case "failed":
                  return "#F44336";
                default:
                  return "#9E9E9E";
              }
            }}
          />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />

          {/* Empty State */}
          {nodes.length === 0 && (
            <Panel position="top-center" className="mt-20">
              <div className="text-center p-8 bg-card/80 backdrop-blur rounded-lg border border-dashed border-border">
                <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">开始构建任务链</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  点击"添加步骤"创建第一个任务节点
                </p>
                <Button onClick={addNewStep}>
                  <Plus className="h-4 w-4 mr-1" />
                  添加第一个步骤
                </Button>
              </div>
            </Panel>
          )}

          {/* Toolbar */}
          <Panel position="bottom-center" className="mb-4">
            <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 shadow-lg">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomIn()}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => zoomOut()}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fitView()}>
                <Maximize className="h-4 w-4" />
              </Button>
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Step Editor Sheet */}
      <Sheet open={showStepEditor} onOpenChange={setShowStepEditor}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>编辑步骤</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] pr-4">
            <div className="space-y-4 mt-4">
              <div>
                <Label>步骤名称</Label>
                <Input
                  value={stepForm.name}
                  onChange={(e) => setStepForm({ ...stepForm, name: e.target.value })}
                  placeholder="例: 收集用户信息"
                />
              </div>

              <div>
                <Label>步骤描述</Label>
                <Textarea
                  value={stepForm.description}
                  onChange={(e) => setStepForm({ ...stepForm, description: e.target.value })}
                  placeholder="详细描述这个步骤需要完成的任务..."
                  rows={3}
                />
              </div>

              <div>
                <Label>任务类型</Label>
                <Select
                  value={stepForm.taskType}
                  onValueChange={(v) => setStepForm({ ...stepForm, taskType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(taskTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>目标 Agent</Label>
                <Select
                  value={stepForm.targetAgentId}
                  onValueChange={(v) => setStepForm({ ...stepForm, targetAgentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择执行此步骤的 Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          {agent.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>输出键名</Label>
                <Input
                  value={stepForm.outputKey}
                  onChange={(e) => setStepForm({ ...stepForm, outputKey: e.target.value })}
                  placeholder="例: user_info"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  后续步骤可通过此键名引用本步骤的输出
                </p>
              </div>

              {executionMode === "mixed" && (
                <div>
                  <Label>并行分组</Label>
                  <Input
                    type="number"
                    min={0}
                    value={stepForm.parallelGroup}
                    onChange={(e) =>
                      setStepForm({ ...stepForm, parallelGroup: parseInt(e.target.value) || 0 })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    相同组号的步骤将并行执行
                  </p>
                </div>
              )}

              <div>
                <Label>输入映射</Label>
                <div className="space-y-2 mt-2">
                  {Object.entries(stepForm.inputMapping).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <span className="font-mono text-sm flex-1">{key}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-mono text-sm flex-1">{value}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeInputMapping(key)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={inputMappingKey}
                      onChange={(e) => setInputMappingKey(e.target.value)}
                      placeholder="参数名"
                      className="font-mono text-sm"
                    />
                    <Input
                      value={inputMappingValue}
                      onChange={(e) => setInputMappingValue(e.target.value)}
                      placeholder="来源键名"
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={addInputMapping}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={saveStepChanges}>
                保存修改
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function TaskChainVisualEditor(props: TaskChainVisualEditorProps) {
  return (
    <ReactFlowProvider>
      <TaskChainVisualEditorInner {...props} />
    </ReactFlowProvider>
  );
}

export default TaskChainVisualEditor;
