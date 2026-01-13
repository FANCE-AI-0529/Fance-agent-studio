import { motion, AnimatePresence } from "framer-motion";
import { Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PersonalityRefreshIndicatorProps {
  isRefreshing: boolean;
  newPersonalityName?: string;
}

export function PersonalityRefreshIndicator({ 
  isRefreshing, 
  newPersonalityName,
}: PersonalityRefreshIndicatorProps) {
  return (
    <AnimatePresence>
      {isRefreshing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
        >
          {/* Background overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          />

          {/* Content card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 25,
              delay: 0.1
            }}
            className={cn(
              "relative bg-gradient-to-br from-background to-background/90",
              "rounded-3xl p-8 shadow-2xl border border-border/50",
              "flex flex-col items-center gap-4"
            )}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-3xl bg-primary/5 blur-xl -z-10" />

            {/* Animated brain icon */}
            <div className="relative">
              {/* Outer glow ring */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
                className="absolute inset-0 rounded-full bg-primary/20 blur-lg"
              />

              {/* Inner spinning ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className={cn(
                  "w-20 h-20 rounded-full",
                  "border-2 border-dashed border-primary/30",
                  "flex items-center justify-center"
                )}
              >
                {/* Brain icon with pulse */}
                <motion.div
                  animate={{ 
                    scale: [1, 1.1, 1],
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                  }}
                  className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <Brain className="w-8 h-8 text-primary" />
                </motion.div>
              </motion.div>

              {/* Sparkle particles */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                    x: [0, (i - 1) * 30],
                    y: [0, -20 - i * 10],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.3,
                    ease: "easeOut"
                  }}
                  className="absolute top-0 left-1/2 -translate-x-1/2"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                </motion.div>
              ))}
            </div>

            {/* Text content */}
            <div className="text-center space-y-1">
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg font-semibold text-foreground"
              >
                {newPersonalityName 
                  ? `切换到「${newPersonalityName}」模式`
                  : '人设刷新中...'
                }
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground"
              >
                正在调整行为模式
              </motion.p>
            </div>

            {/* Progress dots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.3, 1],
                    opacity: [0.4, 1, 0.4]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-2 h-2 rounded-full bg-primary"
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}