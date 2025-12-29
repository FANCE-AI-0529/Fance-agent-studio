import { useState, useMemo, useCallback } from "react";
import {
  Play,
  Save,
  Upload,
  CheckCircle2,
  FileText,
  Eye,
  Code2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

import { SkillEditor } from "@/components/foundry/SkillEditor";
import { FileExplorer, FileItem } from "@/components/foundry/FileExplorer";
import {
  parseSkillMd,
  ValidationPanel,
  MetadataDisplay,
  ValidationResult,
} from "@/components/foundry/SkillValidator";

const defaultSkillMd = `---
name: "政策查询"
version: "1.0.0"
description: "智能解读政策文件，提供精准的政策咨询服务"
author: "Agent OS Studio"
permissions:
  - read
  - network
inputs:
  - name: query
    type: string
    description: 用户的政策相关问题
outputs:
  - name: response
    type: string
    description: 政策解读结果
---

# 政策查询技能

## 能力描述

本技能专注于政策文件的智能解读，能够：

1. **关键词提取** - 从用户问题中提取政策相关关键词
2. **政策匹配** - 在知识库中检索最相关的政策条文
3. **智能解读** - 用通俗易懂的语言解释政策含义
4. **引用溯源** - 提供原文出处便于核实

## 使用示例

\`\`\`
用户: 开火锅店需要什么证照？
助手: 根据《食品安全法》和《个体工商户条例》规定...
\`\`\`

## 注意事项

- 政策解读仅供参考，以官方发布为准
- 涉及敏感政策需人工复核
`;

const handlerPy = `"""
政策查询技能处理器
"""

import json
from typing import Dict, Any


async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    处理政策查询请求
    
    Args:
        inputs: 包含 query 字段的输入字典
        
    Returns:
        包含 response 字段的输出字典
    """
    query = inputs.get("query", "")
    
    # TODO: 实现实际的政策查询逻辑
    # 1. 对查询进行向量化
    # 2. 在知识库中检索相关政策
    # 3. 使用 LLM 生成解读
    
    response = f"正在查询关于 '{query}' 的相关政策..."
    
    return {
        "response": response,
        "sources": [],
        "confidence": 0.85
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
const initialFiles: FileItem[] = [
  {
    id: "folder-policy",
    name: "policy-query",
    type: "folder",
    children: [
      { id: "file-skill", name: "SKILL.md", type: "file", language: "markdown" },
      { id: "file-handler", name: "handler.py", type: "file", language: "python" },
      { id: "file-config", name: "config.yaml", type: "file", language: "yaml" },
    ],
  },
];

const fileContents: Record<string, string> = {
  "file-skill": defaultSkillMd,
  "file-handler": handlerPy,
  "file-config": configYaml,
};

const Foundry = () => {
  const [files] = useState<FileItem[]>(initialFiles);
  const [activeFileId, setActiveFileId] = useState("file-skill");
  const [contents, setContents] = useState<Record<string, string>>(fileContents);
  const [activeTab, setActiveTab] = useState("edit");

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
    },
    [activeFileId]
  );

  const handleFileSelect = useCallback((file: FileItem) => {
    if (file.type === "file") {
      setActiveFileId(file.id);
    }
  }, []);

  const handleSave = () => {
    toast({
      title: "保存成功",
      description: `${activeFile?.name} 已保存`,
    });
  };

  const handleTest = () => {
    toast({
      title: "测试运行中",
      description: "正在沙箱环境中测试技能...",
    });
  };

  const handlePublish = () => {
    if (!validation.isValid) {
      toast({
        title: "无法发布",
        description: "请先修复 SKILL.md 中的错误",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "发布成功",
      description: `${validation.metadata?.name} 已发布到技能市场`,
    });
  };

  const getLanguage = () => {
    if (!activeFile) return "markdown";
    if (activeFile.name.endsWith(".py")) return "python";
    if (activeFile.name.endsWith(".yaml") || activeFile.name.endsWith(".yml"))
      return "yaml";
    if (activeFile.name.endsWith(".json")) return "json";
    return "markdown";
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - File Explorer */}
      <FileExplorer
        files={files}
        activeFileId={activeFileId}
        onFileSelect={handleFileSelect}
      />

      {/* Center - Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="panel-header border-b border-border">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5">
              <FileText className="h-3 w-3" />
              {activeFile?.name || "未选择文件"}
            </Badge>
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
              className="gap-1.5 h-8"
            >
              <Save className="h-3.5 w-3.5" />
              保存
            </Button>
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
            disabled={!validation.isValid}
          >
            <Upload className="h-4 w-4" />
            发布到技能市场
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Foundry;