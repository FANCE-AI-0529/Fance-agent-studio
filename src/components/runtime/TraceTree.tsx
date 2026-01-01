import { useState, useMemo } from "react";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Zap,
  Shield,
  AlertCircle,
  GitBranch,
  Activity,
  Filter,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type TraceEventType = 
  | "intent_detected"
  | "skill_selected"
  | "permission_check"
  | "confirm_requested"
  | "confirm_approved"
  | "confirm_rejected"
  | "execution_started"
  | "execution_completed"
  | "execution_failed"
  | "ai_response_complete"
  | "error";

export interface TraceEvent {
  id: string;
  type: TraceEventType;
  timestamp: Date;
  data: {
    skillName?: string;
    intent?: string;
    permissions?: string[];
    reason?: string;
    duration?: number;
    result?: string;
    tokenCount?: number;
    message?: string;
    code?: string;
  };
}

export interface TraceSession {
  id: string;
  query: string;
  startTime: Date;
  endTime?: Date;
  status: "running" | "completed" | "failed" | "cancelled";
  events: TraceEvent[];
}

interface TraceTreeProps {
  sessions: TraceSession[];
  currentSessionId?: string;
  onClearSessions?: () => void;
  onRefresh?: () => void;
}

const eventConfig: Record<TraceEventType, { 
  icon: React.ElementType; 
  label: string; 
  color: string;
  bgColor: string;
}> = {
  intent_detected: { 
    icon: Brain, 
    label: "意图识别", 
    color: "text-cognitive",
    bgColor: "bg-cognitive/10"
  },
  skill_selected: { 
    icon: Zap, 
    label: "技能选择", 
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  permission_check: { 
    icon: Shield, 
    label: "权限检查", 
    color: "text-governance",
    bgColor: "bg-governance/10"
  },
  confirm_requested: { 
    icon: AlertCircle, 
    label: "请求确认", 
    color: "text-status-confirm",
    bgColor: "bg-status-confirm/10"
  },
  confirm_approved: { 
    icon: CheckCircle2, 
    label: "已确认", 
    color: "text-status-executing",
    bgColor: "bg-status-executing/10"
  },
  confirm_rejected: { 
    icon: XCircle, 
    label: "已拒绝", 
    color: "text-destructive",
    bgColor: "bg-destructive/10"
  },
  execution_started: { 
    icon: Zap, 
    label: "开始执行", 
    color: "text-status-executing",
    bgColor: "bg-status-executing/10"
  },
  execution_completed: { 
    icon: CheckCircle2, 
    label: "执行完成", 
    color: "text-status-executing",
    bgColor: "bg-status-executing/10"
  },
  execution_failed: { 
    icon: XCircle, 
    label: "执行失败", 
    color: "text-destructive",
    bgColor: "bg-destructive/10"
  },
  ai_response_complete: {
    icon: Brain,
    label: "AI响应完成",
    color: "text-cognitive",
    bgColor: "bg-cognitive/10"
  },
  error: {
    icon: AlertCircle,
    label: "错误",
    color: "text-destructive",
    bgColor: "bg-destructive/10"
  },
};

function TraceEventItem({ event, isLast }: { event: TraceEvent; isLast: boolean }) {
  const config = eventConfig[event.type] || eventConfig.error;
  const Icon = config.icon;

  return (
    <div className="flex gap-2">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-5 h-5 rounded-full flex items-center justify-center shrink-0",
          config.bgColor,
          event.type.includes("failed") || event.type.includes("rejected") || event.type === "error"
            ? "ring-1 ring-destructive/50"
            : event.type.includes("completed") || event.type.includes("approved")
            ? "ring-1 ring-status-executing/50"
            : "ring-1 ring-border"
        )}>
          <Icon className={cn("h-2.5 w-2.5", config.color)} />
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-border min-h-[12px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-2 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-medium">{config.label}</span>
          <span className="text-[9px] text-muted-foreground">
            {event.timestamp.toLocaleTimeString()}
          </span>
        </div>
        
        <div className="mt-0.5 space-y-0.5">
          {event.data.skillName && (
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              {event.data.skillName}
            </Badge>
          )}
          {event.data.intent && (
            <p className="text-[10px] text-muted-foreground truncate">
              "{event.data.intent}"
            </p>
          )}
          {event.data.permissions && event.data.permissions.length > 0 && (
            <div className="flex gap-0.5 flex-wrap">
              {event.data.permissions.slice(0, 3).map((p) => (
                <Badge key={p} variant="secondary" className="text-[8px] h-3.5 px-1">
                  {p}
                </Badge>
              ))}
              {event.data.permissions.length > 3 && (
                <Badge variant="secondary" className="text-[8px] h-3.5 px-1">
                  +{event.data.permissions.length - 3}
                </Badge>
              )}
            </div>
          )}
          {event.data.reason && (
            <p className="text-[10px] text-muted-foreground truncate">
              {event.data.reason}
            </p>
          )}
          {event.data.message && (
            <p className="text-[10px] text-destructive truncate">
              {event.data.message}
            </p>
          )}
          {event.data.tokenCount !== undefined && (
            <span className="text-[9px] text-muted-foreground">
              Tokens: {event.data.tokenCount}
            </span>
          )}
          {event.data.duration !== undefined && (
            <span className="text-[9px] text-muted-foreground">
              耗时: {event.data.duration}ms
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TraceSessionItem({ 
  session, 
  isActive 
}: { 
  session: TraceSession; 
  isActive: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(isActive);

  const statusColors = {
    running: "bg-status-planning/20 text-status-planning border-status-planning/30",
    completed: "bg-status-executing/20 text-status-executing border-status-executing/30",
    failed: "bg-destructive/20 text-destructive border-destructive/30",
    cancelled: "bg-muted text-muted-foreground border-border",
  };

  const statusLabels = {
    running: "运行中",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };

  const eventCounts = useMemo(() => {
    const counts = { success: 0, failed: 0, total: session.events.length };
    session.events.forEach(e => {
      if (e.type.includes("completed") || e.type.includes("approved")) {
        counts.success++;
      } else if (e.type.includes("failed") || e.type.includes("rejected") || e.type === "error") {
        counts.failed++;
      }
    });
    return counts;
  }, [session.events]);

  return (
    <div className={cn(
      "rounded-md border overflow-hidden transition-all",
      isActive 
        ? "border-primary/50 bg-primary/5 shadow-sm" 
        : "border-border bg-card hover:bg-secondary/30"
    )}>
      {/* Header */}
      <button
        className="w-full p-2 flex items-center gap-1.5 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </span>
        <GitBranch className="h-3 w-3 text-cognitive shrink-0" />
        <span className="text-xs font-medium flex-1 truncate min-w-0">
          {session.query || "新会话"}
        </span>
        <Badge className={cn("text-[9px] h-4 px-1 shrink-0 border", statusColors[session.status])}>
          {statusLabels[session.status]}
        </Badge>
      </button>

      {/* Summary bar when collapsed */}
      {!isExpanded && session.events.length > 0 && (
        <div className="px-2 pb-1.5 flex items-center gap-2 text-[9px] text-muted-foreground">
          <span>{eventCounts.total} 事件</span>
          {eventCounts.success > 0 && (
            <span className="text-status-executing">✓{eventCounts.success}</span>
          )}
          {eventCounts.failed > 0 && (
            <span className="text-destructive">✗{eventCounts.failed}</span>
          )}
        </div>
      )}

      {/* Events */}
      {isExpanded && (
        <div className="px-2 pb-2 pt-1 border-t border-border">
          {session.events.length > 0 ? (
            <div className="pl-1">
              {session.events.map((event, index) => (
                <TraceEventItem
                  key={event.id}
                  event={event}
                  isLast={index === session.events.length - 1}
                />
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground py-1.5 text-center">
              暂无事件
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Stats component
function TraceStats({ sessions }: { sessions: TraceSession[] }) {
  const stats = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter(s => s.status === "completed").length;
    const failed = sessions.filter(s => s.status === "failed").length;
    const running = sessions.filter(s => s.status === "running").length;
    const totalEvents = sessions.reduce((acc, s) => acc + s.events.length, 0);
    
    return { total, completed, failed, running, totalEvents };
  }, [sessions]);

  if (sessions.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-1 p-2 bg-secondary/30 rounded-md mb-2">
      <div className="text-center">
        <div className="text-sm font-semibold text-primary">{stats.total}</div>
        <div className="text-[9px] text-muted-foreground">会话</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-status-executing">{stats.completed}</div>
        <div className="text-[9px] text-muted-foreground">成功</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-destructive">{stats.failed}</div>
        <div className="text-[9px] text-muted-foreground">失败</div>
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold text-cognitive">{stats.totalEvents}</div>
        <div className="text-[9px] text-muted-foreground">事件</div>
      </div>
    </div>
  );
}

export function TraceTree({ 
  sessions, 
  currentSessionId,
  onClearSessions,
  onRefresh 
}: TraceTreeProps) {
  const [activeTab, setActiveTab] = useState<"all" | "running" | "completed" | "failed">("all");
  const [showEventTypes, setShowEventTypes] = useState<Set<TraceEventType>>(new Set(Object.keys(eventConfig) as TraceEventType[]));

  const filteredSessions = useMemo(() => {
    let result = sessions;
    
    // Filter by status
    if (activeTab !== "all") {
      result = result.filter(s => s.status === activeTab);
    }
    
    return result;
  }, [sessions, activeTab]);

  const toggleEventType = (type: TraceEventType) => {
    const newSet = new Set(showEventTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setShowEventTypes(newSet);
  };

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-3">
          <Clock className="h-6 w-6 opacity-50" />
        </div>
        <p className="text-xs font-medium">暂无决策记录</p>
        <p className="text-[10px] mt-1">发送消息后将显示决策追踪</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stats */}
      <TraceStats sessions={sessions} />

      {/* Tabs and actions */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1">
          <TabsList className="h-7 p-0.5 grid grid-cols-4 gap-0.5">
            <TabsTrigger value="all" className="text-[10px] h-6 px-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              全部
            </TabsTrigger>
            <TabsTrigger value="running" className="text-[10px] h-6 px-1.5 data-[state=active]:bg-status-planning data-[state=active]:text-primary-foreground">
              运行
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-[10px] h-6 px-1.5 data-[state=active]:bg-status-executing data-[state=active]:text-primary-foreground">
              完成
            </TabsTrigger>
            <TabsTrigger value="failed" className="text-[10px] h-6 px-1.5 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
              失败
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 mb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-[10px] px-2 flex-1">
              <Filter className="h-3 w-3 mr-1" />
              过滤事件
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            {(Object.keys(eventConfig) as TraceEventType[]).map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={showEventTypes.has(type)}
                onCheckedChange={() => toggleEventType(type)}
                className="text-xs"
              >
                {eventConfig[type].label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {onRefresh && (
          <Button variant="outline" size="icon" className="h-6 w-6" onClick={onRefresh}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        )}
        
        {onClearSessions && sessions.length > 0 && (
          <Button variant="outline" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={onClearSessions}>
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Sessions list */}
      <ScrollArea className="flex-1 -mx-1 px-1">
        <div className="space-y-1.5">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => (
              <TraceSessionItem
                key={session.id}
                session={{
                  ...session,
                  events: session.events.filter(e => showEventTypes.has(e.type))
                }}
                isActive={session.id === currentSessionId}
              />
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Activity className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">没有匹配的记录</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}