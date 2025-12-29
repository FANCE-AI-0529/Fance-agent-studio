import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Play,
  Save,
  Upload,
  CheckCircle2,
  FileText,
  Eye,
  Code2,
  Settings,
  Plus,
  Loader2,
  Trash2,
  LogIn,
  Sparkles,
  Library,
  FileArchive,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

import { SkillEditor } from "@/components/foundry/SkillEditor";
import { FileExplorer, FileItem } from "@/components/foundry/FileExplorer";
import {
  parseSkillMd,
  ValidationPanel,
  MetadataDisplay,
  ValidationResult,
} from "@/components/foundry/SkillValidator";
import { SkillTemplatesDialog, SkillTemplate } from "@/components/foundry/SkillTemplates";
import { DependencyManager } from "@/components/foundry/DependencyManager";
import { SkillTestSandbox } from "@/components/foundry/SkillTestSandbox";
import { SkillImportExport } from "@/components/foundry/SkillImportExport";
import {
  useMySkills,
  useCreateSkill,
  useUpdateSkill,
  usePublishSkill,
  useDeleteSkill,
} from "@/hooks/useSkills";
import { useAuth } from "@/contexts/AuthContext";

// Anthropic Skills Filesystem 标准模板
const anthropicSkillTemplate = `---
name: "new-skill"
version: "1.0.0"
description: "Description here"
author: "Agent OS Studio"
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
author: "Agent OS Studio"
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
    
    # TODO: 实现实际逻辑
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

const createFileContents = (): Record<string, string> => ({
  "file-skill": defaultSkillMd,
  "file-handler": handlerPy,
  "file-config": configYaml,
});

// Frontmatter Check Card Component
function FrontmatterCheckCard({ validation }: { validation: ValidationResult }) {
  const isValid = validation.isValid && validation.errors.length === 0;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <div className={`p-4 rounded-lg border ${
      isValid 
        ? hasWarnings
          ? "border-status-confirm/50 bg-status-confirm/5"
          : "border-status-executing/50 bg-status-executing/5"
        : "border-destructive/50 bg-destructive/5"
    }`}>
      <div className="flex items-center gap-3">
        {isValid ? (
          hasWarnings ? (
            <AlertTriangle className="h-5 w-5 text-status-confirm" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-status-executing" />
          )
        ) : (
          <XCircle className="h-5 w-5 text-destructive" />
        )}
        <div>
          <h3 className={`font-semibold ${
            isValid 
              ? hasWarnings ? "text-status-confirm" : "text-status-executing"
              : "text-destructive"
          }`}>
            {isValid 
              ? hasWarnings ? "Valid Skill (with warnings)" : "Valid Skill"
              : "Invalid Format"
            }
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isValid 
              ? hasWarnings
                ? `YAML Frontmatter 有效，但有 ${validation.warnings.length} 个警告`
                : "YAML Frontmatter 格式正确"
              : `发现 ${validation.errors.length} 个错误`
            }
          </p>
        </div>
      </div>
      
      {/* Show errors */}
      {validation.errors.length > 0 && (
        <div className="mt-3 space-y-1">
          {validation.errors.map((error, idx) => (
            <div key={idx} className="text-xs text-destructive flex items-start gap-2">
              <span className="text-destructive/60">•</span>
              <span>{error}</span>
            </div>
          ))}
        </div>
      )}
      
      {/* Show warnings */}
      {validation.warnings.length > 0 && (
        <div className="mt-3 space-y-1">
          {validation.warnings.map((warning, idx) => (
            <div key={idx} className="text-xs text-status-confirm flex items-start gap-2">
              <span className="text-status-confirm/60">•</span>
              <span>{warning}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Foundry = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>(createInitialFiles("new-skill"));
  const [activeFileId, setActiveFileId] = useState("file-skill");
  const [contents, setContents] = useState<Record<string, string>>(createFileContents());
  const [activeTab, setActiveTab] = useState("edit");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { data: mySkills = [], isLoading: isLoadingSkills } = useMySkills();
  const createSkill = useCreateSkill();
  const updateSkill = useUpdateSkill();
  const publishSkill = usePublishSkill();
  const deleteSkill = useDeleteSkill();

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
    setContents(createFileContents());
    setFiles(createInitialFiles("new-skill"));
    setActiveFileId("file-skill");
    setHasUnsavedChanges(false);
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
      description: "Anthropic Skills Filesystem 标准模板已填入",
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
    toast({
      title: "模板已加载",
      description: `已加载 "${template.name}" 技能模板`,
    });
  };

  const handleImport = (
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
    if (activeFile.name.endsWith(".yaml") || activeFile.name.endsWith(".yml"))
      return "yaml";
    if (activeFile.name.endsWith(".json")) return "json";
    return "markdown";
  };

  const isSaving = createSkill.isPending || updateSkill.isPending;
  const isPublishing = publishSkill.isPending;
  const isDeleting = deleteSkill.isPending;
  const currentSkill = mySkills.find((s) => s.id === activeSkillId);

  return (
    <div className="h-full flex flex-col">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5">
            <FileText className="h-3 w-3" />
            {activeFile?.name || "未选择文件"}
          </Badge>
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="text-xs">未保存</Badge>
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
          <Button variant="outline" size="sm" onClick={handleLoadTemplate} className="gap-1.5 h-8">
            <Sparkles className="h-3.5 w-3.5" />
            Load Template
          </Button>
          <SkillTemplatesDialog
            onSelectTemplate={handleSelectTemplate}
            trigger={
              <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                <Library className="h-3.5 w-3.5" />
                模板库
              </Button>
            }
          />
          <SkillImportExport
            trigger={
              <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                <FileArchive className="h-3.5 w-3.5" />
                导入/导出
              </Button>
            }
            currentFiles={{
              skillMd: contents["file-skill"],
              handlerPy: contents["file-handler"],
              configYaml: contents["file-config"],
            }}
            skillName={validation.metadata?.name || "new-skill"}
            onImport={handleImport}
          />
          <div className="w-px h-6 bg-border" />
          <SkillTestSandbox
            metadata={validation.metadata}
            trigger={
              <Button variant="ghost" size="sm" className="gap-1.5 h-8">
                <Play className="h-3.5 w-3.5" />
                测试
              </Button>
            }
          />
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
          {activeSkillId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5 h-8 text-destructive hover:text-destructive"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
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
            Publish Skill
          </Button>
        </div>
      </div>

      {/* Main Split Pane Layout */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Panel - File Explorer */}
          <ResizablePanel defaultSize={15} minSize={12} maxSize={25}>
            <div className="h-full flex flex-col border-r border-border bg-card/50">
              {/* Skill Selector */}
              <div className="p-3 border-b border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase">我的技能</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleNewSkill}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Select
                  value={activeSkillId || "new"}
                  onValueChange={(value) => setActiveSkillId(value === "new" ? null : value)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="新建技能" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ 新建技能</SelectItem>
                    {mySkills.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.name}
                        {skill.is_published && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            已发布
                          </Badge>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <FileExplorer
                files={files}
                activeFileId={activeFileId}
                onFileSelect={handleFileSelect}
              />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Center - Code Editor */}
          <ResizablePanel defaultSize={50} minSize={30}>
            <div className="h-full flex flex-col">
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col min-h-0"
              >
                <div className="px-4 pt-2 border-b border-border flex-shrink-0">
                  <TabsList className="bg-transparent h-8 p-0 gap-4">
                    <TabsTrigger
                      value="edit"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 px-0 gap-1.5"
                    >
                      <Code2 className="h-3.5 w-3.5" />
                      编辑器
                    </TabsTrigger>
                    <TabsTrigger
                      value="preview"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 px-0 gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
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

                <TabsContent value="preview" className="flex-1 m-0 p-4 overflow-y-auto">
                  {activeFileId === "file-skill" && validation.metadata ? (
                    <div className="max-w-2xl mx-auto">
                      <div className="p-6 rounded-lg border border-border bg-card">
                        <h2 className="text-xl font-bold mb-2">
                          {validation.metadata.name}
                        </h2>
                        <p className="text-muted-foreground mb-4">
                          {validation.metadata.description}
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="p-3 rounded bg-secondary/30">
                            <div className="text-xs text-muted-foreground mb-1">版本</div>
                            <div className="font-mono">{validation.metadata.version}</div>
                          </div>
                          <div className="p-3 rounded bg-secondary/30">
                            <div className="text-xs text-muted-foreground mb-1">作者</div>
                            <div>{validation.metadata.author}</div>
                          </div>
                        </div>

                        {validation.metadata.permissions && (
                          <div className="mb-4">
                            <div className="text-xs text-muted-foreground mb-2">权限</div>
                            <div className="flex gap-1 flex-wrap">
                              {validation.metadata.permissions.map((p) => (
                                <Badge key={p} variant="outline">{p}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {validation.metadata.inputs && (
                          <div className="mb-4">
                            <div className="text-xs text-muted-foreground mb-2">输入</div>
                            {validation.metadata.inputs.map((input, i) => (
                              <div key={i} className="p-2 rounded bg-secondary/30 font-mono text-sm">
                                <span className="text-cognitive">{input.name}</span>
                                <span className="text-muted-foreground">: </span>
                                <span className="text-governance">{input.type}</span>
                                {input.description && (
                                  <span className="text-muted-foreground ml-2">
                                    // {input.description}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      预览仅支持 SKILL.md 文件
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Panel - Preview & Validation */}
          <ResizablePanel defaultSize={35} minSize={25}>
            <div className="h-full flex flex-col bg-card/50 overflow-y-auto">
              <div className="panel-header">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="font-semibold text-sm">Preview & Validation</span>
                </div>
              </div>

              <div className="flex-1 p-4 space-y-6">
                {/* Frontmatter Check Status Card */}
                {activeFileId === "file-skill" && (
                  <FrontmatterCheckCard validation={validation} />
                )}

                {/* Current Skill Info */}
                {currentSkill && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      技能状态
                    </label>
                    <div className="p-3 rounded-lg border border-border bg-secondary/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{currentSkill.name}</span>
                        <Badge variant={currentSkill.is_published ? "default" : "secondary"}>
                          {currentSkill.is_published ? "已发布" : "草稿"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        v{currentSkill.version}
                      </div>
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
                {activeFileId === "file-skill" && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Frontmatter 解析结果
                    </label>
                    <MetadataDisplay metadata={validation.metadata} />
                  </div>
                )}

                {/* Dependency Manager */}
                {activeFileId === "file-config" && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      依赖管理
                    </label>
                    <DependencyManager configContent={contents["file-config"]} />
                  </div>
                )}

                {activeFileId !== "file-config" && contents["file-config"] && (
                  <DependencyManager configContent={contents["file-config"]} />
                )}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default Foundry;
