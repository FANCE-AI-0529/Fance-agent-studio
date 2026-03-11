import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "../../lib/utils.ts";

interface BuildStepAnimationProps {
  children: ReactNode;
  nodeId: string;
  isNew?: boolean;
  delay?: number;
  className?: string;
}

// Animation for new nodes appearing
export function BuildStepAnimation({
  children,
  nodeId,
  isNew = false,
  delay = 0,
  className,
}: BuildStepAnimationProps) {
  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={nodeId}
        initial={isNew ? { 
          opacity: 0, 
          scale: 0.8,
          y: -10,
        } : false}
        animate={{ 
          opacity: 1, 
          scale: 1,
          y: 0,
        }}
        exit={{ 
          opacity: 0, 
          scale: 0.8,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
          delay,
        }}
        className={cn("relative", className)}
      >
        {children}
        
        {/* Glow effect for new nodes */}
        {isNew && (
          <motion.div
            initial={{ opacity: 0.8, scale: 1 }}
            animate={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 0.6, delay }}
            className="absolute inset-0 rounded-lg bg-primary/20 pointer-events-none"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Animation for edges appearing
interface EdgeAnimationProps {
  edgeId: string;
  isNew?: boolean;
  children: ReactNode;
}

export function EdgeAnimation({ edgeId, isNew = false, children }: EdgeAnimationProps) {
  return (
    <motion.g
      key={edgeId}
      initial={isNew ? { opacity: 0, pathLength: 0 } : false}
      animate={{ opacity: 1, pathLength: 1 }}
      transition={{
        duration: 0.4,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.g>
  );
}

// Pulse effect component
export function PulseEffect({ 
  className, 
  color = "primary" 
}: { 
  className?: string;
  color?: "primary" | "amber" | "green" | "blue";
}) {
  const colorMap = {
    primary: "bg-primary/30",
    amber: "bg-amber-500/30",
    green: "bg-green-500/30",
    blue: "bg-blue-500/30",
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0.8 }}
      animate={{ scale: 1.5, opacity: 0 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "easeOut",
      }}
      className={cn(
        "absolute inset-0 rounded-full",
        colorMap[color],
        className
      )}
    />
  );
}

// Connection line animation
export function ConnectionLineAnimation({
  fromX,
  fromY,
  toX,
  toY,
  isAnimating = false,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  isAnimating?: boolean;
}) {
  if (!isAnimating) return null;

  return (
    <motion.line
      x1={fromX}
      y1={fromY}
      x2={toX}
      y2={toY}
      stroke="hsl(var(--primary))"
      strokeWidth={2}
      strokeDasharray="5,5"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5 }}
    />
  );
}
