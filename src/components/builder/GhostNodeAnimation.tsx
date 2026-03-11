import { useEffect, useRef, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReactFlow, Node } from "@xyflow/react";
import { useRemoteSyncEvents } from "../../hooks/useAgentSync.ts";
import type { SyncEvent } from "../../stores/globalAgentStore.ts";
import { cn } from "../../lib/utils.ts";
import { Plus, Trash2, Move, Settings, Link as LinkIcon } from "lucide-react";

interface GhostNodeAnimationProps {
  onAnimationStart?: (nodeId: string) => void;
  onAnimationComplete?: (nodeId: string) => void;
}

interface GhostNode {
  id: string;
  position: { x: number; y: number };
  type: string;
  label: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}

interface GhostEdge {
  id: string;
  sourceId: string;
  targetId: string;
  sourcePos: { x: number; y: number };
  targetPos: { x: number; y: number };
}

export function GhostNodeAnimation({
  onAnimationStart,
  onAnimationComplete,
}: GhostNodeAnimationProps) {
  const [ghostNodes, setGhostNodes] = useState<GhostNode[]>([]);
  const [ghostEdges, setGhostEdges] = useState<GhostEdge[]>([]);
  const { setCenter, getZoom, getNodes } = useReactFlow();
  const animatingRef = useRef<Set<string>>(new Set());

  // Handle incoming remote events
  const handleRemoteEvent = useCallback((event: SyncEvent) => {
    if (event.source === 'local') return; // Ignore local changes
    
    const payload = event.data as any;
    if (!payload) return;

    // Handle edge events
    if (event.type === 'edge_added') {
      const sourceNode = getNodes().find(n => n.id === payload.source_node);
      const targetNode = getNodes().find(n => n.id === payload.target_node);
      
      if (sourceNode && targetNode) {
        const ghostEdge: GhostEdge = {
          id: `ghost-edge-${Date.now()}`,
          sourceId: payload.source_node,
          targetId: payload.target_node,
          sourcePos: sourceNode.position,
          targetPos: targetNode.position,
        };

        setGhostEdges(prev => [...prev, ghostEdge]);

        // Remove after animation
        setTimeout(() => {
          setGhostEdges(prev => prev.filter(e => e.id !== ghostEdge.id));
        }, 1500);
      }
      return;
    }
    
    // Only handle node changes
    if (!event.type.includes('node')) return;

    const nodeId = payload.node_id || payload.id || 'unknown';
    const nodeType = payload.node_type || 'skill';
    const posX = Number(payload.position_x) || 400;
    const posY = Number(payload.position_y) || 300;
    const label = (payload.data as any)?.name || payload.name || nodeType;

    // Map event type
    let eventType: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT';
    if (event.type === 'node_updated') eventType = 'UPDATE';
    if (event.type === 'node_removed') eventType = 'DELETE';

    // Create ghost node for animation
    const ghostNode: GhostNode = {
      id: `ghost-${nodeId}-${Date.now()}`,
      position: { x: posX, y: posY },
      type: nodeType,
      label,
      eventType,
    };

    setGhostNodes(prev => [...prev, ghostNode]);
    animatingRef.current.add(ghostNode.id);
    onAnimationStart?.(nodeId);

    // Pan to the node location
    const zoom = getZoom();
    setCenter(posX, posY, { duration: 300, zoom: Math.max(zoom, 0.8) });

    // Remove ghost node after animation
    setTimeout(() => {
      setGhostNodes(prev => prev.filter(n => n.id !== ghostNode.id));
      animatingRef.current.delete(ghostNode.id);
      onAnimationComplete?.(nodeId);
    }, 1500);
  }, [setCenter, getZoom, getNodes, onAnimationStart, onAnimationComplete]);

  // Subscribe to remote sync events
  useRemoteSyncEvents(handleRemoteEvent);

  return (
    <>
      {/* Ghost Nodes */}
      <AnimatePresence>
        {ghostNodes.map((ghost) => (
          <GhostNodeOverlay key={ghost.id} ghost={ghost} />
        ))}
      </AnimatePresence>

      {/* Ghost Edges - Growing Line Animation */}
      <AnimatePresence>
        {ghostEdges.map((edge) => (
          <GhostEdgeOverlay key={edge.id} edge={edge} />
        ))}
      </AnimatePresence>
    </>
  );
}

