import { useState, useMemo, useCallback, useEffect } from "react";
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

import { SkillEditor } from "@/components/foundry/SkillEditor";
import { FileExplorer, FileItem } from "@/components/foundry/FileExplorer";
import {
  parseSkillMd,
  ValidationPanel,
  MetadataDisplay,
  ValidationResult,
} from "@/components/foundry/SkillValidator";
import {
  useMySkills,
  useCreateSkill,
  useUpdateSkill,
  usePublishSkill,
  useDeleteSkill,
  type Skill,
} from "@/hooks/useSkills";

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

const Foundry = () => {
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
        // Load skill content
        setContents({
          "file-skill": skill.content || defaultSkillMd,
          "file-handler": handlerPy,
          "file-config": configYaml,
        });
        setFiles(createInitialFiles(skill.name));
        setHasUnsavedChanges(false);
      }
    } else {
      // Reset to defaults for new skill
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

  const handleSave = async () => {
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
      category: "nlp", // Default category, could be parsed from metadata
      content: skillMdContent,
      inputs: parsed.metadata.inputs || [],
      outputs: parsed.metadata.outputs || [],
    };

    if (activeSkillId) {
      await updateSkill.mutateAsync({ id: activeSkillId, ...skillData });
    } else {
      const newSkill = await createSkill.mutateAsync(skillData);
      setActiveSkillId(newSkill.id);
    }

    setHasUnsavedChanges(false);
  };

  const handleTest = () => {
    toast({
      title: "测试运行中",
      description: "正在沙箱环境中测试技能...",
    });
  };

  const handlePublish = async () => {
    if (!validation.isValid) {
      toast({
        title: "无法发布",
        description: "请先修复 SKILL.md 中的错误",
        variant: "destructive",
      });
      return;
    }

    // Save first if there are unsaved changes
    if (hasUnsavedChanges) {
      await handleSave();
    }

    if (activeSkillId) {
      await publishSkill.mutateAsync(activeSkillId);
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
    <div className="h-full flex">
      {/* Left Panel - File Explorer */}
      <div className="w-64 border-r border-border flex flex-col bg-card/50">
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

      {/* Center - Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="panel-header border-b border-border">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5">
              <FileText className="h-3 w-3" />
              {activeFile?.name || "未选择文件"}
            </Badge>
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="text-xs">
                未保存
              </Badge>
            )}
            {activeFileId === "file-skill" && (
              <div className="flex items-center gap-1.5">
                {validation.isValid ? (
                  validation.warnings.length > 0 ? (
                    <Badge className="bg-status-planning/10 text-status-planning border-0 text-xs">
                      {validation.warnings.length} 警告
                    </Badge>
                  ) : (
                    <Badge className="bg-status-executing/10 text-status-executing border-0 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      有效
                    </Badge>
                  )
                ) : (
                  <Badge className="bg-destructive/10 text-destructive border-0 text-xs">
                    {validation.errors.length} 错误
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTest}
              className="gap-1.5 h-8"
            >
              <Play className="h-3.5 w-3.5" />
              测试
            </Button>
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
                删除
              </Button>
            )}
          </div>
        </div>

        {/* Editor with Tabs */}
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

          <TabsContent
            value="preview"
            className="flex-1 m-0 p-4 overflow-y-auto"
          >
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
                      <div className="text-xs text-muted-foreground mb-1">
                        版本
                      </div>
                      <div className="font-mono">
                        {validation.metadata.version}
                      </div>
                    </div>
                    <div className="p-3 rounded bg-secondary/30">
                      <div className="text-xs text-muted-foreground mb-1">
                        作者
                      </div>
                      <div>{validation.metadata.author}</div>
                    </div>
                  </div>

                  {validation.metadata.permissions && (
                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground mb-2">
                        权限
                      </div>
                      <div className="flex gap-1">
                        {validation.metadata.permissions.map((p) => (
                          <Badge key={p} variant="outline">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {validation.metadata.inputs && (
                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground mb-2">
                        输入
                      </div>
                      {validation.metadata.inputs.map((input, i) => (
                        <div
                          key={i}
                          className="p-2 rounded bg-secondary/30 font-mono text-sm"
                        >
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

      {/* Right Panel - Metadata & Validation */}
      <div className="w-72 border-l border-border bg-card/50 hidden xl:flex flex-col">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="font-semibold text-sm">元数据</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
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

          {/* Validation Status */}
          {activeFileId === "file-skill" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                校验状态
              </label>
              <ValidationPanel validation={validation} />
            </div>
          )}

          {/* Metadata Display */}
          {activeFileId === "file-skill" && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                解析结果
              </label>
              <MetadataDisplay metadata={validation.metadata} />
            </div>
          )}
        </div>

        {/* Publish Button */}
        <div className="p-4 border-t border-border">
          <Button
            className="w-full gap-2"
            onClick={handlePublish}
            disabled={!validation.isValid || isPublishing}
          >
            {isPublishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            发布到技能市场
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Foundry;
