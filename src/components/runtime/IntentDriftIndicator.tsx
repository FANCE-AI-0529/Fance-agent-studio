import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntentDriftIndicatorProps {
  severity: "none" | "low" | "medium" | "high" | "critical";
  deltaScore: number;
  message?: string;
  className?: string;
}

export function IntentDriftIndicator({ 
  severity, 
  deltaScore, 
  message,
  className 
}: IntentDriftIndicatorProps) {
  if (severity === "none") return null;

  const driftPercentage = Math.round((1 - deltaScore) * 100);

  const severityConfig = {
    low: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      text: "text-blue-600",
      icon: Info,
      label: "轻微偏离",
    },
    medium: {
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      text: "text-yellow-600",
      icon: AlertTriangle,
      label: "话题偏移",
    },
    high: {
      bg: "bg-orange-500/10",
      border: "border-orange-500/30",
      text: "text-orange-600",
      icon: AlertTriangle,
      label: "明显偏离",
    },
    critical: {
      bg: "bg-destructive/10",
      border: "border-destructive/30",
      text: "text-destructive",
      icon: AlertTriangle,
      label: "严重偏离",
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs",
        config.bg,
        config.border,
        "border",
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", config.text)} />
      <span className={config.text}>
        {config.label}: 与原始意图偏离 {driftPercentage}%
      </span>
    </div>
  );
}
