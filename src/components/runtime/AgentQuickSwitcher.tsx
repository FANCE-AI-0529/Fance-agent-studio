import { useState } from "react";
import { Bot, ChevronDown, Check, Plus, Sparkles, Zap, Settings, Star } from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar.tsx";
import { cn } from "../../lib/utils.ts";

export interface QuickAgent {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  model?: string;
  isDefault?: boolean;
  isFavorite?: boolean;
  lastUsed?: Date;
  color?: string;
}

interface AgentQuickSwitcherProps {
  agents: QuickAgent[];
  currentAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  onCreateAgent?: () => void;
  onManageAgents?: () => void;
}

const defaultAgentColors = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600",
  "from-green-500 to-green-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
];

export function AgentQuickSwitcher({
  agents,
  currentAgentId,
  onSelectAgent,
  onCreateAgent,
  onManageAgents,
}: AgentQuickSwitcherProps) {
  const currentAgent = agents.find(a => a.id === currentAgentId);
  
  // 排序：收藏的在前，然后按最近使用
  const sortedAgents = [...agents].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    if (a.lastUsed && b.lastUsed) {
      return b.lastUsed.getTime() - a.lastUsed.getTime();
    }
    return 0;
  });

  const getAgentColor = (agent: QuickAgent, index: number) => {
    return agent.color || defaultAgentColors[index % defaultAgentColors.length];
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 h-9 px-3">
          <div className={cn(
            "w-6 h-6 rounded-full bg-gradient-to-br flex items-center justify-center",
            currentAgent ? getAgentColor(currentAgent, 0) : "from-primary to-primary/80"
          )}>
            {currentAgent?.avatar ? (
              <Avatar className="w-6 h-6">
                <AvatarImage src={currentAgent.avatar} />
                <AvatarFallback className="text-[10px] text-white bg-transparent">
                  {currentAgent.name[0]}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Bot className="h-3.5 w-3.5 text-white" />
            )}
          </div>
          <span className="font-medium text-sm max-w-[120px] truncate">
            {currentAgent?.name || "选择助手"}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          我的 AI 助手
        </div>
        
        {sortedAgents.map((agent, index) => (
          <DropdownMenuItem
            key={agent.id}
            onClick={() => onSelectAgent(agent.id)}
            className="flex items-center gap-3 py-2.5 cursor-pointer"
          >
            <div className={cn(
              "w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0",
              getAgentColor(agent, index)
            )}>
              {agent.avatar ? (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={agent.avatar} />
                  <AvatarFallback className="text-xs text-white bg-transparent">
                    {agent.name[0]}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <Bot className="h-4 w-4 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">{agent.name}</span>
                {agent.isFavorite && (
                  <Star className="h-3 w-3 fill-primary text-primary flex-shrink-0" />
                )}
                {agent.isDefault && (
                  <Badge variant="secondary" className="text-[9px] px-1 h-4">
                    默认
                  </Badge>
                )}
              </div>
              {agent.description && (
                <p className="text-xs text-muted-foreground truncate">
                  {agent.description}
                </p>
              )}
            </div>
            {agent.id === currentAgentId && (
              <Check className="h-4 w-4 text-primary flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}

        {agents.length === 0 && (
          <div className="text-center py-4 px-2">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-xs text-muted-foreground">
              还没有创建助手
            </p>
          </div>
        )}

        <DropdownMenuSeparator />
        
        {onCreateAgent && (
          <DropdownMenuItem onClick={onCreateAgent} className="gap-2">
            <Plus className="h-4 w-4" />
            创建新助手
          </DropdownMenuItem>
        )}
        
        {onManageAgents && (
          <DropdownMenuItem onClick={onManageAgents} className="gap-2">
            <Settings className="h-4 w-4" />
            管理助手
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// 横向快速切换栏（用于顶部）
export function AgentQuickBar({
  agents,
  currentAgentId,
  onSelectAgent,
  maxVisible = 4,
}: {
  agents: QuickAgent[];
  currentAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  maxVisible?: number;
}) {
  const visibleAgents = agents.slice(0, maxVisible);
  const hiddenAgents = agents.slice(maxVisible);

  return (
    <div className="flex items-center gap-1">
      {visibleAgents.map((agent, index) => (
        <Button
          key={agent.id}
          variant={agent.id === currentAgentId ? "default" : "ghost"}
          size="sm"
          onClick={() => onSelectAgent(agent.id)}
          className={cn(
            "h-8 px-2.5 gap-1.5",
            agent.id === currentAgentId && "bg-primary text-primary-foreground"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-full bg-gradient-to-br flex items-center justify-center",
            agent.id === currentAgentId 
              ? "bg-primary-foreground/20" 
              : defaultAgentColors[index % defaultAgentColors.length]
          )}>
            <Bot className="h-3 w-3 text-white" />
          </div>
          <span className="text-xs max-w-[60px] truncate">{agent.name}</span>
        </Button>
      ))}

      {hiddenAgents.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              +{hiddenAgents.length}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {hiddenAgents.map((agent) => (
              <DropdownMenuItem
                key={agent.id}
                onClick={() => onSelectAgent(agent.id)}
                className="gap-2"
              >
                <Bot className="h-4 w-4" />
                {agent.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
