import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, Wrench, BookOpen, Zap, Database, 
  MessageSquare, GitBranch, UserCheck, Puzzle,
  ArrowRight
} from 'lucide-react';
import { cn } from '../../lib/utils.ts';

interface MiniPreviewTooltipProps {
  nodeType: string;
  keyword: string | null;
  isVisible: boolean;
  className?: string;
}

// Node type configuration
const NODE_CONFIG: Record<string, {
  icon: React.ElementType;
  label: string;
  color: string;
  description: string;
}> = {
  manus: {
    icon: Brain,
    label: '核心思维',
    color: 'text-primary',
    description: '正在进行推理分析',
  },
  manusKernel: {
    icon: Brain,
    label: '核心思维',
    color: 'text-primary',
    description: '正在进行推理分析',
  },
  skill: {
    icon: Wrench,
    label: '技能',
    color: 'text-blue-400',
    description: '正在执行技能操作',
  },
  knowledge: {
    icon: BookOpen,
    label: '知识库',
    color: 'text-emerald-400',
    description: '正在检索知识文档',
  },
  knowledgeBase: {
    icon: BookOpen,
    label: '知识库',
    color: 'text-emerald-400',
    description: '正在检索知识文档',
  },
  trigger: {
    icon: Zap,
    label: '触发器',
    color: 'text-amber-400',
    description: '触发条件已满足',
  },
  output: {
    icon: MessageSquare,
    label: '输出',
    color: 'text-purple-400',
    description: '正在生成回复',
  },
  action: {
    icon: Database,
    label: '动作',
    color: 'text-cyan-400',
    description: '正在执行操作',
  },
  mcpAction: {
    icon: Database,
    label: 'MCP 动作',
    color: 'text-cyan-400',
    description: '正在调用外部服务',
  },
  router: {
    icon: GitBranch,
    label: '路由',
    color: 'text-teal-400',
    description: '正在进行条件判断',
  },
  intervention: {
    icon: UserCheck,
    label: '人工介入',
    color: 'text-rose-400',
    description: '等待人工确认',
  },
  mcp: {
    icon: Puzzle,
    label: 'MCP 工具',
    color: 'text-indigo-400',
    description: '正在调用外部服务',
  },
  mcpTool: {
    icon: Puzzle,
    label: 'MCP 工具',
    color: 'text-indigo-400',
    description: '正在调用外部服务',
  },
};

export const MiniPreviewTooltip = React.memo(({
  nodeType,
  keyword,
  isVisible,
  className,
}: MiniPreviewTooltipProps) => {
  const config = NODE_CONFIG[nodeType] || NODE_CONFIG.skill;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={cn(
            "absolute z-10 pointer-events-none",
            "px-3 py-2 rounded-lg",
            "bg-popover/95 backdrop-blur-md",
            "border border-border/50",
            "shadow-lg shadow-black/20",
            className
          )}
        >
          <div className="flex items-center gap-2">
            {/* Node icon */}
            <div className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center",
              "bg-muted/50"
            )}>
              <Icon className={cn("w-3.5 h-3.5", config.color)} />
            </div>

            {/* Content */}
            <div className="flex flex-col">
              <span className={cn("text-xs font-medium", config.color)}>
                {config.label}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {config.description}
              </span>
            </div>

            {/* Flow indicator */}
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="ml-1"
            >
              <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
            </motion.div>
          </div>

          {/* Matched keyword badge */}
          {keyword && (
            <div className="mt-1.5 pt-1.5 border-t border-border/30">
              <span className="text-[9px] text-muted-foreground/70">
                触发词: <span className="text-foreground/80">{keyword}</span>
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

MiniPreviewTooltip.displayName = 'MiniPreviewTooltip';