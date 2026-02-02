import { memo, useMemo } from 'react';
import { Node } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';

interface AlignmentGuidesProps {
  nodes: Node[];
  draggingNodeId: string | null;
  dragPosition: { x: number; y: number } | null;
  snapThreshold?: number;
  showGuides?: boolean;
}

interface GuideLines {
  vertical: { x: number; y1: number; y2: number; type: 'center' | 'left' | 'right' }[];
  horizontal: { y: number; x1: number; x2: number; type: 'center' | 'top' | 'bottom' }[];
}

interface SnapResult {
  x: number | null;
  y: number | null;
  guides: GuideLines;
}

const GUIDE_COLORS = {
  center: 'hsl(var(--primary))',
  edge: 'hsl(var(--primary) / 0.6)',
};

export const AlignmentGuides = memo(({
  nodes,
  draggingNodeId,
  dragPosition,
  snapThreshold = 8,
  showGuides = true,
}: AlignmentGuidesProps) => {
  const draggingNode = nodes.find(n => n.id === draggingNodeId);

  const { guides, snapPosition } = useMemo((): { guides: GuideLines; snapPosition: SnapResult } => {
    if (!draggingNode || !dragPosition || !showGuides) {
      return {
        guides: { vertical: [], horizontal: [] },
        snapPosition: { x: null, y: null, guides: { vertical: [], horizontal: [] } },
      };
    }

    const nodeWidth = draggingNode.width || 200;
    const nodeHeight = draggingNode.height || 100;
    const nodeCenter = {
      x: dragPosition.x + nodeWidth / 2,
      y: dragPosition.y + nodeHeight / 2,
    };
    const nodeEdges = {
      left: dragPosition.x,
      right: dragPosition.x + nodeWidth,
      top: dragPosition.y,
      bottom: dragPosition.y + nodeHeight,
    };

    const otherNodes = nodes.filter(n => n.id !== draggingNodeId);
    const verticalGuides: GuideLines['vertical'] = [];
    const horizontalGuides: GuideLines['horizontal'] = [];
    let snapX: number | null = null;
    let snapY: number | null = null;

    for (const node of otherNodes) {
      const otherWidth = node.width || 200;
      const otherHeight = node.height || 100;
      const otherCenter = {
        x: node.position.x + otherWidth / 2,
        y: node.position.y + otherHeight / 2,
      };
      const otherEdges = {
        left: node.position.x,
        right: node.position.x + otherWidth,
        top: node.position.y,
        bottom: node.position.y + otherHeight,
      };

      // Vertical alignment (X-axis)
      // Center to center
      if (Math.abs(nodeCenter.x - otherCenter.x) < snapThreshold) {
        snapX = otherCenter.x - nodeWidth / 2;
        const minY = Math.min(nodeEdges.top, otherEdges.top);
        const maxY = Math.max(nodeEdges.bottom, otherEdges.bottom);
        verticalGuides.push({
          x: otherCenter.x,
          y1: minY,
          y2: maxY,
          type: 'center',
        });
      }
      // Left to left
      if (Math.abs(nodeEdges.left - otherEdges.left) < snapThreshold) {
        snapX = otherEdges.left;
        const minY = Math.min(nodeEdges.top, otherEdges.top);
        const maxY = Math.max(nodeEdges.bottom, otherEdges.bottom);
        verticalGuides.push({
          x: otherEdges.left,
          y1: minY,
          y2: maxY,
          type: 'left',
        });
      }
      // Right to right
      if (Math.abs(nodeEdges.right - otherEdges.right) < snapThreshold) {
        snapX = otherEdges.right - nodeWidth;
        const minY = Math.min(nodeEdges.top, otherEdges.top);
        const maxY = Math.max(nodeEdges.bottom, otherEdges.bottom);
        verticalGuides.push({
          x: otherEdges.right,
          y1: minY,
          y2: maxY,
          type: 'right',
        });
      }

      // Horizontal alignment (Y-axis)
      // Center to center
      if (Math.abs(nodeCenter.y - otherCenter.y) < snapThreshold) {
        snapY = otherCenter.y - nodeHeight / 2;
        const minX = Math.min(nodeEdges.left, otherEdges.left);
        const maxX = Math.max(nodeEdges.right, otherEdges.right);
        horizontalGuides.push({
          y: otherCenter.y,
          x1: minX,
          x2: maxX,
          type: 'center',
        });
      }
      // Top to top
      if (Math.abs(nodeEdges.top - otherEdges.top) < snapThreshold) {
        snapY = otherEdges.top;
        const minX = Math.min(nodeEdges.left, otherEdges.left);
        const maxX = Math.max(nodeEdges.right, otherEdges.right);
        horizontalGuides.push({
          y: otherEdges.top,
          x1: minX,
          x2: maxX,
          type: 'top',
        });
      }
      // Bottom to bottom
      if (Math.abs(nodeEdges.bottom - otherEdges.bottom) < snapThreshold) {
        snapY = otherEdges.bottom - nodeHeight;
        const minX = Math.min(nodeEdges.left, otherEdges.left);
        const maxX = Math.max(nodeEdges.right, otherEdges.right);
        horizontalGuides.push({
          y: otherEdges.bottom,
          x1: minX,
          x2: maxX,
          type: 'bottom',
        });
      }
    }

    return {
      guides: { vertical: verticalGuides, horizontal: horizontalGuides },
      snapPosition: {
        x: snapX,
        y: snapY,
        guides: { vertical: verticalGuides, horizontal: horizontalGuides },
      },
    };
  }, [draggingNode, dragPosition, nodes, draggingNodeId, snapThreshold, showGuides]);

  if (!showGuides || !draggingNodeId || guides.vertical.length === 0 && guides.horizontal.length === 0) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 1000 }}
    >
      <defs>
        <pattern
          id="guide-pattern"
          patternUnits="userSpaceOnUse"
          width="6"
          height="6"
        >
          <circle cx="3" cy="3" r="1" fill="hsl(var(--primary))" opacity="0.5" />
        </pattern>
      </defs>

      <AnimatePresence>
        {/* Vertical guides */}
        {guides.vertical.map((guide, index) => (
          <motion.g
            key={`v-${index}-${guide.x}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <line
              x1={guide.x}
              y1={guide.y1 - 20}
              x2={guide.x}
              y2={guide.y2 + 20}
              stroke={guide.type === 'center' ? GUIDE_COLORS.center : GUIDE_COLORS.edge}
              strokeWidth={1}
              strokeDasharray={guide.type === 'center' ? '0' : '4,4'}
            />
            {/* Snap indicator circle */}
            <circle
              cx={guide.x}
              cy={(guide.y1 + guide.y2) / 2}
              r={4}
              fill={GUIDE_COLORS.center}
              opacity={0.8}
            />
          </motion.g>
        ))}

        {/* Horizontal guides */}
        {guides.horizontal.map((guide, index) => (
          <motion.g
            key={`h-${index}-${guide.y}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <line
              x1={guide.x1 - 20}
              y1={guide.y}
              x2={guide.x2 + 20}
              y2={guide.y}
              stroke={guide.type === 'center' ? GUIDE_COLORS.center : GUIDE_COLORS.edge}
              strokeWidth={1}
              strokeDasharray={guide.type === 'center' ? '0' : '4,4'}
            />
            {/* Snap indicator circle */}
            <circle
              cx={(guide.x1 + guide.x2) / 2}
              cy={guide.y}
              r={4}
              fill={GUIDE_COLORS.center}
              opacity={0.8}
            />
          </motion.g>
        ))}
      </AnimatePresence>
    </svg>
  );
});

