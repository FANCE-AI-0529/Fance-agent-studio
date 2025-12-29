import { useState } from "react";
import { 
  FileCode, 
  Play, 
  Save, 
  Upload, 
  FolderTree, 
  CheckCircle2,
  AlertTriangle,
  Code2,
  FileText,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

const Foundry = () => {
  const [content, setContent] = useState(defaultSkillMd);
  const [validationStatus, setValidationStatus] = useState<"valid" | "warning" | "error">("valid");
  const [activeFile, setActiveFile] = useState("SKILL.md");

  const files = [
    { name: "SKILL.md", icon: FileText, type: "skill" },
    { name: "handler.py", icon: Code2, type: "code" },
    { name: "config.yaml", icon: FileCode, type: "config" },
  ];

  const handleValidate = () => {
    // Simulate validation
    setValidationStatus("valid");
  };

  return (
    <div className="h-full flex">
      {/* Left Panel - File Explorer */}
      <div className="w-64 border-r border-border flex flex-col bg-card/50">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-cognitive" />
            <span className="font-semibold text-sm">技能文件</span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Upload className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-0.5">
            {files.map(file => (
              <button
                key={file.name}
                onClick={() => setActiveFile(file.name)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  activeFile === file.name
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <file.icon className="h-4 w-4" />
                <span>{file.name}</span>
              </button>
            ))}
          </div>

          {/* Templates Section */}
          <div className="mt-6">
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              模板库
            </div>
            <div className="space-y-1">
              {["分析类模板", "创作类模板", "工具类模板"].map(template => (
                <button
                  key={template}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{template}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Center - Editor Area */}
      <div className="flex-1 flex flex-col">
        <div className="panel-header border-b border-border">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5">
              <FileText className="h-3 w-3" />
              {activeFile}
            </Badge>
            <div className="flex items-center gap-1.5">
              {validationStatus === "valid" && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-status-executing" />
                  <span className="text-xs text-muted-foreground">语法有效</span>
                </>
              )}
              {validationStatus === "warning" && (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-status-planning" />
                  <span className="text-xs text-muted-foreground">存在警告</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleValidate} className="gap-1.5 h-8">
              <CheckCircle2 className="h-3.5 w-3.5" />
              验证
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8">
              <Play className="h-3.5 w-3.5" />
              测试
            </Button>
            <Button size="sm" className="gap-1.5 h-8">
              <Save className="h-3.5 w-3.5" />
              保存
            </Button>
          </div>
        </div>

        {/* Editor with Tabs */}
        <Tabs defaultValue="edit" className="flex-1 flex flex-col">
          <div className="px-4 pt-2 border-b border-border">
            <TabsList className="bg-transparent h-8 p-0 gap-4">
              <TabsTrigger 
                value="edit" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 px-0"
              >
                编辑器
              </TabsTrigger>
              <TabsTrigger 
                value="preview" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 px-0"
              >
                预览
              </TabsTrigger>
              <TabsTrigger 
                value="schema" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-8 px-0"
              >
                Schema
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="edit" className="flex-1 m-0 p-0">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-4 bg-background font-mono text-sm resize-none focus:outline-none"
              spellCheck={false}
            />
          </TabsContent>
          
          <TabsContent value="preview" className="flex-1 m-0 p-4 overflow-y-auto">
            <div className="prose prose-invert prose-sm max-w-none">
              <div className="p-4 rounded-lg border border-border bg-card">
                <h3 className="text-lg font-semibold mb-2">政策查询</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  智能解读政策文件，提供精准的政策咨询服务
                </p>
                
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">版本</span>
                    <p className="text-sm">1.0.0</p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">权限</span>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">read</Badge>
                      <Badge variant="outline" className="text-xs">network</Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">输入参数</span>
                    <div className="mt-1 p-2 rounded bg-secondary/50 font-mono text-xs">
                      query: string - 用户的政策相关问题
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="schema" className="flex-1 m-0 p-4 overflow-y-auto">
            <pre className="p-4 rounded-lg border border-border bg-card font-mono text-xs overflow-x-auto">
{`{
  "$schema": "https://agentskills.io/schema/v1",
  "name": "政策查询",
  "version": "1.0.0",
  "permissions": ["read", "network"],
  "inputs": {
    "query": {
      "type": "string",
      "required": true
    }
  },
  "outputs": {
    "response": {
      "type": "string"
    }
  }
}`}
            </pre>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Panel - Metadata */}
      <div className="w-72 border-l border-border bg-card/50 hidden xl:flex flex-col">
        <div className="panel-header">
          <span className="font-semibold text-sm">元数据</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              基本信息
            </label>
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">名称</span>
                <span>政策查询</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">版本</span>
                <span>1.0.0</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">作者</span>
                <span>Agent OS Studio</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              依赖检测
            </label>
            <div className="p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 text-status-executing">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">无环境冲突</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              权限声明
            </label>
            <div className="space-y-1">
              {["read", "network"].map(perm => (
                <div key={perm} className="flex items-center justify-between p-2 rounded border border-border bg-card">
                  <span className="text-sm">{perm}</span>
                  <Badge variant="secondary" className="text-[10px]">已声明</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <Button className="w-full gap-2">
            <Upload className="h-4 w-4" />
            发布到技能市场
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Foundry;