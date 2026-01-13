import React, { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Maximize2, Minimize2, X, Building2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAgentSync } from '@/hooks/useAgentSync';
import { useMiniPreviewHighlight } from '@/hooks/useMiniPreviewHighlight';
import { useAppModeStore } from '@/stores/appModeStore';
import { miniNodeTypes } from './MiniNodes';
import { flowingEdgeTypes } from './FlowingEdge';

interface MiniStudioPreviewProps {
  agentId: string | null;
  latestAgentMessage?: string | null;
  className?: string;
  defaultExpanded?: boolean;
}

export const MiniStudioPreview = React.memo(({
  agentId,
  latestAgentMessage,
  className,
  defaultExpanded = false,
}: MiniStudioPreviewProps) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isHovered, setIsHovered] = useState(false);

  // Get agent sync data
  const { nodes: syncedNodes, edges: syncedEdges, isSyncing } = useAgentSync(agentId);

  // Get highlight state based on agent messages
  const { isNodeHighlighted, highlightState } = useMiniPreviewHighlight(latestAgentMessage || null);

  // Get app mode store for transition
  const { ejectToStudio, startTransition } = useAppModeStore();

  // Transform synced nodes to add highlight state
  const displayNodes: Node[] = useMemo(() => {
    return syncedNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isActive: isNodeHighlighted(node.type || 'default'),
      },
    }));
  }, [syncedNodes, isNodeHighlighted]);

  // Transform edges to add active state
  const displayEdges: Edge[] = useMemo(() => {
    const activeNodeIds = new Set(
      displayNodes
        .filter(n => n.data?.isActive)
        .map(n => n.id)
    );

    return syncedEdges.map(edge => ({
      ...edge,
      type: 'flowing',
      data: {
        ...edge.data,
        isActive: activeNodeIds.has(edge.source) || activeNodeIds.has(edge.target),
        flowSpeed: highlightState.isActive ? 'fast' : 'normal',
      },
    }));
  }, [syncedEdges, displayNodes, highlightState.isActive]);

  // Handle expand to full Studio
  const handleExpandToStudio = useCallback(() => {
    if (!agentId) return;

    // Start transition animation
    startTransition('to-studio');

    // Set eject context
    ejectToStudio({
      agentId,
      targetPage: 'builder',
    });

    // Navigate to Builder after animation
    setTimeout(() => {
      navigate(`/builder/${agentId}`);
    }, 600);
  }, [agentId, startTransition, ejectToStudio, navigate]);

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Don't render if no agent or no nodes
  if (!agentId || syncedNodes.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 20 }}
        className={cn(
          "fixed z-50 transition-all duration-300",
          isExpanded
            ? "bottom-4 right-4 w-80 h-64"
            : "bottom-4 right-4 w-12 h-12",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Collapsed state - icon button */}
        {!isExpanded && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleExpanded}
            className={cn(
              "w-12 h-12 rounded-full",
              "bg-gradient-to-br from-primary/20 to-primary/40",
              "border border-primary/30 backdrop-blur-md",
              "flex items-center justify-center",
              "shadow-lg shadow-primary/20",
              "transition-all duration-300",
              isSyncing && "animate-pulse",
              highlightState.isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
          >
            <Building2 className="w-5 h-5 text-primary" />
            {highlightState.isActive && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
              >
                <Zap className="w-2 h-2 text-white m-0.5" />
              </motion.div>
            )}
          </motion.button>
        )}

        {/* Expanded state - mini graph */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "w-full h-full rounded-xl overflow-hidden",
              "bg-background/95 backdrop-blur-md",
              "border border-border/50",
              "shadow-xl shadow-black/20",
              "flex flex-col"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-foreground">Agent 架构</span>
                {isSyncing && (
                  <span className="text-[10px] text-muted-foreground animate-pulse">同步中...</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleExpandToStudio}
                  title="在 Studio 中打开"
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={toggleExpanded}
                >
                  <Minimize2 className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* ReactFlow Canvas */}
            <div className="flex-1 relative">
              <ReactFlow
                nodes={displayNodes}
                edges={displayEdges}
                nodeTypes={miniNodeTypes}
                edgeTypes={flowingEdgeTypes}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                panOnDrag={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                proOptions={{ hideAttribution: true }}
                className="mini-studio-canvas"
              >
                <Background
                  color="hsl(var(--muted-foreground))"
                  gap={20}
                  size={1}
                  style={{ opacity: 0.1 }}
                />
              </ReactFlow>

              {/* Active indicator overlay */}
              {highlightState.isActive && highlightState.matchedKeyword && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-2 left-2 right-2"
                >
                  <div className="bg-primary/10 backdrop-blur-sm rounded-md px-2 py-1 border border-primary/20">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-primary animate-pulse" />
                      <span className="text-[10px] text-primary truncate">
                        {highlightState.matchedKeyword}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div
              className="px-3 py-1.5 border-t border-border/50 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={handleExpandToStudio}
            >
              <span className="text-[10px] text-muted-foreground">
                点击查看完整架构 →
              </span>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
});

MiniStudioPreview.displayName = 'MiniStudioPreview';
