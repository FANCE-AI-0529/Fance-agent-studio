import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  variant?: "card" | "list" | "table" | "profile" | "chat" | "form" | "page";
  count?: number;
  className?: string;
}

/**
 * 统一的 Loading 骨架组件
 * 提供多种预设变体供全站使用
 */
export function LoadingSkeleton({ 
  variant = "card", 
  count = 1,
  className 
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  switch (variant) {
    case "card":
      return (
        <div className={cn("space-y-4", className)}>
          {items.map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      );

    case "list":
      return (
        <div className={cn("space-y-2", className)}>
          {items.map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <div className={cn("space-y-2", className)}>
          {/* Header */}
          <div className="flex gap-4 p-3 border-b border-border">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          {/* Rows */}
          {items.map((i) => (
            <div key={i} className="flex gap-4 p-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          ))}
        </div>
      );

    case "profile":
      return (
        <div className={cn("space-y-6", className)}>
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-border space-y-2">
                <Skeleton className="h-8 w-8 rounded-full mx-auto" />
                <Skeleton className="h-4 w-2/3 mx-auto" />
                <Skeleton className="h-3 w-1/2 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      );

    case "chat":
      return (
        <div className={cn("space-y-4 p-4", className)}>
          {items.map((i) => (
            <div key={i} className={cn(
              "flex gap-3",
              i % 2 === 0 ? "justify-start" : "justify-end"
            )}>
              {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
              <div className={cn(
                "space-y-1.5 max-w-[70%]",
                i % 2 === 0 ? "items-start" : "items-end"
              )}>
                <Skeleton className={cn(
                  "h-16 rounded-xl",
                  i % 2 === 0 ? "w-48" : "w-32"
                )} />
                <Skeleton className="h-3 w-16" />
              </div>
              {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
            </div>
          ))}
        </div>
      );

    case "form":
      return (
        <div className={cn("space-y-4", className)}>
          {items.map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
          <Skeleton className="h-10 w-32" />
        </div>
      );

    case "page":
      return (
        <div className={cn("space-y-6 p-6", className)}>
          {/* Header */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 rounded-lg border border-border space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
          {/* Content */}
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-64 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        </div>
      );

    default:
      return <Skeleton className={cn("h-20 w-full", className)} />;
  }
}

// 单独的骨架预设组件，方便直接导入使用
export function CardSkeleton({ count = 1 }: { count?: number }) {
  return <LoadingSkeleton variant="card" count={count} />;
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return <LoadingSkeleton variant="list" count={count} />;
}

export function TableSkeleton({ count = 5 }: { count?: number }) {
  return <LoadingSkeleton variant="table" count={count} />;
}

export function ProfileSkeleton() {
  return <LoadingSkeleton variant="profile" />;
}

export function ChatSkeleton({ count = 4 }: { count?: number }) {
  return <LoadingSkeleton variant="chat" count={count} />;
}

export function FormSkeleton({ count = 3 }: { count?: number }) {
  return <LoadingSkeleton variant="form" count={count} />;
}

export function PageSkeleton() {
  return <LoadingSkeleton variant="page" />;
}
