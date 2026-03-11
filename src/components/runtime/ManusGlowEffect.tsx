import { motion } from "framer-motion";
import { cn } from "../../lib/utils.ts";

export type ManusPhase = 'idle' | 'reading' | 'writing' | 'thinking' | 'executing';

interface ManusGlowEffectProps {
  isActive: boolean;
  isCompliant: boolean;
  phase?: ManusPhase;
  className?: string;
}

// Animation variants for different phases
const phaseAnimations = {
  idle: {
    opacity: [0.2, 0.4, 0.2],
    scale: [1, 1.05, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
  reading: {
    opacity: [0.3, 0.6, 0.3],
    scale: [1, 1.1, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
  writing: {
    opacity: [0.4, 0.8, 0.4],
    scale: [1, 1.15, 1],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
  thinking: {
    opacity: [0.5, 0.9, 0.5],
    scale: [1, 1.2, 1],
    rotate: [0, 5, -5, 0],
    transition: {
      duration: 1.2,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
  executing: {
    opacity: [0.6, 1, 0.6],
    scale: [1, 1.25, 1],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

// Inner ring pulse animation
const innerPulseAnimation = {
  scale: [1, 1.3, 1],
  opacity: [0.8, 0, 0.8],
  transition: {
    duration: 1.5,
    repeat: Infinity,
    ease: "easeOut" as const,
  },
};

export function ManusGlowEffect({ 
  isActive, 
  isCompliant, 
  phase = 'idle',
  className 
}: ManusGlowEffectProps) {
  if (!isActive) return null;

  const currentAnimation = phaseAnimations[phase] || phaseAnimations.idle;

  // Compliant = golden glow, Non-compliant = red warning
  const glowColor = isCompliant 
    ? "from-amber-400/30 via-yellow-500/20 to-orange-400/30"
    : "from-red-500/40 via-red-400/30 to-orange-500/30";
  
  const borderColor = isCompliant
    ? "border-amber-400/50"
    : "border-red-500/50";

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)}>
      {/* Outer glow ring */}
      <motion.div
        className={cn(
          "absolute inset-[-4px] rounded-full bg-gradient-to-r blur-md",
          glowColor
        )}
        animate={currentAnimation}
      />

      {/* Inner pulse rings (only when thinking/executing) */}
      {(phase === 'thinking' || phase === 'executing') && (
        <>
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full border-2",
              borderColor
            )}
            animate={innerPulseAnimation}
          />
          <motion.div
            className={cn(
              "absolute inset-0 rounded-full border",
              borderColor
            )}
            animate={{
              ...innerPulseAnimation,
              transition: { ...innerPulseAnimation.transition, delay: 0.5 },
            }}
          />
        </>
      )}

      {/* Cognitive brain sparkle effect (when compliant and active) */}
      {isCompliant && phase !== 'idle' && (
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 1, 0.7],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div className="w-full h-full rounded-full bg-gradient-to-r from-amber-300 to-yellow-400 blur-[2px]" />
        </motion.div>
      )}

      {/* Warning indicator (when non-compliant) */}
      {!isCompliant && (
        <motion.div
          className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-destructive/80 flex items-center justify-center"
          animate={{
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
          }}
        >
          <span className="text-destructive-foreground text-[8px] font-bold">!</span>
        </motion.div>
      )}
    </div>
  );
}

export default ManusGlowEffect;
