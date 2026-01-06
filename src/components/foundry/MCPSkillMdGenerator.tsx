import { useState, useMemo } from "react";
import {
  Wand2,
  FileText,
  Copy,
  Check,
  Download,
  Settings,
  Wrench,
  FileBox,
  Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import type { MCPConfig } from "./MCPConfigEditor";
import type { MCPInspectResult } from "@/hooks/useMCPInspect";
import { calculateMCPPermissions } from "@/data/mcpPermissionMapping";
import { mcpCategories } from "@/data/mcpCategories";

interface MCPSkillMdGeneratorProps {
  config: MCPConfig;
  inspectResult?: MCPInspectResult | null;
  onGenerate: (skillMd: string) => void;
}

interface GeneratorOptions {
  includeTools: boolean;
  includeResources: boolean;
  includeExamples: boolean;
  includeSchemas: boolean;
}

export function MCPSkillMdGenerator({
  config,
  inspectResult,
  onGenerate,
}: MCPSkillMdGeneratorProps) {
  const [options, setOptions] = useState<GeneratorOptions>({
    includeTools: true,
    includeResources: true,
    includeExamples: true,
    includeSchemas: false,
  });
  const [copied, setCopied] = useState(false);

  // Get tools from inspect result or config
  const tools = useMemo(() => {
    return inspectResult?.tools || config.tools || [];
  }, [inspectResult, config]);

  // Get resources from inspect result or config
  const resources = useMemo(() => {
    return inspectResult?.resources || config.resources || [];
  }, [inspectResult, config]);

  // Calculate permissions based on category and tools
  const detectedPermissions = useMemo(() => {
    // Detect category from config name or github_url
    const guessCategory = () => {
      const name = config.name.toLowerCase();
      const categories = mcpCategories.map((c) => c.id);
      for (const cat of categories) {
        if (name.includes(cat)) return cat;
      }
      if (name.includes("browser") || name.includes("playwright")) return "browser";
      if (name.includes("postgres") || name.includes("mysql") || name.includes("database"))
        return "database";
      if (name.includes("file") || name.includes("fs")) return "file_systems";
      if (name.includes("git")) return "version_control";
      return "other";
    };

    const category = guessCategory();
    const toolNames = tools.map((t) => t.name);
    return calculateMCPPermissions(category, toolNames);
  }, [config.name, tools]);

  // Generate SKILL.md content
  const generateSkillMd = (): string => {
    const lines: string[] = [];

    // Frontmatter
    lines.push("---");
    lines.push(`name: "${config.name}"`);
    lines.push(`version: "${config.version}"`);
    lines.push(`description: "${config.description || `MCP Server: ${config.name}`}"`);
    lines.push(`author: "MCP Generator"`);
    lines.push(`origin: "mcp"`);
    lines.push(`mcp_type: "${config.transport.type}"`);
    if (config.github_url) {
      lines.push(`transport_url: "${config.github_url}"`);
    }
    lines.push(`runtime_env: "${config.runtime}"`);
    lines.push(`scope: "${config.scope}"`);

    // Permissions
    if (detectedPermissions.length > 0) {
      lines.push("permissions:");
      detectedPermissions.forEach((p) => {
        lines.push(`  - ${p}`);
      });
    }

    // Inputs from tools
    if (options.includeTools && tools.length > 0) {
      lines.push("inputs:");
      tools.slice(0, 3).forEach((tool) => {
        lines.push(`  - name: ${tool.name}_input`);
        lines.push(`    type: object`);
        lines.push(`    description: Input for ${tool.name} tool`);
      });
    }

    // Outputs
    lines.push("outputs:");
    lines.push("  - name: result");
    lines.push("    type: object");
    lines.push("    description: Tool execution result");

    lines.push("---");
    lines.push("");

    // Title
    lines.push(`# ${config.name}`);
    lines.push("");

    // Description
    lines.push("## 概述");
    lines.push("");
    lines.push(config.description || `${config.name} 是一个 MCP Server，提供以下功能。`);
    lines.push("");

    // Tools section
    if (options.includeTools && tools.length > 0) {
      lines.push("## 可用工具");
      lines.push("");
      tools.forEach((tool) => {
        lines.push(`### ${tool.name}`);
        lines.push("");
        lines.push(tool.description || `Tool: ${tool.name}`);
        lines.push("");

        if (options.includeSchemas && tool.inputSchema) {
          lines.push("**输入参数:**");
          lines.push("");
          lines.push("```json");
          lines.push(JSON.stringify(tool.inputSchema, null, 2));
          lines.push("```");
          lines.push("");
        }
      });
    }

    // Resources section
    if (options.includeResources && resources.length > 0) {
      lines.push("## Resources");
      lines.push("");
      resources.forEach((resource) => {
        lines.push(`- \`${resource.uri}\` - ${resource.description || resource.name}`);
      });
      lines.push("");
    }

    // Usage examples
    if (options.includeExamples && tools.length > 0) {
      lines.push("## 使用示例");
      lines.push("");
      lines.push("```");
      lines.push(`User: 使用 ${tools[0]?.name || "tool"} 工具...`);
      lines.push(`Assistant: 好的，我将调用 ${config.name} 的 ${tools[0]?.name || "tool"} 工具来完成任务。`);
      lines.push("```");
      lines.push("");
    }

    // Environment variables
    if (config.envVars && config.envVars.length > 0) {
      lines.push("## 配置要求");
      lines.push("");
      config.envVars.forEach((envVar) => {
        const requiredMark = envVar.required ? " (必需)" : " (可选)";
        lines.push(`- \`${envVar.name}\`: ${envVar.description || "环境变量"}${requiredMark}`);
      });
      lines.push("");
    }

    // Limitations
    lines.push("## 注意事项");
    lines.push("");
    lines.push("- 确保 MCP Server 正确配置并运行");
    if (config.transport.type === "stdio") {
      lines.push(`- 需要安装: \`${config.transport.command} ${(config.transport.args || []).join(" ")}\``);
    }
    lines.push("");

    return lines.join("\n");
  };

  const generatedContent = useMemo(() => generateSkillMd(), [config, tools, resources, options, detectedPermissions]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "已复制",
      description: "SKILL.md 内容已复制到剪贴板",
    });
  };

  const handleGenerate = () => {
    onGenerate(generatedContent);
    toast({
      title: "已生成",
      description: "SKILL.md 已更新到编辑器",
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            自动生成 SKILL.md
          </h3>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          基于 MCP Server 元数据自动生成符合 Anthropic 标准的 SKILL.md 描述文件
        </p>

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5" />
              包含所有 Tools 描述
            </Label>
            <Switch
              checked={options.includeTools}
              onCheckedChange={(checked) =>
                setOptions((prev) => ({ ...prev, includeTools: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <FileBox className="h-3.5 w-3.5" />
              包含 Resources 信息
            </Label>
            <Switch
              checked={options.includeResources}
              onCheckedChange={(checked) =>
                setOptions((prev) => ({ ...prev, includeResources: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              生成使用示例
            </Label>
            <Switch
              checked={options.includeExamples}
              onCheckedChange={(checked) =>
                setOptions((prev) => ({ ...prev, includeExamples: checked }))
              }
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm flex items-center gap-2">
              <Settings className="h-3.5 w-3.5" />
              包含输入/输出 Schema
            </Label>
            <Switch
              checked={options.includeSchemas}
              onCheckedChange={(checked) =>
                setOptions((prev) => ({ ...prev, includeSchemas: checked }))
              }
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <Badge variant="secondary" className="gap-1">
            <Wrench className="h-3 w-3" />
            {tools.length} Tools
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <FileBox className="h-3 w-3" />
            {resources.length} Resources
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Key className="h-3 w-3" />
            {config.envVars?.length || 0} Env Vars
          </Badge>
        </div>
      </div>

      <Separator />

      {/* Preview */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
          预览
        </div>
        <ScrollArea className="flex-1 border-y border-border">
          <pre className="p-4 text-xs font-mono whitespace-pre-wrap text-muted-foreground">
            {generatedContent}
          </pre>
        </ScrollArea>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border flex gap-2">
        <Button variant="outline" onClick={handleCopy} className="flex-1 gap-2">
          {copied ? (
            <Check className="h-4 w-4 text-status-executing" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          复制
        </Button>
        <Button onClick={handleGenerate} className="flex-1 gap-2">
          <Download className="h-4 w-4" />
          生成并替换
        </Button>
      </div>
    </div>
  );
}