interface GhostNodeOverlayProps {
  ghost: GhostNode;
}

function GhostNodeOverlay({ ghost }: GhostNodeOverlayProps) {
  const getEventIcon = () => {
    switch (ghost.eventType) {
      case 'INSERT':
        return <Plus className="h-4 w-4" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4" />;
      case 'UPDATE':
        return <Settings className="h-4 w-4" />;
      default:
        return <Move className="h-4 w-4" />;
    }
  };

  const getEventColor = () => {
    switch (ghost.eventType) {
      case 'INSERT':
        return 'from-primary/20 to-primary/5 border-primary/50';
      case 'DELETE':
        return 'from-destructive/20 to-destructive/5 border-destructive/50';
      case 'UPDATE':
        return 'from-amber-500/20 to-amber-500/5 border-amber-500/50';
      default:
        return 'from-muted/20 to-muted/5 border-muted/50';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ 
        opacity: [0, 0.8, 0.8, 0],
        scale: [0.5, 1.1, 1, 0.9],
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        duration: 1.5,
        times: [0, 0.2, 0.8, 1],
        ease: "easeOut",
      }}
      className="pointer-events-none fixed z-50"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Ghost node visual */}
      <div className={cn(
        "relative flex items-center gap-2 px-4 py-3 rounded-xl",
        "bg-gradient-to-br backdrop-blur-md border-2 border-dashed",
        "shadow-lg shadow-primary/20",
        getEventColor()
      )}>
        {/* Glow effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.5, times: [0, 0.3, 1] }}
          className="absolute inset-0 rounded-xl bg-primary/30 blur-xl"
        />
        
        {/* Content */}
        <div className="relative flex items-center gap-2">
          <div className={cn(
            "p-1.5 rounded-lg",
            ghost.eventType === 'INSERT' && "bg-primary/20 text-primary",
            ghost.eventType === 'DELETE' && "bg-destructive/20 text-destructive",
            ghost.eventType === 'UPDATE' && "bg-amber-500/20 text-amber-500"
          )}>
            {getEventIcon()}
          </div>
          
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">
              {ghost.eventType === 'INSERT' && '添加节点'}
              {ghost.eventType === 'DELETE' && '删除节点'}
              {ghost.eventType === 'UPDATE' && '更新节点'}
            </span>
            <span className="text-xs text-muted-foreground">
              {ghost.label} ({ghost.type})
            </span>
          </div>
        </div>

        {/* Ripple effect */}
        <motion.div
          initial={{ scale: 1, opacity: 0.5 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="absolute inset-0 rounded-xl border-2 border-primary"
        />
      </div>
    </motion.div>
  );
}

interface GhostEdgeOverlayProps {
  edge: GhostEdge;
}

function GhostEdgeOverlay({ edge }: GhostEdgeOverlayProps) {
  // Calculate edge path
  const dx = edge.targetPos.x - edge.sourcePos.x;
  const dy = edge.targetPos.y - edge.sourcePos.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pointer-events-none fixed z-40"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Edge growing indicator */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 backdrop-blur-sm border border-blue-500/30">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 15 }}
        >
          <LinkIcon className="h-4 w-4 text-blue-500" />
        </motion.div>
        <span className="text-xs font-medium text-blue-500">
          连接建立中...
        </span>
        <motion.div
          className="w-12 h-1 bg-blue-500/20 rounded-full overflow-hidden"
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full bg-blue-500 rounded-full"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

/**
 * Hook to trigger ghost node animations programmatically
 */
export function useGhostNodeTrigger() {
  const { setCenter, getZoom } = useReactFlow();

  const triggerGhostAnimation = useCallback((
    node: Node,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE' = 'INSERT'
  ) => {
    // Pan to node
    const zoom = getZoom();
    setCenter(node.position.x, node.position.y, { 
      duration: 300, 
      zoom: Math.max(zoom, 0.8) 
    });
  }, [setCenter, getZoom]);

  return { triggerGhostAnimation };
}
