import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, Smile, HelpCircle, Sparkles, Zap, Heart,
  // Tech-focused icons (synced with AgentAvatarPicker)
  CircuitBoard, Network, Terminal, Binary, Satellite, Radar,
  Atom, AudioWaveform, ScanFace, Workflow, Fingerprint, Eye,
  Layers, Server, Webhook, Cable, Brain, Cpu, Database, Code,
  MessageSquare, Globe, Shield, FileText, Search, Settings,
  Users, Briefcase, Building2, GraduationCap, HeartPulse, Scale,
  Landmark, Car, Plane, ShoppingCart, Wallet, Calculator,
  Lightbulb, Microscope, Palette, Music, Camera, Home, Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Avatar icon options (synced with AgentAvatarPicker for consistency)
const avatarIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  // Tech icons
  circuit: CircuitBoard,
  network: Network,
  terminal: Terminal,
  binary: Binary,
  satellite: Satellite,
  radar: Radar,
  atom: Atom,
  waveform: AudioWaveform,
  "scan-face": ScanFace,
  workflow: Workflow,
  fingerprint: Fingerprint,
  eye: Eye,
  layers: Layers,
  server: Server,
  webhook: Webhook,
  cable: Cable,
  // Core AI icons
  bot: Bot,
  brain: Brain,
  cpu: Cpu,
  sparkles: Sparkles,
  zap: Zap,
  // General icons
  shield: Shield,
  globe: Globe,
  "file-text": FileText,
  database: Database,
  code: Code,
  "message-square": MessageSquare,
  search: Search,
  settings: Settings,
  users: Users,
  briefcase: Briefcase,
  building2: Building2,
  "graduation-cap": GraduationCap,
  "heart-pulse": HeartPulse,
  scale: Scale,
  landmark: Landmark,
  car: Car,
  plane: Plane,
  "shopping-cart": ShoppingCart,
  wallet: Wallet,
  calculator: Calculator,
  lightbulb: Lightbulb,
  microscope: Microscope,
  palette: Palette,
  music: Music,
  camera: Camera,
  home: Home,
  leaf: Leaf,
  // Legacy fallbacks
  heart: Heart,
  smile: Smile,
  help: HelpCircle,
};

// Color options using semantic design tokens - matching AgentAvatarPicker colors
const avatarColors: Record<string, { bg: string; text: string; glow: string; dotBg: string; borderColor: string }> = {
  primary: { bg: "bg-primary/20", text: "text-primary", glow: "shadow-primary/50", dotBg: "bg-primary", borderColor: "border-primary" },
  blue: { bg: "bg-blue-500/20", text: "text-blue-500", glow: "shadow-blue-500/50", dotBg: "bg-blue-500", borderColor: "border-blue-500" },
  green: { bg: "bg-emerald-500/20", text: "text-emerald-500", glow: "shadow-emerald-500/50", dotBg: "bg-emerald-500", borderColor: "border-emerald-500" },
  purple: { bg: "bg-violet-500/20", text: "text-violet-500", glow: "shadow-violet-500/50", dotBg: "bg-violet-500", borderColor: "border-violet-500" },
  pink: { bg: "bg-pink-500/20", text: "text-pink-500", glow: "shadow-pink-500/50", dotBg: "bg-pink-500", borderColor: "border-pink-500" },
  orange: { bg: "bg-orange-500/20", text: "text-orange-500", glow: "shadow-orange-500/50", dotBg: "bg-orange-500", borderColor: "border-orange-500" },
  cyan: { bg: "bg-cyan-500/20", text: "text-cyan-500", glow: "shadow-cyan-500/50", dotBg: "bg-cyan-500", borderColor: "border-cyan-500" },
  rose: { bg: "bg-rose-500/20", text: "text-rose-500", glow: "shadow-rose-500/50", dotBg: "bg-rose-500", borderColor: "border-rose-500" },
  amber: { bg: "bg-amber-500/20", text: "text-amber-500", glow: "shadow-amber-500/50", dotBg: "bg-amber-500", borderColor: "border-amber-500" },
  indigo: { bg: "bg-indigo-500/20", text: "text-indigo-500", glow: "shadow-indigo-500/50", dotBg: "bg-indigo-500", borderColor: "border-indigo-500" },
  teal: { bg: "bg-teal-500/20", text: "text-teal-500", glow: "shadow-teal-500/50", dotBg: "bg-teal-500", borderColor: "border-teal-500" },
  fuchsia: { bg: "bg-fuchsia-500/20", text: "text-fuchsia-500", glow: "shadow-fuchsia-500/50", dotBg: "bg-fuchsia-500", borderColor: "border-fuchsia-500" },
};

