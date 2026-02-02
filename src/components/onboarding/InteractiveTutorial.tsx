/**
 * @file InteractiveTutorial.tsx
 * @description 交互式教程组件
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Play,
  CheckCircle,
  Circle,
  Lightbulb,
  Target,
  Sparkles,
  BookOpen,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  highlight?: string; // CSS selector
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  isInteractive?: boolean;
  completionCheck?: () => boolean;
}

interface InteractiveTutorialProps {
  tutorialId: string;
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export function InteractiveTutorial({
  tutorialId,
  steps,
  onComplete,
  onSkip,
}: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [isVisible, setIsVisible] = useState(true);

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  // 检查步骤完成状态
  useEffect(() => {
    if (step.completionCheck && step.completionCheck()) {
      setCompletedSteps(prev => new Set([...prev, step.id]));
    }
  }, [step]);

  // 高亮目标元素
  useEffect(() => {
    if (step.highlight) {
      const element = document.querySelector(step.highlight);
      if (element) {
        element.classList.add('tutorial-highlight');
        return () => element.classList.remove('tutorial-highlight');
      }
    }
  }, [step.highlight]);

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, step.id]));
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`tutorial_${tutorialId}_completed`, 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(`tutorial_${tutorialId}_skipped`, 'true');
    onSkip();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      >
        {/* 进度条 */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* 教程卡片 */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-lg"
          >
            <Card className="border-2 border-primary/20 shadow-2xl">
              <CardContent className="p-6">
                {/* 头部 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <Badge variant="outline" className="text-xs">
                        步骤 {currentStep + 1}/{steps.length}
                      </Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleSkip}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* 标题 */}
                <h2 className="text-xl font-bold mb-2">{step.title}</h2>
                <p className="text-muted-foreground mb-4">{step.description}</p>

                {/* 内容 */}
                <div className="mb-6">{step.content}</div>

                {/* 步骤指示器 */}
                <div className="flex items-center justify-center gap-1 mb-4">
                  {steps.map((s, index) => (
                    <button
                      key={s.id}
                      onClick={() => setCurrentStep(index)}
                      className={cn(
                        'w-2 h-2 rounded-full transition-all',
                        index === currentStep
                          ? 'w-6 bg-primary'
                          : completedSteps.has(s.id)
                          ? 'bg-green-500'
                          : 'bg-muted-foreground/30'
                      )}
                    />
                  ))}
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrev}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    上一步
                  </Button>

                  <div className="flex gap-2">
                    {step.action && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={step.action.onClick}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        {step.action.label}
                      </Button>
                    )}
                    <Button size="sm" onClick={handleNext}>
                      {currentStep === steps.length - 1 ? (
                        <>
                          <Trophy className="h-4 w-4 mr-1" />
                          完成
                        </>
                      ) : (
                        <>
                          下一步
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// 教程提示气泡
export function TutorialTooltip({
  children,
  content,
  isActive,
  position = 'bottom',
}: {
  children: React.ReactNode;
  content: string;
  isActive: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) {
  if (!isActive) return <>{children}</>;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block">
      <div className="relative z-10 animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background rounded">
        {children}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'absolute z-20 w-48 p-2 bg-primary text-primary-foreground text-xs rounded-lg shadow-lg',
          positionClasses[position]
        )}
      >
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{content}</span>
        </div>
      </motion.div>
    </div>
  );
}

// 预定义的教程内容
export const createAgentTutorial: TutorialStep[] = [
  {
    id: 'welcome',
    title: '欢迎来到 Agent 创建向导',
    description: '让我们一起创建你的第一个 AI 智能体！',
    content: (
      <div className="text-center py-4">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="h-10 w-10 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          整个过程只需 2 分钟，跟着提示一步步来吧！
        </p>
      </div>
    ),
  },
  {
    id: 'name-agent',
    title: '给智能体起个名字',
    description: '一个好名字能让用户更容易记住它',
    content: (
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm font-medium mb-2">💡 命名技巧</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• 使用描述性名称（如"客服小助手"）</li>
            <li>• 保持简短易记（2-6个字为佳）</li>
            <li>• 可以加入个性化元素</li>
          </ul>
        </div>
      </div>
    ),
    highlight: '[data-tutorial="agent-name"]',
    isInteractive: true,
  },
  {
    id: 'system-prompt',
    title: '设置系统提示词',
    description: '系统提示词定义了智能体的行为和能力',
    content: (
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm font-medium mb-2">📝 提示词模板</p>
          <p className="text-xs text-muted-foreground">
            "你是一位专业的[角色]，擅长[能力]。你的目标是[目标]。"
          </p>
        </div>
      </div>
    ),
    highlight: '[data-tutorial="system-prompt"]',
  },
  {
    id: 'add-skills',
    title: '添加技能',
    description: '从技能库中选择适合的能力',
    content: (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded bg-muted/50 text-center">
            <Target className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <span className="text-xs">网页搜索</span>
          </div>
          <div className="p-2 rounded bg-muted/50 text-center">
            <Target className="h-6 w-6 mx-auto mb-1 text-green-500" />
            <span className="text-xs">文件读取</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          从左侧技能库拖拽技能到画布，或点击添加
        </p>
      </div>
    ),
    highlight: '[data-tutorial="skill-panel"]',
  },
  {
    id: 'deploy',
    title: '部署你的智能体',
    description: '一切就绪，点击部署开始使用！',
    content: (
      <div className="text-center py-4">
        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <p className="text-sm text-muted-foreground">
          恭喜！你已经学会了创建智能体的基础流程
        </p>
      </div>
    ),
    highlight: '[data-tutorial="deploy-button"]',
  },
];
