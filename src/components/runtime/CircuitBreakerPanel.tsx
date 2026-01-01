import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  RefreshCw,
  Settings,
  Activity,
  TrendingUp,
  TrendingDown,
  Loader2,
  Zap,
} from "lucide-react";
import {
  useCircuitBreakerState,
  useRealtimeCircuitBreaker,
  useResetCircuit,
  useConfigureCircuit,
  useRecordFailure,
  useRecordSuccess,
  useIntentAnalysis,
  useIntentHistory,
  useTrackIntent,
  circuitStateColors,
  circuitStateLabels,
  intentSeverityColors,
  type CircuitBreakerState,
  type CircuitBreakerConfig,
} from "@/hooks/useCircuitBreaker";

interface CircuitBreakerPanelProps {
  agentId?: string;
  agentName?: string;
  sessionId?: string;
}

export function CircuitBreakerPanel({ agentId, agentName, sessionId }: CircuitBreakerPanelProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<CircuitBreakerConfig>({
    failureThreshold: 5,
    successThreshold: 3,
    timeoutDuration: 30000,
  });
  const [testIntent, setTestIntent] = useState({ original: "", current: "" });

  const { data: cbState, refetch: refetchCB, isLoading: cbLoading } = useCircuitBreakerState(agentId);
  const { data: intentData, refetch: refetchIntent, isLoading: intentLoading } = useIntentAnalysis(agentId, sessionId);
  const { data: intentHistory = [] } = useIntentHistory(agentId, sessionId);

  const resetCircuit = useResetCircuit();
  const configureCircuit = useConfigureCircuit();
  const recordFailure = useRecordFailure();
  const recordSuccess = useRecordSuccess();
  const trackIntent = useTrackIntent();

  // Real-time updates
  const handleCBStateChange = useCallback((state: CircuitBreakerState) => {
    refetchCB();
  }, [refetchCB]);

  useRealtimeCircuitBreaker(agentId || null, handleCBStateChange);

  const handleSaveConfig = async () => {
    if (!agentId) return;
    await configureCircuit.mutateAsync({ agentId, config });
    setShowConfig(false);
  };

  const handleTestIntent = async () => {
    if (!agentId || !testIntent.original || !testIntent.current) return;
    await trackIntent.mutateAsync({
      agentId,
      sessionId,
      originalIntent: testIntent.original,
      currentMessage: testIntent.current,
    });
    setTestIntent({ original: "", current: "" });
  };

  const getCircuitIcon = (state?: string) => {
    switch (state) {
      case "closed": return <ShieldCheck className="h-6 w-6 text-green-500" />;
      case "open": return <ShieldOff className="h-6 w-6 text-red-500" />;
      case "half_open": return <ShieldAlert className="h-6 w-6 text-orange-500" />;
      default: return <Shield className="h-6 w-6 text-muted-foreground" />;
    }
  };

  const isLoading = cbLoading || intentLoading;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          <span className="font-semibold">熔断器 & 意图监控</span>
          {agentName && <Badge variant="outline">{agentName}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { refetchCB(); refetchIntent(); }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowConfig(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="circuit">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="circuit">熔断器</TabsTrigger>
          <TabsTrigger value="intent">Delta Intent</TabsTrigger>
        </TabsList>

        <TabsContent value="circuit" className="space-y-4">
          {/* Circuit Breaker State Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {getCircuitIcon(cbState?.state)}
                熔断器状态
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : cbState ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge
                      className="text-sm px-3 py-1"
                      style={{ backgroundColor: circuitStateColors[cbState.state], color: "#fff" }}
                    >
                      {circuitStateLabels[cbState.state]}
                    </Badge>
                    {cbState.state === "open" && (
                      <Button size="sm" variant="outline" onClick={() => agentId && resetCircuit.mutate(agentId)}>
                        强制重置
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">失败次数</Label>
                      <div className="text-2xl font-bold" style={{ color: cbState.failure_count > 0 ? "#F44336" : "inherit" }}>
                        {cbState.failure_count} / {cbState.failure_threshold}
                      </div>
                      <Progress 
                        value={(cbState.failure_count / cbState.failure_threshold) * 100} 
                        className="mt-1 h-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">成功次数</Label>
                      <div className="text-2xl font-bold text-green-500">
                        {cbState.success_count} / {cbState.success_threshold}
                      </div>
                      <Progress 
                        value={(cbState.success_count / cbState.success_threshold) * 100} 
                        className="mt-1 h-2"
                      />
                    </div>
                  </div>

                  {cbState.state === "open" && cbState.opened_at && (
                    <div className="p-3 bg-destructive/10 rounded-lg text-sm">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <span>熔断中 - 开启于 {new Date(cbState.opened_at).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-muted-foreground mt-1">
                        超时时间: {cbState.timeout_duration_ms / 1000}秒
                      </div>
                    </div>
                  )}

                  {/* Test buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => agentId && recordSuccess.mutate(agentId)}
                      disabled={recordSuccess.isPending}
                    >
                      模拟成功
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => agentId && recordFailure.mutate(agentId)}
                      disabled={recordFailure.isPending}
                    >
                      模拟失败
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  {agentId ? "无熔断器状态" : "请选择Agent"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intent" className="space-y-4">
          {/* Intent Analysis Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="h-4 w-4" />
                意图偏移分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              {intentData?.analysis ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{intentData.analysis.totalTurns}</div>
                      <div className="text-xs text-muted-foreground">总轮次</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-500">{intentData.analysis.driftEvents}</div>
                      <div className="text-xs text-muted-foreground">偏移事件</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{intentData.analysis.avgDeltaScore}</div>
                      <div className="text-xs text-muted-foreground">平均偏移</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      {intentData.analysis.trend === "increasing" ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : intentData.analysis.trend === "decreasing" ? (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      ) : (
                        <Activity className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="text-sm">趋势: {
                        intentData.analysis.trend === "increasing" ? "上升" :
                        intentData.analysis.trend === "decreasing" ? "下降" : "稳定"
                      }</span>
                    </div>
                    <Badge variant="outline">{intentData.analysis.driftRate}</Badge>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {intentData.analysis.recommendation}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  暂无意图分析数据
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Intent Tracking */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">测试意图追踪</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">原始意图</Label>
                <Input 
                  placeholder="用户最初想要做什么..."
                  value={testIntent.original}
                  onChange={(e) => setTestIntent(prev => ({ ...prev, original: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">当前消息</Label>
                <Input 
                  placeholder="用户现在说什么..."
                  value={testIntent.current}
                  onChange={(e) => setTestIntent(prev => ({ ...prev, current: e.target.value }))}
                />
              </div>
              <Button 
                size="sm" 
                onClick={handleTestIntent}
                disabled={!testIntent.original || !testIntent.current || trackIntent.isPending}
              >
                {trackIntent.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                计算Delta
              </Button>
            </CardContent>
          </Card>

          {/* Intent History */}
          {intentHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">意图历史</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {intentHistory.slice(0, 10).map((item) => (
                      <div key={item.id} className="p-2 border rounded text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <Badge 
                            variant="outline"
                            style={{ 
                              borderColor: intentSeverityColors[item.drift_detected ? "high" : "none"],
                              color: intentSeverityColors[item.drift_detected ? "high" : "none"],
                            }}
                          >
                            Delta: {Number(item.delta_score).toFixed(3)}
                          </Badge>
                          <span className="text-muted-foreground">
                            Turn {item.turn_number}
                          </span>
                        </div>
                        <div className="text-muted-foreground line-clamp-1">
                          {item.current_intent}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Config Dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>熔断器配置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>失败阈值</Label>
              <Input
                type="number"
                value={config.failureThreshold}
                onChange={(e) => setConfig(prev => ({ ...prev, failureThreshold: parseInt(e.target.value) || 5 }))}
              />
              <p className="text-xs text-muted-foreground mt-1">连续失败多少次后触发熔断</p>
            </div>
            <div>
              <Label>成功阈值</Label>
              <Input
                type="number"
                value={config.successThreshold}
                onChange={(e) => setConfig(prev => ({ ...prev, successThreshold: parseInt(e.target.value) || 3 }))}
              />
              <p className="text-xs text-muted-foreground mt-1">半开状态下连续成功多少次后恢复</p>
            </div>
            <div>
              <Label>超时时间 (毫秒)</Label>
              <Input
                type="number"
                value={config.timeoutDuration}
                onChange={(e) => setConfig(prev => ({ ...prev, timeoutDuration: parseInt(e.target.value) || 30000 }))}
              />
              <p className="text-xs text-muted-foreground mt-1">熔断后多久自动进入半开状态</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)}>取消</Button>
            <Button onClick={handleSaveConfig} disabled={configureCircuit.isPending}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
