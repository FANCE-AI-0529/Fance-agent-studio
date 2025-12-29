import { useState } from "react";
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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  | "execution_failed";

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
}

const eventConfig: Record<TraceEventType, { 
  icon: React.ElementType; 
  label: string; 
  color: string;
}> = {
  intent_detected: { icon: Brain, label: "意图识别", color: "text-cognitive" },
  skill_selected: { icon: Zap, label: "技能选择", color: "text-primary" },
  permission_check: { icon: Shield, label: "权限检查", color: "text-governance" },
  confirm_requested: { icon: AlertCircle, label: "请求确认", color: "text-status-confirm" },
  confirm_approved: { icon: CheckCircle2, label: "已确认", color: "text-status-executing" },
  confirm_rejected: { icon: XCircle, label: "已拒绝", color: "text-destructive" },
  execution_started: { icon: Zap, label: "开始执行", color: "text-status-executing" },
  execution_completed: { icon: CheckCircle2, label: "执行完成", color: "text-status-executing" },
  execution_failed: { icon: XCircle, label: "执行失败", color: "text-destructive" },
};

function TraceEventItem({ event, isLast }: { event: TraceEvent; isLast: boolean }) {
  const config = eventConfig[event.type];
  const Icon = config.icon;

  return (
    <div className="flex gap-3">
      {/* Timeline */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center bg-card border-2",
          event.type.includes("failed") || event.type.includes("rejected")
            ? "border-destructive"
            : event.type.includes("completed") || event.type.includes("approved")
            ? "border-status-executing"
            : "border-border"
        )}>
          <Icon className={cn("h-3 w-3", config.color)} />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-border min-h-[20px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">{config.label}</span>
          <span className="text-[10px] text-muted-foreground">
            {event.timestamp.toLocaleTimeString()}
          </span>
        </div>
        {event.data.skillName && (
          <Badge variant="outline" className="text-[10px] mt-1">
            {event.data.skillName}
          </Badge>
        )}
        {event.data.intent && (
          <p className="text-xs text-muted-foreground mt-1">
            "{event.data.intent}"
          </p>
        )}
        {event.data.permissions && event.data.permissions.length > 0 && (
          <div className="flex gap-1 mt-1">
            {event.data.permissions.map((p) => (
              <Badge key={p} variant="secondary" className="text-[10px]">
                {p}
              </Badge>
            ))}
          </div>
        )}
        {event.data.reason && (
          <p className="text-xs text-muted-foreground mt-1">
            {event.data.reason}
          </p>
        )}
        {event.data.duration !== undefined && (
          <span className="text-[10px] text-muted-foreground">
            耗时: {event.data.duration}ms
          </span>
        )}
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
    running: "bg-status-planning/10 text-status-planning",
    completed: "bg-status-executing/10 text-status-executing",
    failed: "bg-destructive/10 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };

  const statusLabels = {
    running: "运行中",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      isActive ? "border-primary/50 bg-primary/5" : "border-border bg-card"
    )}>
      {/* Header */}
      <button
        className="w-full p-3 flex items-center gap-2 hover:bg-secondary/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <GitBranch className="h-4 w-4 text-cognitive" />
        <span className="text-sm font-medium flex-1 text-left truncate">
          {session.query}
        </span>
        <Badge className={cn("text-[10px]", statusColors[session.status])}>
          {statusLabels[session.status]}
        </Badge>
      </button>

      {/* Events */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border">
          <div className="pl-2">
            {session.events.map((event, index) => (
              <TraceEventItem
                key={event.id}
                event={event}
                isLast={index === session.events.length - 1}
              />
            ))}
            {session.events.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                暂无事件
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TraceTree({ sessions, currentSessionId }: TraceTreeProps) {
  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-xs">暂无决策记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <TraceSessionItem
          key={session.id}
          session={session}
          isActive={session.id === currentSessionId}
        />
      ))}
    </div>
  );
}
