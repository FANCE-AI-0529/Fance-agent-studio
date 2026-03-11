import React from 'react';
import { Brain, Sparkles } from 'lucide-react';
import { Badge } from '../ui/badge.tsx';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip.tsx';
import { cn } from '../../lib/utils.ts';
import { MANUS_KERNEL } from '../../data/manusKernel.ts';

interface ManusKernelBadgeProps {
  className?: string;
  showVersion?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ManusKernelBadge({ 
  className,
  showVersion = true,
  size = 'md'
}: ManusKernelBadgeProps) {
  const sizeClasses = {
    sm: 'text-[9px] px-1 py-0 h-4',
    md: 'text-[10px] px-1.5 py-0.5 h-5',
    lg: 'text-xs px-2 py-1 h-6'
  };

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-4 w-4'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline"
            className={cn(
              "gap-1 border-cognitive/50 text-cognitive bg-cognitive/5 cursor-help",
              sizeClasses[size],
              className
            )}
          >
            <Brain className={iconSizes[size]} />
            <span>Manus</span>
            {showVersion && (
              <span className="opacity-60">v{MANUS_KERNEL.version}</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-cognitive" />
              <span className="font-medium">{MANUS_KERNEL.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {MANUS_KERNEL.description}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              <Badge variant="secondary" className="text-[9px]">
                <Sparkles className="h-2 w-2 mr-0.5" />
                自动规划
              </Badge>
              <Badge variant="secondary" className="text-[9px]">
                知识沉淀
              </Badge>
              <Badge variant="secondary" className="text-[9px]">
                进度追踪
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground pt-1 border-t border-border">
              <div>• 2-Action Rule: 每 2 次浏览更新发现</div>
              <div>• 3-Strike Protocol: 智能错误处理</div>
              <div>• 5-Question Reboot: 上下文恢复</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// 用于 Builder 中显示内核已注入状态
export function ManusKernelInjectedBadge() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-cognitive/5 border border-cognitive/20 rounded-lg">
      <Brain className="h-5 w-5 text-cognitive" />
      <div className="flex-1">
        <div className="text-sm font-medium flex items-center gap-2">
          Manus 内核已注入
          <Badge variant="outline" className="text-[9px] px-1 h-4 border-cognitive/50 text-cognitive">
            必需
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground">
          此 Agent 将自动获得规划、发现和进度追踪能力
        </div>
      </div>
    </div>
  );
}
