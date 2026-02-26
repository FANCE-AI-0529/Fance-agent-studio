import { Bot, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Agent } from "@/hooks/useAgents";
import { AgentAvatarDisplay, AgentAvatar, getAvatarIcon, getAvatarColor } from "@/components/builder/AgentAvatarPicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent | null) => void;
  isLoading?: boolean;
}

// Default demo agent - FANCE 智能助手 (平台向导)
const defaultAgent = {
  id: "fance-guide",
  name: "FANCE 助手",
  department: "平台向导",
  model: "gemini-2.5-flash",
  status: "deployed",
  avatar: { iconId: "sparkles", colorId: "primary" } as AgentAvatar,
} as const;

// Helper to get avatar from agent manifest
function getAgentAvatar(agent: Agent | typeof defaultAgent): AgentAvatar {
  if ('avatar' in agent && agent.avatar) {
    return agent.avatar as AgentAvatar;
  }
  const manifest = (agent as Agent).manifest as any;
  if (manifest?.avatar) {
    return manifest.avatar as AgentAvatar;
  }
  return { iconId: "bot", colorId: "primary" };
}

export function AgentSelector({
  agents,
  selectedAgent,
  onSelectAgent,
  isLoading,
}: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const displayAgent = selectedAgent || defaultAgent;
  const deployedAgents = agents.filter(a => a.status === "deployed");
  const currentAvatar = selectedAgent ? getAgentAvatar(selectedAgent) : defaultAgent.avatar;

  const handleSelect = (agent: Agent | null) => {
    onSelectAgent(agent);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-2 gap-3 hover:bg-accent/50"
          disabled={isLoading}
        >
          <AgentAvatarDisplay avatar={currentAvatar} size="sm" />
          <div className="text-left">
            <div className="font-semibold text-sm flex items-center gap-2">
              {displayAgent.name}
              {selectedAgent?.id !== "demo" && selectedAgent && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  自定义
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {displayAgent.department || "通用助手"}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs text-muted-foreground">
            选择一个智能体开始对话
          </p>
        </div>
        <ScrollArea className="max-h-[320px]">
          <div className="p-1">
            {/* Default agent */}
            <button
              onClick={() => handleSelect(null)}
              className="w-full flex items-start gap-3 p-3 rounded-md hover:bg-accent/50 transition-colors text-left"
            >
              <AgentAvatarDisplay avatar={defaultAgent.avatar} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">Agent Studio 助手</div>
                <div className="text-xs text-muted-foreground">平台向导 · 智能体构建顾问</div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  帮助您了解平台功能、构建智能体
                </div>
              </div>
              {!selectedAgent && (
                <Badge variant="secondary" className="text-[10px] flex-shrink-0">当前</Badge>
              )}
            </button>

            {deployedAgents.length > 0 && (
              <>
                <div className="px-3 py-2 mt-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    已部署的 Agent
                  </span>
                </div>
                {deployedAgents.map((agent) => {
                  const agentAvatar = getAgentAvatar(agent);
                  return (
                    <button
                      key={agent.id}
                      onClick={() => handleSelect(agent)}
                      className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-accent/50 transition-colors text-left"
                    >
                      <AgentAvatarDisplay avatar={agentAvatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{agent.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {agent.department || "通用助手"}
                        </div>
                      </div>
                      {selectedAgent?.id === agent.id && (
                        <Badge variant="secondary" className="text-[10px]">当前</Badge>
                      )}
                    </button>
                  );
                })}
              </>
            )}

            {deployedAgents.length === 0 && (
              <div className="px-3 py-6 text-center">
                <p className="text-xs text-muted-foreground">暂无已部署的 Agent</p>
                <p className="text-xs text-muted-foreground mt-1">在 Builder 中创建并部署</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
