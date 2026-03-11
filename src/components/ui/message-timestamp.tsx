import { useState } from "react";
import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "../../lib/utils.ts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip.tsx";

interface MessageTimestampProps {
  timestamp: Date;
  className?: string;
  /** Show relative time (e.g., "2 minutes ago") */
  showRelative?: boolean;
  /** Size variant */
  size?: "xs" | "sm" | "md";
}

/**
 * P1-01: MessageTimestamp 消息时间戳组件
 * - 悬停显示精确时间
 * - 相对时间显示（几分钟前）
 * - 支持分组日期显示
 */
export function MessageTimestamp({
  timestamp,
  className,
  showRelative = true,
  size = "xs",
}: MessageTimestampProps) {
  const [isHovering, setIsHovering] = useState(false);

  // Format for short display
  const getShortTime = () => {
    return format(timestamp, "HH:mm", { locale: zhCN });
  };

  // Format for relative time
  const getRelativeTime = () => {
    return formatDistanceToNow(timestamp, { addSuffix: true, locale: zhCN });
  };

  // Format for full precise time
  const getFullTime = () => {
    return format(timestamp, "yyyy年M月d日 HH:mm:ss", { locale: zhCN });
  };

  const sizeClasses = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "text-muted-foreground/70 cursor-default transition-colors hover:text-muted-foreground",
              sizeClasses[size],
              className
            )}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {showRelative ? getRelativeTime() : getShortTime()}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-popover/95 backdrop-blur-sm border-border text-popover-foreground text-xs px-3 py-1.5"
        >
          {getFullTime()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface DateDividerProps {
  date: Date;
  className?: string;
}

/**
 * DateDivider - 日期分组分隔线
 * 用于消息列表中按日期分组显示
 */
export function DateDivider({ date, className }: DateDividerProps) {
  const getDateLabel = () => {
    if (isToday(date)) {
      return "今天";
    }
    if (isYesterday(date)) {
      return "昨天";
    }
    if (isThisWeek(date)) {
      return format(date, "EEEE", { locale: zhCN }); // 星期几
    }
    return format(date, "M月d日", { locale: zhCN });
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center py-4",
        className
      )}
    >
      <div className="flex items-center gap-3 w-full max-w-xs">
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-[11px] text-muted-foreground/60 font-medium px-2">
          {getDateLabel()}
        </span>
        <div className="flex-1 h-px bg-border/50" />
      </div>
    </div>
  );
}

/**
 * Helper function to check if two dates are on different days
 */
export function shouldShowDateDivider(
  currentDate: Date,
  previousDate: Date | null
): boolean {
  if (!previousDate) return true;
  
  return (
    format(currentDate, "yyyy-MM-dd") !== format(previousDate, "yyyy-MM-dd")
  );
}

export default MessageTimestamp;
