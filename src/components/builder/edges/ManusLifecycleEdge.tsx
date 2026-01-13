import React, { memo } from "react";
import { EdgeProps, getBezierPath } from "@xyflow/react";
import { Brain } from "lucide-react";

export interface ManusLifecycleEdgeData {
  edgeType?: "manus_bus";
  label?: string;
}

const ManusLifecycleEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeData = data as ManusLifecycleEdgeData;

  return (
    <>
      {/* SVG Definitions for gradients and filters */}
      <defs>
        <linearGradient id={`manus-gradient-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFA500" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
        <filter id={`manus-glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Glow background edge */}
      <path
        id={`${id}-glow`}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        stroke="rgba(255, 200, 50, 0.4)"
        strokeWidth={8}
        filter={`url(#manus-glow-${id})`}
      />

      {/* Main golden edge */}
      <path
        id={`${id}-path`}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        stroke={`url(#manus-gradient-${id})`}
        strokeWidth={3}
        markerEnd={markerEnd}
        style={{
          ...style,
          filter: "drop-shadow(0 0 4px rgba(255, 200, 50, 0.6))",
        }}
      />

      {/* Animated particles along the path */}
      <circle r="4" fill="#FFD700" filter={`url(#manus-glow-${id})`}>
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={edgePath}
        />
      </circle>
      <circle r="3" fill="#FFA500" filter={`url(#manus-glow-${id})`}>
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={edgePath}
          begin="0.5s"
        />
      </circle>
      <circle r="2" fill="#FFD700" filter={`url(#manus-glow-${id})`}>
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={edgePath}
          begin="1s"
        />
      </circle>

      {/* Label with brain icon */}
      {edgeData?.label && (
        <foreignObject
          width={120}
          height={30}
          x={labelX - 60}
          y={labelY - 15}
          className="pointer-events-none"
        >
          <div className="flex items-center justify-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 backdrop-blur-sm">
            <Brain className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-medium text-amber-200">{edgeData.label}</span>
          </div>
        </foreignObject>
      )}
    </>
  );
});

ManusLifecycleEdge.displayName = "ManusLifecycleEdge";

export const MANUS_LIFECYCLE_EDGE = "manusLifecycle";

export default ManusLifecycleEdge;
