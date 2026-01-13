import { 
  Brain, 
  FileText, 
  FileEdit, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Target,
  RefreshCw,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TraceEvent } from "./trace/traceTypes";
import { Badge } from "@/components/ui/badge";

interface ManusTraceEventProps {
  event: TraceEvent;
  className?: string;
}

// Event configuration for Manus events
const manusEventConfig: Record<string, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bgColor: string;
}> = {
  manus_init: {
    icon: Brain,
    label: "[Manus] Initialize",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  manus_read: {
    icon: FileText,
    label: "[Manus] Read",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  manus_update: {
    icon: FileEdit,
    label: "[Manus] Update",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  manus_hook_pre: {
    icon: Clock,
    label: "[Manus] PreToolUse",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  manus_hook_post: {
    icon: CheckCircle2,
    label: "[Manus] PostToolUse",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  manus_violation: {
    icon: AlertTriangle,
    label: "[Manus] Violation",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  manus_2action_rule: {
    icon: Target,
    label: "[Manus] 2-Action Rule",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  manus_3strike: {
    icon: XCircle,
    label: "[Manus] 3-Strike",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  manus_5question: {
    icon: HelpCircle,
    label: "[Manus] 5-Question",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
};

function formatTime(ts: Date | string | number): string {
  const date = ts instanceof Date ? ts : new Date(ts);
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
  });
}

export function ManusTraceEvent({ event, className }: ManusTraceEventProps) {
  const config = manusEventConfig[event.type];
  
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <div className={cn(
      "flex items-start gap-2 p-2 rounded-lg border border-border/50",
      config.bgColor,
      className
    )}>
      <div className={cn("p-1 rounded", config.bgColor)}>
        <IconComponent className={cn("h-3.5 w-3.5", config.color)} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium", config.color)}>
            {config.label}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(event.timestamp)}
          </span>
        </div>
        
        {/* Event message */}
        {event.data.message && (
          <p className="text-xs text-foreground/80 mt-0.5">
            {event.data.message}
          </p>
        )}
        
        {/* File path if present */}
        {event.data.manusFilePath && (
          <div className="flex items-center gap-1 mt-1">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <code className="text-[10px] text-muted-foreground font-mono">
              {event.data.manusFilePath}
            </code>
          </div>
        )}
        
        {/* Phase info */}
        {event.data.manusPhase !== undefined && (
          <Badge variant="outline" className="mt-1 text-[10px] h-4">
            Phase {event.data.manusPhase}/{event.data.manusPhaseCount || '?'}
          </Badge>
        )}
        
        {/* Rule trigger info */}
        {event.data.manusRuleTriggered && (
          <div className="flex items-center gap-1 mt-1">
            <RefreshCw className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              Rule: {event.data.manusRuleTriggered}
            </span>
            {event.data.manusActionCount !== undefined && (
              <Badge variant="secondary" className="text-[9px] h-3.5 px-1">
                Count: {event.data.manusActionCount}
              </Badge>
            )}
          </div>
        )}
        
        {/* Violation type */}
        {event.data.manusViolationType && (
          <Badge variant="destructive" className="mt-1 text-[10px] h-4">
            {event.data.manusViolationType.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        )}
      </div>
    </div>
  );
}

export function isManusEvent(eventType: string): boolean {
  return eventType.startsWith('manus_');
}

export default ManusTraceEvent;
