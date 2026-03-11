import { motion } from "framer-motion";
import { 
  Sparkles, 
  Unplug, 
  Brain, 
  BookOpen, 
  Bell,
  ChevronRight,
  Puzzle,
  Wand2,
  Play,
} from "lucide-react";
import { cn } from "../../lib/utils.ts";
import { Button } from "../ui/button.tsx";

export type SystemMessageType = 
  | 'skill_added' 
  | 'skill_removed' 
  | 'config_updated' 
  | 'knowledge_mounted'
  | 'knowledge_removed'
  | 'mcp_connected'
  | 'personality_updated';

export interface SystemMessage {
  id: string;
  type: SystemMessageType;
  title: string;
  description: string;
  skillName?: string;
  suggestion?: string; // 试用建议
  timestamp: Date;
}

interface SystemBubbleProps {
  message: SystemMessage;
  onExpand?: () => void;
  onTryIt?: (suggestion: string) => void; // 试用建议回调
}

const typeConfig: Record<SystemMessageType, {
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  label: string;
}> = {
  skill_added: {
    icon: Sparkles,
    colorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    borderClass: 'border-emerald-500/30',
    label: '能力上线',
  },
  skill_removed: {
    icon: Unplug,
    colorClass: 'text-orange-500',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30',
    label: '能力下线',
  },
  config_updated: {
    icon: Brain,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    label: '配置更新',
  },
  knowledge_mounted: {
    icon: BookOpen,
    colorClass: 'text-purple-500',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    label: '知识库挂载',
  },
  knowledge_removed: {
    icon: BookOpen,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    label: '知识库移除',
  },
  mcp_connected: {
    icon: Puzzle,
    colorClass: 'text-indigo-500',
    bgClass: 'bg-indigo-500/10',
    borderClass: 'border-indigo-500/30',
    label: '新能力已连接',
  },
  personality_updated: {
    icon: Wand2,
    colorClass: 'text-fuchsia-500',
    bgClass: 'bg-fuchsia-500/10',
    borderClass: 'border-fuchsia-500/30',
    label: '角色设定已更新',
  },
};

export function SystemBubble({ message, onExpand, onTryIt }: SystemBubbleProps) {
  const config = typeConfig[message.type];
  const Icon = config.icon;

  // 是否显示"试一试"按钮
  const showTryIt = message.suggestion && onTryIt && 
    (message.type === 'mcp_connected' || message.type === 'skill_added');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="flex justify-center my-4"
    >
      <div
        className={cn(
          "relative max-w-md w-full px-4 py-3 rounded-2xl",
          "bg-gradient-to-br from-background/80 to-background/60",
          "backdrop-blur-xl border shadow-lg",
          config.borderClass
        )}
      >
        {/* Glow effect */}
        <div 
          className={cn(
            "absolute inset-0 rounded-2xl opacity-20 blur-xl -z-10",
            config.bgClass
          )}
        />

        <div className="flex items-start gap-3">
          {/* Icon */}
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
              config.bgClass
            )}
          >
            <Icon className={cn("h-4 w-4", config.colorClass)} />
          </motion.div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-xs text-muted-foreground/80 font-medium">
                {config.label}
              </span>
            </div>
            
            <h4 className={cn("font-semibold text-sm", config.colorClass)}>
              {message.title}
            </h4>
            
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {message.description}
            </p>

            {/* Actions row */}
            <div className="flex items-center gap-2 mt-2">
              {/* Try it button */}
              {showTryIt && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onTryIt(message.suggestion!)}
                  className={cn(
                    "h-7 px-2 text-xs font-medium gap-1",
                    "hover:bg-transparent",
                    config.colorClass
                  )}
                >
                  <Play className="h-3 w-3" />
                  试一试
                </Button>
              )}

              {/* Expand action */}
              {onExpand && (
                <button
                  onClick={onExpand}
                  className={cn(
                    "text-xs font-medium flex items-center gap-1",
                    "opacity-60 hover:opacity-100 transition-opacity",
                    config.colorClass
                  )}
                >
                  了解更多
                  <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Timestamp */}
          <span className="text-[10px] text-muted-foreground/50 flex-shrink-0">
            {message.timestamp.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
