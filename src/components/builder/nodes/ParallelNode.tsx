import { memo, useMemo } from "react";
import { Position } from "@xyflow/react";
import { GitMerge, Settings, X, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MultiPortHandle from "@/components/builder/ports/MultiPortHandle";
import { standardPorts, PortConfig } from "@/components/builder/ports/portTypes";

export interface ParallelBranch {
  id: string;
  name: string;
  description?: string;
  portId: string;
  timeout?: number;
}

export interface ParallelNodeData {
  id: string;
  name: string;
  description?: string;
  branches: ParallelBranch[];
  waitStrategy: "all" | "any" | "none";
  timeout: number;
  failureMode: "continue" | "abort";
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  [key: string]: unknown;
}

interface ParallelNodeProps {
  id: string;
  data: ParallelNodeData;
  selected?: boolean;
}

const strategyLabels = {
  all: "等待全部",
  any: "任一完成",
  none: "不等待",
};

const failureModeLabels = {
  continue: "继续执行",
  abort: "中止全部",
};

const ParallelNode = memo(({ id, data, selected }: ParallelNodeProps) => {
  // Generate dynamic output ports based on branches
  const outputPorts: PortConfig[] = useMemo(() => {
    return data.branches.map((branch) => ({
      id: branch.portId,
      type: "control" as const,
      direction: "output" as const,
      label: branch.name,
      description: branch.description,
    }));
  }, [data.branches]);

  return (
    <div
      className={cn(
        "relative min-w-[260px] max-w-[300px] bg-card border-2 rounded-xl shadow-lg transition-all duration-200",
        selected
          ? "border-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          : "border-purple-500/50 hover:border-purple-500"
      )}
    >
      {/* Input Ports */}
      <MultiPortHandle
        ports={standardPorts.parallel.inputs}
        position={Position.Left}
        nodeId={id}
      />

      {/* Output Ports */}
      <MultiPortHandle
        ports={outputPorts}
        position={Position.Right}
        nodeId={id}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-purple-500/10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <GitMerge className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{data.name || "并发执行"}</h3>
            <p className="text-[10px] text-muted-foreground">Parallel Gateway</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {data.onConfigure && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => data.onConfigure?.(data.id)}
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}
          {data.onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => data.onRemove?.(data.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Wait Strategy */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">等待策略</span>
          <Badge variant="secondary" className="text-[10px]">
            {strategyLabels[data.waitStrategy]}
          </Badge>
        </div>

        {/* Timeout */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>超时时间</span>
          </div>
          <span className="font-mono text-purple-500">{data.timeout}s</span>
        </div>

        {/* Failure Mode */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">失败处理</span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px]",
              data.failureMode === "abort" 
                ? "border-red-500/50 text-red-500" 
                : "border-green-500/50 text-green-500"
            )}
          >
            {failureModeLabels[data.failureMode]}
          </Badge>
        </div>

        {/* Branches Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">并行分支</span>
            <Badge variant="outline" className="text-[10px]">
              <Zap className="h-2.5 w-2.5 mr-1" />
              {data.branches.length} 个
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-1">
            {data.branches.slice(0, 4).map((branch, index) => (
              <div
                key={branch.id}
                className="flex items-center gap-1.5 text-[10px] p-1.5 bg-purple-500/10 rounded truncate"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <span className="truncate">{branch.name}</span>
              </div>
            ))}
          </div>
          {data.branches.length > 4 && (
            <div className="text-[10px] text-muted-foreground text-center">
              +{data.branches.length - 4} 更多...
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ParallelNode.displayName = "ParallelNode";

export default ParallelNode;
