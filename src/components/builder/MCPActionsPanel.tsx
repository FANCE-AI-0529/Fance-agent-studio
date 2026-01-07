import React, { DragEvent } from "react";
import { 
  Zap, 
  Hand, 
  GripVertical,
  Calendar,
  Github,
  FileText,
  Mail,
  Database,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Shield,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

// MCP Action drag item type
export interface MCPActionDragItem {
  type: 'mcp_action';
  serverId: string;
  serverName: string;
  tool: {
    name: string;
    description?: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
  };
  category?: string;
  permissions: string[];
  riskLevel: "low" | "medium" | "high";
}

// Intervention drag item type
export interface InterventionDragItem {
  type: 'intervention';
  name: string;
}

// Mock MCP servers with tools
const mcpServers = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    icon: Calendar,
    color: "text-blue-500",
    tools: [
      {
        name: "create_event",
        description: "创建日历事件",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "事件标题" },
            start_time: { type: "string", description: "开始时间" },
            end_time: { type: "string", description: "结束时间" },
            location: { type: "string", description: "地点" },
            description: { type: "string", description: "描述" },
          },
          required: ["title", "start_time"],
        },
        permissions: ["write", "network"],
        riskLevel: "medium" as const,
      },
      {
        name: "list_events",
        description: "列出日历事件",
        inputSchema: {
          type: "object",
          properties: {
            start_date: { type: "string", description: "开始日期" },
            end_date: { type: "string", description: "结束日期" },
          },
        },
        permissions: ["read", "network"],
        riskLevel: "low" as const,
      },
      {
        name: "delete_event",
        description: "删除日历事件",
        inputSchema: {
          type: "object",
          properties: {
            event_id: { type: "string", description: "事件ID" },
          },
          required: ["event_id"],
        },
        permissions: ["delete", "network"],
        riskLevel: "high" as const,
      },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    icon: Github,
    color: "text-gray-400",
    tools: [
      {
        name: "create_issue",
        description: "创建 GitHub Issue",
        inputSchema: {
          type: "object",
          properties: {
            repo: { type: "string", description: "仓库名称" },
            title: { type: "string", description: "Issue 标题" },
            body: { type: "string", description: "Issue 内容" },
            labels: { type: "array", description: "标签列表" },
          },
          required: ["repo", "title"],
        },
        permissions: ["write", "network"],
        riskLevel: "medium" as const,
      },
      {
        name: "list_repos",
        description: "列出仓库",
        inputSchema: {
          type: "object",
          properties: {
            org: { type: "string", description: "组织名称" },
          },
        },
        permissions: ["read", "network"],
        riskLevel: "low" as const,
      },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    icon: FileText,
    color: "text-white",
    tools: [
      {
        name: "create_page",
        description: "创建 Notion 页面",
        inputSchema: {
          type: "object",
          properties: {
            parent_id: { type: "string", description: "父页面ID" },
            title: { type: "string", description: "页面标题" },
            content: { type: "string", description: "页面内容" },
          },
          required: ["parent_id", "title"],
        },
        permissions: ["write", "network"],
        riskLevel: "medium" as const,
      },
    ],
  },
  {
    id: "email",
    name: "Email",
    icon: Mail,
    color: "text-red-400",
    tools: [
      {
        name: "send_email",
        description: "发送电子邮件",
        inputSchema: {
          type: "object",
          properties: {
            to: { type: "string", description: "收件人" },
            subject: { type: "string", description: "主题" },
            body: { type: "string", description: "正文" },
          },
          required: ["to", "subject", "body"],
        },
        permissions: ["network", "send"],
        riskLevel: "high" as const,
      },
    ],
  },
];

const riskIcons = {
  low: ShieldCheck,
  medium: Shield,
  high: ShieldAlert,
};

const riskColors = {
  low: "text-green-500",
  medium: "text-yellow-500",
  high: "text-red-500",
};

interface MCPActionsPanelProps {
  onActionDragStart?: (action: MCPActionDragItem) => void;
  onInterventionDragStart?: (intervention: InterventionDragItem) => void;
  language?: 'en' | 'zh';
}

