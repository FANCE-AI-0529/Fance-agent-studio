import React from "react";
import { cn } from "../../lib/utils.ts";
import { Skeleton } from "./skeleton.tsx";

/**
 * Unified Skeleton Components
 * 统一骨架屏组件库 - 确保全局加载态一致性
 */

// ========== 基础骨架屏 ==========

interface SkeletonTextProps {
  lines?: number;
  className?: string;
  widths?: string[];
}

export function SkeletonText({ lines = 3, className, widths }: SkeletonTextProps) {
  const defaultWidths = ['w-full', 'w-4/5', 'w-3/5', 'w-2/3', 'w-1/2'];
  
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            widths?.[i] || defaultWidths[i % defaultWidths.length]
          )} 
        />
      ))}
    </div>
  );
}

// ========== 卡片骨架屏 ==========

interface SkeletonCardProps {
  showAvatar?: boolean;
  showImage?: boolean;
  showBadge?: boolean;
  lines?: number;
  className?: string;
}

export function SkeletonCard({ 
  showAvatar = false, 
  showImage = false,
  showBadge = false,
  lines = 2,
  className 
}: SkeletonCardProps) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4 space-y-4",
      className
    )}>
      {showImage && (
        <Skeleton className="h-32 w-full rounded-lg" />
      )}
      <div className="flex items-start gap-3">
        {showAvatar && (
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
        )}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-2/3" />
            {showBadge && (
              <Skeleton className="h-5 w-16 rounded-full" />
            )}
          </div>
          <SkeletonText lines={lines} />
        </div>
      </div>
    </div>
  );
}

// ========== 列表项骨架屏 ==========

interface SkeletonListItemProps {
  showAvatar?: boolean;
  showAction?: boolean;
  showMeta?: boolean;
  className?: string;
}

export function SkeletonListItem({ 
  showAvatar = true, 
  showAction = false,
  showMeta = false,
  className 
}: SkeletonListItemProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border border-border/50",
      className
    )}>
      {showAvatar && (
        <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-48" />
          {showMeta && (
            <Skeleton className="h-3 w-16" />
          )}
        </div>
      </div>
      {showAction && (
        <Skeleton className="h-8 w-20 rounded-md flex-shrink-0" />
      )}
    </div>
  );
}

// ========== 消息气泡骨架屏 ==========

interface SkeletonMessageProps {
  isUser?: boolean;
  showAvatar?: boolean;
  className?: string;
}

export function SkeletonMessage({ 
  isUser = false, 
  showAvatar = true,
  className 
}: SkeletonMessageProps) {
  return (
    <div className={cn(
      "flex gap-3",
      isUser && "flex-row-reverse",
      className
    )}>
      {showAvatar && (
        <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      )}
      <div className={cn(
        "space-y-2 max-w-[70%]",
        isUser && "items-end"
      )}>
        <Skeleton className={cn(
          "h-20 rounded-2xl",
          isUser ? "w-48 rounded-br-md" : "w-64 rounded-bl-md"
        )} />
      </div>
    </div>
  );
}

// ========== 节点骨架屏 (Builder) ==========

interface SkeletonNodeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SkeletonNode({ size = 'md', className }: SkeletonNodeProps) {
  const sizeClasses = {
    sm: 'w-24 h-12',
    md: 'w-32 h-16',
    lg: 'w-40 h-20',
  };
  
  return (
    <div className={cn(
      "rounded-xl border-2 border-dashed border-border/50 bg-card/50 p-3 flex flex-col justify-center",
      sizeClasses[size],
      className
    )}>
      <Skeleton className="h-3 w-3/4 mx-auto mb-1.5" />
      <Skeleton className="h-2 w-1/2 mx-auto" />
    </div>
  );
}

// ========== 技能卡片骨架屏 (Foundry) ==========

export function SkeletonSkillCard({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card overflow-hidden",
      className
    )}>
      {/* Header with icon */}
      <div className="p-4 flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
      {/* Tags */}
      <div className="px-4 pb-3 flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/50 flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}

// ========== 知识库骨架屏 ==========

export function SkeletonKnowledgeBase({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4",
      className
    )}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>
    </div>
  );
}

// ========== 代码编辑器骨架屏 ==========

export function SkeletonCodeEditor({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-lg border border-border bg-card overflow-hidden",
      className
    )}>
      {/* Editor toolbar */}
      <div className="h-10 border-b border-border bg-muted/30 px-3 flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24" />
        <div className="flex-1" />
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      {/* Code lines */}
      <div className="p-4 space-y-2 font-mono">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-4 w-6 flex-shrink-0" />
            <Skeleton 
              className="h-4" 
              style={{ width: `${Math.random() * 50 + 30}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== 表格骨架屏 ==========

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4, 
  showHeader = true,
  className 
}: SkeletonTableProps) {
  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
      {showHeader && (
        <div className="bg-muted/50 p-3 flex gap-4 border-b border-border">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="h-4 flex-1" 
            />
          ))}
        </div>
      )}
      <div className="divide-y divide-border/50">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="p-3 flex gap-4">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton 
                key={colIdx} 
                className="h-4 flex-1"
                style={{ opacity: 0.7 - (rowIdx * 0.1) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ========== 统计卡片骨架屏 ==========

export function SkeletonStatsCard({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-24 mb-2" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

// ========== 图表骨架屏 ==========

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-card p-4",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </div>
      <div className="h-48 flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t-md"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default {
  Text: SkeletonText,
  Card: SkeletonCard,
  ListItem: SkeletonListItem,
  Message: SkeletonMessage,
  Node: SkeletonNode,
  SkillCard: SkeletonSkillCard,
  KnowledgeBase: SkeletonKnowledgeBase,
  CodeEditor: SkeletonCodeEditor,
  Table: SkeletonTable,
  StatsCard: SkeletonStatsCard,
  Chart: SkeletonChart,
};
