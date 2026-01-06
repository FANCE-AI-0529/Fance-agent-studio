import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Sparkles, X, Database, Image, MessageSquare, FileCode, Wrench, AlertCircle, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const categoryIcons: Record<string, React.ElementType> = {
  analysis: Database,
  vision: Image,
  nlp: MessageSquare,
  code: FileCode,
  browser: Sparkles,
  database: Database,
  cloud: Sparkles,
};

export interface SkillNodeData {
  id: string;
  name: string;
  category: string;
  description: string;
  permissions: string[];
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  // MCP-specific fields
  origin?: 'native' | 'mcp';
  mcp_tools?: Array<{ name: string; description?: string }> | null;
  enabled_tools?: string[];
  env_vars?: Record<string, string>;
  detected_permissions?: string[];
  [key: string]: unknown;
}

interface SkillNodeProps {
  data: SkillNodeData;
  selected?: boolean;
}

const SkillNode = memo(({ data, selected }: SkillNodeProps) => {
  const CategoryIcon = categoryIcons[data.category] || Sparkles;
  const isMCP = data.origin === 'mcp';
  const tools = data.mcp_tools || [];
  const enabledTools = data.enabled_tools || [];
  const hasToolWarning = isMCP && tools.length > 0 && enabledTools.length === 0;

  return (
    <div
      className={`node-card rounded-lg relative transition-all duration-200 animate-scale-in ${
        selected ? "border-primary glow-primary" : ""
      } ${hasToolWarning ? "border-amber-500/50" : ""}`}
      style={{ minWidth: 180, maxWidth: 200 }}
    >
      {/* Connection handle - connects to agent */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />

      {/* Remove button */}
      {data.onRemove && (
        <button
          onClick={() => data.onRemove?.(data.id)}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform z-10"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Configure button for MCP skills */}
      {isMCP && data.onConfigure && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => data.onConfigure?.(data.id)}
              className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 transition-transform z-10"
            >
              <Settings className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>配置工具绑定</TooltipContent>
        </Tooltip>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-md flex items-center justify-center ${isMCP ? 'bg-purple-500/10' : 'bg-cognitive/10'}`}>
          <CategoryIcon className={`h-4 w-4 ${isMCP ? 'text-purple-400' : 'text-cognitive'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-medium text-sm truncate">{data.name}</span>
            {hasToolWarning && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertCircle className="h-3 w-3 text-amber-500 shrink-0" />
                </TooltipTrigger>
                <TooltipContent>未选择任何工具</TooltipContent>
              </Tooltip>
            )}
          </div>
          {/* MCP Badge */}
          {isMCP && (
            <Badge 
              variant="secondary" 
              className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[9px] px-1 py-0 h-3.5 mt-0.5"
            >
              MCP
            </Badge>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
        {data.description}
      </p>

      {/* MCP Tools Info */}
      {isMCP && tools.length > 0 && (
        <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground">
          <Wrench className="h-3 w-3" />
          <span>
            {enabledTools.length}/{tools.length} Tools
          </span>
        </div>
      )}

      {/* Permissions */}
      <div className="flex flex-wrap gap-1">
        {(data.detected_permissions || data.permissions).slice(0, 3).map((perm) => (
          <Badge
            key={perm}
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4"
          >
            {perm}
          </Badge>
        ))}
        {(data.detected_permissions || data.permissions).length > 3 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            +{(data.detected_permissions || data.permissions).length - 3}
          </Badge>
        )}
      </div>
    </div>
  );
});

SkillNode.displayName = "SkillNode";

export default SkillNode;