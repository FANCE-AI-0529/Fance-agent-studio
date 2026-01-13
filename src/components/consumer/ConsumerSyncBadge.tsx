import { motion, AnimatePresence } from "framer-motion";
import { Radio, Loader2, WifiOff } from "lucide-react";
import { useGlobalAgentStore } from "@/stores/globalAgentStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ConsumerSyncBadgeProps {
  className?: string;
}

export function ConsumerSyncBadge({ className }: ConsumerSyncBadgeProps) {
  const { isSubscribed, isSyncing, agentId } = useGlobalAgentStore();
  
  // Don't show if no agent is loaded
  if (!agentId) return null;

  const getStatus = () => {
    if (!isSubscribed) {
      return {
        icon: WifiOff,
        label: "Studio Live Sync: Off",
        description: "离线模式",
        color: "text-muted-foreground",
        dotColor: "bg-muted-foreground",
        pulse: false,
      };
    }
    
    if (isSyncing) {
      return {
        icon: Loader2,
        label: "架构正在变更...",
        description: "正在同步到 Studio",
        color: "text-primary",
        dotColor: "bg-primary",
        pulse: true,
      };
    }
    
    return {
      icon: Radio,
      label: "Studio Live Sync: On",
      description: "实时同步已启用",
      color: "text-emerald-500",
      dotColor: "bg-emerald-500",
      pulse: false,
    };
  };

  const status = getStatus();
  const Icon = status.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full",
            "bg-background/50 backdrop-blur-sm border border-border/50",
            "text-xs font-medium cursor-default select-none",
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
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{status.description}</p>
      </TooltipContent>
    </Tooltip>
  );
}
