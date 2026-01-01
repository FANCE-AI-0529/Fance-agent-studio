import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, Lightbulb, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TooltipHintProps {
  content: string;
  title?: string;
  type?: "info" | "tip" | "help";
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function TooltipHint({
  content,
  title,
  type = "help",
  side = "top",
  className,
}: TooltipHintProps) {
  const Icon = type === "tip" ? Lightbulb : type === "info" ? Info : HelpCircle;
  const iconColor = type === "tip" ? "text-yellow-500" : type === "info" ? "text-blue-500" : "text-muted-foreground";

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center rounded-full p-0.5 hover:bg-muted transition-colors",
              className
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", iconColor)} />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          {title && <p className="font-medium text-sm mb-1">{title}</p>}
          <p className="text-xs text-muted-foreground">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Floating hint that can be dismissed
interface FloatingHintProps {
  id: string;
  content: string;
  title?: string;
  icon?: ReactNode;
  position?: "top-right" | "bottom-right" | "top-left" | "bottom-left";
  className?: string;
}

export function FloatingHint({
  id,
  content,
  title,
  icon,
  position = "bottom-right",
  className,
}: FloatingHintProps) {
  const storageKey = `hint_dismissed_${id}`;
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(storageKey) === "true";
  });

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  const positionClasses = {
    "top-right": "top-4 right-4",
    "bottom-right": "bottom-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-left": "bottom-4 left-4",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className={cn(
          "absolute z-50 max-w-xs bg-card border border-border rounded-lg shadow-lg p-3",
          positionClasses[position],
          className
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-card border border-border shadow-sm"
          onClick={handleDismiss}
        >
          <X className="h-3 w-3" />
        </Button>

        <div className="flex items-start gap-2">
          {icon ? (
            <div className="flex-shrink-0">{icon}</div>
          ) : (
            <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-0.5" />
          )}
          <div>
            {title && <p className="font-medium text-sm">{title}</p>}
            <p className="text-xs text-muted-foreground">{content}</p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Progress indicator for multi-step processes
interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function StepIndicator({ steps, currentStep, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                idx < currentStep
                  ? "bg-primary text-primary-foreground"
                  : idx === currentStep
                  ? "bg-primary/20 text-primary border-2 border-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {idx + 1}
            </div>
            <span
              className={cn(
                "text-xs hidden sm:inline",
                idx <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={cn(
                "w-8 h-0.5 rounded-full transition-all",
                idx < currentStep ? "bg-primary" : "bg-muted"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
