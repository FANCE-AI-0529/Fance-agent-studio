import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Cloud, CloudOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSavedAt?: Date;
  className?: string;
}

const statusConfig: Record<SaveStatus, { icon: React.ElementType; text: string; className: string }> = {
  idle: {
    icon: Cloud,
    text: "自动保存已启用",
    className: "text-muted-foreground",
  },
  saving: {
    icon: Loader2,
    text: "保存中...",
    className: "text-primary",
  },
  saved: {
    icon: Check,
    text: "已保存",
    className: "text-status-executing",
  },
  error: {
    icon: AlertCircle,
    text: "保存失败",
    className: "text-destructive",
  },
  offline: {
    icon: CloudOff,
    text: "离线模式",
    className: "text-muted-foreground",
  },
};

export function AutoSaveIndicator({ status, lastSavedAt, className }: AutoSaveIndicatorProps) {
  const [showSaved, setShowSaved] = useState(false);
  const config = statusConfig[status];
  const Icon = config.icon;

  // Show "saved" indicator briefly then fade
  useEffect(() => {
    if (status === "saved") {
      setShowSaved(true);
      const timer = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, lastSavedAt]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("zh-CN", { 
      hour: "2-digit", 
      minute: "2-digit" 
    });
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 5 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md",
          status === "saving" && "bg-primary/10",
          status === "saved" && showSaved && "bg-status-executing/10",
          status === "error" && "bg-destructive/10",
          className
        )}
      >
        <Icon 
          className={cn(
            "h-3.5 w-3.5",
            config.className,
            status === "saving" && "animate-spin"
          )} 
        />
        <span className={cn("font-medium", config.className)}>
          {config.text}
          {status === "saved" && lastSavedAt && !showSaved && (
            <span className="text-muted-foreground font-normal ml-1">
              {formatTime(lastSavedAt)}
            </span>
          )}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}

// Hook for managing auto-save state
export function useAutoSave(
  saveFunction: () => Promise<void>,
  deps: unknown[],
  debounceMs: number = 2000
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Debounced auto-save
  useEffect(() => {
    if (!isOnline) return;
    
    const timer = setTimeout(async () => {
      try {
        setStatus("saving");
        await saveFunction();
        setStatus("saved");
        setLastSavedAt(new Date());
      } catch {
        setStatus("error");
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [...deps, isOnline]);

  const manualSave = async () => {
    if (!isOnline) {
      setStatus("offline");
      return;
    }
    
    try {
      setStatus("saving");
      await saveFunction();
      setStatus("saved");
      setLastSavedAt(new Date());
    } catch {
      setStatus("error");
    }
  };

  return { status, lastSavedAt, manualSave, isOnline };
}
