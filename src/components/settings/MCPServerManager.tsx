/**
 * @file MCPServerManager.tsx
 * @description MCP 服务器管理面板 - 用户配置和管理 MCP Server
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { Badge } from "../ui/badge.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog.tsx";
import { Separator } from "../ui/separator.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { useToast } from "../../hooks/use-toast.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { supabase } from "../../integrations/supabase/client.ts";
import { cn } from "../../lib/utils.ts";
import {
  Plus,
  Server,
  Globe,
  Terminal,
  Radio,
  Trash2,
  Pencil,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

// ========== 类型定义 ==========

interface MCPServer {
  id: string;
  user_id: string;
  name: string;
  version: string;
  transport_type: "http" | "sse" | "stdio";
  transport_url: string | null;
  transport_command: string | null;
  transport_args: string[] | null;
  runtime: string;
  scope: string;
  env_vars: unknown; // Json type from Supabase
  last_inspected_at: string | null;
  inspection_result: {
    tools?: Array<{ name: string; description?: string }>;
    resources?: Array<{ name: string }>;
    error?: string;
  } | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Helper to parse env_vars from Json
function parseEnvVars(envVars: unknown): Array<{ key: string; value: string }> {
  if (Array.isArray(envVars)) {
    return envVars.filter(
      (e): e is { key: string; value: string } =>
        typeof e === "object" && e !== null && "key" in e && "value" in e
    );
  }
  return [];
}

interface MCPServerFormData {
  name: string;
  transport_type: "http" | "sse" | "stdio";
  transport_url: string;
  transport_command: string;
  transport_args: string;
  runtime: string;
  env_vars: string;
}

const defaultFormData: MCPServerFormData = {
  name: "",
  transport_type: "http",
  transport_url: "",
  transport_command: "",
  transport_args: "",
  runtime: "node",
  env_vars: "",
};

// ========== 辅助组件 ==========

function TransportIcon({ type }: { type: string }) {
  switch (type) {
    case "http":
      return <Globe className="h-4 w-4" />;
    case "sse":
      return <Radio className="h-4 w-4" />;
    case "stdio":
      return <Terminal className="h-4 w-4" />;
    default:
      return <Server className="h-4 w-4" />;
  }
}

function TransportBadge({ type }: { type: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    http: { label: "HTTP", className: "bg-blue-500/10 text-blue-500" },
    sse: { label: "SSE", className: "bg-green-500/10 text-green-500" },
    stdio: { label: "stdio", className: "bg-orange-500/10 text-orange-500" },
  };
  const v = variants[type] || { label: type, className: "" };
  return (
    <Badge variant="outline" className={cn("text-xs", v.className)}>
      <TransportIcon type={type} />
      <span className="ml-1">{v.label}</span>
    </Badge>
  );
}

// ========== 服务器卡片 ==========

interface MCPServerCardProps {
  server: MCPServer;
  onInspect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isInspecting: boolean;
}

function MCPServerCard({
  server,
  onInspect,
  onEdit,
  onDelete,
  isInspecting,
}: MCPServerCardProps) {
  const toolCount = (server.inspection_result as MCPServer["inspection_result"])?.tools?.length || 0;
  const hasError = !!(server.inspection_result as MCPServer["inspection_result"])?.error;
  const lastInspected = server.last_inspected_at
    ? formatDistanceToNow(new Date(server.last_inspected_at), {
        addSuffix: true,
        locale: zhCN,
      })
    : null;

  return (
    <div className="border border-border rounded-lg p-4 space-y-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium flex items-center gap-2">
              {server.name}
              {!server.is_active && (
                <Badge variant="secondary" className="text-xs">
                  已禁用
                </Badge>
              )}
            </h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TransportBadge type={server.transport_type} />
              <span className="truncate max-w-[200px]">
                {server.transport_url || server.transport_command || "-"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Wrench className="h-3.5 w-3.5" />
          <span>工具: {toolCount} 个</span>
        </div>
        {lastInspected && (
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>探测: {lastInspected}</span>
          </div>
        )}
        {hasError && (
          <div className="flex items-center gap-1 text-destructive">
            <XCircle className="h-3.5 w-3.5" />
            <span>连接失败</span>
          </div>
        )}
      </div>

      {toolCount > 0 && server.inspection_result && (
        <div className="flex flex-wrap gap-1">
          {((server.inspection_result as MCPServer["inspection_result"])?.tools || []).slice(0, 5).map((tool) => (
            <Badge
              key={tool.name}
              variant="secondary"
              className="text-xs font-mono"
            >
              {tool.name}
            </Badge>
          ))}
          {toolCount > 5 && (
            <Badge variant="outline" className="text-xs">
              +{toolCount - 5} 更多
            </Badge>
          )}
        </div>
      )}

      {server.transport_type === "stdio" && (
        <div className="flex items-center gap-1 text-xs text-amber-500">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>stdio 类型仅支持本地运行</span>
        </div>
      )}

      <Separator />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onInspect}
          disabled={isInspecting}
        >
          {isInspecting ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1" />
          )}
          探测
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 mr-1" />
          编辑
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          删除
        </Button>
      </div>
    </div>
  );
}

// ========== 主组件 ==========

export function MCPServerManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 对话框状态
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);
  const [inspectingServerId, setInspectingServerId] = useState<string | null>(null);

  // 表单状态
  const [formData, setFormData] = useState<MCPServerFormData>(defaultFormData);

  // 获取服务器列表
  const { data: servers, isLoading } = useQuery({
    queryKey: ["user-mcp-servers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_mcp_servers")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as MCPServer[];
    },
    enabled: !!user?.id,
  });

  // 添加服务器
  const addServerMutation = useMutation({
    mutationFn: async (data: MCPServerFormData) => {
      if (!user?.id) throw new Error("未登录");

      const envVars = data.env_vars
        ? data.env_vars.split("\n").filter(Boolean).map((line) => {
            const [key, ...valueParts] = line.split("=");
            return { key: key.trim(), value: valueParts.join("=").trim() };
          })
        : [];

      const { error } = await supabase.from("user_mcp_servers").insert({
        user_id: user.id,
        name: data.name,
        transport_type: data.transport_type,
        transport_url: data.transport_type !== "stdio" ? data.transport_url : null,
        transport_command: data.transport_type === "stdio" ? data.transport_command : null,
        transport_args: data.transport_args
          ? data.transport_args.split(" ").filter(Boolean)
          : null,
        runtime: data.runtime,
        env_vars: envVars,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-mcp-servers"] });
      setShowAddDialog(false);
      setFormData(defaultFormData);
      toast({ title: "添加成功", description: "MCP 服务器已添加" });
    },
    onError: (error) => {
      toast({
        title: "添加失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 更新服务器
  const updateServerMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: MCPServerFormData;
    }) => {
      const envVars = data.env_vars
        ? data.env_vars.split("\n").filter(Boolean).map((line) => {
            const [key, ...valueParts] = line.split("=");
            return { key: key.trim(), value: valueParts.join("=").trim() };
          })
        : [];

      const { error } = await supabase
        .from("user_mcp_servers")
        .update({
          name: data.name,
          transport_type: data.transport_type,
          transport_url: data.transport_type !== "stdio" ? data.transport_url : null,
          transport_command: data.transport_type === "stdio" ? data.transport_command : null,
          transport_args: data.transport_args
            ? data.transport_args.split(" ").filter(Boolean)
            : null,
          runtime: data.runtime,
          env_vars: envVars,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-mcp-servers"] });
      setEditingServer(null);
      setFormData(defaultFormData);
      toast({ title: "更新成功", description: "MCP 服务器配置已更新" });
    },
    onError: (error) => {
      toast({
        title: "更新失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 删除服务器
  const deleteServerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("user_mcp_servers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-mcp-servers"] });
      setDeletingServerId(null);
      toast({ title: "删除成功", description: "MCP 服务器已删除" });
    },
    onError: (error) => {
      toast({
        title: "删除失败",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // 探测服务器
  const handleInspect = useCallback(
    async (serverId: string) => {
      setInspectingServerId(serverId);
      try {
        const { data, error } = await supabase.functions.invoke("mcp-inspect", {
          body: { serverId },
        });

        if (error) throw error;

        // 更新本地数据
        queryClient.invalidateQueries({ queryKey: ["user-mcp-servers"] });

        if (data?.tools?.length > 0) {
          toast({
            title: "探测成功",
            description: `发现 ${data.tools.length} 个工具`,
          });
        } else if (data?.error) {
          toast({
            title: "探测失败",
            description: data.error,
            variant: "destructive",
          });
        } else {
          toast({
            title: "探测完成",
            description: "未发现可用工具",
          });
        }
      } catch (error) {
        toast({
          title: "探测失败",
          description: error instanceof Error ? error.message : "未知错误",
          variant: "destructive",
        });
      } finally {
        setInspectingServerId(null);
      }
    },
    [queryClient, toast]
  );

  // 打开编辑对话框
  const handleEdit = (server: MCPServer) => {
    setEditingServer(server);
    setFormData({
      name: server.name,
      transport_type: server.transport_type,
      transport_url: server.transport_url || "",
      transport_command: server.transport_command || "",
      transport_args: server.transport_args?.join(" ") || "",
      runtime: server.runtime || "node",
      env_vars:
        parseEnvVars(server.env_vars).map((e) => `${e.key}=${e.value}`).join("\n") || "",
    });
  };

  // 表单提交
  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ title: "请输入服务器名称", variant: "destructive" });
      return;
    }

    if (
      formData.transport_type !== "stdio" &&
      !formData.transport_url.trim()
    ) {
      toast({ title: "请输入服务器 URL", variant: "destructive" });
      return;
    }

    if (
      formData.transport_type === "stdio" &&
      !formData.transport_command.trim()
    ) {
      toast({ title: "请输入启动命令", variant: "destructive" });
      return;
    }

    if (editingServer) {
      updateServerMutation.mutate({ id: editingServer.id, data: formData });
    } else {
      addServerMutation.mutate(formData);
    }
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingServer(null);
    setFormData(defaultFormData);
  };

  const isDialogOpen = showAddDialog || !!editingServer;
  const isSubmitting =
    addServerMutation.isPending || updateServerMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-5 w-5" />
              我的 MCP 服务器
            </CardTitle>
            <CardDescription>
              配置和管理您的 Model Context Protocol 服务器
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            添加服务器
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : servers && servers.length > 0 ? (
          <div className="space-y-3">
            {servers.map((server) => (
              <MCPServerCard
                key={server.id}
                server={server}
                onInspect={() => handleInspect(server.id)}
                onEdit={() => handleEdit(server)}
                onDelete={() => setDeletingServerId(server.id)}
                isInspecting={inspectingServerId === server.id}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Server className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>还没有配置 MCP 服务器</p>
            <p className="text-sm">点击「添加服务器」开始配置</p>
          </div>
        )}
      </CardContent>

      {/* 添加/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingServer ? "编辑 MCP 服务器" : "添加 MCP 服务器"}
            </DialogTitle>
            <DialogDescription>
              配置 MCP 服务器连接信息以启用工具调用
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">服务器名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例如: Email Server"
              />
            </div>

            <div className="space-y-2">
              <Label>传输类型</Label>
              <Select
                value={formData.transport_type}
                onValueChange={(v: "http" | "sse" | "stdio") =>
                  setFormData({ ...formData, transport_type: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      HTTP - 标准 HTTP 请求
                    </div>
                  </SelectItem>
                  <SelectItem value="sse">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4" />
                      SSE - 服务器推送事件
                    </div>
                  </SelectItem>
                  <SelectItem value="stdio">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      stdio - 本地进程
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.transport_type !== "stdio" ? (
              <div className="space-y-2">
                <Label htmlFor="url">服务器 URL</Label>
                <Input
                  id="url"
                  value={formData.transport_url}
                  onChange={(e) =>
                    setFormData({ ...formData, transport_url: e.target.value })
                  }
                  placeholder="https://mcp.example.com/v1"
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="command">启动命令</Label>
                  <Input
                    id="command"
                    value={formData.transport_command}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        transport_command: e.target.value,
                      })
                    }
                    placeholder="npx mcp-server"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="args">命令参数 (空格分隔)</Label>
                  <Input
                    id="args"
                    value={formData.transport_args}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        transport_args: e.target.value,
                      })
                    }
                    placeholder="--port 3000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>运行时</Label>
                  <Select
                    value={formData.runtime}
                    onValueChange={(v) =>
                      setFormData({ ...formData, runtime: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="node">Node.js</SelectItem>
                      <SelectItem value="bun">Bun</SelectItem>
                      <SelectItem value="python">Python</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="env">环境变量 (每行一个, KEY=VALUE)</Label>
              <Textarea
                id="env"
                value={formData.env_vars}
                onChange={(e) =>
                  setFormData({ ...formData, env_vars: e.target.value })
                }
                placeholder="API_KEY=xxx&#10;SECRET=yyy"
                rows={3}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingServer ? "保存修改" : "添加服务器"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认 */}
      <AlertDialog
        open={!!deletingServerId}
        onOpenChange={() => setDeletingServerId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复该 MCP 服务器配置，确定要删除吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingServerId && deleteServerMutation.mutate(deletingServerId)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteServerMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
