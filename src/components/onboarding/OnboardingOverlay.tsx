import { useEffect, useState } from "react";
import { useOnboarding } from "./OnboardingProvider.tsx";
import { Button } from "../ui/button.tsx";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "../../lib/utils.ts";

export function OnboardingOverlay() {
  const {
    isOnboarding,
    currentStep,
    steps,
    nextStep,
    prevStep,
    skipOnboarding,
  } = useOnboarding();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (!isOnboarding || !step?.target) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetRect(rect);
      
      // 滚动到目标元素
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isOnboarding, step]);

  if (!isOnboarding) return null;

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const isMiddleStep = !isFirstStep && !isLastStep;

  // 中心弹窗样式（用于首尾步骤）
  if (!step.target) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={skipOnboarding}
        />
        <div className="relative z-10 bg-card border border-border rounded-2xl p-8 max-w-md mx-4 animate-scale-in shadow-2xl">
          <button
            onClick={skipOnboarding}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold">{step.title}</h2>
            <p className="text-muted-foreground">{step.description}</p>

            {/* 进度指示器 */}
            <div className="flex items-center justify-center gap-1 pt-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    index === currentStep ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              {isFirstStep ? (
                <>
                  <Button variant="outline" onClick={skipOnboarding} className="flex-1">
                    跳过引导
                  </Button>
                  <Button onClick={nextStep} className="flex-1 gap-2">
                    开始了解
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <Button onClick={nextStep} className="w-full gap-2">
                  开始使用
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 有目标元素的高亮引导
  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* 遮罩层 - 使用 clip-path 镂空目标区域 */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm pointer-events-auto"
        style={{
          clipPath: targetRect
            ? `polygon(
                0% 0%, 
                0% 100%, 
                ${targetRect.left - 8}px 100%, 
                ${targetRect.left - 8}px ${targetRect.top - 8}px, 
                ${targetRect.right + 8}px ${targetRect.top - 8}px, 
                ${targetRect.right + 8}px ${targetRect.bottom + 8}px, 
                ${targetRect.left - 8}px ${targetRect.bottom + 8}px, 
                ${targetRect.left - 8}px 100%, 
                100% 100%, 
                100% 0%
              )`
            : undefined,
        }}
        onClick={skipOnboarding}
      />

      {/* 高亮边框 */}
      {targetRect && (
        <div
          className="absolute border-2 border-primary rounded-lg pointer-events-none animate-pulse"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}

      {/* 提示卡片 */}
      {targetRect && (
        <div
          className={cn(
            "absolute bg-card border border-border rounded-xl p-4 max-w-xs shadow-xl pointer-events-auto animate-fade-in",
            step.position === "bottom" && "translate-y-4",
            step.position === "top" && "-translate-y-full -mt-4",
            step.position === "right" && "translate-x-4",
            step.position === "left" && "-translate-x-full -ml-4"
          )}
          style={{
            left:
              step.position === "right"
                ? targetRect.right + 16
                : step.position === "left"
                ? targetRect.left - 16
                : targetRect.left,
            top:
              step.position === "bottom"
                ? targetRect.bottom + 16
                : step.position === "top"
                ? targetRect.top - 16
                : targetRect.top,
          }}
        >
          <button
            onClick={skipOnboarding}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {step.description}
              </p>
            </div>

            {/* 进度 */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {currentStep + 1} / {steps.length}
              </span>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="ghost" size="sm" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" onClick={nextStep} className="gap-1">
                  {isLastStep ? "完成" : "下一步"}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
