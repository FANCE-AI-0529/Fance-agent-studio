import { motion, AnimatePresence } from "framer-motion";
import { 
  Radio, 
  Loader2, 
  WifiOff, 
  Plus, 
  Minus, 
  RefreshCw, 
  Link, 
  Unlink, 
  Settings, 
  Circle 
} from "lucide-react";
import { useGlobalAgentStore, SyncEvent } from "@/stores/globalAgentStore";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface ConsumerSyncBadgeProps {
  className?: string;
}

// Helper: Get icon for sync event type
function SyncEventIcon({ type }: { type: SyncEvent['type'] }) {
  switch (type) {
    case 'node_added': 
      return <Plus className="h-3 w-3 text-emerald-500" />;
    case 'node_removed': 
      return <Minus className="h-3 w-3 text-destructive" />;
    case 'node_updated': 
      return <RefreshCw className="h-3 w-3 text-primary" />;
    case 'edge_added': 
      return <Link className="h-3 w-3 text-emerald-500" />;
    case 'edge_removed': 
      return <Unlink className="h-3 w-3 text-destructive" />;
    case 'agent_updated': 
      return <Settings className="h-3 w-3 text-purple-500" />;
    default: 
      return <Circle className="h-3 w-3 text-muted-foreground" />;
  }
}

// Helper: Get label for sync event
function getSyncEventLabel(event: SyncEvent): string {
  const source = event.source === 'remote' ? '(远程)' : '';
  switch (event.type) {
    case 'node_added': 
      return `添加节点 ${event.data?.skillName || ''} ${source}`.trim();
    case 'node_removed': 
      return `移除节点 ${event.data?.skillName || ''} ${source}`.trim();
    case 'node_updated': 
      return `更新节点 ${source}`.trim();
    case 'edge_added': 
      return `添加连接 ${source}`.trim();
    case 'edge_removed': 
      return `移除连接 ${source}`.trim();
    case 'agent_updated': 
      return `Agent 配置更新 ${source}`.trim();
    default: 
      return `同步事件 ${source}`.trim();
  }
}

export function ConsumerSyncBadge({ className }: ConsumerSyncBadgeProps) {
  // Precise selectors to avoid re-render loops
  const isSubscribed = useGlobalAgentStore((s) => s.isSubscribed);
  const isSyncing = useGlobalAgentStore((s) => s.isSyncing);
  const agentId = useGlobalAgentStore((s) => s.agentId);
  const agentConfig = useGlobalAgentStore((s) => s.agentConfig);
  const lastSyncedAt = useGlobalAgentStore((s) => s.lastSyncedAt);
  const recentEvents = useGlobalAgentStore((s) => s.recentEvents);
  const subscribe = useGlobalAgentStore((s) => s.subscribe);
  const unsubscribe = useGlobalAgentStore((s) => s.unsubscribe);
  
  // Don't show if no agent is loaded
  if (!agentId) return null;

  const handleToggleSync = () => {
    if (isSubscribed) {
      unsubscribe();
    } else {
      subscribe();
    }
  };

  const getStatus = () => {
    if (!isSubscribed) {
      return {
        icon: WifiOff,
        label: "Studio Live Sync: Off",
        color: "text-muted-foreground",
        dotColor: "bg-muted-foreground",
        pulse: false,
      };
    }
    
    if (isSyncing) {
      return {
        icon: Loader2,
        label: "同步中...",
        color: "text-primary",
        dotColor: "bg-primary",
        pulse: true,
      };
    }
    
    return {
      icon: Radio,
      label: "Studio Live Sync: On",
      color: "text-emerald-500",
      dotColor: "bg-emerald-500",
      pulse: false,
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  // Get last 5 events, reversed (newest first)
  const displayEvents = [...recentEvents].slice(-5).reverse();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full",
            "bg-background/50 backdrop-blur-sm border border-border/50",
            "text-xs font-medium cursor-pointer select-none",
            "hover:bg-background/80 hover:border-border transition-colors",
            status.color,
            className
          )}
        >
          {/* Animated dot */}
          <div className="relative">
            <div className={cn(
              "w-2 h-2 rounded-full",
              status.dotColor
            )} />
            
            {/* Pulse animation when syncing */}
            <AnimatePresence>
              {status.pulse && (
                <motion.div
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2, opacity: 0 }}
                  exit={{ scale: 1, opacity: 0 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className={cn(
                    "absolute inset-0 w-2 h-2 rounded-full",
                    status.dotColor
                  )}
                />
              )}
            </AnimatePresence>
          </div>
          
          {/* Icon */}
          <Icon className={cn(
            "h-3 w-3",
            isSyncing && "animate-spin"
          )} />
          
          {/* Label - hidden on small screens */}
          <span className="hidden sm:inline whitespace-nowrap">
            {status.label}
          </span>
        </motion.div>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-sm">Studio Live Sync</h4>
          <Badge variant={isSubscribed ? 'default' : 'secondary'} className="text-xs">
            {isSubscribed ? '已连接' : '已断开'}
          </Badge>
        </div>

        {/* Agent Info */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">当前 Agent</span>
            <span className="font-medium truncate max-w-[140px]">
              {agentConfig?.name || '未知'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">最后同步</span>
            <span className="text-foreground">
              {lastSyncedAt 
                ? formatDistanceToNow(new Date(lastSyncedAt), { locale: zhCN, addSuffix: true }) 
                : '从未'}
            </span>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Recent Events */}
        <div className="mb-4">
          <h5 className="text-xs font-medium text-muted-foreground mb-2">
            最近同步事件
          </h5>
          <ScrollArea className="h-28">
            <AnimatePresence mode="popLayout">
              {displayEvents.length > 0 ? (
                displayEvents.map((event, i) => (
                  <motion.div
                    key={`${event.type}-${event.timestamp.getTime()}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2 py-1.5 text-xs"
                  >
                    <SyncEventIcon type={event.type} />
                    <span className="flex-1 truncate">{getSyncEventLabel(event)}</span>
                    <span className="text-muted-foreground text-[10px] whitespace-nowrap">
                      {formatDistanceToNow(event.timestamp, { locale: zhCN, addSuffix: true })}
                    </span>
                  </motion.div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  暂无同步事件
                </p>
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>

        {/* Action Button */}
        <Button
          variant={isSubscribed ? 'outline' : 'default'}
          size="sm"
          className="w-full"
          onClick={handleToggleSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <>
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              同步中...
            </>
          ) : isSubscribed ? (
            <>
              <WifiOff className="h-3 w-3 mr-2" />
              断开连接
            </>
          ) : (
            <>
              <Radio className="h-3 w-3 mr-2" />
              连接 Live Sync
            </>
          )}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
