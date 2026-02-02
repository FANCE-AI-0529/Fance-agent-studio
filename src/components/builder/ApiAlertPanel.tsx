import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Clock,
  Mail,
  Activity,
  Zap,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Play,
  History,
  Layers,
  Shield,
  Gauge,
  Server,
  TrendingUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  useApiAlertRules,
  useCreateApiAlertRule,
  useUpdateApiAlertRule,
  useDeleteApiAlertRule,
  useApiAlertLogs,
  useCheckAlerts,
} from "@/hooks/useApiAlerts";
import { AlertTrendChart } from "./AlertTrendChart";

interface ApiAlertPanelProps {
  agentId: string | null;
  agentName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ApiAlertPanel({
  agentId,
  agentName,
  isOpen,
  onClose,
}: ApiAlertPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("默认告警规则");
  const [formEmail, setFormEmail] = useState("");
  const [formErrorRate, setFormErrorRate] = useState("5");
  const [formLatency, setFormLatency] = useState("3000");
  const [formErrorCount, setFormErrorCount] = useState("10");
  const [formTimeWindow, setFormTimeWindow] = useState("5");
  const [formCooldown, setFormCooldown] = useState("30");

  const { data: rules = [], isLoading } = useApiAlertRules(agentId);
  const { data: logs = [] } = useApiAlertLogs(selectedRuleId);
  const createRule = useCreateApiAlertRule();
  const updateRule = useUpdateApiAlertRule();
  const deleteRule = useDeleteApiAlertRule();
  const checkAlerts = useCheckAlerts();

  const resetForm = () => {
    setFormName("默认告警规则");
    setFormEmail("");
    setFormErrorRate("5");
    setFormLatency("3000");
    setFormErrorCount("10");
    setFormTimeWindow("5");
    setFormCooldown("30");
    setEditingRule(null);
  };

  const handleCreateRule = async () => {
    if (!agentId || !formEmail) return;

    await createRule.mutateAsync({
      agentId,
      name: formName,
      notificationEmail: formEmail,
      errorRateThreshold: parseFloat(formErrorRate) || undefined,
      latencyThresholdMs: parseInt(formLatency) || undefined,
      errorCountThreshold: parseInt(formErrorCount) || undefined,
      timeWindowMinutes: parseInt(formTimeWindow) || 5,
      cooldownMinutes: parseInt(formCooldown) || 30,
    });

    setShowCreateDialog(false);
    resetForm();
  };

  const handleUpdateRule = async () => {
    if (!editingRule) return;

    await updateRule.mutateAsync({
      id: editingRule.id,
      name: formName,
      notificationEmail: formEmail,
      errorRateThreshold: formErrorRate ? parseFloat(formErrorRate) : null,
      latencyThresholdMs: formLatency ? parseInt(formLatency) : null,
      errorCountThreshold: formErrorCount ? parseInt(formErrorCount) : null,
      timeWindowMinutes: parseInt(formTimeWindow) || 5,
      cooldownMinutes: parseInt(formCooldown) || 30,
    });

    setShowCreateDialog(false);
    resetForm();
  };

  const handleEditRule = (rule: any) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormEmail(rule.notification_email);
    setFormErrorRate(rule.error_rate_threshold?.toString() || "");
    setFormLatency(rule.latency_threshold_ms?.toString() || "");
    setFormErrorCount(rule.error_count_threshold?.toString() || "");
    setFormTimeWindow(rule.time_window_minutes?.toString() || "5");
    setFormCooldown(rule.cooldown_minutes?.toString() || "30");
    setShowCreateDialog(true);
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleId || !agentId) return;
    await deleteRule.mutateAsync({ id: deleteRuleId, agentId });
    setDeleteRuleId(null);
  };

  const handleToggleActive = async (rule: any) => {
    await updateRule.mutateAsync({
      id: rule.id,
      isActive: !rule.is_active,
    });
  };

  const handleToggleNotification = async (rule: any) => {
    await updateRule.mutateAsync({
      id: rule.id,
      notificationEnabled: !rule.notification_enabled,
    });
  };

  const alertTypeLabels: Record<string, string> = {
    error_rate: "错误率",
    latency: "延迟",
    error_count: "错误数量",
  };

  const alertTypeUnits: Record<string, string> = {
    error_rate: "%",
    latency: "ms",
    error_count: "个",
  };

  // Alert rule templates
  const alertTemplates = [
    {
      id: "strict",
      name: "严格监控",
      description: "高敏感度，适合生产环境关键服务",
      icon: Shield,
      color: "text-red-500",
      config: {
        errorRate: "1",
        latency: "1000",
        errorCount: "3",
        timeWindow: "3",
        cooldown: "15",
      },
    },
    {
      id: "standard",
      name: "标准监控",
      description: "平衡的监控策略，适合大多数场景",
      icon: Gauge,
      color: "text-blue-500",
      config: {
        errorRate: "5",
        latency: "3000",
        errorCount: "10",
        timeWindow: "5",
        cooldown: "30",
      },
    },
    {
      id: "relaxed",
      name: "宽松监控",
      description: "低敏感度，适合开发测试环境",
      icon: Server,
      color: "text-green-500",
      config: {
        errorRate: "15",
        latency: "5000",
        errorCount: "30",
        timeWindow: "10",
        cooldown: "60",
      },
    },
    {
      id: "latency-focus",
      name: "延迟优先",
      description: "专注延迟监控，适合实时性要求高的服务",
      icon: Clock,
      color: "text-yellow-500",
      config: {
        errorRate: "",
        latency: "500",
        errorCount: "",
        timeWindow: "3",
        cooldown: "15",
      },
    },
    {
      id: "error-focus",
      name: "错误优先",
      description: "专注错误监控，适合稳定性要求高的服务",
      icon: AlertTriangle,
      color: "text-orange-500",
      config: {
        errorRate: "2",
        latency: "",
        errorCount: "5",
        timeWindow: "5",
        cooldown: "20",
      },
    },
  ];

  const applyTemplate = (template: typeof alertTemplates[0]) => {
    setFormName(template.name);
    setFormErrorRate(template.config.errorRate);
    setFormLatency(template.config.latency);
    setFormErrorCount(template.config.errorCount);
    setFormTimeWindow(template.config.timeWindow);
    setFormCooldown(template.config.cooldown);
    setShowCreateDialog(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              API 告警 {agentName && `- ${agentName}`}
            </DialogTitle>
            <DialogDescription>
              配置告警规则，当 API 性能指标超过阈值时发送邮件通知
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="rules" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="templates" className="gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                快速模板
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                告警规则
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="h-3.5 w-3.5" />
                告警历史
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="flex-1 overflow-auto mt-0 pt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">告警模板</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      选择预设模板快速创建告警规则
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {alertTemplates.map((template) => {
                    const IconComponent = template.icon;
                    return (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        className="p-4 rounded-lg border bg-card hover:border-primary/50 cursor-pointer transition-all"
                        onClick={() => applyTemplate(template)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn("p-2 rounded-lg bg-muted", template.color)}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{template.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {template.description}
                            </p>
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {template.config.errorRate && (
                                <Badge variant="secondary" className="text-[10px]">
                                  错误率 &gt; {template.config.errorRate}%
                                </Badge>
                              )}
                              {template.config.latency && (
                                <Badge variant="secondary" className="text-[10px]">
                                  延迟 &gt; {template.config.latency}ms
                                </Badge>
                              )}
                              {template.config.errorCount && (
                                <Badge variant="secondary" className="text-[10px]">
                                  错误数 &gt; {template.config.errorCount}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="rules" className="flex-1 overflow-hidden mt-0 pt-4">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">告警规则列表</h3>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => checkAlerts.mutate({ agentId: agentId || undefined })}
                      disabled={checkAlerts.isPending}
                      className="gap-1.5"
                    >
                      {checkAlerts.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      立即检查
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        resetForm();
                        setShowCreateDialog(true);
                      }}
                      className="gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      创建规则
                    </Button>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : rules.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">尚未创建告警规则</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        创建告警规则后，当 API 指标异常时将收到邮件通知
                      </p>
                      <Button
                        onClick={() => {
                          resetForm();
                          setShowCreateDialog(true);
                        }}
                        className="gap-1.5"
                      >
                        <Plus className="h-4 w-4" />
                        创建第一个规则
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rules.map((rule) => (
                        <motion.div
                          key={rule.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "p-4 rounded-lg border transition-all",
                            rule.is_active
                              ? "bg-card border-border"
                              : "bg-muted/30 border-muted opacity-60"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">{rule.name}</span>
                                <Badge
                                  variant={rule.is_active ? "default" : "secondary"}
                                  className="text-[10px]"
                                >
                                  {rule.is_active ? "启用" : "禁用"}
                                </Badge>
                                {rule.notification_enabled && (
                                  <Badge variant="outline" className="text-[10px] gap-1">
                                    <Mail className="h-2.5 w-2.5" />
                                    通知开启
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-4 mb-3 text-xs">
                                {rule.error_rate_threshold && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <AlertTriangle className="h-3 w-3 text-destructive" />
                                    <span>错误率 &gt; {rule.error_rate_threshold}%</span>
                                  </div>
                                )}
                                {rule.latency_threshold_ms && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Clock className="h-3 w-3 text-warning" />
                                    <span>延迟 &gt; {rule.latency_threshold_ms}ms</span>
                                  </div>
                                )}
                                {rule.error_count_threshold && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <Activity className="h-3 w-3 text-destructive" />
                                    <span>错误数 &gt; {rule.error_count_threshold}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {rule.notification_email}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {rule.time_window_minutes} 分钟窗口
                                </span>
                                <span className="flex items-center gap-1">
                                  <Zap className="h-3 w-3" />
                                  {rule.total_alerts_sent} 次触发
                                </span>
                                {rule.last_triggered_at && (
                                  <span className="flex items-center gap-1">
                                    <History className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(rule.last_triggered_at), {
                                      addSuffix: true,
                                      locale: zhCN,
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedRuleId(rule.id)}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditRule(rule)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleToggleActive(rule)}
                              >
                                {rule.is_active ? (
                                  <ToggleRight className="h-4 w-4 text-green-500" />
                                ) : (
                                  <ToggleLeft className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteRuleId(rule.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-hidden mt-0 pt-4">
              <ScrollArea className="h-full">
                {/* 趋势图 */}
                <div className="mb-4">
                  <AlertTrendChart logs={logs} />
                </div>

                {selectedRuleId ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium">
                        告警历史 - {rules.find(r => r.id === selectedRuleId)?.name}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRuleId(null)}
                      >
                        <X className="h-4 w-4 mr-1" />
                        清除筛选
                      </Button>
                    </div>
                    {logs.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        暂无告警记录
                      </div>
                    ) : (
                      logs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge
                                  variant="destructive"
                                  className="text-[10px]"
                                >
                                  {alertTypeLabels[log.alert_type]}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(log.created_at), {
                                    addSuffix: true,
                                    locale: zhCN,
                                  })}
                                </span>
                                {log.notification_sent ? (
                                  <Badge variant="outline" className="text-[10px] text-status-executing">
                                    <Check className="h-2.5 w-2.5 mr-0.5" />
                                    已通知
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-destructive">
                                    <X className="h-2.5 w-2.5 mr-0.5" />
                                    通知失败
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm">
                                <span className="text-muted-foreground">阈值:</span>{" "}
                                <span>{log.threshold_value}{alertTypeUnits[log.alert_type]}</span>
                                <span className="mx-2">→</span>
                                <span className="text-muted-foreground">实际:</span>{" "}
                                <span className="text-destructive font-medium">
                                  {log.actual_value.toFixed(2)}{alertTypeUnits[log.alert_type]}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                采样: {log.sample_size} 次调用
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">选择告警规则查看历史</h3>
                    <p className="text-sm text-muted-foreground">
                      点击规则列表中的历史图标查看该规则的告警记录
                    </p>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowCreateDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "编辑告警规则" : "创建告警规则"}
            </DialogTitle>
            <DialogDescription>
              配置告警条件和通知方式
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>规则名称</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="默认告警规则"
              />
            </div>

            <div className="space-y-2">
              <Label>通知邮箱 *</Label>
              <Input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="alerts@example.com"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  错误率阈值 (%)
                </Label>
                <Input
                  type="number"
                  value={formErrorRate}
                  onChange={(e) => setFormErrorRate(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-warning" />
                  延迟阈值 (ms)
                </Label>
                <Input
                  type="number"
                  value={formLatency}
                  onChange={(e) => setFormLatency(e.target.value)}
                  placeholder="3000"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-destructive" />
                  错误数阈值
                </Label>
                <Input
                  type="number"
                  value={formErrorCount}
                  onChange={(e) => setFormErrorCount(e.target.value)}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>时间窗口 (分钟)</Label>
                <Input
                  type="number"
                  value={formTimeWindow}
                  onChange={(e) => setFormTimeWindow(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div className="space-y-2">
                <Label>冷却时间 (分钟)</Label>
                <Input
                  type="number"
                  value={formCooldown}
                  onChange={(e) => setFormCooldown(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              resetForm();
              setShowCreateDialog(false);
            }}>
              取消
            </Button>
            <Button
              onClick={editingRule ? handleUpdateRule : handleCreateRule}
              disabled={!formEmail || createRule.isPending || updateRule.isPending}
            >
              {(createRule.isPending || updateRule.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingRule ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除告警规则？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将停止该规则的告警检查，历史记录也将被删除。此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRule}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
