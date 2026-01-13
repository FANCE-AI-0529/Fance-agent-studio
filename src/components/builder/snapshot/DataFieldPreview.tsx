// =====================================================
// 数据字段预览组件 - Data Field Preview Component
// =====================================================

import { useState } from 'react';
import { ChevronDown, ChevronUp, Beaker, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DataFieldSnapshot } from '@/types/dataSnapshotTypes';

interface DataFieldPreviewProps {
  field: DataFieldSnapshot;
  compact?: boolean;
}

export function DataFieldPreview({ field, compact = false }: DataFieldPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const isComplex = typeof field.value === 'object' && field.value !== null;
  const displayValue = isComplex 
    ? JSON.stringify(field.value, null, 2) 
    : String(field.value ?? 'null');
  
  const maxLength = compact ? 30 : 60;
  const needsTruncation = displayValue.length > maxLength;
  const truncatedValue = needsTruncation
    ? displayValue.slice(0, maxLength) + '...' 
    : displayValue;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(displayValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // 根据类型选择颜色
  const typeColorMap: Record<string, string> = {
    string: 'text-green-600 dark:text-green-400',
    number: 'text-blue-600 dark:text-blue-400',
    boolean: 'text-purple-600 dark:text-purple-400',
    object: 'text-amber-600 dark:text-amber-400',
    array: 'text-cyan-600 dark:text-cyan-400',
    any: 'text-muted-foreground',
  };

  return (
    <div className={cn(
      "rounded-md border bg-muted/30 transition-all",
      compact ? "p-1.5" : "p-2",
      expanded && "bg-muted/50"
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <code className={cn(
            "font-mono text-primary truncate",
            compact ? "text-[10px]" : "text-xs"
          )}>
            {field.path}
          </code>
          <Badge 
            variant="outline" 
            className={cn(
              "px-1 py-0 shrink-0",
              compact ? "text-[8px]" : "text-[10px]",
              typeColorMap[field.type] || typeColorMap.any
            )}
          >
            {field.type}
          </Badge>
        </div>
        
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className={cn("shrink-0", compact ? "h-4 w-4" : "h-5 w-5")}
            onClick={handleCopy}
          >
            {copied ? (
              <Check className={compact ? "h-2 w-2" : "h-3 w-3"} />
            ) : (
              <Copy className={cn(compact ? "h-2 w-2" : "h-3 w-3", "text-muted-foreground")} />
            )}
          </Button>
          
          {(isComplex || needsTruncation) && (
            <Button
              variant="ghost"
              size="icon"
              className={cn("shrink-0", compact ? "h-4 w-4" : "h-5 w-5")}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className={compact ? "h-2 w-2" : "h-3 w-3"} />
              ) : (
                <ChevronDown className={compact ? "h-2 w-2" : "h-3 w-3"} />
              )}
            </Button>
          )}
        </div>
      </div>
      
      <div className={cn(
        "mt-1 font-mono text-muted-foreground break-all",
        compact ? "text-[10px]" : "text-xs",
        expanded ? "whitespace-pre-wrap max-h-[150px] overflow-y-auto" : "truncate"
      )}>
        {expanded ? displayValue : truncatedValue}
      </div>
      
      {field.description && !compact && (
        <div className="mt-1 text-[10px] text-muted-foreground/70 italic">
          {field.description}
        </div>
      )}
      
      {field.source === 'mock' && (
        <div className={cn(
          "mt-1 flex items-center gap-1 text-amber-500",
          compact ? "text-[8px]" : "text-[10px]"
        )}>
          <Beaker className={compact ? "h-2 w-2" : "h-2.5 w-2.5"} />
          模拟数据
        </div>
      )}
    </div>
  );
}
