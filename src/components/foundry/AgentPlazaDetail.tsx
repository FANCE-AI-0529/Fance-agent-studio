/**
 * @file AgentPlazaDetail.tsx
 * @description 智能体广场详情面板 - 显示选中智能体的详细信息和操作
 */

import { useState } from "react";
import { ExternalLink, Github, Copy, FileText, Loader2, Tag, Cpu, Download, Check } from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { Card, CardContent } from "../ui/card.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Separator } from "../ui/separator.tsx";
import { toast } from "../../hooks/use-toast.ts";
import { cn } from "../../lib/utils.ts";
import {
  AwesomeLLMAgent,
  AGENT_CATEGORIES,
  getAgentGitHubUrl,
} from "../../data/awesomeLLMAgents.ts";
import { useAgentReadme } from "../../hooks/useGitHubContent.ts";
import { useCreateSkill } from "../../hooks/useSkills.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";

interface AgentPlazaDetailProps {
  agent: AwesomeLLMAgent;
  onClose?: () => void;
  className?: string;
}

export function AgentPlazaDetail({
  agent,
  onClose,
  className,
}: AgentPlazaDetailProps) {
  const { data: readme, isLoading, error } = useAgentReadme(agent.githubPath);
  const { user } = useAuth();
  const createSkill = useCreateSkill();
  const [isImported, setIsImported] = useState(false);
  
  const category = AGENT_CATEGORIES.find((c) => c.id === agent.category);
  const githubUrl = getAgentGitHubUrl(agent);

  const handleCopyPath = () => {
    navigator.clipboard.writeText(agent.githubPath);
    toast({
      title: "已复制",
      description: "GitHub 路径已复制到剪贴板",
    });
  };

  const handleOpenGitHub = () => {
    globalThis.open(githubUrl, "_blank", "noopener,noreferrer");
  };

  const handleClone = () => {
    const cloneCommand = `git clone https://github.com/Shubhamsaboo/awesome-llm-apps.git && cd awesome-llm-apps/${agent.githubPath}`;
    navigator.clipboard.writeText(cloneCommand);
    toast({
      title: "克隆命令已复制",
      description: "在终端中粘贴即可克隆此智能体",
    });
  };

  const handleImportAsSkill = async () => {
    if (!user) {
      toast({ 
        title: "请先登录", 
        description: "需要登录后才能导入技能",
        variant: "destructive" 
      });
      return;
    }

    try {
      // Build skill content from README
      const readmeContent = readme || `# ${agent.name}\n\n${agent.description || '从 awesome-llm-apps 导入'}`;
      
      const skillContent = `---
name: "${agent.name}"
version: "1.0.0"
description: "${agent.description || ''}"
author: "awesome-llm-apps"
origin: "github"
origin_url: "${githubUrl}"
tags: ${JSON.stringify(agent.tags)}
model_provider: "${agent.modelProvider || 'openai'}"
permissions:
  - internet_access
---

# ${agent.name}

> 从 [awesome-llm-apps](${githubUrl}) 导入

${readmeContent}
`;

      await createSkill.mutateAsync({
        name: agent.name,
        content: skillContent,
        description: agent.description || `从 awesome-llm-apps 导入的智能体: ${agent.name}`,
        category: category?.id || 'general',
        tags: agent.tags,
        is_published: false,
        is_free: true,
      });

      setIsImported(true);
      toast({ 
        title: "导入成功", 
        description: `「${agent.name}」已添加到我的技能` 
      });
    } catch (error: any) {
      toast({ 
        title: "导入失败", 
        description: error.message || "请稍后重试", 
        variant: "destructive" 
      });
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 头部信息 */}
      <div className="p-6 border-b border-border">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-3xl">
            {agent.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold truncate">{agent.name}</h2>
            {agent.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {agent.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-3">
              {category && (
                <Badge variant="secondary" className="gap-1">
                  <span>{category.emoji}</span>
                  {category.name}
                </Badge>
              )}
              {agent.modelProvider && (
                <Badge variant="outline" className="gap-1">
                  <Cpu className="h-3 w-3" />
                  {agent.modelProvider}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 标签 */}
        <div className="flex flex-wrap gap-2 mt-4">
          {agent.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs gap-1">
              <Tag className="h-3 w-3" />
              {tag}
            </Badge>
          ))}
          {agent.hasLocalVersion && (
            <Badge className="bg-status-executing/20 text-status-executing border-status-executing/30 text-xs">
              支持本地运行
            </Badge>
          )}
        </div>

        {/* 路径信息 */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <code className="text-xs text-muted-foreground truncate flex-1">
            {agent.githubPath}
          </code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={handleCopyPath}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 mt-4">
          <Button 
            onClick={handleImportAsSkill} 
            className="flex-1 gap-2"
            disabled={createSkill.isPending || isImported}
          >
            {createSkill.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isImported ? (
              <Check className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isImported ? "已导入" : "导入为技能"}
          </Button>
          <Button variant="outline" onClick={handleOpenGitHub} className="gap-2">
            <Github className="h-4 w-4" />
            源码
          </Button>
          <Button variant="outline" onClick={handleClone} className="gap-2">
            <Copy className="h-4 w-4" />
            克隆
          </Button>
        </div>
      </div>

      <Separator />

      {/* README 内容 */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            README.md
          </h3>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">加载中...</span>
            </div>
          ) : error ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  无法加载 README 文件
                </p>
                <Button
                  variant="link"
                  onClick={handleOpenGitHub}
                  className="mt-2 gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  在 GitHub 查看
                </Button>
              </CardContent>
            </Card>
          ) : readme ? (
            <Card>
              <CardContent className="p-4">
                <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground leading-relaxed">
                  {readme}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </ScrollArea>

      {/* 底部快捷操作 */}
      <div className="p-4 border-t border-border bg-card/80">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleOpenGitHub}
        >
          <ExternalLink className="h-4 w-4" />
          在浏览器中打开 GitHub
        </Button>
      </div>
    </div>
  );
}

// 空状态组件
export function AgentPlazaEmpty() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
        <span className="text-4xl">🏪</span>
      </div>
      <h3 className="text-lg font-semibold mb-2">选择一个智能体</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        从左侧列表中选择一个智能体模板，查看详细信息并获取源代码
      </p>
    </div>
  );
}
