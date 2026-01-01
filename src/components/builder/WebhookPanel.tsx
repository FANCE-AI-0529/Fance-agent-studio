import { useState } from "react";
import {
  Webhook,
  Plus,
  Trash2,
  Settings,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ToggleLeft,
  ToggleRight,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  RefreshCw,
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  useAgentWebhooks,
  useWebhookLogs,
  useCreateWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  WEBHOOK_EVENTS,
  AgentWebhook,
} from "@/hooks/useAgentWebhooks";
import { toast } from "sonner";

interface WebhookPanelProps {
  agentId: string | null;
  agentName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function WebhookPanel({
  agentId,
  agentName,
  isOpen,
  onClose,
}: WebhookPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<AgentWebhook | null>(null);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());

  // Form state
  const [formName, setFormName] = useState("Default Webhook");
  const [formUrl, setFormUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>(["task.completed"]);

  const { data: webhooks = [], isLoading } = useAgentWebhooks(agentId);
  const { data: logs = [] } = useWebhookLogs(selectedWebhookId);
  const createWebhook = useCreateWebhook();
  const updateWebhook = useUpdateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();

  const resetForm = () => {
    setFormName("Default Webhook");
    setFormUrl("");
    setFormSecret("");
    setFormEvents(["task.completed"]);
    setEditingWebhook(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (webhook: AgentWebhook) => {
    setFormName(webhook.name);
    setFormUrl(webhook.url);
    setFormSecret(webhook.secret || "");
    setFormEvents(webhook.events);
    setEditingWebhook(webhook);
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    if (!agentId || !formUrl) return;

    if (editingWebhook) {
      await updateWebhook.mutateAsync({
        id: editingWebhook.id,
        agentId,
        name: formName,
        url: formUrl,
        secret: formSecret || null,
        events: formEvents,
      });
    } else {
      await createWebhook.mutateAsync({
        agentId,
        name: formName,
        url: formUrl,
        events: formEvents,
        secret: formSecret || undefined,
      });
    }
    setShowCreateDialog(false);
    resetForm();
  };

  const handleToggleActive = async (webhook: AgentWebhook) => {
    await updateWebhook.mutateAsync({
      id: webhook.id,
      agentId: webhook.agent_id,
      is_active: !webhook.is_active,
    });
  };

  const handleDelete = async () => {
    if (!deleteWebhookId || !agentId) return;
    await deleteWebhook.mutateAsync({ id: deleteWebhookId, agentId });
    setDeleteWebhookId(null);
  };

  const handleTest = async (webhook: AgentWebhook) => {
    await testWebhook.mutateAsync({ webhook });
  };

  const toggleSecretVisibility = (id: string) => {
    setShowSecrets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getSuccessRate = (webhook: AgentWebhook) => {
    if (webhook.total_triggers === 0) return null;
    return Math.round((webhook.successful_triggers / webhook.total_triggers) * 100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            Webhook 管理 {agentName && `- ${agentName}`}
          </DialogTitle>
          <DialogDescription>
            配置 Webhook 回调，在任务完成时自动通知您的服务
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="webhooks" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="webhooks" className="gap-1.5">
              <Webhook className="h-3.5 w-3.5" />
              Webhook 列表
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              调用日志
            </TabsTrigger>
          </TabsList>

          <TabsContent value="webhooks" className="flex-1 overflow-hidden mt-0 pt-4">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Webhook 列表</h3>
                <Button size="sm" onClick={handleOpenCreate} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  添加 Webhook
                </Button>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : webhooks.length === 0 ? (
                  <div className="text-center py-12">
                    <Webhook className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">尚未配置 Webhook</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      添加 Webhook 后，任务完成时会自动通知您的服务
                    </p>
                    <Button onClick={handleOpenCreate} className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      添加第一个 Webhook
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {webhooks.map((webhook) => {
                      const successRate = getSuccessRate(webhook);
                      return (
                        <div
                          key={webhook.id}
                          className={cn(
                            "p-4 rounded-lg border transition-all",
                            webhook.is_active
                              ? "bg-card border-border"
                              : "bg-muted/30 border-muted opacity-60"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium">{webhook.name}</span>
                                <Badge
                                  variant={webhook.is_active ? "default" : "secondary"}
                                  className="text-[10px]"
                                >
                                  {webhook.is_active ? "启用" : "禁用"}
                                </Badge>
                                {successRate !== null && (
                                  <Badge
                                    variant={successRate >= 90 ? "default" : successRate >= 50 ? "secondary" : "destructive"}
                                    className="text-[10px]"
                                  >
                                    {successRate}% 成功率
                                  </Badge>
                                )}
                              </div>

                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono block truncate mb-2">
                                {webhook.url}
                              </code>

                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                {webhook.events.map((event) => (
                                  <Badge key={event} variant="outline" className="text-[10px]">
                                    {WEBHOOK_EVENTS.find((e) => e.value === event)?.label || event}
                                  </Badge>
                                ))}
                              </div>

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  {webhook.successful_triggers}
                                </span>
                                <span className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3 text-destructive" />
                                  {webhook.failed_triggers}
                                </span>
                                {webhook.last_triggered_at && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(webhook.last_triggered_at), {
                                      addSuffix: true,
                                      locale: zhCN,
                                    })}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleTest(webhook)}
                                      disabled={testWebhook.isPending}
                                    >
                                      {testWebhook.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Play className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>发送测试</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleOpenEdit(webhook)}
                                    >
                                      <Settings className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>编辑</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleToggleActive(webhook)}
                                    >
                                      {webhook.is_active ? (
                                        <ToggleRight className="h-4 w-4 text-green-500" />
                                      ) : (
                                        <ToggleLeft className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {webhook.is_active ? "禁用" : "启用"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => setDeleteWebhookId(webhook.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>删除</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="flex-1 overflow-hidden mt-0 pt-4">
            <div className="flex flex-col h-full">
              {webhooks.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    添加 Webhook 后可查看调用日志
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      选择 Webhook 查看日志
                    </Label>
                    <select
                      value={selectedWebhookId || ""}
                      onChange={(e) => setSelectedWebhookId(e.target.value || null)}
                      className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="">选择 Webhook...</option>
                      {webhooks.map((webhook) => (
                        <option key={webhook.id} value={webhook.id}>
                          {webhook.name} ({webhook.total_triggers} 次触发)
                        </option>
                      ))}
                    </select>
                  </div>

                  <ScrollArea className="flex-1">
                    {!selectedWebhookId ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        请选择一个 Webhook 查看调用日志
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        此 Webhook 暂无调用记录
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-lg border border-border bg-card text-sm"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {log.success ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-destructive" />
                                )}
                                <Badge variant="outline" className="text-[10px]">
                                  {log.event_type}
                                </Badge>
                                {log.response_status && (
                                  <Badge
                                    variant={log.response_status < 400 ? "default" : "destructive"}
                                    className="text-[10px]"
                                  >
                                    HTTP {log.response_status}
                                  </Badge>
                                )}
                                {log.attempt_number > 1 && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    第 {log.attempt_number} 次尝试
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(log.created_at), {
                                  addSuffix: true,
                                  locale: zhCN,
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {log.latency_ms && <span>{log.latency_ms}ms</span>}
                            </div>
                            {log.error_message && (
                              <div className="mt-2 text-xs text-destructive">
                                {log.error_message}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingWebhook ? "编辑 Webhook" : "添加 Webhook"}
              </DialogTitle>
              <DialogDescription>
                配置 Webhook URL 和触发事件
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>名称</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="例如：任务通知"
                />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://example.com/webhook"
                />
              </div>
              <div className="space-y-2">
                <Label>签名密钥 (可选)</Label>
                <Input
                  type="password"
                  value={formSecret}
                  onChange={(e) => setFormSecret(e.target.value)}
                  placeholder="用于验证 Webhook 请求签名"
                />
                <p className="text-xs text-muted-foreground">
                  设置后，每个请求会包含 X-Webhook-Signature 头
                </p>
              </div>
              <div className="space-y-2">
                <Label>触发事件</Label>
                <div className="grid grid-cols-2 gap-2">
                  {WEBHOOK_EVENTS.map((event) => (
                    <label
                      key={event.value}
                      className="flex items-center gap-2 p-2 rounded border border-border cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={formEvents.includes(event.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormEvents([...formEvents, event.value]);
                          } else {
                            setFormEvents(formEvents.filter((e) => e !== event.value));
                          }
                        }}
                      />
                      <span className="text-sm">{event.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                取消
              </Button>
              <Button
                onClick={handleSave}
                disabled={!formUrl || formEvents.length === 0 || createWebhook.isPending || updateWebhook.isPending}
              >
                {(createWebhook.isPending || updateWebhook.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {editingWebhook ? "保存" : "创建"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteWebhookId} onOpenChange={() => setDeleteWebhookId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                确认删除 Webhook
              </AlertDialogTitle>
              <AlertDialogDescription>
                删除后将停止向此 URL 发送通知，此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
