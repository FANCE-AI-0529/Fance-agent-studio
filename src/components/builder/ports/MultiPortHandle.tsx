import React, { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { cn } from "../../../lib/utils.ts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../ui/tooltip.tsx";
import { PortConfig, portColors, portLayout, getPortHandleId } from "./portTypes.ts";

interface MultiPortHandleProps {
  ports: PortConfig[];
  position: Position;
  nodeId: string;
  className?: string;
}

/**
 * Multi-port handle component for nodes
 * Renders multiple colored handles based on port type
 */
const MultiPortHandle: React.FC<MultiPortHandleProps> = memo(({
  ports,
  position,
  nodeId,
  className,
}) => {
  const isVertical = position === Position.Left || position === Position.Right;
  const isInput = position === Position.Left || position === Position.Top;
  
  // Calculate port positions
  const totalHeight = (ports.length - 1) * portLayout.spacing;
  const startOffset = -totalHeight / 2;

  return (
    <div className={cn("relative", className)}>
      {ports.map((port, index) => {
        const color = portColors[port.type];
        const handleId = getPortHandleId(nodeId, port.id, port.direction);
        
        // Calculate offset for each port
        const offset = startOffset + index * portLayout.spacing;
        
        const style: React.CSSProperties = isVertical
          ? { top: `calc(50% + ${offset}px)` }
          : { left: `calc(50% + ${offset}px)` };

        return (
          <Tooltip key={handleId}>
            <TooltipTrigger asChild>
              <div
                className="absolute"
                style={{
                  ...style,
                  [position === Position.Left ? 'left' : position === Position.Right ? 'right' : position === Position.Top ? 'top' : 'bottom']: 0,
                }}
              >
                <Handle
                  type={isInput ? "target" : "source"}
                  position={position}
                  id={handleId}
                  className={cn(
                    "!w-3 !h-3 !border-2 !border-background transition-all duration-200",
                    "hover:!scale-125 hover:!shadow-lg",
                    color.tailwindBg
                  )}
                  style={{
                    boxShadow: `0 0 0 2px var(--background)`,
                  }}
                />
                {/* Port glow effect on hover */}
                <div
                  className={cn(
                    "absolute inset-0 rounded-full opacity-0 transition-opacity pointer-events-none",
                    "group-hover:opacity-100"
                  )}
                  style={{
                    boxShadow: color.glow,
                    width: portLayout.size,
                    height: portLayout.size,
                  }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent 
              side={position === Position.Left ? "left" : position === Position.Right ? "right" : position === Position.Top ? "top" : "bottom"}
              className="text-xs"
            >
              <div className="flex items-center gap-2">
                <div 
                  className={cn("w-2 h-2 rounded-full", color.tailwindBg)}
                />
                <span>{port.label || port.id}</span>
                <span className="text-muted-foreground">
                  ({port.type === "data" ? "数据" : port.type === "control" ? "控制" : "感知"})
                </span>
              </div>
              {port.description && (
                <p className="text-muted-foreground mt-1">{port.description}</p>
              )}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
});

MultiPortHandle.displayName = "MultiPortHandle";

export default MultiPortHandle;

/**
 * Simplified single port handle with type coloring
 */
export const TypedHandle: React.FC<{
  type: "source" | "target";
  position: Position;
  portType: "data" | "control" | "perception";
  id?: string;
  label?: string;
  className?: string;
}> = memo(({ type, position, portType, id, label, className }) => {
  const color = portColors[portType];

  const handle = (
    <Handle
      type={type}
      position={position}
      id={id}
      className={cn(
        "!w-3 !h-3 !border-2 !border-background transition-all duration-200",
        "hover:!scale-125",
        color.tailwindBg,
        className
      )}
    />
  );

  if (!label) return handle;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{handle}</TooltipTrigger>
      <TooltipContent side={position === Position.Left ? "left" : "right"} className="text-xs">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", color.tailwindBg)} />
          <span>{label}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

TypedHandle.displayName = "TypedHandle";
