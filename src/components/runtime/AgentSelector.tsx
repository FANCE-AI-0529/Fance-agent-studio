import { Bot, ChevronDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Agent } from "@/hooks/useAgents";

interface AgentSelectorProps {
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent | null) => void;
  isLoading?: boolean;
}

// Default demo agent
const defaultAgent = {
  id: "demo",
  name: "MPLP 智能助手",
  department: "Agent OS 平台",
  model: "gemini-2.5-flash",
  status: "deployed",
} as const;

export function AgentSelector({
  agents,
  selectedAgent,
  onSelectAgent,
  isLoading,
}: AgentSelectorProps) {
  const displayAgent = selectedAgent || defaultAgent;
  const deployedAgents = agents.filter(a => a.status === "deployed");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto p-2 gap-3 hover:bg-accent/50"
          disabled={isLoading}
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm flex items-center gap-2">
              {displayAgent.name}
              {selectedAgent?.id !== "demo" && (
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs text-muted-foreground">
            选择一个智能体开始对话，智能体会根据您的指令自动执行任务
          </p>
        </div>
        <DropdownMenuItem
          onClick={() => onSelectAgent(null)}
          className="flex items-start gap-3 p-3"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">MPLP 智能助手</div>
            <div className="text-xs text-muted-foreground">Agent OS 平台 · 默认演示</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              支持：文件读取、数据查询、表单生成、API调用等
            </div>
          </div>
          {!selectedAgent && (
            <Badge variant="secondary" className="text-[10px] flex-shrink-0">当前</Badge>
          )}
        </DropdownMenuItem>

        {deployedAgents.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                已部署的 Agent
              </span>
            </div>
            {deployedAgents.map((agent) => (
              <DropdownMenuItem
                key={agent.id}
                onClick={() => onSelectAgent(agent)}
                className="flex items-center gap-3 p-3"
              >
                <div className="w-8 h-8 rounded-lg bg-cognitive/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-cognitive" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{agent.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {agent.department || "通用助手"}
                  </div>
                </div>
                {selectedAgent?.id === agent.id && (
                  <Badge variant="secondary" className="text-[10px]">当前</Badge>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {deployedAgents.length === 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground">
                暂无已部署的 Agent
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                在 Builder 中创建并部署 Agent
              </p>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
