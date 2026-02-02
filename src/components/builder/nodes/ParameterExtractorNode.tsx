import React, { memo } from "react";
import { Position } from "@xyflow/react";
import { 
  ScanSearch, 
  Settings,
  X,
  Sparkles,
  ListChecks
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import MultiPortHandle from "../ports/MultiPortHandle";
import { PortConfig, standardPorts } from "../ports/portTypes";

export interface ParameterSchema {
  name: string;
  type: "string" | "number" | "boolean" | "enum" | "array";
  required?: boolean;
  description?: string;
  enumValues?: string[];
}

export interface ParameterExtractorNodeData {
  id: string;
  name: string;
  description?: string;
  config?: {
    model?: string;
    parameters?: ParameterSchema[];
    extractionPrompt?: string;
    strictMode?: boolean;
  };
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  [key: string]: unknown;
}

interface ParameterExtractorNodeProps {
  id: string;
  data: ParameterExtractorNodeData;
  selected?: boolean;
}

const ParameterExtractorNode: React.FC<ParameterExtractorNodeProps> = memo(({ id, data, selected }) => {
  const inputPorts: PortConfig[] = standardPorts.parameterExtractor.inputs;
  const outputPorts: PortConfig[] = standardPorts.parameterExtractor.outputs;
  
  const paramCount = data.config?.parameters?.length || 0;
  const requiredCount = data.config?.parameters?.filter(p => p.required).length || 0;

  return (
    <div
      className={cn(
        "relative bg-card border-2 rounded-xl shadow-lg min-w-[220px] transition-all duration-200",
        selected ? "border-violet-500 ring-2 ring-violet-500/30" : "border-border",
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
      <div className="flex items-center gap-3 p-3 rounded-t-lg bg-violet-500/10">
        <div className="p-2 rounded-lg bg-background/80 text-violet-500">
          <ScanSearch className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {data.name || "参数提取器"}
          </h3>
          <Badge variant="secondary" className="text-[10px] mt-0.5">
            <Sparkles className="h-2.5 w-2.5 mr-1" />
            LLM 提取
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

        {/* Parameter preview */}
        {paramCount > 0 ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <ListChecks className="h-3 w-3" />
              <span>提取参数</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {data.config?.parameters?.slice(0, 4).map((param, i) => (
                <Badge 
                  key={i} 
                  variant="outline" 
                  className={cn(
                    "text-[10px] px-1.5 py-0",
                    param.required && "border-violet-500/50"
                  )}
                >
                  {param.name}
                  {param.required && <span className="text-violet-500 ml-0.5">*</span>}
                </Badge>
              ))}
              {paramCount > 4 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{paramCount - 4}
                </Badge>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground italic">
            点击配置提取参数
          </div>
        )}

        {/* Config indicators */}
        <div className="flex flex-wrap gap-1 pt-1">
          {paramCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {paramCount} 参数
            </Badge>
          )}
          {requiredCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {requiredCount} 必填
            </Badge>
          )}
          {data.config?.strictMode && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-500">
              严格模式
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
});

ParameterExtractorNode.displayName = "ParameterExtractorNode";

export default ParameterExtractorNode;
