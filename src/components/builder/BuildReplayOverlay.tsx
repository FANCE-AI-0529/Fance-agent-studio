import { motion, AnimatePresence } from "framer-motion";
import { 
  Loader2, 
  SkipForward, 
  Pause, 
  Play, 
  CheckCircle2, 
  Brain, 
  Layers, 
  GitBranch,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Progress } from "../ui/progress.tsx";
import { Badge } from "../ui/badge.tsx";
import { BuildReplayState } from "../../hooks/useAgentBuildReplay.ts";
import { cn } from "../../lib/utils.ts";

interface BuildReplayOverlayProps {
  state: BuildReplayState;
  agentName?: string;
  onSkip: () => void;
  onPause: () => void;
  onResume: () => void;
}

// Phase icons and colors
const phaseConfig = {
  loading: { icon: Loader2, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  analyzing: { icon: Brain, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  assembling: { icon: Layers, color: 'text-primary', bg: 'bg-primary/10' },
  connecting: { icon: GitBranch, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  complete: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
};

export function BuildReplayOverlay({
  state,
  agentName,
  onSkip,
  onPause,
  onResume,
}: BuildReplayOverlayProps) {
  const { isReplaying, phase, phaseLabel, progress, currentStep, totalSteps } = state;
  const config = phaseConfig[phase];
  const PhaseIcon = config.icon;

  const [isPaused, setIsPaused] = React.useState(false);

  const handlePauseToggle = () => {
    if (isPaused) {
      onResume();
    } else {
      onPause();
    }
    setIsPaused(!isPaused);
  };

  if (!isReplaying && phase === 'complete') {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 pointer-events-none"
      >
        {/* Semi-transparent overlay - only on edges */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-background/60" />

        {/* Top bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto"
        >
          <div className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-full",
            "bg-background/95 backdrop-blur-sm border shadow-lg"
          )}>
            {/* Phase indicator */}
            <div className={cn("p-2 rounded-full", config.bg)}>
              <PhaseIcon className={cn("h-4 w-4", config.color, phase === 'loading' && "animate-spin")} />
            </div>

            {/* Status text */}
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {agentName ? `解构 "${agentName}"` : '构建回放'}
              </span>
              <span className="text-xs text-muted-foreground">{phaseLabel}</span>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 ml-2">
              <Progress value={progress} className="w-24 h-1.5" />
              <span className="text-xs text-muted-foreground tabular-nums">
                {currentStep}/{totalSteps}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handlePauseToggle}
              >
                {isPaused ? (
                  <Play className="h-3.5 w-3.5" />
                ) : (
                  <Pause className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onSkip}
              >
                <SkipForward className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Step indicator - bottom left */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="absolute bottom-4 left-4 pointer-events-auto"
        >
          <Badge variant="outline" className="bg-background/95 backdrop-blur-sm gap-1.5 py-1.5 px-3">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-xs">
              {phase === 'assembling' && '添加组件...'}
              {phase === 'connecting' && '建立连接...'}
              {phase === 'analyzing' && '分析结构...'}
              {phase === 'loading' && '加载数据...'}
              {phase === 'complete' && '回放完成'}
            </span>
          </Badge>
        </motion.div>

        {/* Skip hint - bottom right */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-4 right-4 pointer-events-auto"
        >
          <Button
            variant="outline"
            size="sm"
            className="bg-background/95 backdrop-blur-sm text-xs h-8"
            onClick={onSkip}
          >
            <SkipForward className="h-3 w-3 mr-1.5" />
            跳过回放
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Import React for useState
import React from 'react';
