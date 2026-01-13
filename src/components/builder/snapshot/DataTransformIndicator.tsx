// =====================================================
// 数据转换指示器 - Data Transform Indicator Component
// =====================================================

import { Workflow, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTransformIndicatorProps {
  transformation: string;
  inputCount: number;
  outputCount: number;
  compact?: boolean;
}

export function DataTransformIndicator({ 
  transformation,
  inputCount,
  outputCount,
  compact = false,
}: DataTransformIndicatorProps) {
  return (
    <div className={cn(
      "rounded-lg bg-gradient-to-r from-blue-500/10 via-primary/10 to-green-500/10 border border-primary/20",
      compact ? "p-2" : "p-3"
    )}>
      <div className="flex items-center justify-between mb-1.5">
        <div className={cn(
          "flex items-center gap-1.5 font-medium",
          compact ? "text-xs" : "text-sm"
        )}>
          <Workflow className={cn(
            "text-primary",
            compact ? "h-3 w-3" : "h-4 w-4"
          )} />
          数据转换
        </div>
        
        <div className={cn(
          "flex items-center gap-1.5 text-muted-foreground",
          compact ? "text-[10px]" : "text-xs"
        )}>
          <span className="flex items-center gap-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
            {inputCount} 输入
          </span>
          <ArrowRight className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
          <span className="flex items-center gap-0.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
            {outputCount} 输出
          </span>
        </div>
      </div>
      
      <p className={cn(
        "text-muted-foreground flex items-start gap-1.5",
        compact ? "text-[10px]" : "text-xs"
      )}>
        <Sparkles className={cn(
          "text-primary/60 shrink-0 mt-0.5",
          compact ? "h-2.5 w-2.5" : "h-3 w-3"
        )} />
        {transformation}
      </p>
    </div>
  );
}
