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
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
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
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
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
  Repeat,
  Bug,
  CircleDot,
  XCircle,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";

import TaskStepNode, { type TaskStepNodeData } from "./TaskStepNode";
import ConditionalNode, { type ConditionalNodeData, type ConditionRule } from "./ConditionalNode";
import LoopNode, { type LoopNodeData } from "./LoopNode";
import BreakNode, { type BreakNodeData } from "./BreakNode";
import ContinueNode, { type ContinueNodeData } from "./ContinueNode";
import DebugControlPanel from "./DebugControlPanel";
import { useTaskChainDebug } from "@/hooks/useTaskChainDebug";
import { useCreateChain, useExecuteChain, type TaskChain, type ChainStep } from "@/hooks/useTaskChains";
import { useDeployedAgents } from "@/hooks/useAgents";
import { taskTypeLabels } from "@/hooks/useTaskDelegation";
import { cn } from "@/lib/utils";

// Custom animated edge component
function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isAnimated = data?.animated === true;
  const isCompleted = data?.completed === true;

  return (
    <>
      {/* Background path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          ...style,
          stroke: isCompleted ? "hsl(var(--primary))" : isAnimated ? "#3b82f6" : "hsl(var(--border))",
          strokeWidth: isAnimated ? 3 : 2,
          transition: "stroke 0.3s, stroke-width 0.3s",
        }}
        markerEnd={markerEnd}
      />
      {/* Animated flow particles */}
      {isAnimated && (
        <>
          <circle r="4" fill="#3b82f6" filter="url(#glow)">
            <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} />
          </circle>
          <circle r="4" fill="#3b82f6" filter="url(#glow)">
            <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} begin="0.5s" />
          </circle>
          <circle r="4" fill="#3b82f6" filter="url(#glow)">
            <animateMotion dur="1.5s" repeatCount="indefinite" path={edgePath} begin="1s" />
          </circle>
        </>
      )}
      {/* Completed flow indicator */}
      {isCompleted && !isAnimated && (
        <circle r="3" fill="hsl(var(--primary))" opacity="0.7">
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}

const nodeTypes = {
  taskStep: TaskStepNode,
  conditional: ConditionalNode,
  loop: LoopNode,
  break: BreakNode,
  continue: ContinueNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
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
  const [showConditionEditor, setShowConditionEditor] = useState(false);
  const [showLoopEditor, setShowLoopEditor] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodeType, setEditingNodeType] = useState<"step" | "conditional" | "loop">("step");
  const [stepForm, setStepForm] = useState<StepFormData>(defaultStepForm);
  const [conditionForm, setConditionForm] = useState<{
    name: string;
    description: string;
    conditions: ConditionRule[];
    defaultHandle: string;
  }>({
    name: "",
    description: "",
    conditions: [],
    defaultHandle: "default",
  });
  const [loopForm, setLoopForm] = useState<{
    name: string;
    description: string;
    sourceKey: string;
    itemKey: string;
    indexKey: string;
    maxIterations: number;
    variablePrefix: string;
    nestingLevel: number;
    collectResults: boolean;
    resultsKey: string;
  }>({
    name: "",
    description: "",
    sourceKey: "",
    itemKey: "item",
    indexKey: "index",
    maxIterations: 100,
    variablePrefix: "",
    nestingLevel: 0,
    collectResults: false,
    resultsKey: "",
  });
  const [inputMappingKey, setInputMappingKey] = useState("");
  const [inputMappingValue, setInputMappingValue] = useState("");

  const { data: agents = [] } = useDeployedAgents();
  const createChain = useCreateChain();
  const executeChain = useExecuteChain();

  // Debug hook
  const {
    debugState,
    startDebug,
    pauseDebug,
    resumeDebug,
    stopDebug,
    stepOver,
    stepInto,
    toggleBreakpoint,
    clearBreakpoints,
  } = useTaskChainDebug({
    onNodeHighlight: (nodeId) => {
      setHighlightedNodeId(nodeId);
      // Update node styles for debugging highlight
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          data: {
            ...node.data,
            isDebugging: nodeId === node.id,
          },
        }))
      );
    },
    onBreakpointHit: (nodeId) => {
      // Ensure debug panel is visible when breakpoint is hit
      setShowDebugPanel(true);
    },
  });

  // Handle breakpoint toggle on node
  const handleToggleBreakpoint = useCallback((nodeId: string) => {
    toggleBreakpoint(nodeId);
    // Update node visual to show breakpoint
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          hasBreakpoint: node.id === nodeId 
            ? !debugState.breakpoints.has(nodeId) || !debugState.breakpoints.get(nodeId)?.enabled
            : node.data.hasBreakpoint,
        },
      }))
    );
  }, [toggleBreakpoint, debugState.breakpoints, setNodes]);

  // Start debug execution
  const handleStartDebug = useCallback(() => {
    setShowDebugPanel(true);
    startDebug(nodes);
  }, [startDebug, nodes]);

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

      // Create edges based on step_order with animation data
      const initialEdges: Edge[] = [];
      for (let i = 0; i < chain.steps.length - 1; i++) {
        const sourceStep = chain.steps[i];
        const targetStep = chain.steps[i + 1];
        const isSourceCompleted = sourceStep.status === "completed";
        const isTargetInProgress = targetStep.status === "in_progress";
        
        initialEdges.push({
          id: `edge-${sourceStep.id}-${targetStep.id}`,
          source: sourceStep.id,
          target: targetStep.id,
          type: "animated",
          markerEnd: { type: MarkerType.ArrowClosed, color: isSourceCompleted ? "hsl(var(--primary))" : isTargetInProgress ? "#3b82f6" : "hsl(var(--border))" },
          data: { 
            animated: isTargetInProgress,
            completed: isSourceCompleted,
          },
        });
      }

      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [chain]);

  const handleEditNode = useCallback((nodeId: string) => {
    const node = getNodes().find((n) => n.id === nodeId);
    if (node) {
      if (node.type === "conditional") {
        const data = node.data as unknown as ConditionalNodeData;
        setConditionForm({
          name: data.name,
          description: data.description || "",
          conditions: data.conditions || [],
          defaultHandle: data.defaultHandle || "default",
        });
        setEditingNodeId(nodeId);
        setEditingNodeType("conditional");
        setShowConditionEditor(true);
      } else if (node.type === "loop") {
        const data = node.data as unknown as LoopNodeData;
        setLoopForm({
          name: data.name,
          description: data.description || "",
          sourceKey: data.sourceKey || "",
          itemKey: data.itemKey || "item",
          indexKey: data.indexKey || "index",
          maxIterations: data.maxIterations || 100,
          variablePrefix: data.variablePrefix || "",
          nestingLevel: data.nestingLevel || 0,
          collectResults: data.collectResults || false,
          resultsKey: data.resultsKey || "",
        });
        setEditingNodeId(nodeId);
        setEditingNodeType("loop");
        setShowLoopEditor(true);
      } else {
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
        setEditingNodeType("step");
        setShowStepEditor(true);
      }
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
            type: "animated",
            markerEnd: { type: MarkerType.ArrowClosed },
            data: { animated: false, completed: false },
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
          type: "animated",
          markerEnd: { type: MarkerType.ArrowClosed },
          data: { animated: false, completed: false },
        },
      ]);
    }
  }, [nodes, executionMode, sourceAgentId, agents, handleEditNode, handleDeleteNode]);

  // Add conditional branch node
  const addConditionalNode = useCallback(() => {
    const nodeCount = nodes.length;
    const newNodeId = `condition-${Date.now()}`;
    
    const newNode: Node = {
      id: newNodeId,
      type: "conditional",
      position: { x: 150, y: nodeCount * 180 + 50 },
      data: {
        id: newNodeId,
        name: `条件分支 ${nodes.filter(n => n.type === "conditional").length + 1}`,
        description: "",
        conditions: [
          {
            id: `cond-${Date.now()}`,
            sourceKey: "result",
            operator: "equals",
            value: "success",
            targetHandle: "branch-1",
          },
        ],
        defaultHandle: "default",
        status: "pending" as const,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode,
      } satisfies ConditionalNodeData,
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
          type: "animated",
          markerEnd: { type: MarkerType.ArrowClosed },
          data: { animated: false, completed: false },
        },
      ]);
    }
  }, [nodes, executionMode, handleEditNode, handleDeleteNode]);

  // Add loop node
  const addLoopNode = useCallback(() => {
    const nodeCount = nodes.length;
    const newNodeId = `loop-${Date.now()}`;
    
    const newNode: Node = {
      id: newNodeId,
      type: "loop",
      position: { x: 150, y: nodeCount * 180 + 50 },
      data: {
        id: newNodeId,
        name: `循环 ${nodes.filter(n => n.type === "loop").length + 1}`,
        description: "",
        sourceKey: "",
        itemKey: "item",
        indexKey: "index",
        maxIterations: 100,
        variablePrefix: "",
        nestingLevel: nodes.filter(n => n.type === "loop").length,
        collectResults: false,
        resultsKey: "",
        status: "pending" as const,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode,
      } satisfies LoopNodeData,
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
          type: "animated",
          markerEnd: { type: MarkerType.ArrowClosed },
          data: { animated: false, completed: false },
        },
      ]);
    }
  }, [nodes, executionMode, handleEditNode, handleDeleteNode]);

  // Add break node
  const addBreakNode = useCallback(() => {
    const nodeCount = nodes.length;
    const newNodeId = `break-${Date.now()}`;
    
    const newNode: Node = {
      id: newNodeId,
      type: "break",
      position: { x: 150, y: nodeCount * 180 + 50 },
      data: {
        id: newNodeId,
        name: `Break ${nodes.filter(n => n.type === "break").length + 1}`,
        description: "跳出当前循环",
        condition: "",
        targetLoopId: "",
        breakType: "current" as const,
        status: "pending" as const,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode,
      } satisfies BreakNodeData,
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
          type: "animated",
          markerEnd: { type: MarkerType.ArrowClosed },
          data: { animated: false, completed: false },
        },
      ]);
    }
    
    toast.success("Break 节点已添加", { description: "将在条件满足时中断循环" });
  }, [nodes, executionMode, handleEditNode, handleDeleteNode]);

  // Add continue node
  const addContinueNode = useCallback(() => {
    const nodeCount = nodes.length;
    const newNodeId = `continue-${Date.now()}`;
    
    const newNode: Node = {
      id: newNodeId,
      type: "continue",
      position: { x: 150, y: nodeCount * 180 + 50 },
      data: {
        id: newNodeId,
        name: `Continue ${nodes.filter(n => n.type === "continue").length + 1}`,
        description: "跳到下一次迭代",
        condition: "",
        targetLoopId: "",
        skipCount: 1,
        status: "pending" as const,
        onEdit: handleEditNode,
        onDelete: handleDeleteNode,
      } satisfies ContinueNodeData,
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
          type: "animated",
          markerEnd: { type: MarkerType.ArrowClosed },
          data: { animated: false, completed: false },
        },
      ]);
    }
    
    toast.success("Continue 节点已添加", { description: "将跳过当前迭代继续下一次" });
  }, [nodes, executionMode, handleEditNode, handleDeleteNode]);

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

  // Save condition changes
  const saveConditionChanges = useCallback(() => {
    if (!editingNodeId) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === editingNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              name: conditionForm.name,
              description: conditionForm.description,
              conditions: conditionForm.conditions,
              defaultHandle: conditionForm.defaultHandle,
            },
          };
        }
        return node;
      })
    );

    setShowConditionEditor(false);
    setEditingNodeId(null);
    setConditionForm({
      name: "",
      description: "",
      conditions: [],
      defaultHandle: "default",
    });
  }, [editingNodeId, conditionForm]);

  // Save loop changes
  const saveLoopChanges = useCallback(() => {
    if (!editingNodeId) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === editingNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              name: loopForm.name,
              description: loopForm.description,
              sourceKey: loopForm.sourceKey,
              itemKey: loopForm.itemKey,
              indexKey: loopForm.indexKey,
              maxIterations: loopForm.maxIterations,
              variablePrefix: loopForm.variablePrefix,
              nestingLevel: loopForm.nestingLevel,
              collectResults: loopForm.collectResults,
              resultsKey: loopForm.resultsKey,
            },
          };
        }
        return node;
      })
    );

    setShowLoopEditor(false);
    setEditingNodeId(null);
    setLoopForm({
      name: "",
      description: "",
      sourceKey: "",
      itemKey: "item",
      indexKey: "index",
      maxIterations: 100,
      variablePrefix: "",
      nestingLevel: 0,
      collectResults: false,
      resultsKey: "",
    });
  }, [editingNodeId, loopForm]);

  // Add a new condition rule
  const addConditionRule = useCallback(() => {
    const newCondition: ConditionRule = {
      id: `cond-${Date.now()}`,
      sourceKey: "",
      operator: "equals",
      value: "",
      targetHandle: `branch-${conditionForm.conditions.length + 1}`,
    };
    setConditionForm((prev) => ({
      ...prev,
      conditions: [...prev.conditions, newCondition],
    }));
  }, [conditionForm.conditions.length]);

  // Remove a condition rule
  const removeConditionRule = useCallback((conditionId: string) => {
    setConditionForm((prev) => ({
      ...prev,
      conditions: prev.conditions.filter((c) => c.id !== conditionId),
    }));
  }, []);

  // Update a condition rule
  const updateConditionRule = useCallback((conditionId: string, field: keyof ConditionRule, value: string) => {
    setConditionForm((prev) => ({
      ...prev,
      conditions: prev.conditions.map((c) =>
        c.id === conditionId ? { ...c, [field]: value } : c
      ),
    }));
  }, []);

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

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={addNewStep}>
            <Plus className="h-4 w-4 mr-1" />
            步骤
          </Button>
          <Button variant="outline" size="sm" onClick={addConditionalNode}>
            <GitBranch className="h-4 w-4 mr-1" />
            条件
          </Button>
          <Button variant="outline" size="sm" onClick={addLoopNode}>
            <Repeat className="h-4 w-4 mr-1" />
            循环
          </Button>
          <Button variant="outline" size="sm" onClick={addBreakNode} className="border-red-500/30 text-red-500 hover:bg-red-500/10">
            <XCircle className="h-4 w-4 mr-1" />
            Break
          </Button>
          <Button variant="outline" size="sm" onClick={addContinueNode} className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
            <SkipForward className="h-4 w-4 mr-1" />
            Continue
          </Button>
          <Button variant="outline" size="sm" onClick={exportChain}>
            <Download className="h-4 w-4 mr-1" />
            导出
          </Button>
          <Button 
            variant={showDebugPanel ? "default" : "outline"} 
            size="sm" 
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className={cn(showDebugPanel && "bg-primary")}
          >
            <Bug className="h-4 w-4 mr-1" />
            调试
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

      {/* Canvas with optional debug panel */}
      <div className="flex-1 flex overflow-hidden">
        {showDebugPanel ? (
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={75} minSize={50}>
              <div ref={reactFlowWrapper} className="h-full">
                <ReactFlow
                  nodes={nodes.map((node) => ({
                    ...node,
                    className: cn(
                      highlightedNodeId === node.id && "ring-2 ring-blue-500 ring-offset-2 ring-offset-background",
                      debugState.breakpoints.has(node.id) && debugState.breakpoints.get(node.id)?.enabled && "relative"
                    ),
                  }))}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  onNodeClick={(_, node) => {
                    // Toggle breakpoint with F9 or Ctrl+Click
                  }}
                  onNodeContextMenu={(e, node) => {
                    e.preventDefault();
                    handleToggleBreakpoint(node.id);
                  }}
                  fitView
                  snapToGrid
                  snapGrid={[15, 15]}
                  defaultEdgeOptions={{
                    type: "animated",
                    markerEnd: { type: MarkerType.ArrowClosed },
                  }}
                >
                  {/* SVG Defs for glow effect */}
                  <svg style={{ position: "absolute", width: 0, height: 0 }}>
                    <defs>
                      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                  </svg>
                  
                  <Controls />
                  <MiniMap
                    nodeColor={(node) => {
                      // Highlight current debug step
                      if (highlightedNodeId === node.id) return "#3b82f6";
                      // Show breakpoint nodes
                      if (debugState.breakpoints.has(node.id) && debugState.breakpoints.get(node.id)?.enabled) {
                        return "#ef4444";
                      }
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

                  {/* Debug hint */}
                  <Panel position="top-left" className="ml-2 mt-2">
                    <div className="text-xs text-muted-foreground bg-card/80 backdrop-blur px-2 py-1 rounded border border-border">
                      <CircleDot className="h-3 w-3 inline-block mr-1 text-red-500" />
                      右键点击节点添加断点
                    </div>
                  </Panel>
                </ReactFlow>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
              <DebugControlPanel
                debugState={debugState}
                onStartDebug={handleStartDebug}
                onPauseDebug={pauseDebug}
                onResumeDebug={resumeDebug}
                onStopDebug={stopDebug}
                onStepOver={stepOver}
                onStepInto={stepInto}
                onToggleBreakpoint={handleToggleBreakpoint}
                onClearBreakpoints={clearBreakpoints}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div ref={reactFlowWrapper} className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              snapToGrid
              snapGrid={[15, 15]}
              defaultEdgeOptions={{
                type: "animated",
                markerEnd: { type: MarkerType.ArrowClosed },
              }}
            >
              {/* SVG Defs for glow effect */}
              <svg style={{ position: "absolute", width: 0, height: 0 }}>
                <defs>
                  <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
              </svg>
              
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
        )}
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

      {/* Condition Editor Sheet */}
      <Sheet open={showConditionEditor} onOpenChange={setShowConditionEditor}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-amber-500" />
              编辑条件分支
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] pr-4">
            <div className="space-y-4 mt-4">
              <div>
                <Label>分支名称</Label>
                <Input
                  value={conditionForm.name}
                  onChange={(e) => setConditionForm({ ...conditionForm, name: e.target.value })}
                  placeholder="例: 结果判断"
                />
              </div>

              <div>
                <Label>分支描述</Label>
                <Textarea
                  value={conditionForm.description}
                  onChange={(e) => setConditionForm({ ...conditionForm, description: e.target.value })}
                  placeholder="描述这个条件分支的用途..."
                  rows={2}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>条件规则</Label>
                  <Button variant="outline" size="sm" onClick={addConditionRule}>
                    <Plus className="h-3 w-3 mr-1" />
                    添加条件
                  </Button>
                </div>

                {conditionForm.conditions.map((condition, index) => (
                  <div key={condition.id} className="p-3 border border-border rounded-lg space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                        条件 {index + 1}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => removeConditionRule(condition.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">来源键名</Label>
                        <Input
                          value={condition.sourceKey}
                          onChange={(e) => updateConditionRule(condition.id, "sourceKey", e.target.value)}
                          placeholder="例: result"
                          className="font-mono text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">操作符</Label>
                        <Select
                          value={condition.operator}
                          onValueChange={(v) => updateConditionRule(condition.id, "operator", v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="equals">等于</SelectItem>
                            <SelectItem value="not_equals">不等于</SelectItem>
                            <SelectItem value="contains">包含</SelectItem>
                            <SelectItem value="greater_than">大于</SelectItem>
                            <SelectItem value="less_than">小于</SelectItem>
                            <SelectItem value="is_empty">为空</SelectItem>
                            <SelectItem value="is_not_empty">不为空</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {!["is_empty", "is_not_empty"].includes(condition.operator) && (
                      <div>
                        <Label className="text-xs">比较值</Label>
                        <Input
                          value={condition.value}
                          onChange={(e) => updateConditionRule(condition.id, "value", e.target.value)}
                          placeholder="例: success"
                          className="font-mono text-sm"
                        />
                      </div>
                    )}

                    <div>
                      <Label className="text-xs">分支标识</Label>
                      <Input
                        value={condition.targetHandle}
                        onChange={(e) => updateConditionRule(condition.id, "targetHandle", e.target.value)}
                        placeholder="例: branch-1"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>
                ))}

                {conditionForm.conditions.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    暂无条件规则，点击"添加条件"创建
                  </div>
                )}

                <div className="p-3 border border-border rounded-lg bg-muted/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">默认分支</Badge>
                    <span className="text-xs text-muted-foreground">当所有条件都不满足时执行</span>
                  </div>
                  <div>
                    <Label className="text-xs">默认分支标识</Label>
                    <Input
                      value={conditionForm.defaultHandle}
                      onChange={(e) => setConditionForm({ ...conditionForm, defaultHandle: e.target.value })}
                      placeholder="例: default"
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <Button className="w-full" onClick={saveConditionChanges}>
                保存修改
              </Button>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Loop Editor Sheet */}
      <Sheet open={showLoopEditor} onOpenChange={setShowLoopEditor}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-purple-500" />
              编辑循环节点
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] pr-4">
            <div className="space-y-4 mt-4">
              <div>
                <Label>循环名称</Label>
                <Input
                  value={loopForm.name}
                  onChange={(e) => setLoopForm({ ...loopForm, name: e.target.value })}
                  placeholder="例: 处理用户列表"
                />
              </div>

              <div>
                <Label>循环描述</Label>
                <Textarea
                  value={loopForm.description}
                  onChange={(e) => setLoopForm({ ...loopForm, description: e.target.value })}
                  placeholder="描述这个循环的用途..."
                  rows={2}
                />
              </div>

              <div>
                <Label>列表数据来源</Label>
                <Input
                  value={loopForm.sourceKey}
                  onChange={(e) => setLoopForm({ ...loopForm, sourceKey: e.target.value })}
                  placeholder="例: users_list 或 previous_step.items"
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  引用上一步输出的列表数据键名
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>迭代项变量名</Label>
                  <Input
                    value={loopForm.itemKey}
                    onChange={(e) => setLoopForm({ ...loopForm, itemKey: e.target.value })}
                    placeholder="item"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    每次迭代的当前项
                  </p>
                </div>
                <div>
                  <Label>索引变量名</Label>
                  <Input
                    value={loopForm.indexKey}
                    onChange={(e) => setLoopForm({ ...loopForm, indexKey: e.target.value })}
                    placeholder="index"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    当前迭代索引 (0开始)
                  </p>
                </div>
              </div>

              <div>
                <Label>最大迭代次数</Label>
                <Input
                  type="number"
                  min={1}
                  max={10000}
                  value={loopForm.maxIterations}
                  onChange={(e) => setLoopForm({ ...loopForm, maxIterations: parseInt(e.target.value) || 100 })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  防止无限循环的安全限制
                </p>
              </div>

              {/* Nesting Support Section */}
              <div className="p-3 border border-blue-500/30 rounded-lg bg-blue-500/5">
                <Label className="text-blue-500 text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  嵌套循环设置
                </Label>
                
                <div className="space-y-3 mt-3">
                  <div>
                    <Label className="text-xs">变量命名空间前缀</Label>
                    <Input
                      value={loopForm.variablePrefix}
                      onChange={(e) => setLoopForm({ ...loopForm, variablePrefix: e.target.value })}
                      placeholder="例: outer 或 user_loop"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      嵌套循环时用于区分不同层级的变量
                    </p>
                  </div>

                  <div>
                    <Label className="text-xs">嵌套层级</Label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={loopForm.nestingLevel}
                      onChange={(e) => setLoopForm({ ...loopForm, nestingLevel: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      0=最外层，1=第一层嵌套，以此类推
                    </p>
                  </div>

                  {loopForm.variablePrefix && (
                    <div className="text-xs p-2 bg-muted/50 rounded border border-border">
                      <span className="text-muted-foreground">完整变量路径：</span>
                      <div className="font-mono text-purple-500 mt-1">
                        {loopForm.variablePrefix}.{loopForm.itemKey || "item"}
                      </div>
                      <div className="font-mono text-purple-500">
                        {loopForm.variablePrefix}.{loopForm.indexKey || "index"}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Results Collection */}
              <div className="p-3 border border-green-500/30 rounded-lg bg-green-500/5">
                <div className="flex items-center justify-between">
                  <Label className="text-green-500 text-sm">收集迭代结果</Label>
                  <input
                    type="checkbox"
                    checked={loopForm.collectResults}
                    onChange={(e) => setLoopForm({ ...loopForm, collectResults: e.target.checked })}
                    className="h-4 w-4 rounded border-border"
                  />
                </div>
                
                {loopForm.collectResults && (
                  <div className="mt-3">
                    <Label className="text-xs">结果键名</Label>
                    <Input
                      value={loopForm.resultsKey}
                      onChange={(e) => setLoopForm({ ...loopForm, resultsKey: e.target.value })}
                      placeholder="例: processed_items"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      循环结束后可通过此键名获取所有迭代结果
                    </p>
                  </div>
                )}
              </div>

              <div className="p-3 border border-border rounded-lg bg-muted/20">
                <Label className="text-xs text-muted-foreground">嵌套循环说明</Label>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>可在循环体内添加条件分支或子循环</li>
                  <li>使用变量前缀避免内外层变量名冲突</li>
                  <li>内层循环可通过完整路径访问外层变量</li>
                  <li>例：outer.item.children 访问外层当前项的子列表</li>
                </ul>
              </div>

              <Button className="w-full" onClick={saveLoopChanges}>
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
