import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Eye,
  EyeOff,
  Activity,
  Clock,
  Shield,
  Code2,
  ExternalLink,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  FileText,
  Loader2,
  X,
  AlertTriangle,
  Plug,
  Boxes,
  BarChart3,
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
  useAgentApiKeys,
  useCreateAgentApiKey,
  useUpdateAgentApiKey,
  useDeleteAgentApiKey,
  useAgentApiLogs,
  useAgentApiStats,
} from "@/hooks/useAgentApi";
import { toast } from "sonner";
import { ApiStatsDashboard } from "./ApiStatsDashboard";

interface AgentApiPanelProps {
  agentId: string | null;
  agentName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AgentApiPanel({
  agentId,
  agentName,
  isOpen,
  onClose,
}: AgentApiPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("Default API Key");
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // Store newly created key for one-time display
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);

  const { data: apiKeys = [], isLoading } = useAgentApiKeys(agentId);
  const { data: stats } = useAgentApiStats(agentId);
  const { data: logs = [] } = useAgentApiLogs(selectedKeyId);
  const createKey = useCreateAgentApiKey();
  const updateKey = useUpdateAgentApiKey();
  const deleteKey = useDeleteAgentApiKey();

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const apiEndpoint = `${baseUrl}/functions/v1/agent-api`;
  const mcpEndpoint = `${baseUrl}/functions/v1/agent-mcp`;

  const handleCreateKey = async () => {
    if (!agentId) return;
    const result = await createKey.mutateAsync({
      agentId,
      name: newKeyName,
    });
    // Store the full key for one-time display
    setNewlyCreatedKey(result.api_key);
    setShowCreateDialog(false);
    setNewKeyName("Default API Key");
  };

  const handleCopyNewKey = async () => {
    if (!newlyCreatedKey) return;
    await navigator.clipboard.writeText(newlyCreatedKey);
    toast.success("API 密钥已复制 - 请妥善保存！");
  };

  const handleCloseNewKeyDialog = () => {
    setNewlyCreatedKey(null);
  };

  const handleToggleActive = async (keyId: string, currentActive: boolean) => {
    await updateKey.mutateAsync({
      id: keyId,
      isActive: !currentActive,
    });
  };

