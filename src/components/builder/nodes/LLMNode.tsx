import React, { memo } from "react";
import { Position } from "@xyflow/react";
import { 
  Brain, 
  Settings,
  X,
  Sparkles,
  FileText,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MultiPortHandle from "../ports/MultiPortHandle";
import { PortConfig, standardPorts } from "../ports/portTypes";

export interface LLMNodeData {
  id: string;
  name: string;
  description?: string;
  config?: {
    model?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    systemPrompt?: string;
    structuredOutput?: boolean;
    outputSchema?: Record<string, unknown>;
    enableStreaming?: boolean;
    enableMemory?: boolean;
  };
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  [key: string]: unknown;
}

interface LLMNodeProps {
  id: string;
  data: LLMNodeData;
  selected?: boolean;
}

const modelLabels: Record<string, string> = {
  "google/gemini-2.5-flash": "Gemini 2.5 Flash",
  "google/gemini-2.5-pro": "Gemini 2.5 Pro",
  "google/gemini-3-flash-preview": "Gemini 3 Flash",
  "google/gemini-3-pro-preview": "Gemini 3 Pro",
  "openai/gpt-5": "GPT-5",
  "openai/gpt-5-mini": "GPT-5 Mini",
  "openai/gpt-5-nano": "GPT-5 Nano",
};

const LLMNode: React.FC<LLMNodeProps> = memo(({ id, data, selected }) => {
  const inputPorts: PortConfig[] = standardPorts.llm.inputs;
  const outputPorts: PortConfig[] = standardPorts.llm.outputs;
  
  const modelName = data.config?.model 
    ? modelLabels[data.config.model] || data.config.model 
    : "Gemini 2.5 Flash";

  return (
    <div
      className={cn(
        "relative bg-card border-2 rounded-xl shadow-lg min-w-[220px] transition-all duration-200",
        selected ? "border-blue-500 ring-2 ring-blue-500/30" : "border-border",
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
      <div className="flex items-center gap-3 p-3 rounded-t-lg bg-blue-500/10">
        <div className="p-2 rounded-lg bg-background/80 text-blue-500">
          <Brain className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {data.name || "LLM 调用"}
          </h3>
          <Badge variant="secondary" className="text-[10px] mt-0.5">
            <Sparkles className="h-2.5 w-2.5 mr-1" />
            大模型
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

        {/* Model info */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted/50">
            <Brain className="h-3 w-3 text-blue-500" />
            <span>{modelName}</span>
          </div>
        </div>

        {/* Config indicators */}
        <div className="flex flex-wrap gap-1">
          {data.config?.structuredOutput && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <FileText className="h-2.5 w-2.5 mr-1" />
              结构化输出
            </Badge>
          )}
          {data.config?.enableStreaming && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              <Zap className="h-2.5 w-2.5 mr-1" />
              流式
            </Badge>
          )}
          {data.config?.temperature !== undefined && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              T={data.config.temperature}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});

LLMNode.displayName = "LLMNode";

export default LLMNode;
