/**
 * @file loading-state.tsx
 * @description 标准化加载状态组件库
 */

import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

// ========== 加载旋转器 ==========

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const spinnerSizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', spinnerSizes[size])} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

// ========== 居中加载 ==========

interface CenteredLoadingProps {
  label?: string;
  className?: string;
}

export function CenteredLoading({ label = '加载中...', className }: CenteredLoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

// ========== 全屏加载 ==========

interface FullscreenLoadingProps {
  label?: string;
  transparent?: boolean;
}

export function FullscreenLoading({ label = '加载中...', transparent }: FullscreenLoadingProps) {
  return (
    <div className={cn(
      'fixed inset-0 z-50 flex items-center justify-center',
      transparent ? 'bg-background/80 backdrop-blur-sm' : 'bg-background'
    )}>
      <div className="flex flex-col items-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ========== 带进度条的加载 ==========

interface ProgressLoadingProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ProgressLoading({ 
  progress, 
  label, 
  showPercentage = true,
  className 
}: ProgressLoadingProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          {showPercentage && (
            <span className="font-medium">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <Progress value={progress} className="h-2" />
    </div>
  );
}

// ========== 骨架屏 - 卡片 ==========

interface SkeletonCardProps {
  lines?: number;
  showAvatar?: boolean;
  showImage?: boolean;
  className?: string;
}

export function SkeletonCard({ 
  lines = 3, 
  showAvatar = false, 
  showImage = false,
  className 
}: SkeletonCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-4 space-y-4', className)}>
      {showImage && (
        <Skeleton className="h-32 w-full rounded-md" />
      )}
      <div className="flex items-center gap-3">
        {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="h-3" 
            style={{ width: `${100 - i * 15}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ========== 骨架屏 - 列表项 ==========

interface SkeletonListItemProps {
  showAvatar?: boolean;
  showAction?: boolean;
  className?: string;
}

export function SkeletonListItem({ 
  showAvatar = true, 
  showAction = false,
  className 
}: SkeletonListItemProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3', className)}>
      {showAvatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      {showAction && <Skeleton className="h-8 w-20 rounded-md" />}
    </div>
  );
}

// ========== 骨架屏 - 表格 ==========

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn('rounded-lg border overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-muted/50 p-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div 
          key={rowIndex} 
          className="p-3 flex gap-4 border-t"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={colIndex} 
              className="h-4 flex-1" 
              style={{ opacity: 1 - (rowIndex * 0.1) }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ========== 骨架屏 - 统计卡片 ==========

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-24 mb-1" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// ========== 骨架屏 - 图表 ==========

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      <div className="h-48 flex items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            className="flex-1 rounded-t"
            style={{ height: `${20 + Math.random() * 80}%` }}
          />
        ))}
      </div>
    </div>
  );
}

// ========== 脉冲点 ==========

interface PulsingDotsProps {
  className?: string;
}

export function PulsingDots({ className }: PulsingDotsProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-primary animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// ========== 闪烁效果 ==========

interface ShimmerProps {
  className?: string;
}

export function Shimmer({ className }: ShimmerProps) {
  return (
    <div className={cn(
      'relative overflow-hidden bg-muted rounded',
      'before:absolute before:inset-0',
      'before:translate-x-[-100%]',
      'before:animate-[shimmer_1.5s_infinite]',
      'before:bg-gradient-to-r',
      'before:from-transparent before:via-background/60 before:to-transparent',
      className
    )} />
  );
}

// ========== 加载覆盖层 ==========

interface LoadingOverlayProps {
  isLoading: boolean;
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export function LoadingOverlay({ 
  isLoading, 
  label, 
  children, 
  className 
}: LoadingOverlayProps) {
  return (
    <div className={cn('relative', className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <LoadingSpinner size="lg" label={label} />
        </div>
      )}
    </div>
  );
}

// ========== 内联加载 ==========

interface InlineLoadingProps {
  className?: string;
}

export function InlineLoading({ className }: InlineLoadingProps) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Loader2 className="h-3 w-3 animate-spin" />
      <span className="text-xs text-muted-foreground">加载中</span>
    </span>
  );
}

// ========== 超时处理 ==========

interface LoadingWithTimeoutProps {
  isLoading: boolean;
  timeout?: number;
  onTimeout?: () => void;
  children: React.ReactNode;
  timeoutMessage?: string;
}

export function LoadingWithTimeout({
  isLoading,
  timeout = 30000,
  onTimeout,
  children,
  timeoutMessage = '加载超时，请刷新重试',
}: LoadingWithTimeoutProps) {
  const [timedOut, setTimedOut] = React.useState(false);

  React.useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
      onTimeout?.();
    }, timeout);

    return () => clearTimeout(timer);
  }, [isLoading, timeout, onTimeout]);

  if (timedOut) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-muted-foreground mb-4">{timeoutMessage}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-primary hover:underline text-sm"
        >
          刷新页面
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

// 需要导入 React
import * as React from 'react';
