import { Layers, Plug } from "lucide-react";
import { cn } from "@/lib/utils";

export type SkillMode = "native" | "mcp";

interface SkillModeSwitchProps {
  mode: SkillMode;
  onModeChange: (mode: SkillMode) => void;
  className?: string;
}

export function SkillModeSwitch({ mode, onModeChange, className }: SkillModeSwitchProps) {
  return (
    <div className={cn("flex items-center gap-1 bg-muted rounded-lg p-1", className)}>
      <button
        onClick={() => onModeChange("native")}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
          mode === "native"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Layers className="h-4 w-4" />
        <span>Native 原生技能</span>
      </button>
      <button
        onClick={() => onModeChange("mcp")}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
          mode === "mcp"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Plug className="h-4 w-4" />
        <span>MCP Server</span>
      </button>
    </div>
  );
}
