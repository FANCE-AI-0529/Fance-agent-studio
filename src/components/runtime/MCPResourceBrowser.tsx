import { useState } from "react";
import {
  Database,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Globe,
  FileText,
  Folder,
  Plug,
  Copy,
  Check,
  Loader2,
  Wrench,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface MCPServer {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  tools: MCPTool[];
  resources: MCPResource[];
  lastSync?: Date;
}

interface MCPResourceBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  servers: MCPServer[];
  onRefresh?: () => void;
  onReadResource?: (serverId: string, uri: string) => Promise<string>;
}

const statusColors = {
  connected: "bg-status-executing text-status-executing",
  disconnected: "bg-muted-foreground text-muted-foreground",
  error: "bg-destructive text-destructive",
};

function ResourceIcon({ mimeType }: { mimeType?: string }) {
  if (mimeType?.startsWith("text/html")) {
    return <Globe className="h-3 w-3 text-blue-400" />;
  }
  if (mimeType?.includes("json") || mimeType?.includes("schema")) {
    return <Database className="h-3 w-3 text-purple-400" />;
  }
  return <FileText className="h-3 w-3 text-muted-foreground" />;
}

function ServerNode({ 
  server, 
  onSelectResource 
}: { 
  server: MCPServer; 
  onSelectResource: (resource: MCPResource) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showTools, setShowTools] = useState(false);
  const [showResources, setShowResources] = useState(true);

  return (
    <div className="space-y-0.5">
      {/* Server Header */}
      <div
        className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        <Plug className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium flex-1">{server.name}</span>
        <div className={cn("w-2 h-2 rounded-full", statusColors[server.status].split(" ")[0])} />
      </div>

      {/* Server Content */}
      {isExpanded && (
        <div className="pl-5 space-y-0.5">
          {/* Resources Section */}
          {server.resources.length > 0 && (
            <div>
              <div
                className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/30 cursor-pointer"
                onClick={() => setShowResources(!showResources)}
              >
                {showResources ? (
                  <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                )}
                <Folder className="h-3 w-3 text-amber-400" />
                <span className="text-[11px] text-muted-foreground">Resources ({server.resources.length})</span>
              </div>
              {showResources && (
                <div className="pl-4 space-y-0.5">
                  {server.resources.map((resource) => (
                    <div
                      key={resource.uri}
                      className="flex items-start gap-2 p-1.5 rounded hover:bg-secondary/50 cursor-pointer"
                      onClick={() => onSelectResource(resource)}
                    >
                      <ResourceIcon mimeType={resource.mimeType} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">{resource.name}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{resource.uri}</p>
                        {resource.description && (
                          <p className="text-[9px] text-muted-foreground/70 truncate">{resource.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tools Section */}
          {server.tools.length > 0 && (
            <div>
              <div
                className="flex items-center gap-2 p-1.5 rounded hover:bg-secondary/30 cursor-pointer"
                onClick={() => setShowTools(!showTools)}
              >
                {showTools ? (
                  <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                )}
                <Wrench className="h-3 w-3 text-governance" />
                <span className="text-[11px] text-muted-foreground">Tools ({server.tools.length})</span>
              </div>
              {showTools && (
                <div className="pl-4 space-y-0.5">
                  {server.tools.map((tool) => (
                    <div
                      key={tool.name}
                      className="flex items-start gap-2 p-1.5 rounded bg-secondary/20"
                    >
                      <Wrench className="h-3 w-3 text-primary/70 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">{tool.name}</p>
                        {tool.description && (
                          <p className="text-[9px] text-muted-foreground truncate">{tool.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResourcePreview({
  resource,
  content,
  isLoading,
  onRead,
  onClose,
}: {
  resource: MCPResource;
  content?: string;
  isLoading: boolean;
  onRead: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <div className="border-t border-border mt-3 pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <ResourceIcon mimeType={resource.mimeType} />
          <span className="text-xs font-medium">资源预览</span>
        </div>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-2">
        <div className="text-[10px] space-y-0.5">
          <p><span className="text-muted-foreground">URI:</span> {resource.uri}</p>
          {resource.mimeType && (
            <p><span className="text-muted-foreground">Type:</span> {resource.mimeType}</p>
          )}
        </div>

        {content ? (
          <div className="relative">
            <pre className="text-[10px] font-mono bg-muted/30 rounded p-2 overflow-auto max-h-[200px]">
              <code className="text-muted-foreground whitespace-pre-wrap break-all">
                {content.length > 2000 ? content.slice(0, 2000) + "..." : content}
              </code>
            </pre>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-5 w-5"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-status-executing" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-4 bg-muted/20 rounded">
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary mb-1" />
                <p className="text-[10px] text-muted-foreground">正在读取资源...</p>
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-[10px] text-muted-foreground mb-2">点击读取资源内容</p>
                <Button size="sm" className="h-6 text-[10px] px-3" onClick={onRead}>
                  读取此资源
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function MCPResourceBrowser({
  open,
  onOpenChange,
  servers,
  onRefresh,
  onReadResource,
}: MCPResourceBrowserProps) {
  const [selectedResource, setSelectedResource] = useState<MCPResource | null>(null);
  const [resourceContent, setResourceContent] = useState<string | undefined>();
  const [isReadingResource, setIsReadingResource] = useState(false);

  const handleSelectResource = (resource: MCPResource) => {
    setSelectedResource(resource);
    setResourceContent(undefined);
  };

  const handleReadResource = async () => {
    if (!selectedResource || !onReadResource) return;
    
    setIsReadingResource(true);
    try {
      const server = servers.find(s => 
        s.resources.some(r => r.uri === selectedResource.uri)
      );
      if (server) {
        const content = await onReadResource(server.id, selectedResource.uri);
        setResourceContent(content);
      }
    } catch (error) {
      toast.error("读取资源失败");
    } finally {
      setIsReadingResource(false);
    }
  };

  const connectedCount = servers.filter(s => s.status === 'connected').length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[360px] p-0 flex flex-col">
        <SheetHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              <SheetTitle className="text-sm">MCP Resources</SheetTitle>
            </div>
            {onRefresh && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRefresh}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-[10px]">
              {connectedCount} / {servers.length} 已连接
            </Badge>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          {servers.length > 0 ? (
            <div className="space-y-2">
              {servers.map((server) => (
                <ServerNode
                  key={server.id}
                  server={server}
                  onSelectResource={handleSelectResource}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Plug className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs font-medium">暂无 MCP 服务器</p>
              <p className="text-[10px] mt-1">当前 Agent 未配置 MCP 技能</p>
            </div>
          )}

          {/* Resource Preview */}
          {selectedResource && (
            <ResourcePreview
              resource={selectedResource}
              content={resourceContent}
              isLoading={isReadingResource}
              onRead={handleReadResource}
              onClose={() => {
                setSelectedResource(null);
                setResourceContent(undefined);
              }}
            />
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
