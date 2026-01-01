import { useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
} from "@/hooks/useAgentCollaboration";
import { useDeployedAgents } from "@/hooks/useAgents";

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
  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(null);
  const [selectedTargetAgent, setSelectedTargetAgent] = useState<string>("");
  const [realtimeMessages, setRealtimeMessages] = useState<CollaborationMessage[]>([]);

  const { data: collaborations = [], isLoading: collabLoading, refetch: refetchCollabs } = useAgentCollaborations();
  const { data: agents = [] } = useDeployedAgents();
  const { data: messages = [] } = useCollaborationMessages(selectedCollabId);
  const { data: driftLogs = [], refetch: refetchDrifts } = useDriftLogs(currentAgentId);

  const initiateHandshake = useInitiateHandshake();
  const acceptHandshake = useAcceptHandshake();
  const rejectHandshake = useRejectHandshake();
  const disconnectCollab = useDisconnectCollaboration();
  const checkDrift = useCheckDrift();
  const resolveDrift = useResolveDrift();

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
          {(pendingCollabs.length > 0 || unresolvedDrifts.length > 0) && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive rounded-full text-[10px] text-white flex items-center justify-center">
              {pendingCollabs.length + unresolvedDrifts.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="collaborations" className="relative">
              协作管理
              {pendingCollabs.length > 0 && (
                <span className="ml-1 text-xs text-destructive">({pendingCollabs.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages">通信记录</TabsTrigger>
            <TabsTrigger value="drift" className="relative">
              漂移检测
              {unresolvedDrifts.length > 0 && (
                <span className="ml-1 text-xs text-destructive">({unresolvedDrifts.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

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
      </SheetContent>
    </Sheet>
  );
}
