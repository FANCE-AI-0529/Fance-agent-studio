import { cn } from "@/lib/utils";
import { LucideIcon, Bot, Cpu, Sparkles, MousePointer2 } from "lucide-react";
import { Button } from "./button";
import { motion, AnimatePresence } from "framer-motion";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  type?: "dashboard" | "builder" | "foundry" | "runtime";
}

// Animated SVG illustrations for each empty state
function DashboardIllustration() {
  return (
    <motion.svg
      width="200"
      height="160"
      viewBox="0 0 200 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Grid pattern */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 0.2 }}
      >
        {[...Array(5)].map((_, i) => (
          <line
            key={`h-${i}`}
            x1="20"
            y1={30 + i * 25}
            x2="180"
            y2={30 + i * 25}
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="4 4"
          />
        ))}
        {[...Array(5)].map((_, i) => (
          <line
            key={`v-${i}`}
            x1={40 + i * 35}
            y1="20"
            x2={40 + i * 35}
            y2="140"
            stroke="currentColor"
            strokeOpacity="0.1"
            strokeDasharray="4 4"
          />
        ))}
      </motion.g>

      {/* Central bot icon */}
      <motion.circle
        cx="100"
        cy="80"
        r="35"
        fill="hsl(var(--primary) / 0.1)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
      />
      <motion.circle
        cx="100"
        cy="80"
        r="25"
        fill="hsl(var(--primary) / 0.2)"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
      />
      
      {/* Orbiting dots */}
      {[0, 72, 144, 216, 288].map((angle, i) => (
        <motion.circle
          key={i}
          cx={100 + Math.cos((angle * Math.PI) / 180) * 50}
          cy={80 + Math.sin((angle * Math.PI) / 180) * 40}
          r="6"
          fill="hsl(var(--cognitive))"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0.4, 1, 0.4], scale: 1 }}
          transition={{
            delay: 0.5 + i * 0.1,
            opacity: { duration: 2, repeat: Infinity, delay: i * 0.3 },
          }}
        />
      ))}

      {/* Connection lines */}
      <motion.g
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.3 }}
        transition={{ delay: 0.6, duration: 1 }}
      >
        {[0, 72, 144, 216, 288].map((angle, i) => (
          <line
            key={i}
            x1="100"
            y1="80"
            x2={100 + Math.cos((angle * Math.PI) / 180) * 50}
            y2={80 + Math.sin((angle * Math.PI) / 180) * 40}
            stroke="hsl(var(--primary))"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        ))}
      </motion.g>
    </motion.svg>
  );
}

function BuilderIllustration() {
  return (
    <motion.div className="relative">
      <motion.svg
        width="240"
        height="180"
        viewBox="0 0 240 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Canvas outline */}
        <motion.rect
          x="40"
          y="30"
          width="160"
          height="120"
          rx="8"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          strokeDasharray="8 4"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1 }}
        />

        {/* Central agent placeholder */}
        <motion.circle
          cx="120"
          cy="90"
          r="30"
          fill="hsl(var(--cognitive) / 0.1)"
          stroke="hsl(var(--cognitive) / 0.3)"
          strokeWidth="2"
          strokeDasharray="6 6"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
        />
        <motion.text
          x="120"
          y="95"
          textAnchor="middle"
          fontSize="12"
          fill="hsl(var(--cognitive))"
          className="font-mono"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Agent
        </motion.text>

        {/* Skill placeholders */}
        {[
          { x: 60, y: 50 },
          { x: 180, y: 50 },
          { x: 60, y: 130 },
          { x: 180, y: 130 },
        ].map((pos, i) => (
          <motion.rect
            key={i}
            x={pos.x - 20}
            y={pos.y - 12}
            width="40"
            height="24"
            rx="4"
            fill="hsl(var(--muted) / 0.5)"
            stroke="hsl(var(--border))"
            strokeDasharray="4 4"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.5, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.1 }}
          />
        ))}
      </motion.svg>

      {/* Animated arrow pointing to marketplace */}
      <motion.div
        className="absolute -left-12 top-1/2 -translate-y-1/2"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: [0, -10, 0] }}
        transition={{
          delay: 1.2,
          x: { duration: 1.5, repeat: Infinity },
        }}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <MousePointer2 className="h-5 w-5 rotate-180" />
          <span className="text-xs whitespace-nowrap font-mono">从左侧拖拽技能</span>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FoundryIllustration() {
  return (
    <motion.svg
      width="160"
      height="120"
      viewBox="0 0 160 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Code editor lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.g key={i}>
          <motion.rect
            x="20"
            y={20 + i * 18}
            width={60 + (i % 3) * 20}
            height="10"
            rx="2"
            fill="hsl(var(--muted))"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 0.3 + (i % 3) * 0.2 }}
            transition={{ delay: 0.1 * i, duration: 0.3 }}
          />
        </motion.g>
      ))}

      {/* Sparkle icon area */}
      <motion.circle
        cx="130"
        cy="60"
        r="25"
        fill="hsl(var(--governance) / 0.1)"
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.6, type: "spring" }}
      />
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <Sparkles className="text-governance" x="118" y="48" width="24" height="24" />
      </motion.g>
    </motion.svg>
  );
}

