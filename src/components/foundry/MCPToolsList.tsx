import { ScrollArea } from "../ui/scroll-area.tsx";
import { Wrench, Package, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils.ts";

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

interface MCPToolsListProps {
  tools: MCPTool[];
  className?: string;
}

export function MCPToolsList({ tools, className }: MCPToolsListProps) {
  if (!tools || tools.length === 0) {
    return (
      <div className="text-muted-foreground text-sm py-4 text-center">
        暂无 Tools 信息
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
        <Wrench className="h-4 w-4" />
        <span>可用 Tools ({tools.length})</span>
      </div>
      <ScrollArea className="max-h-[200px]">
        <div className="space-y-1">
          {tools.map((tool, index) => (
            <div
              key={index}
              className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm text-foreground truncate">
                  {tool.name}
                </div>
                {tool.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {tool.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface MCPResourcesListProps {
  resources: MCPResource[];
  className?: string;
}

export function MCPResourcesList({ resources, className }: MCPResourcesListProps) {
  if (!resources || resources.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
        <Package className="h-4 w-4" />
        <span>Resources ({resources.length})</span>
      </div>
      <div className="space-y-1">
        {resources.map((resource, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <span className="text-muted-foreground">•</span>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm text-foreground truncate">
                {resource.uri}
              </div>
              {resource.name && (
                <div className="text-xs text-muted-foreground">
                  {resource.name}
                  {resource.description && ` - ${resource.description}`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface MCPToolsPreviewProps {
  tools: MCPTool[];
  resources: MCPResource[];
  className?: string;
}

export function MCPToolsPreview({ tools, resources, className }: MCPToolsPreviewProps) {
  const toolsCount = tools?.length || 0;
  const resourcesCount = resources?.length || 0;

  if (toolsCount === 0 && resourcesCount === 0) {
    return null;
  }

  return (
    <div className={cn("flex items-center gap-3 text-xs text-muted-foreground", className)}>
      {toolsCount > 0 && (
        <div className="flex items-center gap-1">
          <Wrench className="h-3 w-3" />
          <span>{toolsCount} Tools</span>
        </div>
      )}
      {resourcesCount > 0 && (
        <div className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          <span>{resourcesCount} Resources</span>
        </div>
      )}
    </div>
  );
}
