import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  MessageSquare,
  Mic,
  MousePointer2,
  Shield,
  Sparkles,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Lightbulb,
  Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center";
  highlight?: string; // CSS selector or area description
  tips?: string[];
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "欢迎使用智能体运行环境",
    description: "这是一个交互式引导，帮助您快速了解如何使用智能体。整个过程只需要 1 分钟。",
    icon: <Sparkles className="h-6 w-6" />,
    position: "center",
    tips: [
      "智能体是一个可以理解自然语言的 AI 助手",
      "它可以帮您完成各种任务，如查询数据、生成文档等"
    ]
  },
  {
    id: "agent-selector",
    title: "选择智能体",
    description: "点击这里可以切换不同的智能体。每个智能体都有不同的专业领域和技能。",
    icon: <Bot className="h-6 w-6" />,
    position: "top-left",
    highlight: "agent-selector",
    tips: [
      "默认的「餐饮办证助手」是演示用智能体",
      "您可以在 Builder 模块创建自己的智能体"
    ]
  },
  {
    id: "quick-actions",
    title: "快速操作示例",
    description: "这些是预设的常用命令，点击即可快速体验智能体的各种能力。",
    icon: <MousePointer2 className="h-6 w-6" />,
    position: "center",
    tips: [
      "不同颜色代表不同的风险级别",
      "绿色 = 低风险（直接执行）",
      "黄色 = 中风险（需要确认）",
      "红色 = 高风险（需要确认）"
    ]
  },
  {
    id: "input-area",
    title: "输入指令",
    description: "在输入框中用自然语言描述您的需求，智能体会自动理解并执行。",
    icon: <MessageSquare className="h-6 w-6" />,
    position: "bottom-center",
    highlight: "input-area",
    tips: [
      "支持中文自然语言输入",
      "例如：「帮我查询今天的数据」",
      "按回车键或点击发送按钮提交"
    ]
  },
  {
    id: "voice-input",
    title: "语音输入",
    description: "点击麦克风图标可以使用语音输入，说完后会自动转换成文字。",
    icon: <Mic className="h-6 w-6" />,
    position: "bottom-left",
    highlight: "voice-input",
    tips: [
      "首次使用需要授权麦克风权限",
      "支持中文语音识别",
      "录音时按钮会变红并闪烁"
    ]
  },
  {
    id: "security",
    title: "安全确认机制",
    description: "涉及敏感操作时，智能体会先向您展示详情，您确认后才会执行。",
    icon: <Shield className="h-6 w-6" />,
    position: "center",
    tips: [
      "网络请求、文件写入、数据删除等操作需要确认",
      "确认卡片会显示操作详情和风险级别",
      "您可以选择「确认执行」或「取消」"
    ]
  },
  {
    id: "advanced",
    title: "高级功能",
    description: "顶部工具栏提供了更多高级功能，如模型选择、协作配置等。",
    icon: <Settings2 className="h-6 w-6" />,
    position: "top-right",
    highlight: "toolbar",
    tips: [
      "可以切换不同的 AI 模型",
      "配置智能体协作和任务链",
      "查看执行历史和熔断状态"
    ]
  },
  {
    id: "complete",
    title: "开始使用",
    description: "恭喜！您已经了解了智能体的基本用法。现在可以开始体验了！",
    icon: <Check className="h-6 w-6" />,
    position: "center",
    tips: [
      "尝试点击一个快速操作示例开始",
      "或者直接输入您的需求",
      "有问题随时可以问智能体"
    ]
  }
];

const TOUR_STORAGE_KEY = "agent-os-onboarding-completed";

interface OnboardingTourProps {
  onComplete: () => void;
  forceShow?: boolean;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, forceShow = false }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has completed the tour before
    const hasCompleted = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!hasCompleted || forceShow) {
      setIsVisible(true);
    }
  }, [forceShow]);

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    setIsVisible(false);
    onComplete();
  }, [onComplete]);

  if (!isVisible) return null;

  const step = tourSteps[currentStep];
  const progress = ((currentStep + 1) / tourSteps.length) * 100;

  const getPositionClasses = (position: TourStep["position"]) => {
    switch (position) {
      case "top-left":
        return "top-24 left-8";
      case "top-right":
        return "top-24 right-8";
      case "top-center":
        return "top-24 left-1/2 -translate-x-1/2";
      case "bottom-left":
        return "bottom-24 left-8";
      case "bottom-right":
        return "bottom-24 right-8";
      case "bottom-center":
        return "bottom-24 left-1/2 -translate-x-1/2";
      case "center":
      default:
        return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />

          {/* Tour Card */}
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={cn(
              "fixed z-50 w-[420px] max-w-[90vw]",
              getPositionClasses(step.position)
            )}
          >
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Progress Bar */}
              <div className="h-1 bg-muted">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Header */}
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    {step.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      步骤 {currentStep + 1} / {tourSteps.length}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleSkip}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>

                {step.tips && step.tips.length > 0 && (
                  <div className="space-y-2">
                    {step.tips.map((tip, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Lightbulb className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  跳过引导
                </Button>

                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrev}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      上一步
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="gap-1"
                  >
                    {currentStep === tourSteps.length - 1 ? (
                      <>
                        开始使用
                        <Check className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        下一步
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Step Dots */}
              <div className="px-4 pb-4 flex justify-center gap-1.5">
                {tourSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentStep
                        ? "bg-primary w-6"
                        : index < currentStep
                        ? "bg-primary/50"
                        : "bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Hook to manage tour state
export function useOnboardingTour() {
  const [showTour, setShowTour] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(true);

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    setHasCompletedTour(!!completed);
    if (!completed) {
      setShowTour(true);
    }
  }, []);

  const startTour = useCallback(() => {
    setShowTour(true);
  }, []);

  const completeTour = useCallback(() => {
    setShowTour(false);
    setHasCompletedTour(true);
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setHasCompletedTour(false);
    setShowTour(true);
  }, []);

  return {
    showTour,
    hasCompletedTour,
    startTour,
    completeTour,
    resetTour
  };
}

export default OnboardingTour;