function RuntimeIllustration() {
  return (
    <motion.svg
      width="180"
      height="140"
      viewBox="0 0 180 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Chat bubbles */}
      <motion.rect
        x="20"
        y="30"
        width="80"
        height="30"
        rx="15"
        fill="hsl(var(--card))"
        stroke="hsl(var(--border))"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      />
      <motion.rect
        x="80"
        y="70"
        width="80"
        height="30"
        rx="15"
        fill="hsl(var(--primary) / 0.1)"
        stroke="hsl(var(--primary) / 0.3)"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      />

      {/* Typing indicator */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={i}
            cx={40 + i * 12}
            cy="115"
            r="4"
            fill="hsl(var(--muted-foreground))"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </motion.g>
    </motion.svg>
  );
}

const illustrations: Record<string, React.FC> = {
  dashboard: DashboardIllustration,
  builder: BuilderIllustration,
  foundry: FoundryIllustration,
  runtime: RuntimeIllustration,
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  type,
}: EmptyStateProps) {
  const Illustration = type ? illustrations[type] : null;

  return (
    <motion.div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {Illustration ? (
        <Illustration />
      ) : Icon ? (
        <motion.div 
          className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <Icon className="h-8 w-8 text-muted-foreground/50" />
        </motion.div>
      ) : null}
      
      <motion.h3 
        className="text-lg font-semibold mb-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {title}
      </motion.h3>
      <motion.p 
        className="text-sm text-muted-foreground max-w-sm mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {description}
      </motion.p>
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button onClick={action.onClick} className="gap-2">
            {action.label}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// Animated container for lists with staggered children
export function AnimatedList({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.05,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedListItem({ 
  children, 
  className = "" 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      {children}
    </motion.div>
  );
}

// Fade transition wrapper
export function FadeTransition({ 
  children, 
  show = true,
  className = ""
}: { 
  children: React.ReactNode; 
  show?: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Scale in animation for cards
export function ScaleIn({ 
  children, 
  delay = 0,
  className = ""
}: { 
  children: React.ReactNode; 
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

// Collapse/Expand animation for accordion-like content
export function Collapse({ 
  children, 
  isOpen,
  className = ""
}: { 
  children: React.ReactNode; 
  isOpen: boolean;
  className?: string;
}) {
  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          className={className}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Pulse animation for status indicators
export function PulseIndicator({ 
  color = "primary",
  size = "sm"
}: { 
  color?: "primary" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
}) {
  const colors = {
    primary: "bg-primary",
    success: "bg-status-executing",
    warning: "bg-status-confirm",
    error: "bg-destructive",
  };

  const sizes = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  return (
    <span className="relative flex">
      <motion.span
        className={`absolute inline-flex h-full w-full rounded-full ${colors[color]} opacity-75`}
        animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <span className={`relative inline-flex rounded-full ${colors[color]} ${sizes[size]}`} />
    </span>
  );
}
