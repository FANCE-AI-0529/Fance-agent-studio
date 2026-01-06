import { useState } from "react";
import { 
  Wrench, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface MCPToolCall {
  id: string;
  server: string;
  tool: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  status: 'pending' | 'running' | 'success' | 'error';
  duration?: number;
  error?: string;
}

interface MCPToolCardProps extends MCPToolCall {
  onViewDetail?: () => void;
  onRetry?: () => void;
}

interface StatusConfig {
  icon: typeof Clock;
  label: string;
  color: string;
  bgColor: string;
  animate?: boolean;
}

const statusConfig: Record<MCPToolCall['status'], StatusConfig> = {
  pending: {
    icon: Clock,
    label: "等待中",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
  },
  running: {
    icon: Loader2,
    label: "执行中",
    color: "text-status-planning",
    bgColor: "bg-status-planning/10",
    animate: true,
  },
  success: {
    icon: CheckCircle2,
    label: "成功",
    color: "text-status-executing",
    bgColor: "bg-status-executing/10",
  },
  error: {
    icon: XCircle,
    label: "失败",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
};

function JsonPreview({ data, maxHeight = "120px" }: { data: unknown; maxHeight?: string }) {
  const [copied, setCopied] = useState(false);

  const jsonString = JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <div className="relative group">
      <pre 
        className="text-[10px] font-mono bg-muted/30 rounded p-2 overflow-auto"
        style={{ maxHeight }}
      >
        <code className="text-muted-foreground">{jsonString}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-3 w-3 text-status-executing" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

export function MCPToolCard({
  server,
  tool,
  inputs,
  outputs,
  status,
  duration,
  error,
  onViewDetail,
  onRetry,
}: MCPToolCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-secondary/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={cn("p-1 rounded", config.bgColor)}>
          <Wrench className="h-3 w-3 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate">{tool}</span>
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              {server}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {duration !== undefined && status === 'success' && (
            <span className="text-[9px] text-muted-foreground">
              {duration}ms
            </span>
          )}
          
          <Badge className={cn("text-[9px] h-4 px-1.5 border", config.bgColor, config.color)}>
            <StatusIcon className={cn("h-2.5 w-2.5 mr-0.5", config.animate && "animate-spin")} />
            {config.label}
          </Badge>

          {isExpanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border p-2 space-y-2">
          {/* Inputs */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[10px] font-medium text-muted-foreground">📥 输入参数</span>
            </div>
            <JsonPreview data={inputs} />
          </div>

          {/* Outputs */}
          {outputs && (
            <div>
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[10px] font-medium text-muted-foreground">📤 输出结果</span>
              </div>
              <JsonPreview data={outputs} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-2 rounded bg-destructive/10 border border-destructive/20">
              <p className="text-[10px] text-destructive">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-1 pt-1">
            {onViewDetail && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={onViewDetail}>
                <ExternalLink className="h-3 w-3 mr-1" />
                查看详情
              </Button>
            )}
            {onRetry && status === 'error' && (
              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={onRetry}>
                <RefreshCw className="h-3 w-3 mr-1" />
                重新执行
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
