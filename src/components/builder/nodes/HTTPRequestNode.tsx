import React, { memo } from "react";
import { Position } from "@xyflow/react";
import { 
  Globe, 
  Settings,
  X,
  ArrowRight,
  Lock,
  Unlock
} from "lucide-react";
import { cn } from "../../../lib/utils.ts";
import { Badge } from "../../ui/badge.tsx";
import { Button } from "../../ui/button.tsx";
import MultiPortHandle from "../ports/MultiPortHandle.tsx";
import { PortConfig, standardPorts } from "../ports/portTypes.ts";

export type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
export type AuthType = "none" | "bearer" | "basic" | "api_key";

export interface HTTPRequestNodeData {
  id: string;
  name: string;
  description?: string;
  config?: {
    method?: HTTPMethod;
    url?: string;
    timeout?: number;
    retryCount?: number;
    authType?: AuthType;
    responseFormat?: "json" | "xml" | "text" | "binary";
    headers?: Record<string, string>;
    followRedirects?: boolean;
  };
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  [key: string]: unknown;
}

interface HTTPRequestNodeProps {
  id: string;
  data: HTTPRequestNodeData;
  selected?: boolean;
}

const methodColors: Record<HTTPMethod, string> = {
  GET: "bg-green-500/20 text-green-600",
  POST: "bg-blue-500/20 text-blue-600",
  PUT: "bg-yellow-500/20 text-yellow-600",
  DELETE: "bg-red-500/20 text-red-600",
  PATCH: "bg-purple-500/20 text-purple-600",
  HEAD: "bg-gray-500/20 text-gray-600",
  OPTIONS: "bg-gray-500/20 text-gray-600",
};

const HTTPRequestNode: React.FC<HTTPRequestNodeProps> = memo(({ id, data, selected }) => {
  const inputPorts: PortConfig[] = standardPorts.httpRequest.inputs;
  const outputPorts: PortConfig[] = standardPorts.httpRequest.outputs;
  
  const method = data.config?.method || "GET";
  const url = data.config?.url || "";
  const hasAuth = data.config?.authType && data.config.authType !== "none";

  // Format URL for display
  const displayUrl = url.length > 30 ? url.substring(0, 30) + "..." : url;

  return (
    <div
      className={cn(
        "relative bg-card border-2 rounded-xl shadow-lg min-w-[240px] transition-all duration-200",
        selected ? "border-teal-500 ring-2 ring-teal-500/30" : "border-border",
        "hover:shadow-xl"
      )}
    >
      {/* Input ports on left side */}
      <MultiPortHandle
        ports={inputPorts}
        position={Position.Left}
        nodeId={id}
      />

      {/* Output ports on right side */}
      <MultiPortHandle
        ports={outputPorts}
        position={Position.Right}
        nodeId={id}
      />

      {/* Header */}
      <div className="flex items-center gap-3 p-3 rounded-t-lg bg-teal-500/10">
        <div className="p-2 rounded-lg bg-background/80 text-teal-500">
          <Globe className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {data.name || "HTTP 请求"}
          </h3>
          <Badge variant="secondary" className="text-[10px] mt-0.5">
            <ArrowRight className="h-2.5 w-2.5 mr-1" />
            API 调用
          </Badge>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {data.onConfigure && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                data.onConfigure?.(data.id);
              }}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}
          {data.onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                data.onRemove?.(data.id);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {data.description}
          </p>
        )}

        {/* Method and URL */}
        <div className="flex items-center gap-2">
          <Badge className={cn("text-[10px] font-mono", methodColors[method])}>
            {method}
          </Badge>
          {url && (
            <span className="text-xs text-muted-foreground font-mono truncate">
              {displayUrl}
            </span>
          )}
        </div>

        {/* Config indicators */}
        <div className="flex flex-wrap gap-1">
          {hasAuth && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <Lock className="h-2.5 w-2.5 mr-1" />
              {data.config?.authType}
            </Badge>
          )}
          {!hasAuth && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
              <Unlock className="h-2.5 w-2.5 mr-1" />
              无认证
            </Badge>
          )}
          {data.config?.timeout && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {data.config.timeout / 1000}s
            </Badge>
          )}
          {data.config?.retryCount && data.config.retryCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              重试{data.config.retryCount}次
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});

HTTPRequestNode.displayName = "HTTPRequestNode";

export default HTTPRequestNode;
