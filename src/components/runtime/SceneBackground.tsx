import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SceneConfig {
  id: string;
  name: string;
  description?: string;
  gradient: string;
  particleColor?: string;
  showParticles?: boolean;
}

// Predefined scene themes
export const scenePresets: Record<string, SceneConfig> = {
  default: {
    id: "default",
    name: "默认",
    gradient: "from-background via-background to-background",
    showParticles: false,
  },
  interview: {
    id: "interview",
    name: "面试模拟",
    description: "专业商务氛围",
    gradient: "from-slate-900/50 via-background to-slate-800/30",
    particleColor: "bg-blue-400/20",
    showParticles: true,
  },
  training: {
    id: "training",
    name: "培训学习",
    description: "温馨学习环境",
    gradient: "from-amber-900/20 via-background to-orange-900/10",
    particleColor: "bg-amber-400/20",
    showParticles: true,
  },
  counseling: {
    id: "counseling",
    name: "心理咨询",
    description: "舒适放松空间",
    gradient: "from-green-900/20 via-background to-teal-900/10",
    particleColor: "bg-green-400/20",
    showParticles: true,
  },
  creative: {
    id: "creative",
    name: "创意头脑风暴",
    description: "激发灵感氛围",
    gradient: "from-purple-900/30 via-background to-pink-900/20",
    particleColor: "bg-purple-400/30",
    showParticles: true,
  },
  roleplay: {
    id: "roleplay",
    name: "角色扮演",
    description: "沉浸式体验",
    gradient: "from-indigo-900/30 via-background to-violet-900/20",
    particleColor: "bg-indigo-400/20",
    showParticles: true,
  },
  customer_service: {
    id: "customer_service",
    name: "客服培训",
    description: "服务场景模拟",
    gradient: "from-cyan-900/20 via-background to-blue-900/10",
    particleColor: "bg-cyan-400/20",
    showParticles: true,
  },
};

interface SceneBackgroundProps {
  scene?: SceneConfig | string;
  showDescription?: boolean;
  agentRole?: string;
  userRole?: string;
  className?: string;
  children?: React.ReactNode;
}

// Floating particle component
function FloatingParticle({ 
  color, 
  delay, 
  duration, 
  size,
  startX,
  startY,
}: { 
  color: string; 
  delay: number;
  duration: number;
  size: number;
  startX: number;
  startY: number;
}) {
  return (
    <motion.div
      className={cn("absolute rounded-full blur-sm", color)}
      style={{
        width: size,
        height: size,
        left: `${startX}%`,
        top: `${startY}%`,
      }}
      animate={{
        y: [0, -30, 0],
        x: [0, Math.random() > 0.5 ? 15 : -15, 0],
        opacity: [0.3, 0.6, 0.3],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

export function SceneBackground({
  scene = "default",
  showDescription = true,
  agentRole,
  userRole,
  className,
  children,
}: SceneBackgroundProps) {
  const sceneConfig = typeof scene === "string" ? scenePresets[scene] || scenePresets.default : scene;
  
  // Generate random particles
  const particles = sceneConfig.showParticles
    ? Array.from({ length: 12 }, (_, i) => ({
        id: i,
        color: sceneConfig.particleColor || "bg-primary/20",
        delay: Math.random() * 2,
        duration: 4 + Math.random() * 3,
        size: 4 + Math.random() * 8,
        startX: Math.random() * 100,
        startY: Math.random() * 100,
      }))
    : [];

  return (
    <div className={cn("relative min-h-full overflow-hidden", className)}>
      {/* Gradient background */}
      <motion.div
        className={cn(
          "absolute inset-0 bg-gradient-to-br transition-all duration-1000",
          sceneConfig.gradient
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <FloatingParticle
          key={p.id}
          color={p.color}
          delay={p.delay}
          duration={p.duration}
          size={p.size}
          startX={p.startX}
          startY={p.startY}
        />
      ))}

      {/* Scene info card */}
      {showDescription && sceneConfig.id !== "default" && (
        <motion.div
          className="absolute top-4 left-4 right-4 z-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-3 max-w-md">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium">{sceneConfig.name}</span>
            </div>
            {sceneConfig.description && (
              <p className="text-xs text-muted-foreground">{sceneConfig.description}</p>
            )}
            {(agentRole || userRole) && (
              <div className="mt-2 pt-2 border-t border-border/50 flex flex-wrap gap-2 text-xs">
                {agentRole && (
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">
                    AI: {agentRole}
                  </span>
                )}
                {userRole && (
                  <span className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded">
                    你: {userRole}
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Content */}
      <div className="relative z-0">{children}</div>
    </div>
  );
}

export default SceneBackground;
