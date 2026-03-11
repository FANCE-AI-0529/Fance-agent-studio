import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Play,
  Save,
  Upload,
  CheckCircle2,
  FileText,
  Eye,
  Code2,
  Settings,
  Loader2,
  LogIn,
  AlertTriangle,
  XCircle,
  Store,
  Wand2,
  Wrench,
  Sparkles,
  Package,
  User,
  Server,
  Plug,
} from "lucide-react";
import { Button } from "../components/ui/button.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.tsx";
import { toast } from "../hooks/use-toast.ts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip.tsx";
import { Switch } from "../components/ui/switch.tsx";
import { Label } from "../components/ui/label.tsx";

import { SkillEditor } from "../components/foundry/SkillEditor.tsx";
import { FoundrySidebar, FileItem } from "../components/foundry/FoundrySidebar.tsx";
import {
  parseSkillMd,
  ValidationPanel,
  MetadataDisplay,
  ValidationResult,
} from "../components/foundry/SkillValidator.tsx";
import { SkillTemplatesDialog, SkillTemplate } from "../components/foundry/SkillTemplates.tsx";
import { DependencyManager } from "../components/foundry/DependencyManager.tsx";
import { SkillTestSandbox } from "../components/foundry/SkillTestSandbox.tsx";
import { SkillImportExport } from "../components/foundry/SkillImportExport.tsx";
import { SkillMetadataEditor } from "../components/foundry/SkillMetadataEditor.tsx";
import { SkillVersionHistory } from "../components/foundry/SkillVersionHistory.tsx";
import { AISkillGenerator } from "../components/foundry/AISkillGenerator.tsx";
import { SkillStore } from "../components/foundry/SkillStore.tsx";
import { NaturalLanguageCreator } from "../components/foundry/NaturalLanguageCreator.tsx";
import { LowCodeConfigurator } from "../components/foundry/LowCodeConfigurator.tsx";
import { CreatorDashboard } from "../components/foundry/CreatorDashboard.tsx";
import { SkillBundleCard } from "../components/foundry/SkillBundleCard.tsx";
import { CreateBundleDialog } from "../components/foundry/CreateBundleDialog.tsx";
import { BundleDetailDialog } from "../components/foundry/BundleDetailDialog.tsx";
import { EditBundleDialog } from "../components/foundry/EditBundleDialog.tsx";
import { MyBundlesPanel } from "../components/foundry/MyBundlesPanel.tsx";
import { BundleCategoryFilter, BundleCategory, BUNDLE_CATEGORIES } from "../components/foundry/BundleCategoryFilter.tsx";
import { SkillModeSwitch, SkillMode } from "../components/foundry/SkillModeSwitch.tsx";
import { MCPConfigEditor, MCPConfig } from "../components/foundry/MCPConfigEditor.tsx";
import { MCPInspector } from "../components/foundry/MCPInspector.tsx";
import { MCPSkillMdGenerator } from "../components/foundry/MCPSkillMdGenerator.tsx";
import { useMCPInspect, MCPInspectResult } from "../hooks/useMCPInspect.ts";
import { useFeaturedBundles, SkillBundle } from "../hooks/useSkillBundles.ts";
import { KnowledgeManager } from "../components/knowledge/KnowledgeManager.tsx";
import { useBundlesByCategory } from "../hooks/useBundlesByCategory.ts";
import { AgentPlazaDetail, AgentPlazaEmpty } from "../components/foundry/AgentPlazaDetail.tsx";
import { AgentPlazaSidebar } from "../components/foundry/AgentPlazaSidebar.tsx";
import { AgentPlazaGrid } from "../components/foundry/AgentPlazaCard.tsx";
import { AwesomeLLMAgent, awesomeLLMAgents, AGENT_CATEGORIES, getAgentsByCategory, searchAgents } from "../data/awesomeLLMAgents.ts";
import { useInstallBundle } from "../hooks/useSkillBundleInstall.ts";
import {
  useMySkills,
  useCreateSkill,
  useUpdateSkill,
  usePublishSkill,
  useDeleteSkill,
} from "../hooks/useSkills.ts";
import { useAuth } from "../contexts/AuthContext.tsx";
import { cn } from "../lib/utils.ts";

// Anthropic Skills Filesystem 标准模板
const anthropicSkillTemplate = `---
name: "new-skill"
version: "1.0.0"
description: "Description here"
author: "Fance OS"
permissions:
  - internet_access
  - read
inputs:
  - name: query
    type: string
    description: The input query
    required: true
outputs:
  - name: response
    type: string
    description: The processed response
---

# Instructions

This skill provides the following capabilities:

## Capabilities

1. **Primary Function** - Describe the main capability
2. **Secondary Function** - Describe additional capability

## Usage Examples

\`\`\`
User: Example input query
Assistant: Example response output
\`\`\`

## Guidelines

- Follow these guidelines when using this skill
- Handle errors gracefully
- Return structured responses

## Limitations

- Document any known limitations
- Specify edge cases
`;

const defaultSkillMd = `---
name: "新技能"
version: "1.0.0"
description: "技能描述"
author: "Fance OS"
permissions:
  - read
inputs:
  - name: query
    type: string
    description: 输入参数描述
outputs:
  - name: response
    type: string
    description: 输出参数描述
---

# 技能名称

## 能力描述

本技能可以：

1. **功能一** - 描述功能一
2. **功能二** - 描述功能二

## 使用示例

\`\`\`
用户: 示例输入
助手: 示例输出
\`\`\`

## 注意事项

- 注意事项一
- 注意事项二
`;