export type AvatarState = "idle" | "thinking" | "speaking" | "listening" | "happy" | "confused";

interface AgentAvatarAnimatedProps {
  iconId?: string;
  colorId?: string;
  state?: AvatarState;
  size?: "sm" | "md" | "lg" | "xl";
  showGlow?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "w-8 h-8",
  md: "w-12 h-12",
  lg: "w-16 h-16",
  xl: "w-24 h-24",
};

const iconSizeMap = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

// Animation variants for different states
const stateAnimations = {
  idle: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
  thinking: {
    rotate: [0, -5, 5, -5, 0],
    scale: [1, 1.05, 1],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
  speaking: {
    scale: [1, 1.1, 1, 1.08, 1],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
  listening: {
    scale: [1, 1.03, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
  happy: {
    scale: [1, 1.15, 1],
    rotate: [0, 10, -10, 0],
    transition: {
      duration: 0.6,
      repeat: 2,
      ease: "easeInOut" as const,
    },
  },
  confused: {
    rotate: [0, -15, 15, -15, 0],
    transition: {
      duration: 0.8,
      repeat: 2,
      ease: "easeInOut" as const,
    },
  },
};

// Glow ring animation
const glowAnimation = {
  idle: {
    opacity: [0.3, 0.5, 0.3],
    scale: [1, 1.1, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
  thinking: {
    opacity: [0.5, 0.8, 0.5],
    scale: [1, 1.2, 1],
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
  speaking: {
    opacity: [0.6, 1, 0.6],
    scale: [1, 1.3, 1],
    transition: {
      duration: 0.4,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

export function AgentAvatarAnimated({
  iconId = "bot",
  colorId = "blue",
  state = "idle",
  size = "md",
  showGlow = true,
  className,
}: AgentAvatarAnimatedProps) {
  const IconComponent = avatarIcons[iconId] || Bot;
  const colors = avatarColors[colorId] || avatarColors.blue;

  const currentGlowAnim = glowAnimation[state as keyof typeof glowAnimation] || glowAnimation.idle;
  const currentStateAnim = stateAnimations[state as keyof typeof stateAnimations] || stateAnimations.idle;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      {/* Glow ring */}
      {showGlow && (
        <motion.div
          className={cn(
            "absolute inset-0 rounded-full blur-md",
            colors.bg,
            colors.glow
          )}
          animate={currentGlowAnim}
        />
      )}

      {/* Main avatar container */}
      <motion.div
        className={cn(
          "relative rounded-full flex items-center justify-center",
          sizeMap[size],
          colors.bg,
          "backdrop-blur-sm border border-border/50"
        )}
        animate={currentStateAnim}
        initial={{ scale: 1 }}
      >
        {/* Icon */}
        <IconComponent className={cn(iconSizeMap[size], colors.text)} />

        {/* State indicator dots */}
        <AnimatePresence>
          {state === "thinking" && (
            <motion.div
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className={cn("w-1 h-1 rounded-full", colors.dotBg)}
                  animate={{
                    y: [0, -3, 0],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speaking waves */}
        <AnimatePresence>
          {state === "speaking" && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className={cn(
                    "absolute inset-0 rounded-full border-2",
                    colors.borderColor
                  )}
                  initial={{ scale: 1, opacity: 0.5 }}
                  animate={{
                    scale: [1, 1.3 + i * 0.2],
                    opacity: [0.5, 0],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Listening pulse */}
        <AnimatePresence>
          {state === "listening" && (
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full",
                colors.bg
              )}
              initial={{ scale: 1 }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.2, 0.5],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Expression overlay */}
      <AnimatePresence>
        {state === "happy" && (
          <motion.div
            className="absolute -top-1 -right-1"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <Sparkles className="h-3 w-3 text-yellow-400" />
          </motion.div>
        )}
        {state === "confused" && (
          <motion.div
            className="absolute -top-1 -right-1"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
          >
            <HelpCircle className="h-3 w-3 text-orange-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AgentAvatarAnimated;
