import { Loader2, Check, CheckCheck, AlertCircle } from "lucide-react";
import { cn } from "../../lib/utils.ts";

export type MessageStatus = "sending" | "sent" | "delivered" | "error";

interface MessageStatusProps {
  status: MessageStatus;
  className?: string;
  showText?: boolean;
}

const statusConfig: Record<MessageStatus, { icon: React.ElementType; text: string; className: string }> = {
  sending: {
    icon: Loader2,
    text: "发送中",
    className: "text-muted-foreground animate-spin",
  },
  sent: {
    icon: Check,
    text: "已发送",
    className: "text-muted-foreground",
  },
  delivered: {
    icon: CheckCheck,
    text: "已送达",
    className: "text-primary",
  },
  error: {
    icon: AlertCircle,
    text: "发送失败",
    className: "text-destructive",
  },
};

export function MessageStatusIndicator({ status, className, showText = false }: MessageStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Icon className={cn("h-3 w-3", config.className)} />
      {showText && (
        <span className={cn("text-[10px]", config.className)}>{config.text}</span>
      )}
    </div>
  );
}
