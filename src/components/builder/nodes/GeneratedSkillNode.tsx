// =====================================================
// AI 生成的技能节点组件
// GeneratedSkillNode - 展示即时生成的临时技能
// =====================================================

import React, { memo } from "react";
import { Position } from "@xyflow/react";
import { Sparkles, Save, X, Settings, Wand2, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "../../ui/badge.tsx";
import { Button } from "../../ui/button.tsx";
import { cn } from "../../../lib/utils.ts";
import MultiPortHandle from "../ports/MultiPortHandle.tsx";
import { standardPorts, PortConfig } from "../ports/portTypes.ts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../ui/tooltip.tsx";

export interface GeneratedSkillNodeData {
  [key: string]: unknown;
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  skillMd?: string;
  riskLevel: 'low' | 'medium' | 'high';
  isTemporary: boolean;
  generatedAt: string;
  generatedFor: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  onSave?: (id: string) => void;
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
}

interface GeneratedSkillNodeProps {
  id: string;
  data: GeneratedSkillNodeData;
  selected?: boolean;
}

const riskColors: Record<string, string> = {
  low: "text-green-500 border-green-500/30",
  medium: "text-yellow-500 border-yellow-500/30",
  high: "text-red-500 border-red-500/30",
};

const riskLabels: Record<string, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};

const GeneratedSkillNode: React.FC<GeneratedSkillNodeProps> = memo(({ id, data, selected }) => {
  // Input ports (left side)
  const inputPorts: PortConfig[] = standardPorts.skill.inputs;
  // Output ports (right side)
  const outputPorts: PortConfig[] = standardPorts.skill.outputs;

  const timeAgo = getTimeAgo(data.generatedAt);

  return (
    <div
      className={cn(
        "relative bg-card border-2 rounded-lg shadow-lg min-w-[200px] max-w-[260px] transition-all",
        selected ? "border-primary ring-2 ring-primary/30" : "border-dashed border-amber-500/50",
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

      {/* AI Generated Badge */}
      <Badge 
        className="absolute -top-2.5 -right-2 bg-amber-500 text-white border-0 shadow-md z-10"
      >
        <Sparkles className="h-3 w-3 mr-1" />
        AI 生成
      </Badge>

      {/* Temporary Badge */}
      {data.isTemporary && (
        <Badge 
          variant="outline"
          className="absolute -top-2.5 left-2 bg-background border-amber-500/50 text-amber-600 text-[10px] z-10"
        >
          <Clock className="h-2.5 w-2.5 mr-0.5" />
          临时
        </Badge>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-t-md border-b border-amber-500/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/20 rounded-md">
            <Wand2 className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground line-clamp-1">
              {data.name}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {data.category}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {data.onConfigure && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      data.onConfigure?.(data.id);
                    }}
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>配置技能</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {data.onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-destructive"
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
        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {data.description}
        </p>

        {/* Capabilities */}
        {data.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.capabilities.slice(0, 3).map((cap, idx) => (
              <Badge 
                key={idx} 
                variant="secondary" 
                className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20"
              >
                {cap}
              </Badge>
            ))}
            {data.capabilities.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{data.capabilities.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Risk Level */}
        <div className="flex items-center justify-between text-xs">
          <Badge 
            variant="outline" 
            className={cn("text-[10px]", riskColors[data.riskLevel])}
          >
            {data.riskLevel === 'high' && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
            {riskLabels[data.riskLevel]}
          </Badge>
          <span className="text-muted-foreground text-[10px]">
            {timeAgo}
          </span>
        </div>

        {/* Generated For */}
        {data.generatedFor && (
          <p className="text-[10px] text-muted-foreground italic line-clamp-1">
            为: {data.generatedFor.slice(0, 50)}...
          </p>
        )}
      </div>

      {/* Save Button */}
      {data.isTemporary && data.onSave && (
        <div className="p-2 border-t border-amber-500/20 bg-amber-500/5">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
            onClick={(e) => {
              e.stopPropagation();
              data.onSave?.(data.id);
            }}
          >
            <Save className="h-3 w-3" />
            保存到技能库
          </Button>
        </div>
      )}
    </div>
  );
});

GeneratedSkillNode.displayName = "GeneratedSkillNode";

export default GeneratedSkillNode;

// 辅助函数：计算时间差
function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚生成';
  if (minutes < 60) return `${minutes}分钟前`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}