AlignmentGuides.displayName = 'AlignmentGuides';

// Hook for using alignment guides with snapping
export function useAlignmentSnap(
  nodes: Node[],
  snapThreshold: number = 8
) {
  const calculateSnapPosition = (
    draggingNodeId: string,
    currentPosition: { x: number; y: number }
  ): { x: number; y: number } => {
    const draggingNode = nodes.find(n => n.id === draggingNodeId);
    if (!draggingNode) return currentPosition;

    const nodeWidth = draggingNode.width || 200;
    const nodeHeight = draggingNode.height || 100;
    const nodeCenter = {
      x: currentPosition.x + nodeWidth / 2,
      y: currentPosition.y + nodeHeight / 2,
    };

    let snapX = currentPosition.x;
    let snapY = currentPosition.y;
    const otherNodes = nodes.filter(n => n.id !== draggingNodeId);

    for (const node of otherNodes) {
      const otherWidth = node.width || 200;
      const otherHeight = node.height || 100;
      const otherCenter = {
        x: node.position.x + otherWidth / 2,
        y: node.position.y + otherHeight / 2,
      };

      // Snap to center X
      if (Math.abs(nodeCenter.x - otherCenter.x) < snapThreshold) {
        snapX = otherCenter.x - nodeWidth / 2;
      }
      // Snap to left edge
      if (Math.abs(currentPosition.x - node.position.x) < snapThreshold) {
        snapX = node.position.x;
      }

      // Snap to center Y
      if (Math.abs(nodeCenter.y - otherCenter.y) < snapThreshold) {
        snapY = otherCenter.y - nodeHeight / 2;
      }
      // Snap to top edge
      if (Math.abs(currentPosition.y - node.position.y) < snapThreshold) {
        snapY = node.position.y;
      }
    }

    return { x: snapX, y: snapY };
  };

  return { calculateSnapPosition };
}

export default AlignmentGuides;
