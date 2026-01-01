import React from "react";
import {
  Bot,
  Cpu,
  Database,
  FileCode,
  Key,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Agent } from "@/hooks/useAgents";

interface MemoryItem {
  key: string;
  value: string;
  type: "context" | "entity" | "fact";
}

interface ContextPanelContentProps {
  agent: Agent | null;
  memory: MemoryItem[];
}

export function ContextPanelContent({ agent, memory }: ContextPanelContentProps) {
  const skills = agent ? ((agent.manifest as any)?.skills?.details || []) : [];

  return (
    <div className="space-y-4">
      {/* Agent Info */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          当前 Agent
        </label>
        <div className="mt-2 p-3 rounded-lg bg-secondary/30 border border-border">
          {agent ? (
            <>
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-cognitive" />
                <span className="text-sm font-medium">{agent.name}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>{agent.department || '通用'}</span>
                <span>•</span>
                <span>{agent.model}</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">使用默认 Demo Agent</div>
          )}
        </div>
      </div>

      {/* Loaded Skills */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          已加载技能
        </label>
        <div className="mt-2 space-y-1.5">
          {skills.length > 0 ? (
            skills.map((skill: any) => (
              <div 
                key={skill.id} 
                className="flex items-center gap-2 p-2 rounded bg-cognitive/5 border border-cognitive/20"
              >
                <FileCode className="h-3.5 w-3.5 text-cognitive" />
                <span className="text-xs font-medium">{skill.name}</span>
                {skill.permissions?.length > 0 && (
                  <div className="flex gap-0.5 ml-auto">
                    {skill.permissions.slice(0, 2).map((p: string) => (
                      <Badge key={p} variant="outline" className="text-[8px] px-1 py-0 h-4">
                        {p}
                      </Badge>
                    ))}
                    {skill.permissions.length > 2 && (
                      <Badge variant="outline" className="text-[8px] px-1 py-0 h-4">
                        +{skill.permissions.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
              <FileCode className="h-5 w-5 mx-auto mb-1 opacity-50" />
              无已加载技能
            </div>
          )}
        </div>
      </div>

      {/* Memory / Context */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <Database className="h-3 w-3" />
          Memory / Context
        </label>
        <div className="mt-2 space-y-1.5">
          {memory.length > 0 ? (
            memory.map((item, idx) => (
              <div 
                key={idx}
                className="flex items-start gap-2 p-2 rounded bg-secondary/30 border border-border/50"
              >
                <Key className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-medium text-muted-foreground">{item.key}</div>
                  <div className="text-xs truncate">{item.value}</div>
                </div>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-[8px] px-1 py-0 h-4",
                    item.type === 'entity' && 'border-cognitive/50 text-cognitive',
                    item.type === 'fact' && 'border-governance/50 text-governance',
                    item.type === 'context' && 'border-primary/50 text-primary'
                  )}
                >
                  {item.type}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
              <Database className="h-6 w-6 mx-auto mb-2 opacity-50" />
              对话开始后将显示上下文
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
