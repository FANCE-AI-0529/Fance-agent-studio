import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils.ts';
import { 
  Bot, 
  Sparkles, 
  Database, 
  Zap, 
  GitBranch, 
  Globe, 
  MessageSquare,
  Send,
  RefreshCw,
  Shuffle,
  Circle
} from 'lucide-react';

interface GhostNodeData {
  id: string;
  nodeType: string;
  label: string;
  description?: string;
  status: 'ghost' | 'materializing' | 'solid';
}

const nodeTypeIcons: Record<string, React.ElementType> = {
  input: MessageSquare,
  output: Send,
  agent: Bot,
  skill: Sparkles,
  knowledge: Database,
  condition: GitBranch,
  loop: RefreshCw,
  api: Globe,
  transform: Shuffle,
  trigger: Zap,
  default: Circle,
};

const nodeTypeColors: Record<string, string> = {
  agent: 'hsl(var(--primary))',
  skill: 'hsl(var(--chart-1))',
  knowledge: 'hsl(var(--chart-2))',
  trigger: 'hsl(var(--chart-3))',
  condition: 'hsl(var(--chart-4))',
  api: 'hsl(var(--chart-5))',
  default: 'hsl(var(--muted-foreground))',
};

export function GhostNode({ data }: NodeProps) {
  const nodeData = data as unknown as GhostNodeData;
  const { status, label, description, nodeType } = nodeData;
  
  const Icon = nodeTypeIcons[nodeType] || nodeTypeIcons.default;
  const color = nodeTypeColors[nodeType] || nodeTypeColors.default;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: -20 }}
      animate={{ 
        opacity: status === 'ghost' ? 0.5 : status === 'materializing' ? 0.8 : 1,
        scale: status === 'ghost' ? 0.9 : 1,
        y: 0,
      }}
      transition={{ 
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
      className={cn(
        "relative px-4 py-3 rounded-xl border-2 min-w-[160px] max-w-[200px]",
        status === 'ghost' && "border-dashed border-primary/50 bg-primary/5",
        status === 'materializing' && "border-dashed border-primary/70 bg-primary/10",
        status === 'solid' && "border-solid border-border bg-card shadow-lg",
      )}
      style={{
        borderColor: status === 'solid' ? color : undefined,
      }}
    >
      {/* 物化动画 - 粒子效果 */}
      {status === 'materializing' && (
        <motion.div
          className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: color }}
              initial={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                opacity: 0,
                scale: 0,
              }}
              animate={{
                x: '50%',
                y: '50%',
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 0.6,
                delay: i * 0.04,
                ease: "easeInOut",
              }}
            />
          ))}
        </motion.div>
      )}
      
      {/* 图标和标签 */}
      <div className={cn(
        "flex items-center gap-2",
        status === 'ghost' && "opacity-60"
      )}>
        <div 
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ 
            backgroundColor: status === 'solid' ? `${color}20` : 'hsl(var(--muted))',
          }}
        >
          <Icon 
            className="h-4 w-4" 
            style={{ color: status === 'solid' ? color : 'hsl(var(--muted-foreground))' }}
          />
        </div>
        <span className="font-medium text-sm truncate">{label}</span>
      </div>
      
      {/* 描述 */}
      {description && (
        <p className={cn(
          "text-xs mt-2 line-clamp-2",
          status === 'ghost' ? "text-muted-foreground/60" : "text-muted-foreground"
        )}>
          {description}
        </p>
      )}
      
      {/* Ghost 状态标记 */}
      {status === 'ghost' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute -top-2 -right-2 text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium"
        >
          构思中
        </motion.div>
      )}

      {/* Materializing 状态标记 */}
      {status === 'materializing' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute -top-2 -right-2 text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium"
        >
          生成中
        </motion.div>
      )}
      
      {/* 连接点 */}
      <Handle 
        type="target" 
        position={Position.Left}
        className={cn(
          "!w-3 !h-3 !border-2",
          status === 'solid' ? "!bg-background !border-border" : "!bg-muted !border-muted-foreground/30"
        )}
      />
      <Handle 
        type="source" 
        position={Position.Right}
        className={cn(
          "!w-3 !h-3 !border-2",
          status === 'solid' ? "!bg-background !border-border" : "!bg-muted !border-muted-foreground/30"
        )}
      />
    </motion.div>
  );
}

export default GhostNode;
