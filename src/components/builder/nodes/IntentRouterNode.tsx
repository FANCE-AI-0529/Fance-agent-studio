import { memo, useMemo } from "react";
import { Position } from "@xyflow/react";
import { Route, Settings, X } from "lucide-react";
import { cn } from "../../../lib/utils.ts";
import { Button } from "../../ui/button.tsx";
import { Badge } from "../../ui/badge.tsx";
import MultiPortHandle from "../ports/MultiPortHandle.tsx";
import { standardPorts, PortConfig } from "../ports/portTypes.ts";

export interface IntentRoute {
  id: string;
  name: string;
  keywords: string[];
  semanticCondition?: string;
  portId: string;
  color?: string;
}

export interface IntentRouterNodeData {
  id: string;
  name: string;
  description?: string;
  routes: IntentRoute[];
  defaultRoute: { name: string; portId: string };
  matchMode: "keyword" | "semantic" | "hybrid";
  confidenceThreshold: number;
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  [key: string]: unknown;
}

interface IntentRouterNodeProps {
  id: string;
  data: IntentRouterNodeData;
  selected?: boolean;
}

const routeColors = [
  "hsl(var(--primary))",
  "hsl(280 60% 60%)",
  "hsl(160 60% 45%)",
  "hsl(30 90% 55%)",
  "hsl(340 75% 55%)",
];

const IntentRouterNode = memo(({ id, data, selected }: IntentRouterNodeProps) => {
  // Generate dynamic output ports based on routes
  const outputPorts: PortConfig[] = useMemo(() => {
    const routePorts = data.routes.map((route, index) => ({
      id: route.portId,
      type: "control" as const,
      direction: "output" as const,
      label: route.name,
      description: route.keywords.length > 0 
        ? `关键词: ${route.keywords.slice(0, 3).join(", ")}${route.keywords.length > 3 ? "..." : ""}`
        : route.semanticCondition || undefined,
    }));

    return [
      ...routePorts,
      {
        id: data.defaultRoute.portId,
        type: "control" as const,
        direction: "output" as const,
        label: data.defaultRoute.name,
        description: "未匹配时的默认路由",
      },
    ];
  }, [data.routes, data.defaultRoute]);

  const matchModeLabels = {
    keyword: "关键词",
    semantic: "语义",
    hybrid: "混合",
  };

  return (
    <div
      className={cn(
        "relative min-w-[280px] max-w-[320px] bg-card border-2 rounded-xl shadow-lg transition-all duration-200",
        selected
          ? "border-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          : "border-cyan-500/50 hover:border-cyan-500"
      )}
    >
      {/* Input Ports */}
      <MultiPortHandle
        ports={standardPorts.intentRouter.inputs}
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
      <div className="flex items-center justify-between p-3 border-b border-border bg-cyan-500/10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
            <Route className="h-4 w-4 text-cyan-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{data.name || "意图路由器"}</h3>
            <p className="text-[10px] text-muted-foreground">Intent Router</p>
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
        {/* Match Mode */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">匹配模式</span>
          <Badge variant="secondary" className="text-[10px]">
            {matchModeLabels[data.matchMode]}
          </Badge>
        </div>

        {/* Confidence Threshold */}
        {data.matchMode !== "keyword" && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">置信度阈值</span>
            <span className="font-mono text-cyan-500">&gt; {data.confidenceThreshold}</span>
          </div>
        )}

        {/* Routes Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">路由分支</span>
            <Badge variant="outline" className="text-[10px]">
              {data.routes.length + 1} 个
            </Badge>
          </div>
          <div className="space-y-1">
            {data.routes.slice(0, 3).map((route, index) => (
              <div
                key={route.id}
                className="flex items-center gap-2 text-xs p-1.5 bg-muted/50 rounded"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: routeColors[index % routeColors.length] }}
                />
                <span className="truncate flex-1">{route.name}</span>
                {route.keywords.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {route.keywords.length} 词
                  </span>
                )}
              </div>
            ))}
            {data.routes.length > 3 && (
              <div className="text-[10px] text-muted-foreground text-center">
                +{data.routes.length - 3} 更多...
              </div>
            )}
            {/* Default route */}
            <div className="flex items-center gap-2 text-xs p-1.5 bg-muted/30 rounded border border-dashed border-muted-foreground/30">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span className="truncate flex-1 text-muted-foreground">
                {data.defaultRoute.name}
              </span>
              <span className="text-[10px] text-muted-foreground">默认</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

IntentRouterNode.displayName = "IntentRouterNode";

export default IntentRouterNode;
