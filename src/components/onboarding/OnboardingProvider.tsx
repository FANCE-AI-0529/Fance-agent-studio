import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector
  position?: "top" | "bottom" | "left" | "right";
}

interface OnboardingContextType {
  isOnboarding: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  startOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  hasCompletedOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const defaultSteps: OnboardingStep[] = [
  {
    id: "welcome",
    title: "欢迎来到 FANCE",
    description: "让我们花1分钟快速了解如何创建你的专属AI助手",
  },
  {
    id: "dashboard",
    title: "这是你的工作台",
    description: "在这里可以看到你的AI助手、使用数据和快捷入口",
    target: "[data-onboarding='dashboard']",
    position: "bottom",
  },
  {
    id: "workflow-nodes",
    title: "强大的工作流节点",
    description: "使用 LLM 调用、HTTP 请求、代码执行等 13 种节点，构建复杂的自动化流程",
    target: "[data-onboarding='logic-nodes']",
    position: "right",
  },
  {
    id: "builder",
    title: "创建AI助手",
    description: "点击这里开始创建你的第一个AI助手，可以用对话的方式告诉我你想要什么样的助手",
    target: "[data-onboarding='builder']",
    position: "right",
  },
  {
    id: "skills",
    title: "能力商店",
    description: "这里有各种现成的能力可以安装给你的AI助手，比如写文案、分析数据等",
    target: "[data-onboarding='foundry']",
    position: "right",
  },
  {
    id: "runtime",
    title: "开始对话",
    description: "创建好助手后，在这里和它聊天，让它帮你完成任务",
    target: "[data-onboarding='runtime']",
    position: "right",
  },
  {
    id: "complete",
    title: "准备好了！",
    description: "现在你可以开始创建你的第一个AI助手了，如有问题随时查看帮助中心",
  },
];

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(() => {
    return localStorage.getItem("onboarding_completed") === "true";
  });

  useEffect(() => {
    // 检查是否新用户首次访问
    const isFirstVisit = !localStorage.getItem("has_visited");
    if (isFirstVisit && !hasCompletedOnboarding) {
      localStorage.setItem("has_visited", "true");
      // 延迟启动引导，让页面先加载完
      setTimeout(() => {
        setIsOnboarding(true);
      }, 1000);
    }
  }, [hasCompletedOnboarding]);

  const startOnboarding = () => {
    setCurrentStep(0);
    setIsOnboarding(true);
  };

  const nextStep = () => {
    if (currentStep < defaultSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    setIsOnboarding(false);
    localStorage.setItem("onboarding_completed", "true");
    setHasCompletedOnboarding(true);
  };

  const completeOnboarding = () => {
    setIsOnboarding(false);
    localStorage.setItem("onboarding_completed", "true");
    setHasCompletedOnboarding(true);
  };

  return (
    <OnboardingContext.Provider
      value={{
        isOnboarding,
        currentStep,
        steps: defaultSteps,
        startOnboarding,
        nextStep,
        prevStep,
        skipOnboarding,
        completeOnboarding,
        hasCompletedOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