const handlerPy = `"""
技能处理器
"""

import json
from typing import Dict, Any


async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    处理请求
    
    Args:
        inputs: 输入字典
        
    Returns:
        输出字典
    """
    query = inputs.get("query", "")
    
    # 在此处实现你的业务逻辑
    # 示例：调用 API、处理数据、执行计算等
    response = f"处理结果: {query}"
    
    return {
        "response": response
    }


def validate_inputs(inputs: Dict[str, Any]) -> bool:
    """验证输入参数"""
    return "query" in inputs and isinstance(inputs["query"], str)
`;

const configYaml = `# 技能配置文件
runtime:
  python_version: "3.11"
  timeout_seconds: 30
  memory_mb: 256

dependencies:
  - numpy>=1.24.0
  - requests>=2.28.0

environment:
  LOG_LEVEL: INFO
  MAX_TOKENS: 2048
`;

// File structure
const createInitialFiles = (skillName: string): FileItem[] => [
  {
    id: "folder-skill",
    name: skillName || "new-skill",
    type: "folder",
    children: [
      { id: "file-skill", name: "SKILL.md", type: "file", language: "markdown" },
      { id: "file-handler", name: "handler.py", type: "file", language: "python" },
      { id: "file-config", name: "config.yaml", type: "file", language: "yaml" },
    ],
  },
];

// MCP file structure
const createMCPFiles = (serverName: string): FileItem[] => [
  {
    id: "folder-skill",
    name: serverName || "new-mcp-server",
    type: "folder",
    children: [
      { id: "file-mcp-config", name: "mcp-config.json", type: "file", language: "json" },
      { id: "file-skill", name: "SKILL.md", type: "file", language: "markdown" },
      { id: "file-env", name: ".env.example", type: "file", language: "plaintext" },
    ],
  },
];

const createFileContents = (): Record<string, string> => ({
  "file-skill": defaultSkillMd,
  "file-handler": handlerPy,
  "file-config": configYaml,
});

const defaultMCPConfig: MCPConfig = {
  name: "new-mcp-server",
  version: "1.0.0",
  description: "",
  transport: { type: "stdio", command: "npx", args: [] },
  runtime: "node",
  scope: "local",
  tools: [],
  resources: [],
  envVars: [],
};

const generateEnvExample = (config: MCPConfig): string => {
  if (!config.envVars || config.envVars.length === 0) {
    return "# No environment variables required\n";
  }
  return config.envVars
    .map((env) => `# ${env.description || env.name}\n${env.name}=${env.default || ""}`)
    .join("\n\n");
};

const generateMCPSkillMd = (config: MCPConfig): string => {
  const toolsList = config.tools?.map((t) => `- **${t.name}**: ${t.description || "No description"}`).join("\n") || "No tools defined";
  const resourcesList = config.resources?.map((r) => `- \`${r.uri}\`: ${r.description || r.name}`).join("\n") || "No resources defined";
  
  return `---
name: "${config.name}"
version: "${config.version}"
description: "${config.description || ""}"
author: "MCP Generator"
origin: "mcp"
mcp_type: "${config.transport.type}"
runtime_env: "${config.runtime}"
scope: "${config.scope}"
permissions:
  - network
---

# ${config.name}

## Overview

${config.description || "An MCP Server skill."}

## Available Tools

${toolsList}

## Resources

${resourcesList}

## Configuration

Transport Type: \`${config.transport.type}\`
${config.transport.type === "stdio" ? `Command: \`${config.transport.command} ${config.transport.args?.join(" ") || ""}\`` : `URL: \`${config.transport.url || ""}\``}

## Environment Variables

