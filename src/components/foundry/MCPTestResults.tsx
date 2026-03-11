import { useState } from "react";
import {
  Wrench,
  FileBox,
  MessageSquare,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Server,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible.tsx";
import { toast } from "../../hooks/use-toast.ts";
import { cn } from "../../lib/utils.ts";
import type { MCPInspectResult } from "../../hooks/useMCPInspect.ts";

interface MCPTestResultsProps {
  result: MCPInspectResult;
}

export function MCPTestResults({ result }: MCPTestResultsProps) {
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const toggleTool = (name: string) => {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const copyToClipboard = async (content: string, itemId: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedItem(itemId);
    setTimeout(() => setCopiedItem(null), 2000);
    toast({
      title: "已复制",
      description: "Schema 已复制到剪贴板",
    });
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("zh-CN");
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Server Info */}
        {result.serverInfo && (
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Server className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Server Info</span>
              <Badge
                variant={result.inspectionMethod === "simulated" ? "secondary" : "default"}
                className="ml-auto text-[10px]"
              >
                {result.inspectionMethod === "simulated" ? "模拟" : "实时"}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">名称</span>
                <span className="font-mono">{result.serverInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">版本</span>
                <span className="font-mono">{result.serverInfo.version}</span>
              </div>
              {result.serverInfo.protocolVersion && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">协议版本</span>
                  <span className="font-mono">{result.serverInfo.protocolVersion}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">检测时间</span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(result.timestamp)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tools */}
        {result.tools && result.tools.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-cognitive" />
              <span className="font-semibold text-sm">Tools</span>
              <Badge variant="secondary" className="text-[10px]">
                {result.tools.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {result.tools.map((tool) => {
                const isExpanded = expandedTools.has(tool.name);
                const schemaStr = JSON.stringify(tool.inputSchema, null, 2);

                return (
                  <Collapsible
                    key={tool.name}
                    open={isExpanded}
                    onOpenChange={() => toggleTool(tool.name)}
                  >
                    <div className="border border-border rounded-lg overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <Zap className="h-4 w-4 text-cognitive" />
                          <span className="font-mono text-sm font-medium">{tool.name}</span>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t border-border p-3 space-y-3 bg-muted/30">
                          {tool.description && (
                            <p className="text-sm text-muted-foreground">{tool.description}</p>
                          )}

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Input Schema
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(schemaStr, tool.name)}
                                className="h-7 px-2 gap-1"
                              >
                                {copiedItem === tool.name ? (
                                  <Check className="h-3 w-3 text-status-executing" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                <span className="text-xs">复制</span>
                              </Button>
                            </div>
                            <pre className="p-3 rounded-lg bg-background border border-border text-xs font-mono overflow-x-auto">
                              {schemaStr}
                            </pre>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        )}

        {/* Resources */}
        {result.resources && result.resources.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileBox className="h-4 w-4 text-governance" />
              <span className="font-semibold text-sm">Resources</span>
              <Badge variant="secondary" className="text-[10px]">
                {result.resources.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {result.resources.map((resource) => (
                <div
                  key={resource.uri}
                  className="p-3 border border-border rounded-lg space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <FileBox className="h-4 w-4 text-muted-foreground" />
                    <code className="text-sm font-mono text-primary">{resource.uri}</code>
                  </div>
                  <div className="text-sm text-muted-foreground">{resource.name}</div>
                  {resource.description && (
                    <p className="text-xs text-muted-foreground">{resource.description}</p>
                  )}
                  {resource.mimeType && (
                    <Badge variant="outline" className="text-[10px]">
                      {resource.mimeType}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prompts */}
        {result.prompts && result.prompts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Prompts</span>
              <Badge variant="secondary" className="text-[10px]">
                {result.prompts.length}
              </Badge>
            </div>

            <div className="space-y-2">
              {result.prompts.map((prompt) => (
                <div
                  key={prompt.name}
                  className="p-3 border border-border rounded-lg space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm font-medium">{prompt.name}</span>
                  </div>
                  {prompt.description && (
                    <p className="text-sm text-muted-foreground">{prompt.description}</p>
                  )}
                  {prompt.arguments && prompt.arguments.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {prompt.arguments.map((arg) => (
                        <Badge
                          key={arg.name}
                          variant={arg.required ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {arg.name}
                          {arg.required && " *"}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {(!result.tools || result.tools.length === 0) &&
          (!result.resources || result.resources.length === 0) &&
          (!result.prompts || result.prompts.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">未检测到 Tools、Resources 或 Prompts</p>
              <p className="text-xs mt-1">请检查 MCP 配置是否正确</p>
            </div>
          )}
      </div>
    </ScrollArea>
  );
}
