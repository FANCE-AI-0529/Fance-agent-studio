import { Badge } from "../ui/badge.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.tsx";
import { runtimeEnvConfig, scopeConfig } from "../../data/mcpCategories.ts";
import { Award } from "lucide-react";
import { cn } from "../../lib/utils.ts";

interface MCPBadgeProps {
  className?: string;
}

export function MCPBadge({ className }: MCPBadgeProps) {
  return (
    <Badge 
      variant="secondary" 
      className={cn(
        "bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs font-medium",
        className
      )}
    >
      MCP
    </Badge>
  );
}

interface RuntimeBadgeProps {
  runtime: string;
  showLabel?: boolean;
  className?: string;
}

export function RuntimeBadge({ runtime, showLabel = false, className }: RuntimeBadgeProps) {
  const config = runtimeEnvConfig[runtime];
  if (!config) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("text-sm cursor-default", config.color, className)}>
          {config.emoji}
          {showLabel && <span className="ml-1">{config.label}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface ScopeBadgeProps {
  scope: string;
  className?: string;
}

export function ScopeBadge({ scope, className }: ScopeBadgeProps) {
  const config = scopeConfig[scope];
  if (!config) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("text-sm cursor-default", className)}>
          {config.emoji}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.label}</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface OfficialBadgeProps {
  className?: string;
}

export function OfficialBadge({ className }: OfficialBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("text-amber-500 cursor-default", className)}>
          <Award className="h-4 w-4" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>官方实现</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface MCPInfoBadgesProps {
  runtime?: string | null;
  scope?: string | null;
  isOfficial?: boolean | null;
  className?: string;
}

export function MCPInfoBadges({ runtime, scope, isOfficial, className }: MCPInfoBadgesProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {runtime && <RuntimeBadge runtime={runtime} />}
      {scope && <ScopeBadge scope={scope} />}
      {isOfficial && <OfficialBadge />}
    </div>
  );
}
