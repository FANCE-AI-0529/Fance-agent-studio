import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonProps {
  className?: string;
}

/**
 * P1-08: 标准化骨架屏组件库
 * 统一各页面的加载状态展示
 */

// ===================== 基础骨架组件 =====================

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-3", className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonAvatar({ className, size = "md" }: SkeletonProps & { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };
  return <Skeleton className={cn("rounded-full", sizeClasses[size], className)} />;
}

export function SkeletonText({ className, lines = 3 }: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-3/4" : "w-full")}
        />
      ))}
    </div>
  );
}

// ===================== 消息气泡骨架 =====================

export function SkeletonMessageBubble({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <SkeletonAvatar size="sm" />
      <div className={cn("space-y-2 max-w-[75%]", isUser ? "items-end" : "items-start")}>
        <Skeleton className={cn("h-16 rounded-2xl", isUser ? "w-32" : "w-48")} />
        <Skeleton className="h-2 w-12" />
      </div>
    </div>
  );
}

export function SkeletonChatList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMessageBubble key={i} isUser={i % 2 === 1} />
      ))}
    </div>
  );
}

// ===================== Agent 卡片骨架 =====================

export function SkeletonAgentCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-4", className)}>
      <div className="flex items-start gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonAgentGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonAgentCard key={i} />
      ))}
    </div>
  );
}

// ===================== 技能卡片骨架 =====================

export function SkeletonSkillCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-5 w-12 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-10 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonSkillGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonSkillCard key={i} />
      ))}
    </div>
  );
}

// ===================== 知识库骨架 =====================

export function SkeletonKnowledgeItem({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center gap-3 p-3 rounded-lg border border-border bg-card", className)}>
      <Skeleton className="h-10 w-10 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
  );
}

export function SkeletonKnowledgeList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonKnowledgeItem key={i} />
      ))}
    </div>
  );
}

// ===================== Builder 画布骨架 =====================

export function SkeletonCanvas({ className }: SkeletonProps) {
  return (
    <div className={cn("w-full h-full bg-muted/30 rounded-xl border border-border relative overflow-hidden", className)}>
      {/* Mock nodes */}
      <Skeleton className="absolute top-1/4 left-1/4 h-20 w-32 rounded-xl" />
      <Skeleton className="absolute top-1/2 left-1/2 h-24 w-40 rounded-xl -translate-x-1/2 -translate-y-1/2" />
      <Skeleton className="absolute top-1/3 right-1/4 h-16 w-28 rounded-xl" />
      <Skeleton className="absolute bottom-1/4 left-1/3 h-16 w-24 rounded-xl" />
      
      {/* Mock edges */}
      <div className="absolute top-[30%] left-[30%] w-32 h-0.5 bg-border/50 rotate-45" />
      <div className="absolute top-[45%] left-[45%] w-24 h-0.5 bg-border/50 -rotate-12" />
    </div>
  );
}

// ===================== 侧边栏骨架 =====================

export function SkeletonSidebar({ className }: SkeletonProps) {
  return (
    <div className={cn("w-64 h-full border-r border-border bg-card p-4 space-y-4", className)}>
      <Skeleton className="h-8 w-full rounded-lg" />
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
      <div className="h-px bg-border" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== 表格骨架 =====================

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 p-4 bg-muted/30 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className={cn(
            "flex gap-4 p-4",
            rowIndex !== rows - 1 && "border-b border-border"
          )}
        >
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton
              key={colIndex}
              className={cn("h-4 flex-1", colIndex === 0 && "w-1/4 flex-none")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ===================== 统计卡片骨架 =====================

export function SkeletonStatsCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-5 rounded" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function SkeletonStatsGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>
  );
}

// ===================== 页面级骨架 =====================

export function SkeletonRuntimePage() {
  return (
    <div className="flex h-full">
      <SkeletonSidebar className="hidden md:block" />
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <SkeletonAvatar />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <SkeletonChatList count={5} />
        </div>
        <div className="p-4 border-t border-border">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonFoundryPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <SkeletonSkillGrid count={6} />
    </div>
  );
}

export function SkeletonBuilderPage() {
  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-border p-4 space-y-4">
        <Skeleton className="h-8 w-full rounded-lg" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex-1">
        <SkeletonCanvas className="h-full" />
      </div>
      <div className="w-80 border-l border-border p-4 space-y-4">
        <Skeleton className="h-8 w-full rounded-lg" />
        <SkeletonText lines={4} />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