${config.envVars?.map((env) => `- \`${env.name}\`: ${env.description || "No description"} ${env.required ? "(required)" : "(optional)"}`).join("\n") || "No environment variables required."}
`;
};

// Validation Status Card
function ValidationStatusCard({ validation }: { validation: ValidationResult }) {
  const isValid = validation.isValid && validation.errors.length === 0;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <div
      className={cn(
        "p-4 rounded-xl border-2 transition-all",
        isValid
          ? hasWarnings
            ? "border-status-confirm/50 bg-status-confirm/5"
            : "border-status-executing/50 bg-status-executing/5"
          : "border-destructive/50 bg-destructive/5"
      )}
    >
      <div className="flex items-center gap-3">
        {isValid ? (
          hasWarnings ? (
            <div className="w-10 h-10 rounded-lg bg-status-confirm/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-status-confirm" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-status-executing/20 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-status-executing" />
            </div>
          )
        ) : (
          <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
            <XCircle className="h-5 w-5 text-destructive" />
          </div>
        )}
        <div>
          <h3
            className={cn(
              "font-semibold",
              isValid
                ? hasWarnings
                  ? "text-status-confirm"
                  : "text-status-executing"
                : "text-destructive"
            )}
          >
            {isValid
              ? hasWarnings
                ? "格式有效（有警告）"
                : "格式校验通过"
              : "格式错误"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isValid
              ? hasWarnings
                ? `Frontmatter 有效，但有 ${validation.warnings.length} 个警告`
                : "YAML Frontmatter 格式正确"
              : `发现 ${validation.errors.length} 个错误`}
          </p>
        </div>
      </div>

      {validation.errors.length > 0 && (
        <div className="mt-3 space-y-1 pl-[52px]">
          {validation.errors.map((error, idx) => (
            <div key={idx} className="text-xs text-destructive flex items-start gap-2">
              <span>•</span>
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="mt-3 space-y-1 pl-[52px]">
          {validation.warnings.map((warning, idx) => (
            <div key={idx} className="text-xs text-status-confirm flex items-start gap-2">
              <span>•</span>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// C端消费者视图类型
type ConsumerView = "store" | "bundles" | "plaza" | "myBundles" | "create" | "lowcode" | "creator" | "knowledge";

// 3-category mapping
type FoundryCategory = "discover" | "create" | "mine";

const CATEGORY_VIEWS: Record<FoundryCategory, { label: string; views: { key: ConsumerView; label: string; icon: typeof Store }[] }> = {
  discover: {
    label: "发现",
    views: [
      { key: "store", label: "能力商店", icon: Store },
      { key: "bundles", label: "能力包", icon: Package },
      { key: "plaza", label: "智能体广场", icon: Store },
    ],
  },
  create: {
    label: "创建",
    views: [
      { key: "create", label: "AI 创建", icon: Wand2 },
      { key: "lowcode", label: "可视化配置", icon: Settings },
    ],
  },
  mine: {
    label: "我的",
    views: [
      { key: "knowledge", label: "知识库", icon: Server },
      { key: "creator", label: "创作者中心", icon: User },
    ],
  },
};

function getCategoryForView(view: ConsumerView): FoundryCategory {
  for (const [cat, config] of Object.entries(CATEGORY_VIEWS)) {
    if (config.views.some(v => v.key === view)) return cat as FoundryCategory;
  }
  return "discover";
}

const Foundry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // 默认使用消费者模式（非开发者模式）
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [consumerView, setConsumerView] = useState<ConsumerView>("store");
  
  // Agent Plaza state
  const [selectedPlazaAgent, setSelectedPlazaAgent] = useState<AwesomeLLMAgent | null>(null);
  const [plazaSearchTerm, setPlazaSearchTerm] = useState("");
  const [plazaCategory, setPlazaCategory] = useState<string>("all");
  
  // Fetch bundles for the bundles tab
  const [bundleCategory, setBundleCategory] = useState<BundleCategory>("all");
  const [bundleSearch, setBundleSearch] = useState("");
  const { data: bundles = [], isLoading: loadingBundles } = useBundlesByCategory(
    bundleCategory,
    bundleSearch
  );
  const { data: featuredBundles = [] } = useFeaturedBundles(4);
  const installBundle = useInstallBundle();
  
  // Bundle dialogs state
  const [showCreateBundle, setShowCreateBundle] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<SkillBundle | null>(null);
  const [showBundleDetail, setShowBundleDetail] = useState(false);
  const [editBundle, setEditBundle] = useState<SkillBundle | null>(null);
  
  // 开发者模式状态
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>(createInitialFiles("new-skill"));
  const [activeFileId, setActiveFileId] = useState("file-skill");
  const [contents, setContents] = useState<Record<string, string>>(createFileContents());
  const [activeTab, setActiveTab] = useState("edit");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // MCP 模式状态
  const [skillMode, setSkillMode] = useState<SkillMode>("native");
  const [mcpConfig, setMcpConfig] = useState<MCPConfig>(defaultMCPConfig);
  const { inspect, isInspecting, result: inspectResult, reset: resetInspect } = useMCPInspect();

  const { data: mySkills = [], isLoading: isLoadingSkills } = useMySkills();
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const publishSkill = usePublishSkill();
  const deleteSkill = useDeleteSkill();

  // 检查URL参数是否指定开发者模式
  useEffect(() => {
    if (searchParams.get("dev") === "true") {
      setIsDeveloperMode(true);
    }
  }, [searchParams]);

  // Load skill data when active skill changes
  useEffect(() => {
    if (activeSkillId) {
      const skill = mySkills.find((s) => s.id === activeSkillId);
      if (skill) {
        setContents({
          "file-skill": skill.content || defaultSkillMd,
          "file-handler": handlerPy,
          "file-config": configYaml,
        });
        setFiles(createInitialFiles(skill.name));
        setHasUnsavedChanges(false);
      }
    } else {
      setContents(createFileContents());
      setFiles(createInitialFiles("new-skill"));
      setHasUnsavedChanges(false);
    }
  }, [activeSkillId, mySkills]);

  const activeFile = useMemo(() => {
    const findFile = (items: FileItem[]): FileItem | null => {
      for (const item of items) {
        if (item.id === activeFileId) return item;
        if (item.children) {
          const found = findFile(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findFile(files);
  }, [files, activeFileId]);

  const currentContent = contents[activeFileId] || "";

  const validation: ValidationResult = useMemo(() => {
    if (activeFileId === "file-skill") {
      return parseSkillMd(currentContent);
    }
    return { isValid: true, errors: [], warnings: [], metadata: null };
  }, [currentContent, activeFileId]);

  const handleContentChange = useCallback(
    (value: string) => {
      setContents((prev) => ({ ...prev, [activeFileId]: value }));
      setHasUnsavedChanges(true);
    },
    [activeFileId]
  );

  const handleFileSelect = useCallback((file: FileItem) => {
    if (file.type === "file") {
      setActiveFileId(file.id);
    }
  }, []);

  const handleNewSkill = () => {
    setActiveSkillId(null);
    if (skillMode === "mcp") {
      const newConfig = { ...defaultMCPConfig };
      setMcpConfig(newConfig);
      setContents({
        "file-mcp-config": JSON.stringify(newConfig, null, 2),
        "file-skill": generateMCPSkillMd(newConfig),
        "file-env": generateEnvExample(newConfig),
      });
      setFiles(createMCPFiles("new-mcp-server"));
      setActiveFileId("file-mcp-config");
    } else {
      setContents(createFileContents());
      setFiles(createInitialFiles("new-skill"));
      setActiveFileId("file-skill");
    }
    setHasUnsavedChanges(false);
    resetInspect();
  };

  const handleModeChange = (newMode: SkillMode) => {
    if (newMode === skillMode) return;
    
    if (newMode === "mcp") {
      // 切换到 MCP 模式
      const newConfig = { ...defaultMCPConfig };
      setMcpConfig(newConfig);
      setFiles(createMCPFiles(newConfig.name));
      setContents({
        "file-mcp-config": JSON.stringify(newConfig, null, 2),
        "file-skill": generateMCPSkillMd(newConfig),
        "file-env": generateEnvExample(newConfig),
      });
      setActiveFileId("file-mcp-config");
    } else {
      // 切换到 Native 模式
      setFiles(createInitialFiles("new-skill"));
      setContents(createFileContents());
      setActiveFileId("file-skill");
    }
    setSkillMode(newMode);
    setActiveSkillId(null);
    setHasUnsavedChanges(true);
    resetInspect();
  };

  const handleMCPConfigChange = (newConfig: MCPConfig) => {
    setMcpConfig(newConfig);
    setContents((prev) => ({
      ...prev,
      "file-mcp-config": JSON.stringify(newConfig, null, 2),
      "file-skill": generateMCPSkillMd(newConfig),
      "file-env": generateEnvExample(newConfig),
    }));
    setFiles(createMCPFiles(newConfig.name));
    setHasUnsavedChanges(true);
  };

  const handleGenerateSkillMd = (content: string) => {
    setContents((prev) => ({
      ...prev,
      "file-skill": content,
    }));
    setHasUnsavedChanges(true);
    toast({
      title: "SKILL.md 已生成",
      description: "基于 MCP 配置自动生成的描述文件",
    });
  };

  const handleLoadTemplate = () => {
    setContents((prev) => ({
      ...prev,
      "file-skill": anthropicSkillTemplate,
    }));
    setActiveFileId("file-skill");
    setHasUnsavedChanges(true);
    toast({
      title: "模板已加载",
      description: "Anthropic Skills 标准模板已填入",
    });
  };

  const handleSelectTemplate = (template: SkillTemplate) => {
    setContents({
      "file-skill": template.content,
      "file-handler": template.handlerCode,
      "file-config": template.configYaml,
    });
    setFiles(createInitialFiles(template.name));
    setActiveSkillId(null);
    setActiveFileId("file-skill");
    setHasUnsavedChanges(true);
    setShowTemplates(false);
    toast({
      title: "模板已加载",
      description: `已加载「${template.name}」技能模板`,
    });
  };

  const handleImport = (
    importedFiles: { skillMd: string; handlerPy: string; configYaml: string },
    skillName: string
  ) => {
    setContents({
      "file-skill": importedFiles.skillMd,
      "file-handler": importedFiles.handlerPy,
      "file-config": importedFiles.configYaml,
    });
    setFiles(createInitialFiles(skillName));
    setActiveSkillId(null);
    setActiveFileId("file-skill");
    setHasUnsavedChanges(true);
    setShowImportExport(false);
  };

  const handleAIGenerated = (
    files: { skillMd: string; handlerPy: string; configYaml: string },
    skillName: string
  ) => {
    setContents({
      "file-skill": files.skillMd,
      "file-handler": files.handlerPy,
      "file-config": files.configYaml,
    });
    setFiles(createInitialFiles(skillName));
    setActiveSkillId(null);
    setActiveFileId("file-skill");
    setHasUnsavedChanges(true);
    // 切换到开发者模式查看生成结果
    setIsDeveloperMode(true);
  };

  const handleLowCodeSave = async (config: any, generatedFiles: { skillMd: string; handlerPy: string; configYaml: string }) => {
    setContents({
      "file-skill": generatedFiles.skillMd,
      "file-handler": generatedFiles.handlerPy,
      "file-config": generatedFiles.configYaml,
    });
    setFiles(createInitialFiles(config.name));
    setHasUnsavedChanges(true);
    
    // 自动保存
    if (user) {
      try {
        const skillData = {
          name: config.name,
          version: "1.0.0",
          description: config.description || null,
          permissions: config.permissions || [],
          category: config.category || "nlp",
          content: generatedFiles.skillMd,
          inputs: config.inputs || [],
          outputs: config.outputs || [],
        };
        
        const newSkill = await createSkill.mutateAsync(skillData);
        setActiveSkillId(newSkill.id);
        setHasUnsavedChanges(false);
        setConsumerView("store");
        toast({
          title: "能力创建成功",
          description: `「${config.name}」已保存`,
        });
      } catch (error) {
        // Error handled by mutation
      }
    } else {
      toast({
        title: "请先登录",
        description: "保存能力需要登录账号",
        variant: "destructive",
      });
      navigate("/auth");
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "保存技能需要登录账号",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const skillMdContent = contents["file-skill"];
    const parsed = parseSkillMd(skillMdContent);

    if (!parsed.isValid || !parsed.metadata) {
      toast({
        title: "保存失败",
        description: "请先修复 SKILL.md 中的错误",
        variant: "destructive",
      });
      return;
    }

    const skillData = {
      name: parsed.metadata.name,
      version: parsed.metadata.version,
      description: parsed.metadata.description || null,
      permissions: parsed.metadata.permissions || [],
      category: "nlp",
      content: skillMdContent,
      inputs: parsed.metadata.inputs || [],
      outputs: parsed.metadata.outputs || [],
    };

    try {
      if (activeSkillId) {
        await updateSkill.mutateAsync({ id: activeSkillId, ...skillData });
      } else {
        const newSkill = await createSkill.mutateAsync(skillData);
        setActiveSkillId(newSkill.id);
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      // Error toast is handled by the mutation
    }
  };

  const handlePublish = async () => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "发布技能需要登录账号",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!validation.isValid) {
      toast({
        title: "无法发布",
        description: "请先修复 SKILL.md 中的错误",
        variant: "destructive",
      });
      return;
    }

    if (hasUnsavedChanges) {
      await handleSave();
    }

    if (activeSkillId) {
      try {
        await publishSkill.mutateAsync(activeSkillId);
      } catch (error) {
        // Error toast is handled by the mutation
      }
    } else {
      toast({
        title: "请先保存",
        description: "发布前请先保存技能",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!activeSkillId) return;
    await deleteSkill.mutateAsync(activeSkillId);
    handleNewSkill();
  };

  const getLanguage = () => {
    if (!activeFile) return "markdown";
    if (activeFile.name.endsWith(".py")) return "python";
    if (activeFile.name.endsWith(".yaml") || activeFile.name.endsWith(".yml")) return "yaml";
    if (activeFile.name.endsWith(".json")) return "json";
    return "markdown";
  };

  const isSaving = createSkill.isPending || updateSkill.isPending;
  const isPublishing = publishSkill.isPending;
  const currentSkill = mySkills.find((s) => s.id === activeSkillId);

  // Convert skills for sidebar
  const sidebarSkills = mySkills.map((s) => ({
    id: s.id,
    name: s.name,
    version: s.version,
    is_published: s.is_published,
  }));

  // 消费者模式渲染
  if (!isDeveloperMode) {
    return (
      <TooltipProvider>
        <div className="h-full flex flex-col">
          {/* 顶部导航栏 - 3-category design */}
          <div className="border-b border-border bg-card">
            <div className="h-12 px-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-sm font-semibold">能力工坊</h1>
                
                {/* Primary category tabs */}
                <div className="flex items-center gap-1">
                  {(Object.entries(CATEGORY_VIEWS) as [FoundryCategory, typeof CATEGORY_VIEWS[FoundryCategory]][]).map(([cat, config]) => {
                    const isActive = getCategoryForView(consumerView) === cat;
                    // Hide "mine" category if not logged in
                    if (cat === "mine" && !user) return null;
                    return (
                      <Button
                        key={cat}
                        variant={isActive ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setConsumerView(config.views[0].key)}
                        className="h-7 text-xs px-3"
                      >
                        {config.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!user && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/auth")}
                    className="gap-1.5 h-7 text-xs"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    登录
                  </Button>
                )}
                <div className="flex items-center gap-2 pl-3 border-l border-border">
                  <Switch
                    checked={isDeveloperMode}
                    onCheckedChange={setIsDeveloperMode}
                  />
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    开发者
                  </Label>
                </div>
              </div>
            </div>

            {/* Sub-navigation within active category */}
            {(() => {
              const activeCat = getCategoryForView(consumerView);
              const catConfig = CATEGORY_VIEWS[activeCat];
              if (catConfig.views.length <= 1) return null;
              return (
                <div className="h-9 px-6 flex items-center gap-1 border-t border-border/50 bg-muted/30">
                  {catConfig.views.map((view) => {
                    const Icon = view.icon;
                    const isActive = consumerView === view.key;
                    return (
                      <button
                        key={view.key}
                        onClick={() => setConsumerView(view.key)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium transition-all",
                          isActive
                            ? "bg-background text-foreground shadow-sm border border-border"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {view.label}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* 主内容区 */}
          <div className="flex-1 overflow-hidden">
            {consumerView === "store" && (
              <SkillStore
                onInstall={(skillId) => {
                  toast({
                    title: "能力已安装",
                    description: "可以在你的AI助手中使用这个能力了",
                  });
                }}
                onCreateNew={() => setConsumerView("create")}
              />
            )}
            
            {consumerView === "bundles" && (
              <div className="p-6 space-y-8 overflow-y-auto h-full">
                {/* 头部 */}
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <h2 className="text-xl font-semibold">能力包</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      打包多个相关能力，一键安装
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user && (
                      <>
                        <Button 
                          variant="outline" 
                          onClick={() => setConsumerView("myBundles")}
                          className="gap-2"
                        >
                          <User className="h-4 w-4" />
                          我的能力包
                        </Button>
                        <Button onClick={() => setShowCreateBundle(true)} className="gap-2">
                          <Package className="h-4 w-4" />
                          创建能力包
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* 精选能力包 */}
                {featuredBundles.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      精选推荐
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {featuredBundles.map((bundle) => (
                        <SkillBundleCard
                          key={bundle.id}
                          bundle={bundle}
                          onView={() => {
                            setSelectedBundle(bundle);
                            setShowBundleDetail(true);
                          }}
                          onInstall={() => {
                            if (bundle.skill_ids && bundle.skill_ids.length > 0) {
                              installBundle.mutate({
                                bundleId: bundle.id,
                                skillIds: bundle.skill_ids,
                              });
                            }
                          }}
                          isInstalling={installBundle.isPending}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 搜索和筛选 */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      value={bundleSearch}
                      onChange={(e) => setBundleSearch(e.target.value)}
                      placeholder="搜索能力包..."
                      className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  </div>
                  <BundleCategoryFilter
                    activeCategory={bundleCategory}
                    onCategoryChange={setBundleCategory}
                  />
                </div>

                {/* 能力包列表 */}
                {loadingBundles ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-64 bg-card border border-border rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : bundles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bundles.map((bundle) => (
                      <SkillBundleCard
                        key={bundle.id}
                        bundle={bundle}
                        onView={() => {
                          setSelectedBundle(bundle);
                          setShowBundleDetail(true);
                        }}
                        onInstall={() => {
                          if (bundle.skill_ids && bundle.skill_ids.length > 0) {
                            installBundle.mutate({
                              bundleId: bundle.id,
                              skillIds: bundle.skill_ids,
                            });
                          }
                        }}
                        isInstalling={installBundle.isPending}
                        onEdit={user && bundle.author_id === user.id ? () => setEditBundle(bundle) : undefined}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {bundleSearch || bundleCategory !== "all" 
                        ? "没有找到匹配的能力包" 
                        : "暂无能力包"}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {bundleSearch || bundleCategory !== "all"
                        ? "试试其他搜索条件"
                        : "创作者可以将多个相关能力打包成能力包"}
                    </p>
                    {user && !bundleSearch && bundleCategory === "all" && (
                      <Button 
                        onClick={() => setShowCreateBundle(true)} 
                        variant="outline" 
                        className="mt-4 gap-2"
                      >
                        <Package className="h-4 w-4" />
                        创建第一个能力包
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {consumerView === "myBundles" && (
              <div className="p-6 overflow-y-auto h-full">
                <div className="mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setConsumerView("bundles")}
                    className="gap-2"
                  >
                    ← 返回能力包
                  </Button>
                </div>
                <MyBundlesPanel />
              </div>
            )}
            
            {consumerView === "create" && (
              <NaturalLanguageCreator
                onGenerated={handleAIGenerated}
              />
            )}
            
            {consumerView === "lowcode" && (
              <LowCodeConfigurator
                onSave={handleLowCodeSave}
                onCancel={() => setConsumerView("store")}
              />
            )}
            
            {consumerView === "creator" && (
              <CreatorDashboard
                onCreateNew={() => setConsumerView("create")}
                onEditSkill={(skillId) => {
                  setActiveSkillId(skillId);
                  setIsDeveloperMode(true);
                }}
              />
            )}

            {consumerView === "knowledge" && (
              <KnowledgeManager />
            )}

            {consumerView === "plaza" && (
              <div className="flex h-full">
                {/* 左侧列表 */}
                <div className="w-80 border-r border-border flex-shrink-0">
                  <AgentPlazaSidebar
                    selectedAgentId={selectedPlazaAgent?.id || null}
                    onAgentSelect={setSelectedPlazaAgent}
                  />
                </div>
                {/* 右侧详情 */}
                <div className="flex-1 overflow-hidden">
                  {selectedPlazaAgent ? (
                    <AgentPlazaDetail
                      agent={selectedPlazaAgent}
                      onClose={() => setSelectedPlazaAgent(null)}
                    />
                  ) : (
                    <AgentPlazaEmpty />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dialogs */}
          <CreateBundleDialog open={showCreateBundle} onOpenChange={setShowCreateBundle} />
          <BundleDetailDialog
            bundle={selectedBundle}
            open={showBundleDetail}
            onOpenChange={setShowBundleDetail}
          />
          <EditBundleDialog
            bundle={editBundle}
            open={!!editBundle}
            onOpenChange={(open) => !open && setEditBundle(null)}
          />
        </div>
      </TooltipProvider>
    );
  }

  // 开发者模式渲染（原有界面）
  return (
    <TooltipProvider>
      <div className="h-full flex flex-col">
        {/* 开发者模式提示栏 */}
        <div className="h-10 px-4 flex items-center justify-between bg-primary/10 border-b border-primary/20">
          <div className="flex items-center gap-2 text-sm">
            <Code2 className="h-4 w-4 text-primary" />
            <span className="font-medium">开发者模式</span>
            <span className="text-muted-foreground">- 完整代码编辑器</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={isDeveloperMode}
              onCheckedChange={setIsDeveloperMode}
            />
            <Label className="text-sm">退出开发者模式</Label>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Left Sidebar */}
          <FoundrySidebar
            skills={sidebarSkills}
            activeSkillId={activeSkillId}
            onSkillSelect={setActiveSkillId}
            onNewSkill={handleNewSkill}
            onDeleteSkill={handleDelete}
            files={files}
            activeFileId={activeFileId}
            onFileSelect={handleFileSelect}
            onLoadTemplate={handleLoadTemplate}
            onOpenTemplates={() => setShowTemplates(true)}
            onOpenImportExport={() => setShowImportExport(true)}
            onOpenVersionHistory={() => setShowVersionHistory(true)}
            isLoading={isLoadingSkills}
            skillMode={skillMode}
          />

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Toolbar */}
            <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-card/80">
              <div className="flex items-center gap-3">
                <SkillModeSwitch mode={skillMode} onModeChange={handleModeChange} />
                <div className="w-px h-5 bg-border" />
                <Badge variant="outline" className="gap-1.5">
                  {skillMode === "mcp" ? <Server className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                  {activeFile?.name || "未选择文件"}
                </Badge>
                {hasUnsavedChanges && (
                  <Badge variant="secondary" className="text-xs">
                    未保存
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                {!user && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/auth")}
                    className="gap-1.5 h-8 text-muted-foreground"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    登录
                  </Button>
                )}

                <AISkillGenerator onGenerated={handleAIGenerated} />

                <SkillTestSandbox
                  metadata={validation.metadata}
                  trigger={
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                          <Play className="h-3.5 w-3.5" />
                          测试
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>在沙箱中测试技能</TooltipContent>
                    </Tooltip>
                  }
                />

                <div className="w-px h-5 bg-border" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="gap-1.5 h-8"
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      保存
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>保存技能</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={handlePublish}
                      disabled={!validation.isValid || isPublishing}
                      className="gap-1.5 h-8"
                    >
                      {isPublishing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      发布
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>发布到技能市场</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex min-h-0">
              {/* Code Editor / MCP Config Editor */}
              <div className="flex-1 flex flex-col min-w-0">
                {skillMode === "mcp" ? (
                  // MCP 模式
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <div className="px-4 pt-2 border-b border-border flex-shrink-0">
                      <TabsList className="bg-transparent h-9 p-0 gap-6">
                        <TabsTrigger
                          value="edit"
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-1 gap-2"
                        >
                          <Server className="h-4 w-4" />
                          配置编辑
                        </TabsTrigger>
                        <TabsTrigger
                          value="visual"
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-1 gap-2"
                        >
                          <Code2 className="h-4 w-4" />
                          JSON 编辑
                        </TabsTrigger>
                        <TabsTrigger
                          value="preview"
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-1 gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          SKILL.md
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="edit" className="flex-1 m-0 p-0 min-h-0 overflow-auto">
                      <MCPConfigEditor config={mcpConfig} onChange={handleMCPConfigChange} />
                    </TabsContent>

                    <TabsContent value="visual" className="flex-1 m-0 p-0 min-h-0">
                      <SkillEditor
                        value={contents["file-mcp-config"] || JSON.stringify(mcpConfig, null, 2)}
                        onChange={(value) => {
                          try {
                            const parsed = JSON.parse(value);
                            setMcpConfig(parsed);
                            setContents((prev) => ({
                              ...prev,
                              "file-mcp-config": value,
                              "file-skill": generateMCPSkillMd(parsed),
                              "file-env": generateEnvExample(parsed),
                            }));
                            setFiles(createMCPFiles(parsed.name));
                          } catch {
                            // Invalid JSON, just update the content
                            setContents((prev) => ({ ...prev, "file-mcp-config": value }));
                          }
                          setHasUnsavedChanges(true);
                        }}
                        language="json"
                      />
                    </TabsContent>

                    <TabsContent value="preview" className="flex-1 m-0 p-0 min-h-0">
                      <SkillEditor
                        value={contents["file-skill"] || generateMCPSkillMd(mcpConfig)}
                        onChange={(value) => {
                          setContents((prev) => ({ ...prev, "file-skill": value }));
                          setHasUnsavedChanges(true);
                        }}
                        language="markdown"
                      />
                    </TabsContent>
                  </Tabs>
                ) : (
                  // Native 模式
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                    <div className="px-4 pt-2 border-b border-border flex-shrink-0">
                      <TabsList className="bg-transparent h-9 p-0 gap-6">
                        <TabsTrigger
                          value="edit"
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-1 gap-2"
                        >
                          <Code2 className="h-4 w-4" />
                          代码编辑
                        </TabsTrigger>
                        <TabsTrigger
                          value="visual"
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-1 gap-2"
                        >
                          <Settings className="h-4 w-4" />
                          可视化编辑
                        </TabsTrigger>
                        <TabsTrigger
                          value="preview"
                          className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-9 px-1 gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          预览
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="edit" className="flex-1 m-0 p-0 min-h-0">
                      <SkillEditor
                        value={currentContent}
                        onChange={handleContentChange}
                        language={getLanguage()}
                      />
                    </TabsContent>

                    <TabsContent value="visual" className="flex-1 m-0 p-0 min-h-0 overflow-auto">
                      {activeFileId === "file-skill" ? (
                        <SkillMetadataEditor
                          content={contents["file-skill"]}
                          onChange={(newContent) => {
                            setContents((prev) => ({ ...prev, "file-skill": newContent }));
                            setHasUnsavedChanges(true);
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                          <Settings className="h-10 w-10 mb-3 opacity-30" />
                          <p className="text-sm">可视化编辑仅支持 SKILL.md</p>
                          <p className="text-xs mt-1">请在左侧选择 SKILL.md</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="preview" className="flex-1 m-0 p-6 overflow-auto">
                      {activeFileId === "file-skill" && validation.metadata ? (
                        <div className="max-w-2xl mx-auto">
                          <div className="p-6 rounded-xl border border-border bg-card">
                            <h2 className="text-xl font-bold mb-2">{validation.metadata.name}</h2>
                            <p className="text-muted-foreground mb-4">{validation.metadata.description}</p>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="p-3 rounded-lg bg-secondary/30">
                                <div className="text-xs text-muted-foreground mb-1">版本</div>
                                <div className="font-mono">{validation.metadata.version}</div>
                              </div>
                              <div className="p-3 rounded-lg bg-secondary/30">
                                <div className="text-xs text-muted-foreground mb-1">作者</div>
                                <div>{validation.metadata.author}</div>
                              </div>
                            </div>

                            {validation.metadata.permissions && validation.metadata.permissions.length > 0 && (
                              <div className="mb-4">
                                <div className="text-xs text-muted-foreground mb-2">权限</div>
                                <div className="flex gap-1.5 flex-wrap">
                                  {validation.metadata.permissions.map((p) => (
                                    <Badge key={p} variant="outline">
                                      {p}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {validation.metadata.inputs && validation.metadata.inputs.length > 0 && (
                              <div className="mb-4">
                                <div className="text-xs text-muted-foreground mb-2">输入参数</div>
                                <div className="space-y-1">
                                  {validation.metadata.inputs.map((input, i) => (
                                    <div key={i} className="p-2 rounded-lg bg-secondary/30 font-mono text-sm">
                                      <span className="text-cognitive">{input.name}</span>
                                      <span className="text-muted-foreground">: </span>
                                      <span className="text-governance">{input.type}</span>
                                      {input.description && (
                                        <span className="text-muted-foreground ml-2">// {input.description}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          <div className="text-center">
                            <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
                            <p>预览仅支持 SKILL.md 文件</p>
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </div>


              {/* Right Panel - Validation / MCP Inspector */}
              <div className="w-80 border-l border-border bg-card/50 flex flex-col">
                <div className="h-12 px-4 flex items-center border-b border-border">
                  <span className="font-semibold text-sm">
                    {skillMode === "mcp" ? "MCP 工具" : "校验 & 预览"}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {skillMode === "mcp" ? (
                    <>
                      {/* MCP Inspector */}
                      <MCPInspector config={mcpConfig} />
                      
                      {/* SKILL.md Generator */}
                      <MCPSkillMdGenerator 
                        config={mcpConfig} 
                        inspectResult={inspectResult}
                        onGenerate={handleGenerateSkillMd}
                      />
                    </>
                  ) : (
                    <>
                      {/* Validation Status */}
                      {activeFileId === "file-skill" && <ValidationStatusCard validation={validation} />}

                      {/* Current Skill Info */}
                      {currentSkill && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            技能状态
                          </label>
                          <div className="p-3 rounded-lg border border-border bg-card">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium">{currentSkill.name}</span>
                              <Badge variant={currentSkill.is_published ? "default" : "secondary"}>
                                {currentSkill.is_published ? "已发布" : "草稿"}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">v{currentSkill.version}</div>
                          </div>
                        </div>
                      )}

                      {/* Validation Details */}
                      {activeFileId === "file-skill" && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            校验详情
                          </label>
                          <ValidationPanel validation={validation} />
                        </div>
                      )}

                      {/* Metadata Display */}
                      {activeFileId === "file-skill" && validation.metadata && (
                        <div className="space-y-2">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Frontmatter 解析
                          </label>
                          <MetadataDisplay metadata={validation.metadata} />
                        </div>
                      )}

                      {/* Dependency Manager */}
                      {contents["file-config"] && <DependencyManager configContent={contents["file-config"]} />}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dialogs */}
        <SkillTemplatesDialog
          onSelectTemplate={handleSelectTemplate}
          open={showTemplates}
          onOpenChange={setShowTemplates}
        />

        <SkillImportExport
          open={showImportExport}
          onOpenChange={setShowImportExport}
          currentFiles={{
            skillMd: contents["file-skill"],
            handlerPy: contents["file-handler"],
            configYaml: contents["file-config"],
          }}
          skillName={validation.metadata?.name || "new-skill"}
          onImport={handleImport}
        />

        <SkillVersionHistory
          skillId={activeSkillId}
          skillName={validation.metadata?.name}
          currentContent={contents["file-skill"]}
          open={showVersionHistory}
          onOpenChange={setShowVersionHistory}
        />

        {/* Bundle Dialogs */}
        <CreateBundleDialog
          open={showCreateBundle}
          onOpenChange={setShowCreateBundle}
        />

        <BundleDetailDialog
          bundle={selectedBundle}
          open={showBundleDetail}
          onOpenChange={setShowBundleDetail}
        />
      </div>
    </TooltipProvider>
  );
};

export default Foundry;
