import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet.tsx";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog.tsx";
import { Label } from "../ui/label.tsx";
import { Progress } from "../ui/progress.tsx";
import { Input } from "../ui/input.tsx";
import { Textarea } from "../ui/textarea.tsx";
import {
  Users,
  Handshake,
  Link,
  Unlink,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Check,
  X,
  Loader2,
  Send,
  Network,
  Play,
  XCircle,
} from "lucide-react";
import {
  useAgentCollaborations,
  useCollaborationMessages,
  useRealtimeCollaborationMessages,
  useInitiateHandshake,
  useAcceptHandshake,
  useRejectHandshake,
  useDisconnectCollaboration,
  useDriftLogs,
  useRealtimeDriftAlerts,
  useCheckDrift,
  useResolveDrift,
  collaborationStatusColors,
  driftSeverityColors,
  driftTypeLabels,
  type CollaborationMessage,
  type DriftLog,
} from "../../hooks/useAgentCollaboration.ts";
import {
  useDelegatedTasks,
  useDelegateTask,
  useAcceptTask,
  useRejectTask,
  useStartTask,
  useCompleteTask,
  useCancelTask,
  useExecuteTask,
  taskStatusColors,
  taskStatusLabels,
  taskPriorityColors,
  taskPriorityLabels,
  taskTypeLabels,
  useRealtimeTaskUpdates,
  type DelegatedTask,
  type HandoffContext,
} from "../../hooks/useTaskDelegation.ts";
import { useDeployedAgents } from "../../hooks/useAgents.ts";
import { CollaborationDashboard } from "./CollaborationDashboard.tsx";
import { HandoffPacketEditor } from "./HandoffPacketEditor.tsx";

interface AgentCollaborationPanelProps {
  currentAgentId?: string;
  currentAgentName?: string;
}

