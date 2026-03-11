// =====================================================
// 图谱变更 Toast 组件
// Graph Change Toast - Consumer Page Notification
// =====================================================

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  Minus, 
  RefreshCw, 
  Link, 
  Settings, 
  ExternalLink,
  X,
} from "lucide-react";
import { Card, CardContent } from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { useGlobalAgentStore, SyncEvent } from "../../stores/globalAgentStore.ts";
import { cn } from "../../lib/utils.ts";

interface GraphChangeToastProps {
  className?: string;
}

interface ToastItem {
  id: string;
  event: SyncEvent;
  expiresAt: number;
}

export function GraphChangeToast({ className }: GraphChangeToastProps) {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const recentEvents = useGlobalAgentStore((s) => s.recentEvents);
  const agentId = useGlobalAgentStore((s) => s.agentId);

  // Process new events
  useEffect(() => {
    const latestEvents = recentEvents
      .filter(e => e.source === 'local')
      .filter(e => ['node_added', 'node_removed', 'node_updated', 'edge_added'].includes(e.type))
      .slice(-3);

    latestEvents.forEach(event => {
      const eventId = `${event.type}-${event.timestamp.getTime()}`;
      
      // Check if already shown
      setToasts(prev => {
        if (prev.some(t => t.id === eventId)) return prev;
        
        const newToast: ToastItem = {
          id: eventId,
          event,
          expiresAt: Date.now() + 4000,
        };

        return [...prev.slice(-2), newToast];
      });
    });
  }, [recentEvents]);

  // Auto-remove expired toasts
  useEffect(() => {
    const timer = setInterval(() => {
      setToasts(prev => prev.filter(t => t.expiresAt > Date.now()));
    }, 500);

    return () => clearInterval(timer);
  }, []);

  // Dismiss toast
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Navigate to builder
  const goToBuilder = useCallback(() => {
    if (agentId) {
      navigate(`/hive?tab=builder&agentId=${agentId}`);
    }
  }, [navigate, agentId]);

  // Get icon for event type
  const getEventIcon = (type: SyncEvent['type']) => {
    switch (type) {
      case 'node_added':
        return <Plus className="h-4 w-4 text-emerald-500" />;
      case 'node_removed':
        return <Minus className="h-4 w-4 text-destructive" />;
      case 'node_updated':
        return <RefreshCw className="h-4 w-4 text-primary" />;
      case 'edge_added':
        return <Link className="h-4 w-4 text-blue-500" />;
      default:
        return <Settings className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // Get description for event
  const getEventDescription = (event: SyncEvent): string => {
    const name = (event.data as any)?.data?.name || 
                 (event.data as any)?.name || 
                 '';
    
    switch (event.type) {
      case 'node_added':
        return `已添加「${name}」节点`;
      case 'node_removed':
        return `已移除「${name}」节点`;
      case 'node_updated':
        return `已更新「${name}」节点`;
      case 'edge_added':
        return '已添加新连接';
      default:
        return '架构已更新';
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-24 left-1/2 -translate-x-1/2 z-50",
      "flex flex-col gap-2",
      className
    )}>
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <Card className="bg-background/95 backdrop-blur-md shadow-lg border-primary/20">
              <CardContent className="flex items-center gap-3 py-3 px-4">
                {/* Icon */}
                <div className="p-2 rounded-full bg-primary/10">
                  {getEventIcon(toast.event.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getEventDescription(toast.event)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    在 Studio 中查看详情
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={goToBuilder}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => dismissToast(toast.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
