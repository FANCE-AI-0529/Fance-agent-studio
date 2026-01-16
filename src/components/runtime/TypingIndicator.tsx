import { cn } from "@/lib/utils";
import { Bot, Sparkles } from "lucide-react";

interface TypingIndicatorProps {
  phase: "planning" | "executing" | "trace" | "thinking";
  className?: string;
}

// Static config with explicit bg/text classes to prevent Tailwind purging
const phaseConfig = {
  planning: {
    icon: Sparkles,
    text: "正在分析意图并选择技能",
    color: "text-blue-500",
    dotBgColor: "bg-blue-500", // Static bg class for dots
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  executing: {
    icon: Bot,
    text: "正在执行任务",
    color: "text-amber-500",
    dotBgColor: "bg-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  trace: {
    icon: Bot,
    text: "正在记录执行结果",
    color: "text-green-500",
    dotBgColor: "bg-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
  },
  thinking: {
    icon: Sparkles,
    text: "思考中",
    color: "text-purple-500",
    dotBgColor: "bg-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
};

export function TypingIndicator({ phase, className }: TypingIndicatorProps) {
  const config = phaseConfig[phase];
  const Icon = config.icon;

  return (
    <div className={cn("flex gap-3 animate-fade-in", className)}>
      <div
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center border",
          config.bgColor,
          config.borderColor
        )}
      >
        <Icon className={cn("h-4 w-4 animate-pulse", config.color)} />
      </div>
      <div
        className={cn(
          "p-3 rounded-lg border flex items-center gap-3",
          config.bgColor,
          config.borderColor
        )}
      >
        <div className="flex items-center gap-1.5">
          <span className="flex gap-1">
            <span
              className={cn(
                "w-2 h-2 rounded-full animate-bounce",
                config.dotBgColor
              )}
              style={{ animationDelay: "0ms" }}
            />
            <span
              className={cn(
                "w-2 h-2 rounded-full animate-bounce",
                config.dotBgColor
              )}
              style={{ animationDelay: "150ms" }}
            />
            <span
              className={cn(
                "w-2 h-2 rounded-full animate-bounce",
                config.dotBgColor
              )}
              style={{ animationDelay: "300ms" }}
            />
          </span>
        </div>
        <span className={cn("text-sm font-medium", config.color)}>
          {config.text}
        </span>
      </div>
    </div>
  );
}