export function AgentCollaborationPanel({ 
  currentAgentId, 
  currentAgentName 
}: AgentCollaborationPanelProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("collaborations");
  const [showNewCollab, setShowNewCollab] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(null);
  const [selectedTargetAgent, setSelectedTargetAgent] = useState<string>("");
  const [realtimeMessages, setRealtimeMessages] = useState<CollaborationMessage[]>([]);
  
  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [newTaskType, setNewTaskType] = useState<"general" | "analysis" | "generation" | "query" | "validation">("general");
  const [newTaskTargetAgent, setNewTaskTargetAgent] = useState("");
  const [showAdvancedHandoff, setShowAdvancedHandoff] = useState(false);
  const [handoffContext, setHandoffContext] = useState<HandoffContext>({});

  const { data: collaborations = [], isLoading: collabLoading, refetch: refetchCollabs } = useAgentCollaborations();
  const { data: agents = [] } = useDeployedAgents();
  const { data: messages = [] } = useCollaborationMessages(selectedCollabId);
  const { data: driftLogs = [], refetch: refetchDrifts } = useDriftLogs(currentAgentId);
  const { data: delegatedTasks = [], refetch: refetchTasks } = useDelegatedTasks(currentAgentId);

  const initiateHandshake = useInitiateHandshake();
  const acceptHandshake = useAcceptHandshake();
  const rejectHandshake = useRejectHandshake();
  const disconnectCollab = useDisconnectCollaboration();
  const checkDrift = useCheckDrift();
  const resolveDrift = useResolveDrift();
  
  // Task mutations
  const delegateTask = useDelegateTask();
  const acceptTask = useAcceptTask();
  const rejectTask = useRejectTask();
  const startTask = useStartTask();
  const completeTask = useCompleteTask();
  const cancelTask = useCancelTask();
  const executeTask = useExecuteTask();
  
  // Task result dialog
  const [showTaskResult, setShowTaskResult] = useState(false);
  const [selectedTaskResult, setSelectedTaskResult] = useState<DelegatedTask | null>(null);

  // Real-time message handler
  const handleNewMessage = useCallback((message: CollaborationMessage) => {
    setRealtimeMessages((prev) => [...prev, message]);
  }, []);

  useRealtimeCollaborationMessages(selectedCollabId, handleNewMessage);

  // Real-time drift handler
  const handleNewDrift = useCallback((drift: DriftLog) => {
    refetchDrifts();
  }, [refetchDrifts]);

  useRealtimeDriftAlerts(currentAgentId || null, handleNewDrift);
  
  // Real-time task handler
  const handleTaskUpdate = useCallback((task: DelegatedTask) => {
    refetchTasks();
  }, [refetchTasks]);

  useRealtimeTaskUpdates(currentAgentId || null, handleTaskUpdate);

  // Get available agents for collaboration (exclude current agent)
  const availableAgents = agents.filter(
    (a) => a.id !== currentAgentId && a.status === "deployed"
  );

  // Current agent's collaborations
  const myCollaborations = collaborations.filter(
    (c: any) => c.initiator_agent_id === currentAgentId || c.target_agent_id === currentAgentId
  );

  const pendingCollabs = myCollaborations.filter((c: any) => c.status === "pending");
  const activeCollabs = myCollaborations.filter((c: any) => c.status === "connected");
  const unresolvedDrifts = driftLogs.filter((d) => !d.resolved);
  
  // Task filtering
  const myTasks = delegatedTasks.filter(
    (t) => t.source_agent_id === currentAgentId || t.target_agent_id === currentAgentId
  );
  const pendingTasks = myTasks.filter((t) => t.status === "pending" && t.target_agent_id === currentAgentId);
  const inProgressTasks = myTasks.filter((t) => t.status === "in_progress" || t.status === "accepted");

  const handleDelegateTask = async () => {
    if (!currentAgentId || !newTaskTargetAgent || !newTaskTitle) return;

    // Find collaboration with target agent
    const collab = activeCollabs.find(
      (c: any) => c.initiator_agent_id === newTaskTargetAgent || c.target_agent_id === newTaskTargetAgent
    );

    // Build enhanced handoff context
    const finalHandoffContext: HandoffContext = {
      ...handoffContext,
      goal: handoffContext.goal || newTaskTitle,
      conversationSummary: handoffContext.conversationSummary || newTaskDescription || "Task delegated from collaboration panel",
      urgency: newTaskPriority,
      handoffTimestamp: new Date().toISOString(),
      protocolVersion: "1.0",
      sourceAgentContext: {
        agentId: currentAgentId,
        agentName: currentAgentName || "Unknown",
        capabilities: ["task_delegation"],
        reasonForHandoff: `Task type: ${newTaskType}`,
      },
    };

    await delegateTask.mutateAsync({
      sourceAgentId: currentAgentId,
      targetAgentId: newTaskTargetAgent,
      collaborationId: collab?.id,
      title: newTaskTitle,
      description: newTaskDescription,
      priority: newTaskPriority,
      taskType: newTaskType,
      handoffContext: finalHandoffContext,
    });

    setShowNewTask(false);
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskPriority("normal");
    setNewTaskType("general");
    setNewTaskTargetAgent("");
    setHandoffContext({});
    setShowAdvancedHandoff(false);
  };

  const handleInitiateHandshake = async () => {
    if (!currentAgentId || !selectedTargetAgent) return;

    await initiateHandshake.mutateAsync({
      initiatorAgentId: currentAgentId,
      targetAgentId: selectedTargetAgent,
      capabilities: ["task_delegation", "knowledge_sharing"],
    });

    setShowNewCollab(false);
    setSelectedTargetAgent("");
  };

  const handleSimulateDrift = async () => {
    if (!currentAgentId) return;

    // Simulate metrics with some drift
    await checkDrift.mutateAsync({
      agentId: currentAgentId,
      metrics: {
        responseLatency: 3500, // Higher than baseline
        confidenceScore: 0.65, // Lower than baseline
        tokenUsage: 800,
        errorRate: 0.08,
      },
    });
  };

  const allMessages = [...messages, ...realtimeMessages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Users className="h-4 w-4 mr-2" />
          协作
          {(pendingCollabs.length > 0 || unresolvedDrifts.length > 0 || pendingTasks.length > 0) && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center">
              {pendingCollabs.length + unresolvedDrifts.length + pendingTasks.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      
      {/* Collaboration Dashboard */}
      <CollaborationDashboard open={showDashboard} onOpenChange={setShowDashboard} />
      <SheetContent side="right" className="w-[800px] sm:max-w-[800px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            多Agent协作中心
            {currentAgentName && (
              <Badge variant="outline" className="ml-2">
                {currentAgentName}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="collaborations" className="relative">
              协作
              {pendingCollabs.length > 0 && (
                <span className="ml-1 text-xs text-destructive">({pendingCollabs.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="relative">
              任务
              {pendingTasks.length > 0 && (
                <span className="ml-1 text-xs text-destructive">({pendingTasks.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages">通信</TabsTrigger>
            <TabsTrigger value="drift" className="relative">
              漂移
              {unresolvedDrifts.length > 0 && (
                <span className="ml-1 text-xs text-destructive">({unresolvedDrifts.length})</span>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Dashboard button */}
          <div className="flex justify-end mt-2">
            <Button variant="outline" size="sm" onClick={() => setShowDashboard(true)}>
              <Network className="h-4 w-4 mr-1" />
              网络拓扑
            </Button>
          </div>

          <TabsContent value="collaborations" className="mt-4 space-y-4">
            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{activeCollabs.length}</div>
                  <div className="text-xs text-muted-foreground">活跃连接</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-500">{pendingCollabs.length}</div>
                  <div className="text-xs text-muted-foreground">待处理</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold">{myCollaborations.length}</div>
                  <div className="text-xs text-muted-foreground">总协作</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-destructive">{unresolvedDrifts.length}</div>
                  <div className="text-xs text-muted-foreground">漂移警告</div>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={() => setShowNewCollab(true)} disabled={!currentAgentId}>
                <Plus className="h-4 w-4 mr-1" />
                发起协作
              </Button>
              <Button variant="outline" onClick={() => refetchCollabs()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Collaboration List */}
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {collabLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : myCollaborations.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Handshake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无协作关系</p>
                    <p className="text-sm">点击"发起协作"与其他Agent建立连接</p>
                  </div>
                ) : (
                  myCollaborations.map((collab: any) => {
                    const isInitiator = collab.initiator_agent_id === currentAgentId;
                    const partnerAgent = isInitiator ? collab.target : collab.initiator;

                    return (
                      <Card key={collab.id} className="hover:bg-muted/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: collaborationStatusColors[collab.status] }}
                              />
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {isInitiator ? (
                                    <>
                                      <span className="text-muted-foreground">→</span>
                                      {partnerAgent?.name || "未知Agent"}
                                    </>
                                  ) : (
                                    <>
                                      {partnerAgent?.name || "未知Agent"}
                                      <span className="text-muted-foreground">→</span>
                                    </>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {collab.status}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  信任度: {(collab.trust_level * 100).toFixed(0)}% | 
                                  协议: v{collab.protocol_version}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {collab.status === "pending" && !isInitiator && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => acceptHandshake.mutateAsync({ collaborationId: collab.id })}
                                    disabled={acceptHandshake.isPending}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => rejectHandshake.mutateAsync(collab.id)}
                                    disabled={rejectHandshake.isPending}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {collab.status === "connected" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setSelectedCollabId(collab.id)}
                                  >
                                    <Activity className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => disconnectCollab.mutateAsync(collab.id)}
                                    disabled={disconnectCollab.isPending}
                                  >
                                    <Unlink className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {collab.status === "connected" && (
                            <div className="mt-3">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">信任度:</span>
                                <Progress value={collab.trust_level * 100} className="flex-1 h-2" />
                                <span>{(collab.trust_level * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => setShowNewTask(true)} disabled={!currentAgentId || activeCollabs.length === 0}>
                <Send className="h-4 w-4 mr-1" />
                委派任务
              </Button>
              <Button variant="outline" onClick={() => refetchTasks()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {myTasks.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无任务</p>
                  </div>
                ) : (
                  myTasks.map((task) => {
                    const isReceiver = task.target_agent_id === currentAgentId;
                    return (
                      <Card key={task.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge style={{ backgroundColor: taskStatusColors[task.status], color: "#fff" }}>
                                  {taskStatusLabels[task.status]}
                                </Badge>
                                <Badge variant="outline" style={{ borderColor: taskPriorityColors[task.priority] }}>
                                  {taskPriorityLabels[task.priority]}
                                </Badge>
                              </div>
                              <div className="font-medium mt-1">{task.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {isReceiver ? `来自: ${task.source_agent?.name}` : `发送至: ${task.target_agent?.name}`}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {isReceiver && task.status === "pending" && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => acceptTask.mutate(task.id)} disabled={acceptTask.isPending}><Check className="h-4 w-4" /></Button>
                                  <Button size="sm" variant="outline" onClick={() => rejectTask.mutate({ taskId: task.id })} disabled={rejectTask.isPending}><X className="h-4 w-4" /></Button>
                                </>
                              )}
                              {isReceiver && task.status === "accepted" && (
                                <Button 
                                  size="sm" 
                                  onClick={() => executeTask.mutate({ taskId: task.id })}
                                  disabled={executeTask.isPending}
                                >
                                  {executeTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                  执行
                                </Button>
                              )}
                              {isReceiver && task.status === "in_progress" && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => executeTask.mutate({ taskId: task.id })}
                                  disabled={executeTask.isPending}
                                >
                                  {executeTask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4 mr-1" />AI执行</>}
                                </Button>
                              )}
                              {task.status === "completed" && task.result && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  onClick={() => {
                                    setSelectedTaskResult(task);
                                    setShowTaskResult(true);
                                  }}
                                >
                                  <Activity className="h-4 w-4 mr-1" />
                                  查看结果
                                </Button>
                              )}
                              {!isReceiver && task.status === "pending" && (
                                <Button size="sm" variant="ghost" onClick={() => cancelTask.mutate(task.id)} disabled={cancelTask.isPending}><XCircle className="h-4 w-4" /></Button>
                              )}
                            </div>
                          </div>
                          {task.actual_duration_ms && (
                            <div className="mt-2 text-xs text-muted-foreground flex gap-4">
                              <span>耗时: {(task.actual_duration_ms / 1000).toFixed(1)}s</span>
                              {task.tokens_used && <span>Tokens: {task.tokens_used}</span>}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="messages" className="mt-4">
            {selectedCollabId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>协作通信记录</Label>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCollabId(null)}>
                    返回
                  </Button>
                </div>
                <ScrollArea className="h-[450px] border rounded-lg p-4">
                  {allMessages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      暂无通信记录
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`p-3 rounded-lg ${
                            msg.sender_agent_id === currentAgentId
                              ? "bg-primary/10 ml-8"
                              : "bg-muted mr-8"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className="text-xs">
                              {msg.message_type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(msg.created_at).toLocaleString()}
                            </span>
                          </div>
                          <pre className="text-xs whitespace-pre-wrap overflow-auto">
                            {JSON.stringify(msg.payload, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>请从协作列表中选择一个连接查看通信记录</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="drift" className="mt-4 space-y-4">
            {/* Drift Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSimulateDrift}
                disabled={!currentAgentId || checkDrift.isPending}
              >
                {checkDrift.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4 mr-1" />
                )}
                检测漂移
              </Button>
              <Button variant="outline" onClick={() => refetchDrifts()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Drift Stats */}
            <div className="grid grid-cols-4 gap-2">
              {["low", "medium", "high", "critical"].map((severity) => {
                const count = driftLogs.filter(
                  (d) => d.severity === severity && !d.resolved
                ).length;
                return (
                  <Card key={severity}>
                    <CardContent className="p-3 text-center">
                      <div
                        className="text-xl font-bold"
                        style={{ color: driftSeverityColors[severity] }}
                      >
                        {count}
                      </div>
                      <div className="text-[10px] text-muted-foreground capitalize">
                        {severity}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Drift Logs */}
            <ScrollArea className="h-[350px]">
              <div className="space-y-2">
                {driftLogs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无漂移记录</p>
                    <p className="text-sm">系统会自动监测Agent行为漂移</p>
                  </div>
                ) : (
                  driftLogs.map((drift) => (
                    <Card
                      key={drift.id}
                      className={drift.resolved ? "opacity-60" : ""}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {drift.severity === "critical" || drift.severity === "high" ? (
                              <TrendingDown
                                className="h-4 w-4"
                                style={{ color: driftSeverityColors[drift.severity] }}
                              />
                            ) : (
                              <TrendingUp
                                className="h-4 w-4"
                                style={{ color: driftSeverityColors[drift.severity] }}
                              />
                            )}
                            <div>
                              <div className="font-medium text-sm">
                                {driftTypeLabels[drift.drift_type] || drift.drift_type}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(drift.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              style={{
                                backgroundColor: `${driftSeverityColors[drift.severity]}20`,
                                color: driftSeverityColors[drift.severity],
                                borderColor: driftSeverityColors[drift.severity],
                              }}
                            >
                              {drift.severity}
                            </Badge>
                            <Badge variant="outline">
                              {(drift.deviation_score * 100).toFixed(0)}%
                            </Badge>
                            {drift.resolved ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => resolveDrift.mutateAsync(drift.id)}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-muted p-2 rounded">
                            <div className="text-muted-foreground">基线值</div>
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(drift.baseline_value, null, 2)}
                            </pre>
                          </div>
                          <div className="bg-muted p-2 rounded">
                            <div className="text-muted-foreground">当前值</div>
                            <pre className="whitespace-pre-wrap">
                              {JSON.stringify(drift.current_value, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* New Collaboration Dialog */}
        <Dialog open={showNewCollab} onOpenChange={setShowNewCollab}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5" />
                发起Agent协作
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>选择目标Agent</Label>
                <Select value={selectedTargetAgent} onValueChange={setSelectedTargetAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择要协作的Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAgents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>握手协议将建立两个Agent之间的安全通信通道：</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>生成唯一握手令牌</li>
                  <li>交换能力信息</li>
                  <li>建立信任评级</li>
                  <li>启用任务委派</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewCollab(false)}>
                取消
              </Button>
              <Button
                onClick={handleInitiateHandshake}
                disabled={!selectedTargetAgent || initiateHandshake.isPending}
              >
                {initiateHandshake.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Link className="h-4 w-4 mr-1" />
                )}
                发起握手
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Task Dialog */}
        <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
          <DialogContent className={showAdvancedHandoff ? "max-w-4xl max-h-[90vh] overflow-hidden" : ""}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                委派任务
              </DialogTitle>
            </DialogHeader>
            <div className={showAdvancedHandoff ? "grid grid-cols-2 gap-4" : "space-y-4"}>
              <div className="space-y-4">
                <div>
                  <Label>目标Agent</Label>
                  <Select value={newTaskTargetAgent} onValueChange={setNewTaskTargetAgent}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择接收任务的Agent" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCollabs.map((collab: any) => {
                        const partnerId = collab.initiator_agent_id === currentAgentId 
                          ? collab.target_agent_id 
                          : collab.initiator_agent_id;
                        const partner = collab.initiator_agent_id === currentAgentId 
                          ? collab.target 
                          : collab.initiator;
                        return (
                          <SelectItem key={partnerId} value={partnerId}>
                            {partner?.name || "Unknown"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>任务标题</Label>
                  <Input 
                    value={newTaskTitle} 
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="输入任务标题"
                  />
                </div>
                <div>
                  <Label>任务描述</Label>
                  <Textarea 
                    value={newTaskDescription} 
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    placeholder="描述任务详情..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>优先级</Label>
                    <Select value={newTaskPriority} onValueChange={(v: any) => setNewTaskPriority(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">低</SelectItem>
                        <SelectItem value="normal">普通</SelectItem>
                        <SelectItem value="high">高</SelectItem>
                        <SelectItem value="urgent">紧急</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>任务类型</Label>
                    <Select value={newTaskType} onValueChange={(v: any) => setNewTaskType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">通用</SelectItem>
                        <SelectItem value="analysis">分析</SelectItem>
                        <SelectItem value="generation">生成</SelectItem>
                        <SelectItem value="query">查询</SelectItem>
                        <SelectItem value="validation">验证</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowAdvancedHandoff(!showAdvancedHandoff)}
                  className="w-full"
                >
                  {showAdvancedHandoff ? "隐藏高级上下文" : "配置HandoffPacket上下文"}
                </Button>
              </div>
              
              {showAdvancedHandoff && (
                <HandoffPacketEditor
                  value={handoffContext}
                  onChange={setHandoffContext}
                  sourceAgentName={currentAgentName}
                  targetAgentName={activeCollabs.find((c: any) => 
                    c.initiator_agent_id === newTaskTargetAgent || c.target_agent_id === newTaskTargetAgent
                  )?.initiator?.name || activeCollabs.find((c: any) => 
                    c.initiator_agent_id === newTaskTargetAgent || c.target_agent_id === newTaskTargetAgent
                  )?.target?.name}
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewTask(false)}>
                取消
              </Button>
              <Button
                onClick={handleDelegateTask}
                disabled={!newTaskTargetAgent || !newTaskTitle || delegateTask.isPending}
              >
                {delegateTask.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                委派
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Task Result Dialog */}
        <Dialog open={showTaskResult} onOpenChange={setShowTaskResult}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                任务执行结果
                {selectedTaskResult && (
                  <Badge style={{ backgroundColor: taskStatusColors[selectedTaskResult.status], color: "#fff" }}>
                    {taskStatusLabels[selectedTaskResult.status]}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedTaskResult && (
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">任务类型:</span>
                      <span className="ml-2 font-medium">{taskTypeLabels[selectedTaskResult.task_type]}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">执行耗时:</span>
                      <span className="ml-2 font-medium">{selectedTaskResult.actual_duration_ms ? `${(selectedTaskResult.actual_duration_ms / 1000).toFixed(1)}s` : "-"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Token用量:</span>
                      <span className="ml-2 font-medium">{selectedTaskResult.tokens_used || "-"}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">任务标题</Label>
                    <div className="font-medium">{selectedTaskResult.title}</div>
                  </div>
                  {selectedTaskResult.description && (
                    <div>
                      <Label className="text-sm text-muted-foreground">任务描述</Label>
                      <div>{selectedTaskResult.description}</div>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm text-muted-foreground">执行结果</Label>
                    <div className="mt-2 p-4 bg-muted rounded-lg">
                      {selectedTaskResult.result && typeof selectedTaskResult.result === "object" && "content" in selectedTaskResult.result ? (
                        <div className="whitespace-pre-wrap text-sm">
                          {String((selectedTaskResult.result as any).content)}
                        </div>
                      ) : (
                        <pre className="text-xs whitespace-pre-wrap overflow-auto">
                          {JSON.stringify(selectedTaskResult.result, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            )}
            <DialogFooter>
              <Button onClick={() => setShowTaskResult(false)}>关闭</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
