import React, { useMemo } from 'react';
import { EdgeProps, getBezierPath } from '@xyflow/react';
import { cn } from '../../lib/utils.ts';

interface FlowingEdgeData {
  isActive?: boolean;
  flowSpeed?: 'slow' | 'normal' | 'fast';
}

export const FlowingEdge = React.memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}: EdgeProps) => {
  const edgeData = data as FlowingEdgeData | undefined;
  const isActive = edgeData?.isActive || false;
  const flowSpeed = edgeData?.flowSpeed || 'normal';

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Calculate animation duration based on speed
  const animationDuration = useMemo(() => {
    switch (flowSpeed) {
      case 'fast': return '1s';
      case 'slow': return '3s';
      default: return '2s';
    }
  }, [flowSpeed]);

  // Generate unique gradient ID
  const gradientId = `flowing-gradient-${id}`;

  return (
    <g className="flowing-edge-group">
      {/* Gradient definition for active state */}
      <defs>
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse"
          x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
          <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Base edge path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={isActive ? `url(#${gradientId})` : 'hsl(var(--muted-foreground))'}
        strokeWidth={isActive ? 2 : 1}
        strokeOpacity={isActive ? 1 : 0.4}
        className={cn(
          "transition-all duration-300",
          isActive && "filter drop-shadow-[0_0_3px_hsl(var(--primary))]"
        )}
        style={style}
      />

      {/* Flowing particles when active */}
      {isActive && (
        <>
          {[0, 0.33, 0.66].map((offset, index) => (
            <circle
              key={index}
              r="3"
              fill="hsl(var(--primary))"
              className="flowing-particle"
              style={{
                offsetPath: `path('${edgePath}')`,
                offsetDistance: '0%',
                animation: `particle-flow ${animationDuration} linear infinite`,
                animationDelay: `${offset * parseFloat(animationDuration)}s`,
              }}
            >
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                keyTimes="0;0.1;0.9;1"
                dur={animationDuration}
                repeatCount="indefinite"
                begin={`${offset * parseFloat(animationDuration)}s`}
              />
            </circle>
          ))}
        </>
      )}

      {/* Glow effect when active */}
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={4}
          strokeOpacity={0.2}
          className="animate-pulse"
        />
      )}
    </g>
  );
});

FlowingEdge.displayName = 'FlowingEdge';

// Edge types mapping for ReactFlow
export const flowingEdgeTypes = {
  flowing: FlowingEdge,
  default: FlowingEdge,
};

// CSS for particle animation (add to index.css or component styles)
export const flowingEdgeStyles = `
  @keyframes particle-flow {
    0% { offset-distance: 0%; }
    100% { offset-distance: 100%; }
  }
  
  .flowing-particle {
    filter: drop-shadow(0 0 2px hsl(var(--primary)));
  }
`;
