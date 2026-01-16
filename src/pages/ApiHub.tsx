import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Key, 
  Copy, 
  Check, 
  Plus, 
  Activity, 
  Clock, 
  ExternalLink,
  Bot,
  Code,
  FileCode,
  Terminal,
  Loader2,
  MoreVertical,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Play
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  useAgentApiKeys, 
  useCreateAgentApiKey, 
  useUpdateAgentApiKey,
  useDeleteAgentApiKey,
  useAgentApiStats 
} from "@/hooks/useAgentApi";
import { toast } from "sonner";
import { format } from "date-fns";

interface Agent {
  id: string;
  name: string;
  status: string;
  model: string;
  created_at: string;
}

export default function ApiHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  // Store newly created key for one-time display
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  
  // API Tester state
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [selectedTestKey, setSelectedTestKey] = useState<string | null>(null);

  // Fetch deployed agents
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ["deployed-agents"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("author_id", user.id)
        .eq("status", "deployed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Agent[];
    },
    enabled: !!user,
  });

  // Auto-select first agent
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const { data: apiKeys = [], isLoading: keysLoading } = useAgentApiKeys(selectedAgentId);
  const { data: stats } = useAgentApiStats(selectedAgentId);
  const createKey = useCreateAgentApiKey();
  const updateKey = useUpdateAgentApiKey();
  const deleteKey = useDeleteAgentApiKey();

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const projectId = "izkiwlbxkeczzttryhbi";
  const apiEndpoint = `https://${projectId}.supabase.co/functions/v1/agent-api`;

  const handleCreateKey = async () => {
    if (!selectedAgentId || !newKeyName.trim()) return;
    const result = await createKey.mutateAsync({ 
      agentId: selectedAgentId, 
      name: newKeyName.trim() 
    });
    // Store the full key for one-time display
    setNewlyCreatedKey(result.api_key);
    setShowCreateDialog(false);
    setNewKeyName("");
  };

  const handleCopyNewKey = async () => {
    if (!newlyCreatedKey) return;
    await navigator.clipboard.writeText(newlyCreatedKey);
    setCopiedKey(newlyCreatedKey);
    toast.success("API 密钥已复制 - 请妥善保存！");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCloseNewKeyDialog = () => {
    setNewlyCreatedKey(null);
  };

  const handleTestApi = async () => {
    if (!selectedTestKey || !testMessage.trim()) return;
    
    setIsTesting(true);
    setTestResponse(null);
    
    try {
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${selectedTestKey}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: testMessage }],
        }),
      });
      
      const data = await response.json();
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setTestResponse(JSON.stringify({ error: String(error) }, null, 2));
    } finally {
      setIsTesting(false);
    }
  };

  const generateCurlExample = (apiKey: string) => {
    return `curl -X POST "${apiEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "messages": [
      {"role": "user", "content": "你好，请介绍一下你自己"}
    ],
    "stream": false
  }'`;
  };

  const generateJsExample = (apiKey: string) => {
    return `const response = await fetch("${apiEndpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${apiKey}",
  },
  body: JSON.stringify({
    messages: [
      { role: "user", content: "你好，请介绍一下你自己" }
    ],
    stream: false
  }),
});

const data = await response.json();
console.log(data.choices[0].message.content);`;
  };

  const generatePythonExample = (apiKey: string) => {
    return `import requests

response = requests.post(
    "${apiEndpoint}",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer ${apiKey}",
    },
    json={
        "messages": [
            {"role": "user", "content": "你好，请介绍一下你自己"}
        ],
        "stream": False
    }
)

data = response.json()
print(data["choices"][0]["message"]["content"])`;
  };

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Bot className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">暂无已部署的智能体</h2>
        <p className="text-muted-foreground text-center max-w-md">
          您需要先在 Agent 构建器中创建并部署智能体，才能生成 API 接口
        </p>
        <Button onClick={() => navigate("/builder")}>
          <Plus className="h-4 w-4 mr-2" />
          创建智能体
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API 中心</h1>
          <p className="text-muted-foreground">管理智能体 API 密钥，获取调用接口</p>
        </div>
        <Select value={selectedAgentId || ""} onValueChange={setSelectedAgentId}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="选择智能体" />
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

      {/* Stats Cards */}
      {selectedAgent && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalKeys || 0}</p>
                  <p className="text-sm text-muted-foreground">API 密钥</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-status-success/10">
                  <Activity className="h-5 w-5 text-status-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalCalls || 0}</p>
                  <p className="text-sm text-muted-foreground">总调用次数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cognitive/10">
                  <Bot className="h-5 w-5 text-cognitive" />
                </div>
                <div>
                  <p className="text-sm font-medium truncate">{selectedAgent.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedAgent.model}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {stats?.lastUsed 
                      ? format(new Date(stats.lastUsed), "MM/dd HH:mm")
                      : "从未使用"}
                  </p>
                  <p className="text-sm text-muted-foreground">最后调用</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys" className="gap-2">
            <Key className="h-4 w-4" />
            API 密钥
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <FileCode className="h-4 w-4" />
            接口文档
          </TabsTrigger>
          <TabsTrigger value="test" className="gap-2">
            <Play className="h-4 w-4" />
            在线测试
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              API 密钥用于验证对智能体接口的调用请求
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建密钥
            </Button>
          </div>

          {keysLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : apiKeys.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Key className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">尚未创建 API 密钥</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  创建一个 API 密钥以开始调用智能体接口
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建第一个密钥
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Key className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{key.name}</span>
                              <Badge variant={key.is_active ? "default" : "secondary"}>
                                {key.is_active ? "活跃" : "已禁用"}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-sm text-muted-foreground font-mono">
                                {key.api_key_prefix}
                              </code>
                              <Badge variant="outline" className="text-xs">
                                已加密
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <p className="font-medium">{key.total_calls} 次调用</p>
                            <p className="text-muted-foreground">
                              {key.last_used_at 
                                ? format(new Date(key.last_used_at), "MM/dd HH:mm")
                                : "从未使用"}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => updateKey.mutate({ 
                                  id: key.id, 
                                  isActive: !key.is_active 
                                })}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                {key.is_active ? "禁用密钥" : "启用密钥"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteKey.mutate({ 
                                  id: key.id, 
                                  agentId: key.agent_id 
                                })}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除密钥
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Docs Tab */}
        <TabsContent value="docs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API 端点</CardTitle>
              <CardDescription>使用以下端点调用智能体</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <code className="flex-1 text-sm font-mono">{apiEndpoint}</code>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(apiEndpoint);
                    toast.success("已复制端点地址");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">代码示例</CardTitle>
              <CardDescription>选择您熟悉的语言快速开始</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="curl">
                <TabsList className="mb-4">
                  <TabsTrigger value="curl">
                    <Terminal className="h-4 w-4 mr-2" />
                    cURL
                  </TabsTrigger>
                  <TabsTrigger value="js">
                    <Code className="h-4 w-4 mr-2" />
                    JavaScript
                  </TabsTrigger>
                  <TabsTrigger value="python">
                    <FileCode className="h-4 w-4 mr-2" />
                    Python
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="curl">
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                      <code>{generateCurlExample("YOUR_API_KEY")}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(generateCurlExample("YOUR_API_KEY"));
                        toast.success("已复制代码");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="js">
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                      <code>{generateJsExample("YOUR_API_KEY")}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(generateJsExample("YOUR_API_KEY"));
                        toast.success("已复制代码");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="python">
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                      <code>{generatePythonExample("YOUR_API_KEY")}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(generatePythonExample("YOUR_API_KEY"));
                        toast.success("已复制代码");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">请求参数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                  <span>参数名</span>
                  <span>类型</span>
                  <span>必填</span>
                  <span>说明</span>
                </div>
                {[
                  { name: "messages", type: "array", required: "是", desc: "对话消息数组" },
                  { name: "stream", type: "boolean", required: "否", desc: "是否流式返回，默认 false" },
                  { name: "temperature", type: "number", required: "否", desc: "温度参数，0-2，默认 0.7" },
                  { name: "max_tokens", type: "number", required: "否", desc: "最大 token 数" },
                ].map((param) => (
                  <div key={param.name} className="grid grid-cols-4 gap-4 text-sm py-2 border-b border-border/50">
                    <code className="text-primary">{param.name}</code>
                    <span className="text-muted-foreground">{param.type}</span>
                    <span>{param.required}</span>
                    <span>{param.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">API 在线测试</CardTitle>
              <CardDescription>直接在浏览器中测试智能体接口</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>输入 API 密钥</Label>
                  <Input
                    type="password"
                    placeholder="粘贴您的 API 密钥..."
                    value={selectedTestKey || ""}
                    onChange={(e) => setSelectedTestKey(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    出于安全考虑，API 密钥不会被存储。请粘贴您在创建时保存的密钥。
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>测试消息</Label>
                  <Textarea
                    placeholder="输入要发送给智能体的消息..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleTestApi}
                  disabled={!selectedTestKey || !testMessage.trim() || isTesting}
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      请求中...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      发送请求
                    </>
                  )}
                </Button>
              </div>

              {testResponse && (
                <div className="space-y-2">
                  <Label>响应结果</Label>
                  <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm max-h-80">
                    <code>{testResponse}</code>
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建 API 密钥</DialogTitle>
            <DialogDescription>
              为智能体「{selectedAgent?.name}」创建新的 API 密钥
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>密钥名称</Label>
              <Input
                placeholder="例如：生产环境密钥"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
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
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "创建"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
