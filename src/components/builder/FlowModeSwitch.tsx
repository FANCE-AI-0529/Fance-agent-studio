import { MessageSquare, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

export type FlowMode = "chatflow" | "workflow";

interface FlowModeSwitchProps {
  mode: FlowMode;
  onModeChange: (mode: FlowMode) => void;
  className?: string;
}

export function FlowModeSwitch({ mode, onModeChange, className }: FlowModeSwitchProps) {
  return (
    <div className={cn("flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50 border border-border/50", className)}>
      <button
        onClick={() => onModeChange("chatflow")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
          mode === "chatflow"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Chatflow</span>
      </button>
      <button
        onClick={() => onModeChange("workflow")}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
          mode === "workflow"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <GitBranch className="h-3.5 w-3.5" />
        <span>Workflow</span>
      </button>
    </div>
  );
}

// Node availability per mode
export const CHATFLOW_NODES = [
  "trigger", "llm", "condition", "template", "code",
  "knowledge", "parameterExtractor", "variableAggregator", "output",
];

export const WORKFLOW_NODES = [
  "trigger", "llm", "httpRequest", "code", "condition",
  "template", "parameterExtractor", "variableAggregator",
  "iterator", "loop", "knowledge", "output",
];

export function getAvailableNodes(mode: FlowMode): string[] {
  return mode === "chatflow" ? CHATFLOW_NODES : WORKFLOW_NODES;
}
