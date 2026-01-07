import React, { memo } from "react";
import {
  BaseEdge,
  getBezierPath,
  EdgeLabelRenderer,
} from "@xyflow/react";
import type { EdgeProps } from "@xyflow/react";
import { PortType, portColors } from "../ports/portTypes";

export interface AnimatedFlowEdgeData {
  portType?: PortType;
  animated?: boolean;
  flowDirection?: "forward" | "reverse";
  label?: string;
  [key: string]: unknown;
}

/**
 * Animated flow edge with colored particles based on port type
 */
const AnimatedFlowEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) => {
  const edgeData = data as AnimatedFlowEdgeData | undefined;
  const portType = edgeData?.portType || "data";
  const animated = edgeData?.animated !== false;
  const flowDirection = edgeData?.flowDirection || "forward";
  const color = portColors[portType];

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Generate unique IDs for SVG definitions
  const gradientId = `gradient-${id}`;
  const filterId = `glow-${id}`;

  return (
    <>
      {/* SVG Definitions */}
      <defs>
        {/* Gradient along edge */}
        <linearGradient id={gradientId} gradientUnits="userSpaceOnUse"
          x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}
        >
          <stop offset="0%" stopColor={color.primary} stopOpacity={0.6} />
          <stop offset="50%" stopColor={color.primary} stopOpacity={1} />
          <stop offset="100%" stopColor={color.primary} stopOpacity={0.6} />
        </linearGradient>

        {/* Glow filter */}
        <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Background edge (thicker, for hit area) */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />

      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: color.primary,
          strokeWidth: selected ? 3 : 2,
          filter: selected ? `url(#${filterId})` : undefined,
        }}
      />

      {/* Animated particles */}
      {animated && (
        <>
          {/* Primary flowing particle */}
          <circle r="4" fill={color.primary} filter={`url(#${filterId})`}>
            <animateMotion
              dur={portType === "control" ? "1s" : "1.5s"}
              repeatCount="indefinite"
              path={edgePath}
              keyPoints={flowDirection === "reverse" ? "1;0" : "0;1"}
              keyTimes="0;1"
            />
          </circle>

          {/* Secondary particle (offset) */}
          <circle r="3" fill={color.primary} opacity={0.6}>
            <animateMotion
              dur={portType === "control" ? "1s" : "1.5s"}
              repeatCount="indefinite"
              path={edgePath}
              keyPoints={flowDirection === "reverse" ? "1;0" : "0;1"}
              keyTimes="0;1"
              begin="0.5s"
            />
          </circle>

          {/* Control port pulse effect */}
          {portType === "control" && (
            <path
              d={edgePath}
              fill="none"
              stroke={color.primary}
              strokeWidth={2}
              opacity={0.5}
            >
              <animate
                attributeName="stroke-opacity"
                values="0.3;0.8;0.3"
                dur="1s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-width"
                values="2;4;2"
                dur="1s"
                repeatCount="indefinite"
              />
            </path>
          )}

          {/* Perception port wave effect */}
          {portType === "perception" && (
            <>
              <circle r="6" fill="none" stroke={color.primary} strokeWidth={1} opacity={0.4}>
                <animateMotion
                  dur="2s"
                  repeatCount="indefinite"
                  path={edgePath}
                  keyPoints="0;1"
                  keyTimes="0;1"
                />
                <animate
                  attributeName="r"
                  values="4;8;4"
                  dur="1s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.4;0.1;0.4"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            </>
          )}
        </>
      )}

      {/* Edge label */}
      {edgeData?.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="px-2 py-1 rounded text-xs bg-background border shadow-sm"
          >
            {edgeData.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

AnimatedFlowEdge.displayName = "AnimatedFlowEdge";

export default AnimatedFlowEdge;

/**
 * Edge type name for ReactFlow registration
 */
export const ANIMATED_FLOW_EDGE = "animatedFlow";
