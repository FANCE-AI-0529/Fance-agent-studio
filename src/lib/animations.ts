// P3-01: Global Animation System - Unified micro-interaction standards
import { Variants, Transition, TargetAndTransition } from "framer-motion";

// ==================== Core Timing Functions ====================
export const easings = {
  // Standard easing curves
  standard: [0.4, 0, 0.2, 1] as const,
  decelerate: [0, 0, 0.2, 1] as const,
  accelerate: [0.4, 0, 1, 1] as const,
  // Expressive curves
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
  elastic: [0.68, -0.6, 0.32, 1.6] as const,
  smooth: [0.25, 0.1, 0.25, 1] as const,
};

// ==================== Duration Presets ====================
export const durations = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
};

// ==================== Transition Presets ====================
export const transitions: Record<string, Transition> = {
  // Quick feedback for buttons, toggles
  microFeedback: {
    duration: durations.instant,
    ease: easings.standard,
  },
  // Standard UI transitions
  standard: {
    duration: durations.normal,
    ease: easings.standard,
  },
  // Enter animations
  enter: {
    duration: durations.normal,
    ease: easings.decelerate,
  },
  // Exit animations
  exit: {
    duration: durations.fast,
    ease: easings.accelerate,
  },
  // Bounce effect for emphasis
  bounce: {
    type: "spring",
    stiffness: 400,
    damping: 25,
  },
  // Smooth spring
  spring: {
    type: "spring",
    stiffness: 300,
    damping: 30,
  },
  // Gentle spring for large elements
  gentleSpring: {
    type: "spring",
    stiffness: 200,
    damping: 25,
  },
};

// ==================== Animation Variants ====================

// Fade animations
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: transitions.enter,
  },
  exit: { 
    opacity: 0,
    transition: transitions.exit,
  },
};

// Scale animations
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.spring,
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: transitions.exit,
  },
};

// Pop effect for buttons, cards
export const popVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.bounce,
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    transition: transitions.exit,
  },
  tap: { scale: 0.95 },
  hover: { scale: 1.02 },
};

// Slide variants
export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.enter,
  },
  exit: { 
    opacity: 0, 
    y: 20,
    transition: transitions.exit,
  },
};

export const slideDownVariants: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.enter,
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: transitions.exit,
  },
};

export const slideLeftVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.enter,
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: transitions.exit,
  },
};

export const slideRightVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: transitions.enter,
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: transitions.exit,
  },
};

// ==================== Stagger Containers ====================
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

// Stagger child items
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: transitions.enter,
  },
};

// ==================== Special Effects ====================

// Pulse/glow effect
export const pulseVariants: Variants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatType: "reverse",
    },
  },
};

// Shake effect for errors
export const shakeVariants: Variants = {
  idle: { x: 0 },
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: {
      duration: 0.4,
      ease: easings.standard,
    },
  },
};

// Success checkmark
export const checkmarkVariants: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.4, ease: easings.decelerate },
      opacity: { duration: 0.1 },
    },
  },
};

// Tooltip/popover
export const tooltipVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -5 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { duration: durations.fast, ease: easings.decelerate },
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: durations.instant },
  },
};

// Modal/dialog
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: transitions.spring,
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: durations.fast },
  },
};

// Backdrop
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: durations.normal },
  },
  exit: { 
    opacity: 0,
    transition: { duration: durations.fast },
  },
};

// ==================== Interactive Helpers ====================
export const hoverScale: TargetAndTransition = {
  scale: 1.02,
  transition: transitions.microFeedback,
};

export const tapScale: TargetAndTransition = {
  scale: 0.98,
  transition: transitions.microFeedback,
};

export const hoverLift: TargetAndTransition = {
  y: -2,
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  transition: transitions.standard,
};

// ==================== List Animation Helpers ====================
export function getStaggerDelay(index: number, baseDelay = 0.05): number {
  return index * baseDelay;
}

export function createListVariants(staggerDelay = 0.05): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };
}

// ==================== Animation Presets for Components ====================
export const componentAnimations = {
  button: {
    whileHover: hoverScale,
    whileTap: tapScale,
  },
  card: {
    variants: scaleVariants,
    whileHover: hoverLift,
  },
  listItem: {
    variants: staggerItem,
    whileHover: { x: 4 },
  },
  modal: {
    variants: modalVariants,
    initial: "hidden",
    animate: "visible",
    exit: "exit",
  },
  tooltip: {
    variants: tooltipVariants,
    initial: "hidden",
    animate: "visible",
    exit: "exit",
  },
  notification: {
    variants: slideRightVariants,
    initial: "hidden",
    animate: "visible",
    exit: "exit",
  },
};
