import { useState, useMemo } from "react";
import { Plus, Trash2, Terminal, Globe, Radio, Settings, Key, Wrench, FileBox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPEnvVar {
  name: string;
  description?: string;
  required?: boolean;
  default?: string;
}

export interface MCPConfig {
  name: string;
  version: string;
  description?: string;
  transport: {
    type: "stdio" | "sse" | "http";
    command?: string;
    args?: string[];
    url?: string;
  };
  runtime: "node" | "python" | "go" | "rust" | "csharp" | "java";
  scope: "local" | "cloud" | "embedded";
  is_official?: boolean;
  github_url?: string;
  tools?: MCPTool[];
  resources?: MCPResource[];
  envVars?: MCPEnvVar[];
}

interface MCPConfigEditorProps {
  config: MCPConfig;
  onChange: (config: MCPConfig) => void;
}

const transportIcons = {
  stdio: Terminal,
  sse: Radio,
  http: Globe,
};

const runtimeOptions = [
  { value: "node", label: "Node.js" },
  { value: "python", label: "Python" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "csharp", label: "C#" },
  { value: "java", label: "Java" },
];

const scopeOptions = [
  { value: "local", label: "本地运行" },
  { value: "cloud", label: "云端运行" },
  { value: "embedded", label: "嵌入式" },
];

export function MCPConfigEditor({ config, onChange }: MCPConfigEditorProps) {
  const [newToolName, setNewToolName] = useState("");
  const [newResourceUri, setNewResourceUri] = useState("");
  const [newEnvVarName, setNewEnvVarName] = useState("");

  const updateConfig = (updates: Partial<MCPConfig>) => {
    onChange({ ...config, ...updates });
  };

  const updateTransport = (updates: Partial<MCPConfig["transport"]>) => {
    onChange({
      ...config,
      transport: { ...config.transport, ...updates },
    });
  };

  const addTool = () => {
    if (!newToolName.trim()) return;
    const tools = config.tools || [];
    if (tools.some((t) => t.name === newToolName)) return;
    updateConfig({
      tools: [...tools, { name: newToolName, description: "" }],
    });
    setNewToolName("");
  };

  const removeTool = (name: string) => {
    updateConfig({
      tools: (config.tools || []).filter((t) => t.name !== name),
    });
  };

  const updateTool = (index: number, updates: Partial<MCPTool>) => {
    const tools = [...(config.tools || [])];
    tools[index] = { ...tools[index], ...updates };
    updateConfig({ tools });
  };

  const addResource = () => {
    if (!newResourceUri.trim()) return;
    const resources = config.resources || [];
    if (resources.some((r) => r.uri === newResourceUri)) return;
    updateConfig({
      resources: [...resources, { uri: newResourceUri, name: newResourceUri, description: "" }],
    });
    setNewResourceUri("");
  };

  const removeResource = (uri: string) => {
    updateConfig({
      resources: (config.resources || []).filter((r) => r.uri !== uri),
    });
  };

  const addEnvVar = () => {
    if (!newEnvVarName.trim()) return;
    const envVars = config.envVars || [];
    if (envVars.some((e) => e.name === newEnvVarName)) return;
    updateConfig({
      envVars: [...envVars, { name: newEnvVarName, description: "", required: false }],
    });
    setNewEnvVarName("");
  };

  const removeEnvVar = (name: string) => {
    updateConfig({
      envVars: (config.envVars || []).filter((e) => e.name !== name),
    });
  };

  const updateEnvVar = (index: number, updates: Partial<MCPEnvVar>) => {
    const envVars = [...(config.envVars || [])];
    envVars[index] = { ...envVars[index], ...updates };
    updateConfig({ envVars });
  };

  const TransportIcon = transportIcons[config.transport.type];

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Settings className="h-4 w-4" />
            基本信息
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={config.name}
                onChange={(e) => updateConfig({ name: e.target.value })}
                placeholder="mcp-server-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version">版本</Label>
              <Input
                id="version"
                value={config.version}
                onChange={(e) => updateConfig({ version: e.target.value })}
                placeholder="1.0.0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={config.description || ""}
              onChange={(e) => updateConfig({ description: e.target.value })}
              placeholder="MCP Server 的功能描述..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="github_url">GitHub URL</Label>
            <Input
              id="github_url"
              value={config.github_url || ""}
              onChange={(e) => updateConfig({ github_url: e.target.value })}
              placeholder="https://github.com/..."
            />
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={config.is_official}
                onCheckedChange={(checked) => updateConfig({ is_official: checked })}
              />
              <Label className="text-sm">官方认证</Label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Transport Config */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <TransportIcon className="h-4 w-4" />
            传输配置
          </h3>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>传输类型</Label>
              <div className="flex gap-2">
                {(["stdio", "sse", "http"] as const).map((type) => {
                  const Icon = transportIcons[type];
                  return (
                    <button
                      key={type}
                      onClick={() => updateTransport({ type })}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all",
                        config.transport.type === type
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium uppercase">{type}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {config.transport.type === "stdio" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="command">命令</Label>
                  <Input
                    id="command"
                    value={config.transport.command || ""}
                    onChange={(e) => updateTransport({ command: e.target.value })}
                    placeholder="npx"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="args">参数 (每行一个)</Label>
                  <Textarea
                    id="args"
                    value={(config.transport.args || []).join("\n")}
                    onChange={(e) =>
                      updateTransport({
                        args: e.target.value.split("\n").filter(Boolean),
                      })
                    }
                    placeholder="@modelcontextprotocol/server-example"
                    className="font-mono"
                    rows={3}
                  />
                </div>
              </>
            )}

            {(config.transport.type === "sse" || config.transport.type === "http") && (
              <div className="space-y-2">
                <Label htmlFor="url">服务地址</Label>
                <Input
                  id="url"
                  value={config.transport.url || ""}
                  onChange={(e) => updateTransport({ url: e.target.value })}
                  placeholder="http://localhost:3000/mcp"
                  className="font-mono"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>运行时</Label>
              <Select
                value={config.runtime}
                onValueChange={(value) => updateConfig({ runtime: value as MCPConfig["runtime"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {runtimeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>运行范围</Label>
              <Select
                value={config.scope}
                onValueChange={(value) => updateConfig({ scope: value as MCPConfig["scope"] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Tools */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Tools 定义
            </h3>
            <Badge variant="secondary">{config.tools?.length || 0}</Badge>
          </div>

          <div className="flex gap-2">
            <Input
              value={newToolName}
              onChange={(e) => setNewToolName(e.target.value)}
              placeholder="工具名称..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && addTool()}
            />
            <Button onClick={addTool} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {config.tools && config.tools.length > 0 && (
            <Accordion type="multiple" className="space-y-2">
              {config.tools.map((tool, index) => (
                <AccordionItem
                  key={tool.name}
                  value={tool.name}
                  className="border border-border rounded-lg px-3"
                >
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono text-sm">{tool.name}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 py-2">
                      <div className="space-y-2">
                        <Label>描述</Label>
                        <Input
                          value={tool.description || ""}
                          onChange={(e) => updateTool(index, { description: e.target.value })}
                          placeholder="工具功能描述..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Input Schema (JSON)</Label>
                        <Textarea
                          value={JSON.stringify(tool.inputSchema || {}, null, 2)}
                          onChange={(e) => {
                            try {
                              const schema = JSON.parse(e.target.value);
                              updateTool(index, { inputSchema: schema });
                            } catch {
                              // Invalid JSON, ignore
                            }
                          }}
                          className="font-mono text-xs"
                          rows={4}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTool(tool.name)}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除此工具
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>

        <Separator />

        {/* Resources */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <FileBox className="h-4 w-4" />
              Resources 定义
            </h3>
            <Badge variant="secondary">{config.resources?.length || 0}</Badge>
          </div>

          <div className="flex gap-2">
            <Input
              value={newResourceUri}
              onChange={(e) => setNewResourceUri(e.target.value)}
              placeholder="resource://..."
              className="flex-1 font-mono"
              onKeyDown={(e) => e.key === "Enter" && addResource()}
            />
            <Button onClick={addResource} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {config.resources && config.resources.length > 0 && (
            <div className="space-y-2">
              {config.resources.map((resource) => (
                <div
                  key={resource.uri}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <div className="font-mono text-sm">{resource.uri}</div>
                    <div className="text-xs text-muted-foreground">{resource.name}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeResource(resource.uri)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Environment Variables */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Key className="h-4 w-4" />
              环境变量
            </h3>
            <Badge variant="secondary">{config.envVars?.length || 0}</Badge>
          </div>

          <div className="flex gap-2">
            <Input
              value={newEnvVarName}
              onChange={(e) => setNewEnvVarName(e.target.value.toUpperCase())}
              placeholder="ENV_VAR_NAME"
              className="flex-1 font-mono"
              onKeyDown={(e) => e.key === "Enter" && addEnvVar()}
            />
            <Button onClick={addEnvVar} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {config.envVars && config.envVars.length > 0 && (
            <div className="space-y-2">
              {config.envVars.map((envVar, index) => (
                <div
                  key={envVar.name}
                  className="p-3 rounded-lg border border-border space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-primary">{envVar.name}</code>
                      {envVar.required && (
                        <Badge variant="destructive" className="text-[10px]">
                          必需
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEnvVar(envVar.name)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    value={envVar.description || ""}
                    onChange={(e) => updateEnvVar(index, { description: e.target.value })}
                    placeholder="变量说明..."
                    className="text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={envVar.required}
                      onCheckedChange={(checked) => updateEnvVar(index, { required: checked })}
                    />
                    <Label className="text-xs text-muted-foreground">必需</Label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

// Default MCP config for new skills
export const defaultMCPConfig: MCPConfig = {
  name: "new-mcp-server",
  version: "1.0.0",
  description: "",
  transport: {
    type: "stdio",
    command: "npx",
    args: [],
  },
  runtime: "node",
  scope: "local",
  is_official: false,
  tools: [],
  resources: [],
  envVars: [],
};