export function MCPActionsPanel({ 
  onActionDragStart, 
  onInterventionDragStart,
  language = 'zh' 
}: MCPActionsPanelProps) {
  const [expandedServers, setExpandedServers] = useState<string[]>(["google-calendar"]);

  const toggleServer = (serverId: string) => {
    setExpandedServers(prev => 
      prev.includes(serverId) 
        ? prev.filter(id => id !== serverId)
        : [...prev, serverId]
    );
  };

  const handleActionDragStart = (
    e: DragEvent<HTMLDivElement>, 
    server: typeof mcpServers[0], 
    tool: typeof mcpServers[0]["tools"][0]
  ) => {
    const action: MCPActionDragItem = {
      type: 'mcp_action',
      serverId: server.id,
      serverName: server.name,
      tool: {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      permissions: tool.permissions,
      riskLevel: tool.riskLevel,
    };
    e.dataTransfer.setData("application/json", JSON.stringify(action));
    e.dataTransfer.effectAllowed = "copy";
    onActionDragStart?.(action);
  };

  const handleInterventionDragStart = (e: DragEvent<HTMLDivElement>) => {
    const intervention: InterventionDragItem = {
      type: 'intervention',
      name: language === 'zh' ? "用户介入" : "User Intervention",
    };
    e.dataTransfer.setData("application/json", JSON.stringify(intervention));
    e.dataTransfer.effectAllowed = "copy";
    onInterventionDragStart?.(intervention);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-3">
        {/* System Nodes Section */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground px-2">
            {language === 'zh' ? '系统节点' : 'System Nodes'}
          </div>
          
          {/* Intervention Node */}
          <div
            draggable
            onDragStart={handleInterventionDragStart}
            className={cn(
              "p-3 rounded-lg border transition-all group cursor-grab active:cursor-grabbing",
              "border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50"
            )}
          >
            <div className="flex items-start gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded flex items-center justify-center bg-orange-500/20 text-orange-500">
                    <Hand className="h-3.5 w-3.5" />
                  </div>
                  <span className="font-medium text-sm">
                    {language === 'zh' ? '用户介入' : 'Intervention'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {language === 'zh' 
                    ? 'MPLP 确认节点，暂停执行等待用户批准' 
                    : 'MPLP confirmation node, pause and wait for user approval'}
                </p>
                <Badge variant="outline" className="text-[10px] mt-1.5 border-orange-500/30 text-orange-600">
                  MPLP
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* MCP Servers Section */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground px-2">
            {language === 'zh' ? 'MCP 动作' : 'MCP Actions'}
          </div>

          {mcpServers.map((server) => {
            const ServerIcon = server.icon;
            const isExpanded = expandedServers.includes(server.id);

            return (
              <Collapsible
                key={server.id}
                open={isExpanded}
                onOpenChange={() => toggleServer(server.id)}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 transition-colors">
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <ServerIcon className={cn("h-4 w-4", server.color)} />
                    <span className="text-sm font-medium flex-1 text-left">{server.name}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {server.tools.length}
                    </Badge>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent className="pl-4 space-y-1.5 mt-1.5">
                  {server.tools.map((tool) => {
                    const RiskIcon = riskIcons[tool.riskLevel];
                    return (
                      <div
                        key={tool.name}
                        draggable
                        onDragStart={(e) => handleActionDragStart(e, server, tool)}
                        className={cn(
                          "p-2.5 rounded-lg border transition-all group cursor-grab active:cursor-grabbing",
                          "border-border bg-card hover:border-primary/50 hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Zap className="h-3.5 w-3.5 text-primary" />
                              <span className="font-medium text-xs">{tool.name}</span>
                              <RiskIcon className={cn("h-3 w-3 ml-auto", riskColors[tool.riskLevel])} />
                            </div>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {tool.description}
                            </p>
                            <div className="flex items-center gap-1 mt-1">
                              {tool.permissions.slice(0, 2).map((perm) => (
                                <Badge 
                                  key={perm} 
                                  variant="outline" 
                                  className="text-[9px] px-1 py-0"
                                >
                                  {perm}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
