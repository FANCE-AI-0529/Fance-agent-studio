import { useState, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import { Progress } from "../ui/progress.tsx";
import {
  Network,
  Activity,
  ArrowRightLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  useAgentCollaborations,
  useCollaborationMessages,
  collaborationStatusColors,
  driftSeverityColors,
  type DriftLog,
} from "../../hooks/useAgentCollaboration.ts";
import {
  useDelegatedTasks,
  taskStatusColors,
  taskStatusLabels,
  taskPriorityColors,
  type DelegatedTask,
} from "../../hooks/useTaskDelegation.ts";
import { useDeployedAgents } from "../../hooks/useAgents.ts";

interface CollaborationDashboardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Custom node for agents in the network topology
function AgentTopologyNode({ data }: { data: any }) {
  const statusColor = data.isActive ? "#4CAF50" : "#9E9E9E";
  
  return (
    <div
      className="px-4 py-3 rounded-lg border-2 bg-card shadow-lg min-w-[140px]"
      style={{ borderColor: statusColor }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-3 h-3 rounded-full animate-pulse"
          style={{ backgroundColor: statusColor }}
        />
        <span className="font-semibold text-sm">{data.label}</span>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>模型: {data.model}</div>
        <div>连接: {data.connectionCount}</div>
        <div>任务: {data.taskCount}</div>
      </div>
      {data.messageCount > 0 && (
        <Badge variant="secondary" className="mt-2 text-xs">
          {data.messageCount} 消息
        </Badge>
      )}
    </div>
  );
}

const nodeTypes = {
  agentNode: AgentTopologyNode,
};

export function CollaborationDashboard({ open, onOpenChange }: CollaborationDashboardProps) {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("topology");

  const { data: agents = [] } = useDeployedAgents();
  const { data: collaborations = [], isLoading: collabLoading } = useAgentCollaborations();
  const { data: tasks = [], isLoading: tasksLoading } = useDelegatedTasks();

  // Calculate network metrics
  const networkMetrics = useMemo(() => {
    const activeCollabs = collaborations.filter((c: any) => c.status === "connected");
    const pendingCollabs = collaborations.filter((c: any) => c.status === "pending");
    const pendingTasks = tasks.filter((t) => t.status === "pending");
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
    const completedTasks = tasks.filter((t) => t.status === "completed");
    const failedTasks = tasks.filter((t) => t.status === "failed" || t.status === "rejected");

    // Calculate average task completion time
    const completedWithDuration = completedTasks.filter((t) => t.actual_duration_ms);
    const avgDuration = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, t) => sum + (t.actual_duration_ms || 0), 0) / completedWithDuration.length
      : 0;

    return {
      totalAgents: agents.length,
      activeConnections: activeCollabs.length,
      pendingConnections: pendingCollabs.length,
      totalTasks: tasks.length,
      pendingTasks: pendingTasks.length,
      inProgressTasks: inProgressTasks.length,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      avgTaskDuration: avgDuration,
      successRate: tasks.length > 0
        ? (completedTasks.length / (completedTasks.length + failedTasks.length)) * 100 || 0
        : 0,
    };
  }, [agents, collaborations, tasks]);

  // Build network topology nodes and edges
  const { nodes, edges } = useMemo(() => {
    const agentConnectionMap = new Map<string, number>();
    const agentTaskMap = new Map<string, number>();
    const agentMessageMap = new Map<string, number>();

    // Count connections per agent
    collaborations.forEach((c: any) => {
      if (c.status === "connected") {
        agentConnectionMap.set(c.initiator_agent_id, (agentConnectionMap.get(c.initiator_agent_id) || 0) + 1);
        agentConnectionMap.set(c.target_agent_id, (agentConnectionMap.get(c.target_agent_id) || 0) + 1);
      }
    });

    // Count tasks per agent
    tasks.forEach((t) => {
      agentTaskMap.set(t.source_agent_id, (agentTaskMap.get(t.source_agent_id) || 0) + 1);
      agentTaskMap.set(t.target_agent_id, (agentTaskMap.get(t.target_agent_id) || 0) + 1);
    });

    // Position agents in a circle
    const radius = 200;
    const centerX = 300;
    const centerY = 250;

    const flowNodes: Node[] = agents.map((agent, index) => {
      const angle = (2 * Math.PI * index) / agents.length;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      return {
        id: agent.id,
        type: "agentNode",
        position: { x, y },
        data: {
          label: agent.name,
          model: agent.model,
          isActive: agent.status === "deployed",
          connectionCount: agentConnectionMap.get(agent.id) || 0,
          taskCount: agentTaskMap.get(agent.id) || 0,
          messageCount: agentMessageMap.get(agent.id) || 0,
        },
      };
    });

    // Create edges from collaborations
    const flowEdges: Edge[] = collaborations
      .filter((c: any) => c.status === "connected")
      .map((c: any, index: number) => {
        // Count tasks between these two agents
        const tasksBetween = tasks.filter(
          (t) =>
            (t.source_agent_id === c.initiator_agent_id && t.target_agent_id === c.target_agent_id) ||
            (t.source_agent_id === c.target_agent_id && t.target_agent_id === c.initiator_agent_id)
        );

        return {
          id: `edge-${index}`,
          source: c.initiator_agent_id,
          target: c.target_agent_id,
          type: "smoothstep",
          animated: true,
          style: {
            stroke: collaborationStatusColors[c.status],
            strokeWidth: Math.min(2 + tasksBetween.length, 6),
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: collaborationStatusColors[c.status],
          },
          label: tasksBetween.length > 0 ? `${tasksBetween.length} 任务` : undefined,
          labelStyle: { fontSize: 10, fill: "#666" },
        };
      });

    return { nodes: flowNodes, edges: flowEdges };
  }, [agents, collaborations, tasks]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Track previous values to avoid infinite loops
  const prevNodesRef = useRef<Node[]>([]);
  const prevEdgesRef = useRef<Edge[]>([]);

  // Update nodes when data changes (avoid infinite loop by comparing JSON)
  useEffect(() => {
    const nodesJson = JSON.stringify(nodes);
    const edgesJson = JSON.stringify(edges);
    const prevNodesJson = JSON.stringify(prevNodesRef.current);
    const prevEdgesJson = JSON.stringify(prevEdgesRef.current);

    if (nodesJson !== prevNodesJson) {
      prevNodesRef.current = nodes;
      setFlowNodes(nodes);
    }
    if (edgesJson !== prevEdgesJson) {
      prevEdgesRef.current = edges;
      setFlowEdges(edges);
    }
  }, [nodes, edges]);

  // Get tasks for timeline
  const recentTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);
  }, [tasks]);

  const isLoading = collabLoading || tasksLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[90vh] h-[800px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            协作仪表盘 - Agent网络拓扑
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="topology">网络拓扑</TabsTrigger>
            <TabsTrigger value="traffic">通信流量</TabsTrigger>
            <TabsTrigger value="tasks">任务委派</TabsTrigger>
          </TabsList>

          {/* Metrics Overview */}
          <div className="grid grid-cols-6 gap-3 my-4">
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-primary">{networkMetrics.totalAgents}</div>
                <div className="text-xs text-muted-foreground">Agent总数</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-green-500">{networkMetrics.activeConnections}</div>
                <div className="text-xs text-muted-foreground">活跃连接</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-blue-500">{networkMetrics.totalTasks}</div>
                <div className="text-xs text-muted-foreground">总任务</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold text-purple-500">{networkMetrics.inProgressTasks}</div>
                <div className="text-xs text-muted-foreground">执行中</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{networkMetrics.avgTaskDuration > 0 ? `${(networkMetrics.avgTaskDuration / 1000).toFixed(1)}s` : "-"}</div>
                <div className="text-xs text-muted-foreground">平均耗时</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold" style={{ color: networkMetrics.successRate >= 80 ? "#4CAF50" : networkMetrics.successRate >= 50 ? "#FF9800" : "#F44336" }}>
                  {networkMetrics.successRate.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">成功率</div>
              </CardContent>
            </Card>
          </div>

          <TabsContent value="topology" className="flex-1 h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Network className="h-16 w-16 mb-4 opacity-50" />
                <p>暂无已部署的Agent</p>
                <p className="text-sm">请先在Builder中部署Agent</p>
              </div>
            ) : (
              <div className="h-full border rounded-lg overflow-hidden">
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  fitView
                  proOptions={{ hideAttribution: true }}
                >
                  <Background />
                  <Controls />
                  <MiniMap nodeColor="#6366f1" />
                </ReactFlow>
              </div>
            )}
          </TabsContent>

          <TabsContent value="traffic" className="h-[500px]">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Connection status */}
              <Card className="overflow-hidden">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    连接状态
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    {collaborations.length === 0 ? (
                      <div className="text-center text-muted-foreground py-8">
                        暂无协作连接
                      </div>
                    ) : (
                      <div className="divide-y">
                        {collaborations.map((c: any) => (
                          <div key={c.id} className="p-3 hover:bg-muted/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: collaborationStatusColors[c.status] }}
                                />
                                <span className="text-sm font-medium">
                                  {c.initiator?.name || "Unknown"} → {c.target?.name || "Unknown"}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {c.status}
                              </Badge>
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                              <span>信任度: {(c.trust_level * 100).toFixed(0)}%</span>
                              <span>协议: v{c.protocol_version}</span>
                            </div>
                            <Progress value={c.trust_level * 100} className="mt-2 h-1" />
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Traffic metrics */}
              <Card className="overflow-hidden">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    流量统计
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>活跃连接</span>
                        <span className="font-medium">{networkMetrics.activeConnections}</span>
                      </div>
                      <Progress value={(networkMetrics.activeConnections / Math.max(networkMetrics.totalAgents, 1)) * 100} />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>待处理连接</span>
                        <span className="font-medium">{networkMetrics.pendingConnections}</span>
                      </div>
                      <Progress value={(networkMetrics.pendingConnections / Math.max(networkMetrics.totalAgents, 1)) * 100} className="bg-yellow-100" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>任务成功率</span>
                        <span className="font-medium">{networkMetrics.successRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={networkMetrics.successRate} />
                    </div>
                    <div className="pt-4 border-t">
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-500">
                            {networkMetrics.completedTasks}
                          </div>
                          <div className="text-xs text-muted-foreground">已完成任务</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-500">
                            {networkMetrics.failedTasks}
                          </div>
                          <div className="text-xs text-muted-foreground">失败任务</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="h-[500px]">
            <ScrollArea className="h-full">
              {recentTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Clock className="h-16 w-16 mb-4 opacity-50" />
                  <p>暂无任务记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTasks.map((task) => (
                    <Card key={task.id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {task.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                              {task.status === "failed" && <XCircle className="h-4 w-4 text-red-500" />}
                              {task.status === "in_progress" && <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />}
                              {task.status === "pending" && <Clock className="h-4 w-4 text-yellow-500" />}
                              {(task.status === "rejected" || task.status === "cancelled") && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                              <span className="font-medium">{task.title}</span>
                              <Badge
                                variant="outline"
                                className="text-xs"
                                style={{ borderColor: taskPriorityColors[task.priority], color: taskPriorityColors[task.priority] }}
                              >
                                {task.priority}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {task.source_agent?.name || "Unknown"} → {task.target_agent?.name || "Unknown"}
                            </div>
                            {task.description && (
                              <p className="text-sm mt-1 text-muted-foreground line-clamp-1">{task.description}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <Badge
                              style={{ backgroundColor: taskStatusColors[task.status], color: "#fff" }}
                            >
                              {taskStatusLabels[task.status]}
                            </Badge>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(task.created_at).toLocaleString()}
                            </div>
                            {task.actual_duration_ms && (
                              <div className="text-xs text-muted-foreground">
                                耗时: {(task.actual_duration_ms / 1000).toFixed(1)}s
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
