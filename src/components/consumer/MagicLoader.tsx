import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, Sparkles, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { TypewriterText } from "@/components/ui/typewriter-text";
import type { KnowledgeMatchResult } from "@/hooks/useKnowledgeMatching";

// Clarification interaction embedded in a step
export interface StepClarification {
  type: 'knowledge_selection' | 'upload_guide';
  matches?: KnowledgeMatchResult[];
  question?: string;
}

export interface MagicStep {
  id: string;
  text: string;
  subtext?: string;
  status: 'pending' | 'active' | 'complete' | 'paused';
  clarification?: StepClarification;
}

interface MagicLoaderProps {
  steps: MagicStep[];
  currentStepIndex: number;
  agentName?: string;
  className?: string;
  isPaused?: boolean;
  // Clarification interaction callbacks
  clarificationComponent?: React.ReactNode;
}

export function MagicLoader({ 
  steps, 
  currentStepIndex, 
  agentName,
  className,
  isPaused = false,
  clarificationComponent,
}: MagicLoaderProps) {
  const currentStep = steps[currentStepIndex];
  const showClarification = isPaused && currentStep?.status === 'paused' && clarificationComponent;
  return (
    <div className={cn("flex flex-col items-center justify-center py-20", className)}>
      {/* Magic orb animation */}
      <div className="relative mb-12">
        {/* Outer glow rings */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
            width: 200,
            height: 200,
            left: -60,
            top: -60,
          }}
          animate={isPaused ? {
            scale: 1,
            opacity: 0.3,
          } : {
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: isPaused ? 0 : Infinity,
            ease: "easeInOut",
          }}
        />
        
        {/* Inner orb */}
        <motion.div
          className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center"
          animate={isPaused ? {
            boxShadow: '0 0 30px hsl(var(--primary) / 0.4)',
          } : {
            boxShadow: [
              '0 0 20px hsl(var(--primary) / 0.3)',
              '0 0 40px hsl(var(--primary) / 0.5)',
              '0 0 20px hsl(var(--primary) / 0.3)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: isPaused ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.div
            animate={isPaused ? { rotate: 0 } : { rotate: 360 }}
            transition={{ duration: 8, repeat: isPaused ? 0 : Infinity, ease: "linear" }}
          >
            {isPaused ? (
              <Pause className="h-8 w-8 text-primary" />
            ) : (
              <Sparkles className="h-8 w-8 text-primary" />
            )}
          </motion.div>
        </motion.div>

        {/* Floating particles - only show when not paused */}
        {!isPaused && Array.from({ length: 6 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
            style={{
              left: '50%',
              top: '50%',
            }}
            animate={{
              x: [0, Math.cos((i * 60 * Math.PI) / 180) * 50],
              y: [0, Math.sin((i * 60 * Math.PI) / 180) * 50],
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-semibold text-foreground mb-2"
      >
        {isPaused ? '需要您的确认' : agentName ? `正在创建 ${agentName}` : '正在施展魔法'}
      </motion.h2>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-muted-foreground mb-10"
      >
        {isPaused ? '请完成以下选择后继续' : '请稍候，AI 正在为你构建专属数字员工'}
      </motion.p>

      {/* Clarification Card - Render when paused */}
      <AnimatePresence>
        {showClarification && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="w-full mb-8"
          >
            {clarificationComponent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Steps list */}
      <div className="w-full max-w-sm space-y-3">
        <AnimatePresence mode="popLayout">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: index <= currentStepIndex ? 1 : 0.4,
                x: 0 
              }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all",
                step.status === 'active' && "bg-primary/5 border border-primary/20",
                step.status === 'paused' && "bg-amber-500/5 border border-amber-500/20",
                step.status === 'complete' && "bg-muted/30",
                step.status === 'pending' && "opacity-50"
              )}
            >
              {/* Status icon */}
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                step.status === 'complete' && "bg-green-500/20 text-green-500",
                step.status === 'active' && "bg-primary/20 text-primary",
                step.status === 'paused' && "bg-amber-500/20 text-amber-500",
                step.status === 'pending' && "bg-muted text-muted-foreground"
              )}>
                {step.status === 'complete' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : step.status === 'paused' ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : step.status === 'active' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </div>

              {/* Step text */}
              <div className="flex-1 min-w-0">
                {step.status === 'active' ? (
                  <TypewriterText
                    text={step.text}
                    speed={30}
                    className="text-sm text-foreground"
                  />
                ) : (
                  <span className={cn(
                    "text-sm",
                    step.status === 'complete' ? "text-muted-foreground" : "text-muted-foreground/60"
                  )}>
                    {step.text}
                  </span>
                )}
                {step.subtext && step.status === 'active' && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground mt-0.5"
                  >
                    {step.subtext}
                  </motion.p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
