import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Brain, 
  Puzzle, 
  Database, 
  Sparkles, 
  CheckCircle,
  Loader2,
  type LucideIcon
} from "lucide-react";
import { TypewriterText } from "@/components/ui/typewriter-text";
import { cn } from "@/lib/utils";

export interface MagicStep {
  id: string;
  message: string;
  detail?: string;
  icon: LucideIcon;
  duration?: number;
}

export const MAGIC_STEPS: MagicStep[] = [
  { id: 'understanding', message: '正在理解你的需求...', icon: Brain, duration: 1500 },
  { id: 'skills', message: '发现需要的技能，正在挂载...', icon: Puzzle, duration: 2000 },
  { id: 'knowledge', message: '正在连接相关知识库...', icon: Database, duration: 1500 },
  { id: 'assembling', message: '正在组装数字员工...', icon: Sparkles, duration: 2000 },
  { id: 'complete', message: '✨ 数字员工已就绪', icon: CheckCircle, duration: 800 },
];

interface MagicLoaderProps {
  isLoading: boolean;
  currentStepIndex: number;
  steps?: MagicStep[];
  userPrompt?: string;
  onComplete?: () => void;
}

export function MagicLoader({
  isLoading,
  currentStepIndex,
  steps = MAGIC_STEPS,
  userPrompt,
  onComplete,
}: MagicLoaderProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (currentStepIndex > 0) {
      setCompletedSteps(prev => {
        const newSet = new Set(prev);
        newSet.add(steps[currentStepIndex - 1].id);
        return newSet;
      });
    }
  }, [currentStepIndex, steps]);

  useEffect(() => {
    if (currentStep?.id === 'complete') {
      const timer = setTimeout(() => {
        onComplete?.();
      }, currentStep.duration || 800);
      return () => clearTimeout(timer);
    }
  }, [currentStep, onComplete]);

  const CurrentIcon = currentStep?.icon || Loader2;
  const isComplete = currentStep?.id === 'complete';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center min-h-[400px] text-center px-4"
    >
      {/* Animated icon */}
      <motion.div
        key={currentStep?.id}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className={cn(
          "w-20 h-20 rounded-2xl flex items-center justify-center mb-8",
          "bg-primary/10 border border-primary/20",
          isComplete && "bg-green-500/10 border-green-500/20"
        )}
      >
        <CurrentIcon 
          className={cn(
            "h-10 w-10",
            isComplete ? "text-green-500" : "text-primary",
            !isComplete && "animate-pulse"
          )} 
        />
      </motion.div>

      {/* Current step message with typewriter effect */}
      <div className="h-12 flex items-center justify-center mb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep?.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">
              <TypewriterText 
                text={currentStep?.message || ''} 
                speed={25}
              />
            </h2>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* User prompt reminder */}
      {userPrompt && !isComplete && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-muted-foreground/60 max-w-md mb-8"
        >
          「{userPrompt.length > 50 ? userPrompt.slice(0, 50) + '...' : userPrompt}」
        </motion.p>
      )}

      {/* Progress dots */}
      <div className="flex items-center gap-3 mt-4">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isDone = completedSteps.has(step.id) || index < currentStepIndex;
          
          return (
            <motion.div
              key={step.id}
              initial={{ scale: 0.8 }}
              animate={{ 
                scale: isActive ? 1.2 : 1,
                opacity: isDone || isActive ? 1 : 0.3,
              }}
              transition={{ duration: 0.3 }}
              className={cn(
                "w-2 h-2 rounded-full transition-colors duration-300",
                isDone && "bg-green-500",
                isActive && !isDone && "bg-primary",
                !isDone && !isActive && "bg-muted-foreground/30"
              )}
            />
          );
        })}
      </div>

      {/* Ambient glow effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl"
        />
      </div>
    </motion.div>
  );
}
