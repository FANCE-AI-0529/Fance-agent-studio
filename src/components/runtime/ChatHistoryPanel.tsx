import { useState, useMemo } from "react";
import {
  History,
  Search,
  Star,
  StarOff,
  Calendar,
  Bot,
  Trash2,
  MessageSquare,
  ChevronRight,
  Clock,
  Filter,
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import { cn } from "../../lib/utils.ts";
import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek } from "date-fns";
import { zhCN } from "date-fns/locale";

export interface ChatHistoryItem {
  id: string;
  title?: string;
  preview: string;
  agentId?: string;
  agentName?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isFavorite: boolean;
}

interface ChatHistoryPanelProps {
  sessions: ChatHistoryItem[];
  currentSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onToggleFavorite: (sessionId: string) => void;
  onNewSession: () => void;
}

export function ChatHistoryPanel({
  sessions,
  currentSessionId,
  onSelectSession,
  onDeleteSession,
  onToggleFavorite,
  onNewSession,
}: ChatHistoryPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "favorites">("all");
  const [groupBy, setGroupBy] = useState<"time" | "agent">("time");

  // 过滤对话
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const matchesSearch = 
        session.preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (session.title?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
        (session.agentName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesFavorite = activeTab === "all" || session.isFavorite;
      return matchesSearch && matchesFavorite;
    });
  }, [sessions, searchTerm, activeTab]);

  // 按时间分组
  const groupedByTime = useMemo(() => {
    const groups: { label: string; sessions: ChatHistoryItem[] }[] = [
      { label: "今天", sessions: [] },
      { label: "昨天", sessions: [] },
      { label: "本周", sessions: [] },
      { label: "更早", sessions: [] },
    ];

    filteredSessions.forEach(session => {
      if (isToday(session.updatedAt)) {
        groups[0].sessions.push(session);
      } else if (isYesterday(session.updatedAt)) {
        groups[1].sessions.push(session);
      } else if (isThisWeek(session.updatedAt)) {
        groups[2].sessions.push(session);
      } else {
        groups[3].sessions.push(session);
      }
    });

    return groups.filter(g => g.sessions.length > 0);
  }, [filteredSessions]);

  // 按助手分组
  const groupedByAgent = useMemo(() => {
    const groups: { label: string; agentId?: string; sessions: ChatHistoryItem[] }[] = [];
    const agentMap = new Map<string, ChatHistoryItem[]>();

    filteredSessions.forEach(session => {
      const key = session.agentName || "默认助手";
      if (!agentMap.has(key)) {
        agentMap.set(key, []);
      }
      agentMap.get(key)!.push(session);
    });

    agentMap.forEach((sessions, label) => {
      groups.push({ label, sessions, agentId: sessions[0]?.agentId });
    });

    return groups.sort((a, b) => b.sessions.length - a.sessions.length);
  }, [filteredSessions]);

  const currentGroups = groupBy === "time" ? groupedByTime : groupedByAgent;

  return (
    <div className="h-full flex flex-col bg-card/50">
      {/* 头部 */}
      <div className="p-3 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">对话历史</span>
            <Badge variant="secondary" className="text-xs">
              {sessions.length}
            </Badge>
          </div>
          <Button size="sm" onClick={onNewSession} className="h-7 text-xs gap-1">
            <MessageSquare className="h-3 w-3" />
            新对话
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="搜索对话..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>

        {/* 标签页 */}
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-auto">
            <TabsList className="h-7 p-0.5">
              <TabsTrigger value="all" className="text-xs h-6 px-2">全部</TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs h-6 px-2 gap-1">
                <Star className="h-3 w-3" />
                收藏
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <Filter className="h-3 w-3" />
                {groupBy === "time" ? "按时间" : "按助手"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setGroupBy("time")}>
                <Calendar className="h-4 w-4 mr-2" />
                按时间分组
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy("agent")}>
                <Bot className="h-4 w-4 mr-2" />
                按助手分组
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 对话列表 */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {currentGroups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {groupBy === "agent" ? (
                  <Bot className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {group.label}
                <Badge variant="outline" className="text-[10px] px-1 h-4">
                  {group.sessions.length}
                </Badge>
              </div>
              <div className="space-y-1">
                {group.sessions.map((session) => (
                  <SessionItem
                    key={session.id}
                    session={session}
                    isActive={session.id === currentSessionId}
                    onSelect={() => onSelectSession(session.id)}
                    onDelete={() => onDeleteSession(session.id)}
                    onToggleFavorite={() => onToggleFavorite(session.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredSessions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {searchTerm ? "没有找到匹配的对话" : "还没有对话记录"}
              </p>
              <Button variant="link" size="sm" onClick={onNewSession} className="mt-2">
                开始新对话
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// 会话项组件
function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onToggleFavorite,
}: {
  session: ChatHistoryItem;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  return (
    <div
      className={cn(
        "group p-2.5 rounded-lg cursor-pointer transition-all border border-transparent",
        "hover:bg-accent/50 hover:border-border",
        isActive && "bg-accent border-primary/30"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {session.title || session.preview.slice(0, 20) + "..."}
            </p>
            {session.isFavorite && (
              <Star className="h-3 w-3 fill-primary text-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {session.preview}
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
            {session.agentName && (
              <span className="flex items-center gap-1">
                <Bot className="h-2.5 w-2.5" />
                {session.agentName}
              </span>
            )}
            <span>{session.messageCount} 条消息</span>
            <span>•</span>
            <span>{formatDistanceToNow(session.updatedAt, { addSuffix: true, locale: zhCN })}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite();
            }}
          >
            {session.isFavorite ? (
              <StarOff className="h-3 w-3" />
            ) : (
              <Star className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
