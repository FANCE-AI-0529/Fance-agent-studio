import { motion } from "framer-motion";
import { MousePointer2, ArrowDown, Sparkles, Grid3X3 } from "lucide-react";
import { cn } from "../../lib/utils.ts";

interface DragDropHintProps {
  className?: string;
  isVisible?: boolean;
}

export function DragDropHint({ className, isVisible = true }: DragDropHintProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "absolute inset-0 flex items-center justify-center pointer-events-none z-10",
        className
      )}
    >
      <div className="text-center space-y-4 p-8">
        {/* Animated drag hint */}
        <motion.div
          className="relative mx-auto w-24 h-24"
          initial={{ y: 0 }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5" />
          <motion.div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            animate={{ 
              x: [-20, 0, 0],
              y: [-20, 0, 10],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="flex items-center gap-1">
              <MousePointer2 className="h-5 w-5 text-primary" />
              <div className="w-12 h-8 rounded-md bg-primary/20 border border-primary/30" />
            </div>
          </motion.div>
          <motion.div
            className="absolute bottom-2 left-1/2 -translate-x-1/2"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          >
            <ArrowDown className="h-4 w-4 text-primary" />
          </motion.div>
        </motion.div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">
            拖放技能到画布
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            从左侧技能市场拖拽技能卡片到中央画布，技能会自动连接到您的智能体
          </p>
        </div>

        {/* Quick tips */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
            <span>支持多技能组合</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Grid3X3 className="h-3.5 w-3.5 text-blue-500" />
            <span>自动布局排列</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface CanvasEmptyStateProps {
  onStartWizard?: () => void;
  className?: string;
}

export function CanvasEmptyState({ onStartWizard, className }: CanvasEmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center h-full p-8", className)}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center space-y-6 max-w-md"
      >
        {/* Animated agent placeholder */}
        <motion.div
          className="relative mx-auto w-32 h-32"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30" />
          <div className="absolute inset-4 rounded-xl bg-card border border-border flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="h-10 w-10 text-primary/60" />
            </motion.div>
          </div>
          
          {/* Floating skill hints */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute w-8 h-8 rounded-md bg-muted border border-border"
              style={{
                top: `${20 + i * 25}%`,
                left: i === 1 ? "-40px" : "auto",
                right: i !== 1 ? "-40px" : "auto",
              }}
              animate={{
                x: i === 1 ? [-5, 5, -5] : [5, -5, 5],
                y: [0, -3, 0],
              }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </motion.div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold">创建您的智能体</h3>
          <p className="text-sm text-muted-foreground">
            右侧配置基本信息，然后从左侧拖拽技能开始构建
          </p>
        </div>

        {onStartWizard && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStartWizard}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            使用向导快速创建
          </motion.button>
        )}
      </motion.div>
    </div>
  );
}