  const handleDeleteKey = async () => {
    if (!deleteKeyId || !agentId) return;
    await deleteKey.mutateAsync({ id: deleteKeyId, agentId });
    setDeleteKeyId(null);
    if (selectedKeyId === deleteKeyId) {
      setSelectedKeyId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            API 管理 {agentName && `- ${agentName}`}
          </DialogTitle>
          <DialogDescription>
            将智能体封装为 API，通过 HTTP 请求调用智能体能力
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="keys" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="keys" className="gap-1.5">
              <Key className="h-3.5 w-3.5" />
              API 密钥
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              统计仪表盘
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              REST API
            </TabsTrigger>
            <TabsTrigger value="mcp" className="gap-1.5">
              <Plug className="h-3.5 w-3.5" />
              MCP 协议
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              调用日志
            </TabsTrigger>
          </TabsList>

          {/* Stats bar */}
          {stats && (
            <div className="flex items-center gap-4 py-2 px-1 border-b border-border text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Key className="h-3 w-3" />
                <span>{stats.totalKeys} 个密钥</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="h-3 w-3" />
                <span>{stats.totalCalls.toLocaleString()} 次调用</span>
              </div>
              {stats.lastUsed && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  <span>
                    最后调用{" "}
                    {formatDistanceToNow(new Date(stats.lastUsed), {
                      addSuffix: true,
                      locale: zhCN,
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          <TabsContent value="keys" className="flex-1 overflow-hidden mt-0 pt-4">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">API 密钥列表</h3>
                <Button
                  size="sm"
                  onClick={() => setShowCreateDialog(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  创建密钥
                </Button>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="text-center py-12">
                    <Key className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">尚未创建 API 密钥</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      创建 API 密钥后，您可以通过 HTTP 请求调用此智能体
                    </p>
                    <Button onClick={() => setShowCreateDialog(true)} className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      创建第一个密钥
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <motion.div
                        key={key.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "p-4 rounded-lg border transition-all",
                          key.is_active
                            ? "bg-card border-border"
                            : "bg-muted/30 border-muted opacity-60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium">{key.name}</span>
                              <Badge
                                variant={key.is_active ? "default" : "secondary"}
                                className="text-[10px]"
                              >
                                {key.is_active ? "启用" : "禁用"}
                              </Badge>
                              {key.expires_at && new Date(key.expires_at) < new Date() && (
                                <Badge variant="destructive" className="text-[10px]">
                                  已过期
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 mb-2">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono flex-1 truncate">
                                {key.api_key_prefix}
                              </code>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="outline" className="text-[10px] cursor-help">
                                      <Shield className="h-3 w-3 mr-1" />
                                      已加密
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    API 密钥已安全加密存储，仅在创建时显示一次
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                {key.total_calls.toLocaleString()} 次调用
                              </span>
                              {key.last_used_at && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(key.last_used_at), {
                                    addSuffix: true,
                                    locale: zhCN,
                                  })}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {key.rate_limit}/分钟
                              </span>
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
                                    onClick={() => handleToggleActive(key.id, key.is_active)}
                                  >
                                    {key.is_active ? (
                                      <ToggleRight className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <ToggleLeft className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {key.is_active ? "禁用密钥" : "启用密钥"}
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
                                    onClick={() => setDeleteKeyId(key.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>删除密钥</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="flex-1 overflow-auto mt-0 pt-4">
            <ApiStatsDashboard 
              agentId={agentId} 
              apiKeyIds={apiKeys.map(k => k.id)} 
            />
          </TabsContent>

          <TabsContent value="docs" className="flex-1 overflow-auto mt-0 pt-4">
            <div className="space-y-6 max-w-3xl">
              <div>
                <h3 className="text-lg font-semibold mb-3">API 端点</h3>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="text-sm flex-1 font-mono">{apiEndpoint}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(apiEndpoint);
                      toast.success("已复制端点地址");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">请求示例</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">cURL</Label>
                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
{`curl -X POST "${apiEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "messages": [
      {"role": "user", "content": "你好，请介绍一下你自己"}
    ],
    "stream": false
  }'`}
                    </pre>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">JavaScript/TypeScript</Label>
                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
{`const response = await fetch("${apiEndpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_API_KEY"
  },
  body: JSON.stringify({
    messages: [
      { role: "user", content: "你好，请介绍一下你自己" }
    ],
    stream: false,
    temperature: 0.7,
    max_tokens: 4096
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`}
                    </pre>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">Python</Label>
                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
{`import requests

response = requests.post(
    "${apiEndpoint}",
    headers={
        "Content-Type": "application/json",
        "x-api-key": "YOUR_API_KEY"
    },
    json={
        "messages": [
            {"role": "user", "content": "你好，请介绍一下你自己"}
        ],
        "stream": False
    }
)

data = response.json()
print(data["choices"][0]["message"]["content"])`}
                    </pre>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">请求参数</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">参数</th>
                        <th className="text-left p-3 font-medium">类型</th>
                        <th className="text-left p-3 font-medium">必填</th>
                        <th className="text-left p-3 font-medium">说明</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-3 font-mono text-xs">messages</td>
                        <td className="p-3">array</td>
                        <td className="p-3">是</td>
                        <td className="p-3">对话消息数组</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-xs">stream</td>
                        <td className="p-3">boolean</td>
                        <td className="p-3">否</td>
                        <td className="p-3">是否启用流式响应，默认 false</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-xs">temperature</td>
                        <td className="p-3">number</td>
                        <td className="p-3">否</td>
                        <td className="p-3">温度参数 (0-1)，默认 0.7</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-xs">max_tokens</td>
                        <td className="p-3">number</td>
                        <td className="p-3">否</td>
                        <td className="p-3">最大生成 token 数，默认 4096</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">响应格式</h3>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
{`{
  "id": "agos-xxx",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "claude-3.5",
  "agent": {
    "id": "agent-uuid",
    "name": "智能体名称"
  },
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "AI 回复内容"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 100,
    "completion_tokens": 200,
    "total_tokens": 300
  }
}`}
                </pre>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mcp" className="flex-1 overflow-auto mt-0 pt-4">
            <div className="space-y-6 max-w-3xl">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  <Plug className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <h4 className="font-medium mb-1">MCP (Model Context Protocol) 支持</h4>
                    <p className="text-sm text-muted-foreground">
                      您的智能体已支持 MCP 协议，可以作为 MCP Server 被 Claude Desktop、Cursor 等工具直接调用。
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">MCP 端点</h3>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <code className="text-sm flex-1 font-mono">{mcpEndpoint}</code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(mcpEndpoint);
                      toast.success("已复制 MCP 端点地址");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Claude Desktop 配置</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  在 Claude Desktop 的配置文件中添加以下内容：
                </p>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
{`{
  "mcpServers": {
    "${agentName || 'my-agent'}": {
      "command": "npx",
      "args": [
        "-y",
        "@anthropic-ai/mcp-remote-client",
        "${mcpEndpoint}"
      ],
      "env": {
        "MCP_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}`}
                </pre>
                <p className="text-xs text-muted-foreground mt-2">
                  配置文件位置：macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">支持的 MCP 方法</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium">方法</th>
                        <th className="text-left p-3 font-medium">说明</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr>
                        <td className="p-3 font-mono text-xs">initialize</td>
                        <td className="p-3">初始化 MCP 会话，返回服务器能力</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-xs">tools/list</td>
                        <td className="p-3">获取智能体提供的所有工具列表</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-xs">tools/call</td>
                        <td className="p-3">调用指定工具执行任务</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-xs">resources/list</td>
                        <td className="p-3">获取可用资源列表</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-xs">resources/read</td>
                        <td className="p-3">读取指定资源内容</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-xs">prompts/list</td>
                        <td className="p-3">获取预设 prompt 模板列表</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-xs">prompts/get</td>
                        <td className="p-3">获取指定 prompt 详情</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">直接调用示例</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">初始化连接</Label>
                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
{`curl -X POST "${mcpEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "clientInfo": { "name": "my-client", "version": "1.0.0" }
    }
  }'`}
                    </pre>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">列出可用工具</Label>
                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
{`curl -X POST "${mcpEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list"
  }'`}
                    </pre>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground mb-2 block">调用 chat 工具</Label>
                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
{`curl -X POST "${mcpEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "chat",
      "arguments": {
        "message": "你好，请介绍一下你自己"
      }
    }
  }'`}
                    </pre>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">TypeScript/Node.js 客户端</h3>
                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto font-mono">
{`import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { HttpClientTransport } from "@anthropic-ai/mcp-remote-client";

const transport = new HttpClientTransport(
  new URL("${mcpEndpoint}"),
  { headers: { "x-api-key": "YOUR_API_KEY" } }
);

const client = new Client({ name: "my-app", version: "1.0.0" });
await client.connect(transport);

// 列出工具
const tools = await client.listTools();
console.log("Available tools:", tools);

// 调用工具
const result = await client.callTool("chat", {
  message: "你好，请介绍一下你自己"
});
console.log("Response:", result);`}
                </pre>
              </div>

              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Boxes className="h-4 w-4" />
                  智能体技能自动转换
                </h4>
                <p className="text-sm text-muted-foreground">
                  智能体配置的所有技能将自动转换为 MCP 工具。例如，名为 "文档分析" 的技能将可通过 
                  <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">tools/call</code> 
                  方法以 <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-xs">skill_文档分析</code> 
                  的名称调用。
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="flex-1 overflow-hidden mt-0 pt-4">
            <div className="flex flex-col h-full">
              {apiKeys.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    创建 API 密钥后可查看调用日志
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <Label className="text-sm text-muted-foreground mb-2 block">
                      选择密钥查看日志
                    </Label>
                    <select
                      value={selectedKeyId || ""}
                      onChange={(e) => setSelectedKeyId(e.target.value || null)}
                      className="w-full p-2 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="">选择密钥...</option>
                      {apiKeys.map((key) => (
                        <option key={key.id} value={key.id}>
                          {key.name} ({key.total_calls} 次调用)
                        </option>
                      ))}
                    </select>
                  </div>

                  <ScrollArea className="flex-1">
                    {!selectedKeyId ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        请选择一个 API 密钥查看调用日志
                      </div>
                    ) : logs.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-sm">
                        此密钥暂无调用记录
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {logs.map((log) => (
                          <div
                            key={log.id}
                            className="p-3 rounded-lg border border-border bg-card text-sm"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Badge
                                variant={log.status_code === 200 ? "default" : "destructive"}
                                className="text-[10px]"
                              >
                                {log.status_code}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(log.created_at), {
                                  addSuffix: true,
                                  locale: zhCN,
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {log.latency_ms && (
                                <span>{log.latency_ms}ms</span>
                              )}
                              {log.tokens_used && (
                                <span>{log.tokens_used} tokens</span>
                              )}
                              {log.ip_address && (
                                <span>{log.ip_address}</span>
                              )}
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

        {/* Create Key Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建 API 密钥</DialogTitle>
              <DialogDescription>
                创建一个新的 API 密钥用于调用此智能体
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>密钥名称</Label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="例如：生产环境密钥"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                取消
              </Button>
              <Button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || createKey.isPending}
              >
                {createKey.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                确认删除密钥
              </AlertDialogTitle>
              <AlertDialogDescription>
                删除后，使用此密钥的所有应用将无法继续调用 API。此操作无法撤销。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteKey}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认删除
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Newly Created Key Display - One Time Only */}
        <Dialog open={!!newlyCreatedKey} onOpenChange={handleCloseNewKeyDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-status-success">
                <Check className="h-5 w-5" />
                API 密钥创建成功
              </DialogTitle>
              <DialogDescription className="text-status-warning">
                ⚠️ 请立即复制并妥善保存此密钥！出于安全考虑，密钥仅显示一次，之后将无法再次查看。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>您的 API 密钥</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all select-all">
                    {newlyCreatedKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyNewKey}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                <p className="font-medium mb-1">安全提示：</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>密钥已加密存储，无法再次查看完整内容</li>
                  <li>请勿在公开代码或日志中暴露密钥</li>
                  <li>如果密钥泄露，请立即删除并创建新密钥</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCopyNewKey} className="w-full sm:w-auto">
                <Copy className="h-4 w-4 mr-2" />
                复制密钥
              </Button>
              <Button variant="outline" onClick={handleCloseNewKeyDialog}>
                我已保存，关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
