import { History, Code2, MessageCircle, Theater, Brain, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentSelector } from "./AgentSelector";
import { ScenarioSelector } from "./ScenarioSelector";
import { MemoryPanel } from "./MemoryPanel";
import { ShareDialog } from "./ShareDialog";
import { Scenario } from "@/hooks/useScenarios";
import { Agent } from "@/hooks/useAgents";
import { cn } from "@/lib/utils";

interface HeaderMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

// ShareDialog expects messages without system role
type ShareMessage = Omit<HeaderMessage, 'role'> & { role: "user" | "assistant" };

interface ImmersiveHeaderProps {
  // Mode
  isDeveloperMode: boolean;
  onToggleMode: (mode: boolean) => void;
  
  // History
  showHistory: boolean;
  onToggleHistory: () => void;
  isLoggedIn: boolean;
  
  // Agent
  agents: Agent[];
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent | null) => void;
  isLoadingAgents: boolean;
  
  // Session
  hasActiveSession: boolean;
  
  // Scenario
  activeScenario: Scenario | null;
  onSelectScenario: (scenario: Scenario | null) => void;
  
  // State
  isIdle: boolean;
  
  // Messages for sharing
  messages: HeaderMessage[];
  sessionId?: string;
}

export function ImmersiveHeader({
  isDeveloperMode,
  onToggleMode,
  showHistory,
  onToggleHistory,
  isLoggedIn,
  agents,
  selectedAgent,
  onSelectAgent,
  isLoadingAgents,
  hasActiveSession,
  activeScenario,
  onSelectScenario,
  isIdle,
  messages,
  sessionId,
}: ImmersiveHeaderProps) {
  return (
    <div className="panel-header border-b border-border backdrop-blur-sm bg-background/80 relative z-20">
      {/* 左侧控制区 */}
      <div className="flex items-center gap-2 flex-1">
        {/* History Toggle */}
        {isLoggedIn && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggleHistory}
          >
            <History className={cn("h-4 w-4", showHistory && "text-primary")} />
          </Button>
        )}
        
        {/* Session Badge */}
        {hasActiveSession && (
          <Badge variant="secondary" className="text-xs">已保存</Badge>
        )}
        
        {/* Scenario Badge */}
        {activeScenario && (
          <Badge variant="outline" className="text-xs gap-1 bg-primary/10 text-primary border-primary/30">
            <Theater className="h-3 w-3" />
            {activeScenario.name}
          </Badge>
        )}
      </div>
      
      {/* 中间 - Agent Selector 居中显示 */}
      <div className="flex items-center justify-center">
        <AgentSelector
          agents={agents}
          selectedAgent={selectedAgent}
          onSelectAgent={onSelectAgent}
          isLoading={isLoadingAgents}
        />
      </div>
      
      {/* 右侧控制区 */}
      <div className="flex items-center gap-1.5 flex-1 justify-end">
        {/* Scenario Selector */}
        <ScenarioSelector
          selectedScenario={activeScenario}
          onSelectScenario={onSelectScenario}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={!isIdle}
            >
              <Theater className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">场景</span>
            </Button>
          }
        />
        
        {/* Memory Panel */}
        <MemoryPanel
          agentId={selectedAgent?.id}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
            >
              <Brain className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">记忆</span>
            </Button>
          }
        />
        
        {/* Share Button */}
        <ShareDialog
          messages={messages.filter(m => m.role !== "system") as ShareMessage[]}
          sessionId={sessionId}
          agentName={selectedAgent?.name}
          agentAvatar={
            selectedAgent?.manifest
              ? {
                  iconId: (selectedAgent.manifest as any).iconId || "bot",
                  colorId: (selectedAgent.manifest as any).colorId || "blue",
                }
              : undefined
          }
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              disabled={messages.filter(m => m.role !== "system").length === 0}
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">分享</span>
            </Button>
          }
        />
        
        {/* Mode Toggle - Segmented Controller */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50 border border-border/50">
          <Button
            variant={!isDeveloperMode ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 gap-1.5 text-xs rounded-md transition-all",
              !isDeveloperMode && "shadow-sm"
            )}
            onClick={() => onToggleMode(false)}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">沉浸</span>
          </Button>
          <Button
            variant={isDeveloperMode ? "default" : "ghost"}
            size="sm"
            className={cn(
              "h-7 gap-1.5 text-xs rounded-md transition-all",
              isDeveloperMode && "shadow-sm"
            )}
            onClick={() => onToggleMode(true)}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">专家</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ImmersiveHeader;
