import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { FileCode2, Settings2, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface TemplateNodeData {
  label?: string;
  template?: string;
  variables?: Array<{ name: string; description?: string }>;
  outputFormat?: "text" | "json" | "markdown";
  [key: string]: unknown;
}

const defaultTemplate = `你好，{{user_name}}！

今天是 {{date}}，天气{{weather}}。

您的任务列表：
{% for task in tasks %}
- {{ task.title }} ({{ task.priority }})
{% endfor %}`;

const TemplateNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as TemplateNodeData;
  const [isExpanded, setIsExpanded] = useState(false);
  const [template, setTemplate] = useState(nodeData.template || defaultTemplate);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Extract variables from template using Jinja2-like syntax
  const extractedVars = template.match(/\{\{([^}]+)\}\}/g)?.map(v => v.replace(/\{\{|\}\}/g, '').trim()) || [];
  const uniqueVars = [...new Set(extractedVars)];

  return (
    <div
      className={cn(
        "bg-card rounded-xl border-2 shadow-lg min-w-[280px] max-w-[320px] transition-all duration-200",
        selected ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-border/50 hover:border-emerald-400/50"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="control-in"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
        style={{ top: 24 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="variables-in"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
        style={{ top: 48 }}
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <FileCode2 className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {nodeData.label || "模板转换"}
          </h3>
          <p className="text-xs text-muted-foreground">Jinja2 / Handlebars</p>
        </div>
        <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 text-[10px]">
          TEMPLATE
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Template Editor */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs h-8 px-2"
            >
              <span className="flex items-center gap-1">
                <Settings2 className="w-3 h-3" />
                编辑模板
              </span>
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="relative">
              <Textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="font-mono text-xs min-h-[120px] resize-none"
                placeholder="输入模板内容..."
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Detected Variables */}
        {uniqueVars.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">检测到的变量：</p>
            <div className="flex flex-wrap gap-1">
              {uniqueVars.slice(0, 6).map((v, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0.5">
                  {v}
                </Badge>
              ))}
              {uniqueVars.length > 6 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                  +{uniqueVars.length - 6}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Output Format */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">输出格式</span>
          <Badge variant="outline" className="text-[10px]">
            {nodeData.outputFormat || "text"}
          </Badge>
        </div>
      </div>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="control-out"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
        style={{ top: 24 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="rendered-out"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-background"
        style={{ top: 48 }}
      />
    </div>
  );
});

TemplateNode.displayName = "TemplateNode";
export default TemplateNode;
