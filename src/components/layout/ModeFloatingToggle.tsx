import { motion } from "framer-motion";
import { Terminal, Sparkles } from "lucide-react";
import { Button } from "../ui/button.tsx";
import { useAppModeStore } from "../../stores/appModeStore.ts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip.tsx";

export function ModeFloatingToggle() {
  const { mode, toggleMode } = useAppModeStore();
  
  const isConsumerMode = mode === 'consumer';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggleMode}
            size="lg"
            className={`
              rounded-full shadow-lg transition-all duration-300
              ${isConsumerMode 
                ? 'bg-card/80 hover:bg-card text-foreground border border-border/50 backdrop-blur-sm' 
                : 'bg-primary/90 hover:bg-primary text-primary-foreground'
              }
              group
            `}
          >
            {isConsumerMode ? (
              <>
                <Terminal className="h-4 w-4 mr-2" />
                <span className="text-sm">进入工作室</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                <span className="text-sm">返回魔法界面</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <div className="flex items-center gap-2">
            <span>{isConsumerMode ? '切换到开发者模式' : '切换到用户模式'}</span>
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
              Ctrl+Shift+D
            </kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}
