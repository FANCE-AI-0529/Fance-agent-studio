import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, RefreshCw, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useRemoteSyncEvents } from '@/hooks/useAgentSync';
import type { SyncEvent } from '@/stores/globalAgentStore';
import { cn } from '@/lib/utils';

interface RemoteChangeAnimationProps {
  onScrollToNode?: (nodeId: string) => void;
}

interface FloatingNotification {
  id: string;
  event: SyncEvent;
}

export function RemoteChangeAnimation({ onScrollToNode }: RemoteChangeAnimationProps) {
  const [notifications, setNotifications] = useState<FloatingNotification[]>([]);

  // Listen for remote events
  useRemoteSyncEvents((event) => {
    if (event.source !== 'remote') return;

    // Show toast notification
    const eventLabel = getEventLabel(event);
    const nodeId = event.data?.node_id || event.data?.nodeId;

    toast(eventLabel.title, {
      description: eventLabel.description,
      icon: eventLabel.icon,
      action: nodeId && onScrollToNode ? {
        label: '查看',
        onClick: () => onScrollToNode(nodeId),
      } : undefined,
      duration: 3000,
    });

    // Add floating notification
    const notificationId = `${event.type}-${Date.now()}`;
    setNotifications((prev) => [...prev, { id: notificationId, event }]);

    // Remove after animation
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    }, 2000);
  });

  return (
    <>
      {/* Floating notifications overlay */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {notifications.map(({ id, event }) => (
            <FloatingEventBadge key={id} event={event} />
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}

function FloatingEventBadge({ event }: { event: SyncEvent }) {
  const { icon, color, bgColor } = getEventStyle(event);
  const Icon = icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.8 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg pointer-events-auto',
        bgColor
      )}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
      >
        <Icon className={cn('h-4 w-4', color)} />
      </motion.div>
      <span className="text-sm font-medium text-foreground">
        {getEventShortLabel(event)}
      </span>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 'auto' }}
        className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden"
      >
        来自 Consumer
      </motion.div>
    </motion.div>
  );
}

// ============= Helpers =============

function getEventLabel(event: SyncEvent) {
  switch (event.type) {
    case 'node_added':
      return {
        title: '画布已更新',
        description: `远程添加了「${event.data?.data?.name || '新节点'}」`,
        icon: <Plus className="h-4 w-4 text-green-500" />,
      };
    case 'node_updated':
      return {
        title: '节点已更新',
        description: `远程修改了节点属性`,
        icon: <RefreshCw className="h-4 w-4 text-blue-500" />,
      };
    case 'node_removed':
      return {
        title: '节点已删除',
        description: `远程删除了一个节点`,
        icon: <Minus className="h-4 w-4 text-red-500" />,
      };
    case 'edge_added':
      return {
        title: '连接已添加',
        description: `远程添加了新的连接`,
        icon: <ArrowRight className="h-4 w-4 text-green-500" />,
      };
    case 'edge_removed':
      return {
        title: '连接已删除',
        description: `远程删除了一个连接`,
        icon: <Minus className="h-4 w-4 text-red-500" />,
      };
    case 'agent_updated':
      return {
        title: 'Agent 已更新',
        description: `远程修改了 Agent 配置`,
        icon: <RefreshCw className="h-4 w-4 text-purple-500" />,
      };
    default:
      return {
        title: '远程变更',
        description: '画布已同步更新',
        icon: <RefreshCw className="h-4 w-4" />,
      };
  }
}

function getEventShortLabel(event: SyncEvent): string {
  switch (event.type) {
    case 'node_added':
      return `+${event.data?.data?.name || '节点'}`;
    case 'node_updated':
      return '节点更新';
    case 'node_removed':
      return '节点删除';
    case 'edge_added':
      return '+连接';
    case 'edge_removed':
      return '-连接';
    case 'agent_updated':
      return 'Agent更新';
    default:
      return '同步';
  }
}

function getEventStyle(event: SyncEvent) {
  switch (event.type) {
    case 'node_added':
    case 'edge_added':
      return {
        icon: Plus,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10 border border-green-500/20',
      };
    case 'node_removed':
    case 'edge_removed':
      return {
        icon: Minus,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10 border border-red-500/20',
      };
    case 'node_updated':
    case 'edge_updated':
    case 'agent_updated':
      return {
        icon: RefreshCw,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10 border border-blue-500/20',
      };
    default:
      return {
        icon: RefreshCw,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
      };
  }
}

/**
 * Hook to get animation styles for a specific node
 * Use this to highlight nodes that were just added/updated remotely
 */
export function useNodeHighlight(nodeId: string) {
  const [isHighlighted, setIsHighlighted] = useState(false);

  useRemoteSyncEvents((event) => {
    if (event.source !== 'remote') return;
    
    const eventNodeId = event.data?.node_id || event.data?.nodeId;
    if (eventNodeId === nodeId) {
      setIsHighlighted(true);
      setTimeout(() => setIsHighlighted(false), 2000);
    }
  });

  return {
    isHighlighted,
    highlightStyle: isHighlighted ? {
      boxShadow: '0 0 20px 5px rgba(var(--primary), 0.3)',
      transition: 'box-shadow 0.3s ease-out',
    } : {},
  };
}
