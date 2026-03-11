// =====================================================
// 演示模式覆盖层 - Demo Mode Overlay
// 引导用户了解 AI 一键生成流程
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipForward,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Search,
  GitBranch,
  Shield,
  CheckCircle,
  Lightbulb,
} from 'lucide-react';
import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import { Progress } from '../ui/progress.tsx';
import { cn } from '../../lib/utils.ts';

// ========== 类型定义 ==========

interface DemoStep {
  id: string;
  title: string;
  description: string;
  details: string;
  icon: React.ElementType;
  highlightSelector?: string;
  demoAction?: () => Promise<void>;
  duration?: number;
}

interface DemoModeOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onStepChange?: (stepIndex: number) => void;
}

// ========== 演示步骤定义 ==========

const DEMO_STEPS: DemoStep[] = [
  {
    id: 'intro',
    title: '欢迎使用 AI 工作流生成器',
    description: '让 AI 帮你快速构建智能体工作流',
    details: '本演示将引导你了解 AI 一键生成的完整流程，包括需求描述、语义搜索、拓扑生成和合规检查。',
    icon: Sparkles,
    duration: 4000,
  },
  {
    id: 'input',
    title: '步骤 1: 描述需求',
    description: '用自然语言描述你想要的智能体功能',
    details: '在输入框中描述智能体的功能需求，例如："创建一个客服助手，能够查询订单、处理退款、发送通知邮件"。AI 会分析你的需求并自动规划工作流。',
    icon: Lightbulb,
    highlightSelector: '.demo-input',
    duration: 5000,
  },
  {
    id: 'search',
    title: '步骤 2: 语义资产搜索',
    description: 'AI 自动检索相关的技能和工具',
    details: '系统使用语义向量搜索技术，从技能库、MCP 工具和知识库中找到与需求最匹配的资产。每个资产都会显示相似度得分，帮助你了解匹配程度。',
    icon: Search,
    highlightSelector: '.demo-search',
    duration: 5000,
  },
  {
    id: 'generate',
    title: '步骤 3: 拓扑结构生成',
    description: 'AI 生成工作流节点和连接关系',
    details: 'AI 根据需求分析结果，自动生成 WorkflowDSL 结构，包括触发器、处理节点、条件分支和输出节点。同时计算最佳布局，确保画布整洁美观。',
    icon: GitBranch,
    highlightSelector: '.demo-preview',
    duration: 5000,
  },
  {
    id: 'compliance',
    title: '步骤 4: MPLP 合规检查',
    description: '自动检测风险并插入安全节点',
    details: '系统扫描工作流中的高危操作（如删除、支付等），自动插入人工确认节点，确保 Agent 的行为符合 MPLP 安全规范。你可以在报告中查看所有修改。',
    icon: Shield,
    highlightSelector: '.demo-compliance',
    duration: 5000,
  },
  {
    id: 'apply',
    title: '步骤 5: 应用到画布',
    description: '一键将生成的工作流应用到画布',
    details: '确认生成结果后，点击"应用到画布"按钮，工作流将自动渲染到 Builder 画布上。你可以继续调整节点位置、修改配置或添加更多功能。',
    icon: CheckCircle,
    highlightSelector: '.demo-apply',
    duration: 4000,
  },
];

// ========== 高亮遮罩组件 ==========

function HighlightMask({ selector }: { selector?: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  
  useEffect(() => {
    if (!selector) {
      setRect(null);
      return;
    }
    
    const element = document.querySelector(selector);
    if (element) {
      setRect(element.getBoundingClientRect());
    }
  }, [selector]);
  
  if (!rect) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 pointer-events-none z-40"
    >
      {/* 四周遮罩 */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      
      {/* 高亮区域 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute bg-transparent"
        style={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
          borderRadius: '8px',
          border: '2px solid hsl(var(--primary))',
        }}
      />
      
      {/* 脉冲动画 */}
      <motion.div
        animate={{
          boxShadow: [
            '0 0 0 0 hsla(var(--primary) / 0.4)',
            '0 0 0 20px hsla(var(--primary) / 0)',
          ],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute bg-transparent pointer-events-none"
        style={{
          top: rect.top - 8,
          left: rect.left - 8,
          width: rect.width + 16,
          height: rect.height + 16,
          borderRadius: '8px',
        }}
      />
    </motion.div>
  );
}

// ========== 主组件 ==========

export function DemoModeOverlay({
  isOpen,
  onClose,
  onComplete,
  onStepChange,
}: DemoModeOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const step = DEMO_STEPS[currentStep];
  const Icon = step.icon;
  const totalSteps = DEMO_STEPS.length;
  
  // 自动进度
  useEffect(() => {
    if (!isOpen || isPaused) return;
    
    const duration = step.duration || 5000;
    const interval = 50;
    const increment = (100 / duration) * interval;
    
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          // 自动进入下一步
          if (currentStep < totalSteps - 1) {
            setCurrentStep((s) => s + 1);
            onStepChange?.(currentStep + 1);
            return 0;
          } else {
            onComplete?.();
            return 100;
          }
        }
        return next;
      });
    }, interval);
    
    return () => clearInterval(timer);
  }, [isOpen, isPaused, currentStep, step.duration, totalSteps, onComplete, onStepChange]);
  
  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
      setProgress(0);
      onStepChange?.(currentStep + 1);
    } else {
      onComplete?.();
      onClose();
    }
  }, [currentStep, totalSteps, onComplete, onStepChange, onClose]);
  
  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setProgress(0);
      onStepChange?.(currentStep - 1);
    }
  }, [currentStep, onStepChange]);
  
  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <HighlightMask selector={step.highlightSelector} />
      
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
      >
        <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
          {/* 进度条 */}
          <Progress value={progress} className="h-1 rounded-none" />
          
          {/* 步骤指示器 */}
          <div className="flex items-center justify-center gap-2 py-3 border-b border-border">
            {DEMO_STEPS.map((s, index) => (
              <button
                key={s.id}
                onClick={() => {
                  setCurrentStep(index);
                  setProgress(0);
                  onStepChange?.(index);
                }}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === currentStep
                    ? 'w-6 bg-primary'
                    : index < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
          
          {/* 内容 */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{step.title}</h3>
                      <Badge variant="outline" className="text-[10px]">
                        {currentStep + 1}/{totalSteps}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {step.description}
                    </p>
                    <p className="text-xs text-muted-foreground/80">
                      {step.details}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* 控制按钮 */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              跳过
            </Button>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={handleNext}
              >
                {currentStep === totalSteps - 1 ? '完成' : '下一步'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DemoModeOverlay;

// ========== Demo Mode Hook ==========

export function useDemoMode() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const start = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
  }, []);
  
  const stop = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
  }, []);
  
  const complete = useCallback(() => {
    setIsActive(false);
    // 可以在这里保存用户已完成演示的状态
    localStorage.setItem('hasCompletedDemo', 'true');
  }, []);
  
  const hasCompletedDemo = typeof window !== 'undefined' 
    ? localStorage.getItem('hasCompletedDemo') === 'true'
    : false;
  
  return {
    isActive,
    currentStep,
    start,
    stop,
    complete,
    setCurrentStep,
    hasCompletedDemo,
  };
}
