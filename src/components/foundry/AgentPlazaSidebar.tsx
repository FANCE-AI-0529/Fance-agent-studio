/**
 * @file AgentPlazaSidebar.tsx
 * @description 智能体广场侧边栏组件 - 展示 awesome-llm-apps 中的智能体分类列表
 */

import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Input } from "../ui/input.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible.tsx";
import { cn } from "../../lib/utils.ts";
import {
  AwesomeLLMAgent,
  AgentCategory,
  AGENT_CATEGORIES,
  getAgentsByCategory,
  searchAgents,
} from "../../data/awesomeLLMAgents.ts";

interface AgentPlazaSidebarProps {
  selectedAgentId: string | null;
  onAgentSelect: (agent: AwesomeLLMAgent) => void;
  className?: string;
}

export function AgentPlazaSidebar({
  selectedAgentId,
  onAgentSelect,
  className,
}: AgentPlazaSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<AgentCategory>>(
    new Set(["starter-agents"])
  );

  // 过滤智能体
  const filteredAgents = useMemo(() => {
    if (searchTerm.trim()) {
      return searchAgents(searchTerm);
    }
    return null; // 返回 null 表示按分类显示
  }, [searchTerm]);

  // 切换分类展开状态
  const toggleCategory = (categoryId: AgentCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* 搜索栏 */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索智能体..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>
      </div>

      {/* 智能体列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {filteredAgents ? (
            // 搜索结果模式
            <div className="space-y-0.5">
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                找到 {filteredAgents.length} 个智能体
              </div>
              {filteredAgents.map((agent) => (
                <AgentItem
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgentId === agent.id}
                  onSelect={() => onAgentSelect(agent)}
                />
              ))}
              {filteredAgents.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  未找到匹配的智能体
                </div>
              )}
            </div>
          ) : (
            // 分类模式
            AGENT_CATEGORIES.map((category) => {
              const agents = getAgentsByCategory(category.id);
              const isExpanded = expandedCategories.has(category.id);

              return (
                <Collapsible
                  key={category.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-base">{category.emoji}</span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          {category.name}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {agents.length}
                      </Badge>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="space-y-0.5 mt-1 pl-2">
                      {agents.map((agent) => (
                        <AgentItem
                          key={agent.id}
                          agent={agent}
                          isSelected={selectedAgentId === agent.id}
                          onSelect={() => onAgentSelect(agent)}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* 底部说明 */}
      <div className="p-3 border-t border-border">
        <a
          href="https://github.com/Shubhamsaboo/awesome-llm-apps"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          <span>数据来源: awesome-llm-apps</span>
        </a>
      </div>
    </div>
  );
}

// 单个智能体项组件
function AgentItem({
  agent,
  isSelected,
  onSelect,
}: {
  agent: AwesomeLLMAgent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
        isSelected
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <span className="text-base flex-shrink-0">{agent.emoji}</span>
      <span className="truncate flex-1">{agent.name}</span>
      {agent.hasLocalVersion && (
        <Badge variant="outline" className="text-[9px] h-4 px-1">
          Local
        </Badge>
      )}
    </button>
  );
}
