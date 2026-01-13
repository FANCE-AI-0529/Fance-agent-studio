import { motion } from "framer-motion";
import { Sparkles, MessageSquare } from "lucide-react";

interface MagicCompleteProps {
  agentName?: string;
  onContinue?: () => void;
}

export function MagicComplete({ agentName = "智能助手", onContinue }: MagicCompleteProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="flex flex-col items-center justify-center min-h-[400px] text-center px-4"
    >
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: 'spring', 
          stiffness: 200, 
          damping: 15,
          delay: 0.1 
        }}
        className="relative mb-8"
      >
        {/* Glow ring */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 w-24 h-24 bg-green-500/30 rounded-full blur-xl"
        />
        
        {/* Icon container */}
        <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
          <Sparkles className="h-12 w-12 text-white" />
        </div>
      </motion.div>

      {/* Success message */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
          {agentName} 已就绪
        </h2>
        <p className="text-muted-foreground mb-8">
          你的数字员工已创建完成，开始对话吧
        </p>
      </motion.div>

      {/* Continue hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-2 text-sm text-primary"
      >
        <MessageSquare className="h-4 w-4" />
        <span>正在进入对话...</span>
      </motion.div>

      {/* Particle effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ 
              opacity: 0,
              scale: 0,
              x: "50%",
              y: "50%",
            }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0, 1, 0.5],
              x: `${50 + (Math.random() - 0.5) * 60}%`,
              y: `${50 + (Math.random() - 0.5) * 60}%`,
            }}
            transition={{
              duration: 2,
              delay: 0.2 + i * 0.1,
              ease: "easeOut",
            }}
            className="absolute w-3 h-3 bg-primary/40 rounded-full"
          />
        ))}
      </div>
    </motion.div>
  );
}
