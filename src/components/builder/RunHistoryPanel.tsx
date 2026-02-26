import { useState } from "react";
import { History, Clock, Zap, CheckCircle, XCircle, SkipForward, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkflowRuns, type WorkflowRun } from "@/hooks/useWorkflowRuns";

interface RunHistoryPanelProps {
  workflowId: string | null;
  onReplayRun?: (run: WorkflowRun) => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "刚刚";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const statusConfig = {
  completed: { icon: CheckCircle, label: "成功", color: "text-green-500" },
  failed: { icon: XCircle, label: "失败", color: "text-destructive" },
  running: { icon: Loader2, label: "运行中", color: "text-blue-500" },
  pending: { icon: Clock, label: "等待中", color: "text-muted-foreground" },
} as const;

function NodeResultItem({ result }: { result: WorkflowRun["node_results"][0] }) {
  const [expanded, setExpanded] = useState(false);
  const statusIcon = result.status === "success" ? CheckCircle 
    : result.status === "failed" ? XCircle : SkipForward;
  const statusColor = result.status === "success" ? "text-green-500"
    : result.status === "failed" ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="border border-border/50 rounded-md">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
      >
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        {(() => { const Icon = statusIcon; return <Icon className={cn("h-3 w-3", statusColor)} />; })()}
        <span className="font-mono text-muted-foreground">{result.nodeType}</span>
        <span className="font-medium truncate flex-1 text-left">{result.nodeId}</span>
        <span className="text-muted-foreground">{formatDuration(result.duration)}</span>
        {result.tokensUsed > 0 && (
          <Badge variant="outline" className="text-[10px] h-4 px-1">
            <Zap className="h-2 w-2 mr-0.5" />{result.tokensUsed}
          </Badge>
        )}
      </button>
      {expanded && (
        <div className="px-3 pb-2 space-y-1">
          {result.error && (
            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
              {result.error}
            </div>
          )}
          {Object.keys(result.output || {}).length > 0 && (
            <pre className="text-[10px] bg-muted/50 p-2 rounded overflow-auto max-h-32 font-mono">
              {JSON.stringify(result.output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function RunItem({ run, onReplay }: { run: WorkflowRun; onReplay?: (run: WorkflowRun) => void }) {
  const [expanded, setExpanded] = useState(false);
  const config = statusConfig[run.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <StatusIcon className={cn("h-4 w-4", config.color, run.status === "running" && "animate-spin")} />
        <span className="flex-1 text-left font-medium">{config.label}</span>
        <span className="text-xs text-muted-foreground">{formatDuration(run.total_duration_ms)}</span>
        {run.total_tokens_used > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            <Zap className="h-2.5 w-2.5 mr-0.5" />{run.total_tokens_used}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">{formatTime(run.created_at)}</span>
      </button>
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-border/50">
          {run.error_message && (
            <div className="text-xs text-destructive bg-destructive/10 p-2 rounded mt-2">
              {run.error_message}
            </div>
          )}
          <div className="space-y-1 mt-2">
            <div className="text-xs font-medium text-muted-foreground">节点执行详情</div>
            {(run.node_results || []).map((r, i) => (
              <NodeResultItem key={i} result={r} />
            ))}
          </div>
          {Object.keys(run.outputs || {}).length > 0 && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">最终输出</div>
              <pre className="text-[10px] bg-muted/50 p-2 rounded overflow-auto max-h-24 font-mono">
                {JSON.stringify(run.outputs, null, 2)}
              </pre>
            </div>
          )}
          {onReplay && (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-7"
              onClick={() => onReplay(run)}
            >
              <History className="h-3 w-3 mr-1" />
              回放到画布
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function RunHistoryPanel({ workflowId, onReplayRun }: RunHistoryPanelProps) {
  const { data: runs = [], isLoading } = useWorkflowRuns(workflowId);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <History className="h-4 w-4 text-primary" />
        <h3 className="font-medium text-sm">运行历史</h3>
        <Badge variant="secondary" className="ml-auto text-[10px] h-5">
          {runs.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto opacity-30 mb-2" />
              <p className="text-sm">暂无运行记录</p>
              <p className="text-xs mt-1">点击「运行」按钮执行工作流</p>
            </div>
          ) : (
            runs.map((run) => (
              <RunItem key={run.id} run={run} onReplay={onReplayRun} />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
