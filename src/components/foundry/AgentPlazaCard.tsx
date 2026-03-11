/**
 * @file AgentPlazaCard.tsx
 * @description 智能体广场卡片组件 - 用于在网格视图中展示智能体
 */

import { Github, Tag, Cpu, ExternalLink } from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card.tsx";
import { cn } from "../../lib/utils.ts";
import {
  AwesomeLLMAgent,
  AGENT_CATEGORIES,
  getAgentGitHubUrl,
} from "../../data/awesomeLLMAgents.ts";

interface AgentPlazaCardProps {
  agent: AwesomeLLMAgent;
  onSelect?: (agent: AwesomeLLMAgent) => void;
  className?: string;
}

export function AgentPlazaCard({
  agent,
  onSelect,
  className,
}: AgentPlazaCardProps) {
  const category = AGENT_CATEGORIES.find((c) => c.id === agent.category);
  const githubUrl = getAgentGitHubUrl(agent);

  const handleViewDetails = () => {
    onSelect?.(agent);
  };

  const handleOpenGitHub = (e: React.MouseEvent) => {
    e.stopPropagation();
    globalThis.open(githubUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg",
        className
      )}
      onClick={handleViewDetails}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform">
            {agent.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {agent.name}
            </h3>
            {category && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <span>{category.emoji}</span>
                {category.name}
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {agent.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {agent.description}
          </p>
        )}

        {/* 标签 */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {agent.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] px-1.5">
              {tag}
            </Badge>
          ))}
          {agent.tags.length > 3 && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              +{agent.tags.length - 3}
            </Badge>
          )}
          {agent.hasLocalVersion && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 border-status-executing/50 text-status-executing"
            >
              Local
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={handleViewDetails}
        >
          查看详情
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={handleOpenGitHub}
        >
          <Github className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// 智能体广场网格视图
interface AgentPlazaGridProps {
  agents: AwesomeLLMAgent[];
  onAgentSelect: (agent: AwesomeLLMAgent) => void;
  className?: string;
}

export function AgentPlazaGrid({
  agents,
  onAgentSelect,
  className,
}: AgentPlazaGridProps) {
  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <span className="text-3xl">🔍</span>
        </div>
        <p className="text-sm text-muted-foreground">未找到匹配的智能体</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4",
        className
      )}
    >
      {agents.map((agent) => (
        <AgentPlazaCard
          key={agent.id}
          agent={agent}
          onSelect={onAgentSelect}
        />
      ))}
    </div>
  );
}
