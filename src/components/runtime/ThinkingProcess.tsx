import { useState } from "react";
import { ChevronDown, ChevronRight, Terminal, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface LogEntry {
  id: string;
  timestamp: Date;
  module: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
}

interface ThinkingProcessProps {
  logs: LogEntry[];
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
}

const levelConfig = {
  info: { icon: Terminal, color: "text-muted-foreground" },
  warn: { icon: AlertCircle, color: "text-status-confirm" },
  error: { icon: AlertCircle, color: "text-destructive" },
  success: { icon: CheckCircle2, color: "text-status-executing" },
};

export function ThinkingProcess({ 
  logs, 
  isExpanded: controlledExpanded, 
  onToggle,
  className 
}: ThinkingProcessProps) {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const isExpanded = controlledExpanded ?? internalExpanded;
  
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  if (logs.length === 0) return null;

  return (
    <div className={cn("rounded-lg border border-border bg-card overflow-hidden", className)}>
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Terminal className="h-4 w-4 text-cognitive" />
          <span className="text-sm font-medium">Thinking Process</span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {logs.length} entries
        </Badge>
      </button>

      {/* Log content */}
      {isExpanded && (
        <div className="p-3 max-h-[200px] overflow-y-auto">
          <div className="font-mono text-xs space-y-1.5">
            {logs.map((log) => {
              const config = levelConfig[log.level];
              const Icon = config.icon;
              
              return (
                <div key={log.id} className="flex items-start gap-2">
                  {/* Timestamp */}
                  <span className="text-muted-foreground flex-shrink-0 w-16">
                    {log.timestamp.toLocaleTimeString('zh-CN', { 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit',
                      hour12: false
                    })}
                  </span>
                  
                  {/* Module badge */}
                  <Badge 
                    variant="outline" 
                    className="text-[9px] px-1.5 py-0 h-4 flex-shrink-0 font-mono"
                  >
                    {log.module}
                  </Badge>
                  
                  {/* Icon and message */}
                  <div className={cn("flex items-start gap-1.5 min-w-0", config.color)}>
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                    <span className="break-all">{log.message}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to create log entries
export function createLogEntry(
  module: string, 
  message: string, 
  level: LogEntry["level"] = "info"
): LogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    module,
    level,
    message,
  };
}
