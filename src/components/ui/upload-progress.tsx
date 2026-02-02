import { motion } from "framer-motion";
import { File, X, Check, AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type UploadStatus = "pending" | "uploading" | "processing" | "complete" | "error";

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
  statusText?: string;
  error?: string;
  estimatedTimeLeft?: number; // in seconds
}

interface UploadProgressProps {
  items: UploadItem[];
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
  className?: string;
}

const statusConfig: Record<UploadStatus, { icon: React.ElementType; className: string }> = {
  pending: { icon: File, className: "text-muted-foreground" },
  uploading: { icon: Loader2, className: "text-primary animate-spin" },
  processing: { icon: Loader2, className: "text-status-planning animate-spin" },
  complete: { icon: Check, className: "text-status-executing" },
  error: { icon: AlertCircle, className: "text-destructive" },
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatTimeLeft(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}秒`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}分${remainingSeconds}秒`;
}

function UploadProgressItem({ 
  item, 
  onCancel, 
  onRetry 
}: { 
  item: UploadItem; 
  onCancel?: (id: string) => void;
  onRetry?: (id: string) => void;
}) {
  const config = statusConfig[item.status];
  const Icon = config.icon;
  
  const getStatusText = () => {
    if (item.statusText) return item.statusText;
    switch (item.status) {
      case "pending": return "等待上传";
      case "uploading": return `上传中 ${item.progress}%`;
      case "processing": return "处理中";
      case "complete": return "完成";
      case "error": return item.error || "上传失败";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
    >
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
        item.status === "complete" && "bg-status-executing/10",
        item.status === "error" && "bg-destructive/10",
        item.status === "uploading" && "bg-primary/10",
        item.status === "processing" && "bg-status-planning/10",
        item.status === "pending" && "bg-muted"
      )}>
        <Icon className={cn("h-5 w-5", config.className)} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate pr-2">{item.name}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
            <span>{formatFileSize(item.size)}</span>
            {item.estimatedTimeLeft && item.status === "uploading" && (
              <span>· 剩余 {formatTimeLeft(item.estimatedTimeLeft)}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Progress 
            value={item.progress} 
            className={cn(
              "h-1.5 flex-1",
              item.status === "error" && "[&>div]:bg-destructive",
              item.status === "complete" && "[&>div]:bg-status-executing"
            )}
          />
          <span className={cn("text-xs font-medium min-w-[4rem] text-right", config.className)}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex-shrink-0">
        {(item.status === "pending" || item.status === "uploading") && onCancel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onCancel(item.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {item.status === "error" && onRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onRetry(item.id)}
          >
            重试
          </Button>
        )}
      </div>
    </motion.div>
  );
}

export function UploadProgress({ items, onCancel, onRetry, className }: UploadProgressProps) {
  if (items.length === 0) return null;

  const completedCount = items.filter(i => i.status === "complete").length;
  const totalCount = items.length;
  const hasErrors = items.some(i => i.status === "error");
  const isAllComplete = completedCount === totalCount;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Summary header */}
      {totalCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {isAllComplete ? (
              <span className="text-status-executing">全部上传完成</span>
            ) : hasErrors ? (
              <span className="text-destructive">部分上传失败</span>
            ) : (
              `上传进度: ${completedCount}/${totalCount}`
            )}
          </span>
          {!isAllComplete && (
            <Progress 
              value={(completedCount / totalCount) * 100} 
              className="w-24 h-1.5" 
            />
          )}
        </div>
      )}

      {/* Individual items */}
      <div className="space-y-2">
        {items.map((item) => (
          <UploadProgressItem
            key={item.id}
            item={item}
            onCancel={onCancel}
            onRetry={onRetry}
          />
        ))}
      </div>
    </div>
  );
}
