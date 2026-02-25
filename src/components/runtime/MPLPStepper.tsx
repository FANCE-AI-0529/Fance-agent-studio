import { motion, AnimatePresence } from "framer-motion";
import { Clock, Brain, Shield, Zap, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

export type MPLPPhase = "idle" | "planning" | "confirm" | "ipc_intercept" | "executing" | "trace";

interface MPLPStepperProps {
  currentPhase: MPLPPhase;
  className?: string;
}

const phases: { key: MPLPPhase; label: string; icon: typeof Clock }[] = [
  { key: "idle", label: "Idle", icon: Clock },
  { key: "planning", label: "Planning", icon: Brain },
  { key: "confirm", label: "Confirm", icon: Shield },
  { key: "ipc_intercept", label: "IPC Guard", icon: Shield },
  { key: "executing", label: "Executing", icon: Zap },
  { key: "trace", label: "Trace", icon: GitBranch },
];

const phaseColors: Record<MPLPPhase, { bg: string; text: string; glow: string }> = {
  idle: { 
    bg: "bg-muted", 
    text: "text-muted-foreground",
    glow: ""
  },
  planning: { 
    bg: "bg-status-planning", 
    text: "text-status-planning",
    glow: "shadow-[0_0_12px_hsl(var(--status-planning)/0.5)]"
  },
  confirm: { 
    bg: "bg-status-confirm", 
    text: "text-status-confirm",
    glow: "shadow-[0_0_12px_hsl(var(--status-confirm)/0.5)]"
  },
  ipc_intercept: {
    bg: "bg-destructive",
    text: "text-destructive",
    glow: "shadow-[0_0_12px_hsl(var(--destructive)/0.5)]"
  },
  executing: { 
    bg: "bg-status-executing", 
    text: "text-status-executing",
    glow: "shadow-[0_0_12px_hsl(var(--status-executing)/0.5)]"
  },
  trace: { 
    bg: "bg-cognitive", 
    text: "text-cognitive",
    glow: "shadow-[0_0_12px_hsl(var(--cognitive)/0.5)]"
  },
};

export function MPLPStepper({ currentPhase, className }: MPLPStepperProps) {
  const currentIndex = phases.findIndex(p => p.key === currentPhase);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {phases.map((phase, index) => {
        const isActive = phase.key === currentPhase;
        const isPast = index < currentIndex;
        const colors = phaseColors[phase.key];
        const Icon = phase.icon;

        return (
          <div key={phase.key} className="flex items-center">
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <motion.div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                  isActive && [colors.bg, colors.glow, "text-background"],
                  isPast && "bg-primary/20 text-primary",
                  !isActive && !isPast && "bg-muted text-muted-foreground"
                )}
                animate={isActive ? { 
                  scale: [1, 1.1, 1],
                } : {}}
                transition={{
                  duration: 1.5,
                  repeat: isActive ? Infinity : 0,
                  ease: "easeInOut"
                }}
              >
                <Icon className="h-4 w-4" />
              </motion.div>
              <motion.span
                className={cn(
                  "text-[10px] mt-1 font-medium transition-colors font-mono",
                  isActive && colors.text,
                  isPast && "text-primary",
                  !isActive && !isPast && "text-muted-foreground"
                )}
                animate={isActive ? { opacity: [0.7, 1, 0.7] } : { opacity: 1 }}
                transition={{ duration: 1.5, repeat: isActive ? Infinity : 0 }}
              >
                {phase.label}
              </motion.span>
            </div>

            {/* Connector line with animation */}
            {index < phases.length - 1 && (
              <div className="relative w-8 h-0.5 mx-1">
                <div className="absolute inset-0 bg-border" />
                <motion.div
                  className="absolute inset-0 bg-primary"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: index < currentIndex ? 1 : 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ transformOrigin: "left" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
