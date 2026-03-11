import React, { memo } from "react";
import { Position } from "@xyflow/react";
import { 
  Code2, 
  Settings,
  X,
  Terminal,
  FileCode
} from "lucide-react";
import { cn } from "../../../lib/utils.ts";
import { Badge } from "../../ui/badge.tsx";
import { Button } from "../../ui/button.tsx";
import MultiPortHandle from "../ports/MultiPortHandle.tsx";
import { PortConfig, standardPorts } from "../ports/portTypes.ts";

export type CodeLanguage = "javascript" | "python";

export interface CodeNodeData {
  id: string;
  name: string;
  description?: string;
  config?: {
    language?: CodeLanguage;
    code?: string;
    timeout?: number;
    inputVariables?: Array<{ name: string; type: string }>;
    outputVariables?: Array<{ name: string; type: string }>;
  };
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  [key: string]: unknown;
}

interface CodeNodeProps {
  id: string;
  data: CodeNodeData;
  selected?: boolean;
}

const languageConfig: Record<CodeLanguage, { label: string; color: string; bgColor: string }> = {
  javascript: {
    label: "JavaScript",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
  },
  python: {
    label: "Python",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
};

const CodeNode: React.FC<CodeNodeProps> = memo(({ id, data, selected }) => {
  const inputPorts: PortConfig[] = standardPorts.code.inputs;
  const outputPorts: PortConfig[] = standardPorts.code.outputs;
  
  const language = data.config?.language || "javascript";
  const langConfig = languageConfig[language];
  const hasCode = !!data.config?.code;

  // Get code preview (first line or placeholder)
  const codePreview = data.config?.code 
    ? data.config.code.split('\n')[0].substring(0, 40) + (data.config.code.length > 40 ? '...' : '')
    : '// 点击配置编写代码';

  return (
    <div
      className={cn(
        "relative bg-card border-2 rounded-xl shadow-lg min-w-[220px] transition-all duration-200",
        selected ? "border-amber-500 ring-2 ring-amber-500/30" : "border-border",
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
      <div className={cn("flex items-center gap-3 p-3 rounded-t-lg", langConfig.bgColor)}>
        <div className={cn("p-2 rounded-lg bg-background/80", langConfig.color)}>
          <Code2 className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {data.name || "代码执行"}
          </h3>
          <Badge variant="secondary" className="text-[10px] mt-0.5">
            <Terminal className="h-2.5 w-2.5 mr-1" />
            {langConfig.label}
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

        {/* Code preview */}
        <div className="bg-muted/50 rounded-md p-2 font-mono text-xs text-muted-foreground overflow-hidden">
          <code className="truncate block">{codePreview}</code>
        </div>

        {/* Config indicators */}
        <div className="flex flex-wrap gap-1">
          {hasCode && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-500">
              <FileCode className="h-2.5 w-2.5 mr-1" />
              已配置
            </Badge>
          )}
          {data.config?.timeout && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              超时 {data.config.timeout / 1000}s
            </Badge>
          )}
          {data.config?.inputVariables && data.config.inputVariables.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {data.config.inputVariables.length} 输入
            </Badge>
          )}
          {data.config?.outputVariables && data.config.outputVariables.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {data.config.outputVariables.length} 输出
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});

CodeNode.displayName = "CodeNode";

export default CodeNode;
