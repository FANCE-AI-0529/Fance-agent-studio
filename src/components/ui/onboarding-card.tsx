import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Lightbulb, ArrowRight } from "lucide-react";
import { Button } from "./button.tsx";
import { cn } from "../../lib/utils.ts";

interface OnboardingStep {
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  icon?: React.ReactNode;
}

interface OnboardingCardProps {
  id: string;
  title: string;
  description?: string;
  steps: OnboardingStep[];
  onDismiss?: () => void;
  className?: string;
}

export function OnboardingCard({
  id,
  title,
  description,
  steps,
  onDismiss,
  className,
}: OnboardingCardProps) {
  const storageKey = `onboarding_dismissed_${id}`;
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem(storageKey) === "true";
  });
  const [currentStep, setCurrentStep] = useState(0);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, "true");
    setIsDismissed(true);
    onDismiss?.();
  };

  if (isDismissed) return null;

  const step = steps[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn(
        "relative overflow-hidden rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Content */}
      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-card/50 rounded-lg p-4 border border-border/50"
          >
            <div className="flex items-start gap-3">
              {step.icon && (
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {step.icon}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{step.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{step.description}</p>
              </div>
            </div>

            {step.action && (
              <Button
                variant="default"
                size="sm"
                className="mt-3 w-full"
                onClick={step.action.onClick}
                asChild={!!step.action.href}
              >
                {step.action.href ? (
                  <a href={step.action.href}>
                    {step.action.label}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </a>
                ) : (
                  <>
                    {step.action.label}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Step indicators and navigation */}
        {steps.length > 1 && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    idx === currentStep
                      ? "bg-primary w-4"
                      : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                >
                  上一步
                </Button>
              )}
              {currentStep < steps.length - 1 ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                >
                  下一步
                  <ChevronRight className="h-3 w-3 ml-0.5" />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleDismiss}
                >
                  完成
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
