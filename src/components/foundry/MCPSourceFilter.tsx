import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Sparkles, Puzzle, LayoutGrid } from "lucide-react";

export type SkillOrigin = "all" | "native" | "mcp";

interface MCPSourceFilterProps {
  value: SkillOrigin;
  onChange: (value: SkillOrigin) => void;
  className?: string;
}

const sources: { value: SkillOrigin; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "all", label: "全部", icon: LayoutGrid },
  { value: "native", label: "Agent OS", icon: Sparkles },
  { value: "mcp", label: "MCP 生态", icon: Puzzle },
];

export function MCPSourceFilter({ value, onChange, className }: MCPSourceFilterProps) {
  return (
    <div className={cn("flex items-center gap-1 p-1 bg-muted/50 rounded-lg", className)}>
      {sources.map((source) => {
        const Icon = source.icon;
        const isActive = value === source.value;
        
        return (
          <Button
            key={source.value}
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onChange(source.value)}
            className={cn(
              "h-8 px-3 text-xs font-medium transition-all",
              isActive && "shadow-sm",
              source.value === "mcp" && isActive && "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
            )}
          >
            <Icon className="h-3.5 w-3.5 mr-1.5" />
            {source.label}
          </Button>
        );
      })}
    </div>
  );
}
