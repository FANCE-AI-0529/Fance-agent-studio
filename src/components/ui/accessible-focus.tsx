/**
 * @file accessible-focus.tsx
 * @description 可访问性焦点管理组件
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ========== 焦点陷阱 ==========

interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

/**
 * 焦点陷阱 - 将焦点限制在容器内
 */
export function FocusTrap({ children, active = true, className }: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement.focus();

    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// ========== 跳过链接 ==========

interface SkipLinkProps {
  href: string;
  children?: React.ReactNode;
}

/**
 * 跳过链接 - 用于屏幕阅读器快速导航
 */
export function SkipLink({ href, children = '跳到主要内容' }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only focus:not-sr-only',
        'focus:fixed focus:top-4 focus:left-4 focus:z-50',
        'focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground',
        'focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring'
      )}
    >
      {children}
    </a>
  );
}

// ========== 可视焦点指示器 ==========

interface FocusIndicatorProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 增强的焦点指示器
 */
export function FocusIndicator({ children, className }: FocusIndicatorProps) {
  return (
    <div
      className={cn(
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        'focus-within:ring-offset-background rounded-md',
        className
      )}
    >
      {children}
    </div>
  );
}

// ========== 键盘导航 Hook ==========

interface UseKeyboardNavigationOptions {
  items: HTMLElement[] | null;
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
  onSelect?: (index: number) => void;
}

export function useKeyboardNavigation({
  items,
  orientation = 'vertical',
  loop = true,
  onSelect,
}: UseKeyboardNavigationOptions) {
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!items || items.length === 0) return;

      const isVertical = orientation === 'vertical' || orientation === 'both';
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';

      let nextIndex = focusedIndex;

      switch (e.key) {
        case 'ArrowDown':
          if (isVertical) {
            e.preventDefault();
            nextIndex = focusedIndex + 1;
            if (nextIndex >= items.length) {
              nextIndex = loop ? 0 : items.length - 1;
            }
          }
          break;
        case 'ArrowUp':
          if (isVertical) {
            e.preventDefault();
            nextIndex = focusedIndex - 1;
            if (nextIndex < 0) {
              nextIndex = loop ? items.length - 1 : 0;
            }
          }
          break;
        case 'ArrowRight':
          if (isHorizontal) {
            e.preventDefault();
            nextIndex = focusedIndex + 1;
            if (nextIndex >= items.length) {
              nextIndex = loop ? 0 : items.length - 1;
            }
          }
          break;
        case 'ArrowLeft':
          if (isHorizontal) {
            e.preventDefault();
            nextIndex = focusedIndex - 1;
            if (nextIndex < 0) {
              nextIndex = loop ? items.length - 1 : 0;
            }
          }
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = items.length - 1;
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect?.(focusedIndex);
          return;
        default:
          return;
      }

      if (nextIndex !== focusedIndex) {
        setFocusedIndex(nextIndex);
        items[nextIndex]?.focus();
      }
    },
    [items, focusedIndex, orientation, loop, onSelect]
  );

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
  };
}

// ========== 可视化隐藏 ==========

interface VisuallyHiddenProps {
  children: React.ReactNode;
  asChild?: boolean;
}

/**
 * 视觉隐藏但对屏幕阅读器可见
 */
export function VisuallyHidden({ children, asChild }: VisuallyHiddenProps) {
  const Comp = asChild ? React.Fragment : 'span';
  return (
    <Comp>
      <span className="sr-only">{children}</span>
    </Comp>
  );
}

// ========== 动态公告 ==========

interface LiveRegionProps {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  className?: string;
}

/**
 * ARIA Live Region - 动态内容公告
 */
export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
  className,
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  );
}

// ========== 公告 Hook ==========

export function useAnnounce() {
  const [message, setMessage] = React.useState('');

  const announce = React.useCallback((text: string, delay = 100) => {
    // 先清空再设置，确保重复消息也能被读出
    setMessage('');
    setTimeout(() => setMessage(text), delay);
  }, []);

  const Announcer = React.useCallback(
    () => <LiveRegion>{message}</LiveRegion>,
    [message]
  );

  return { announce, Announcer };
}

// ========== 减少动画偏好 ==========

export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// ========== 快捷键提示 ==========

interface ShortcutHintProps {
  keys: string[];
  className?: string;
}

export function ShortcutHint({ keys, className }: ShortcutHintProps) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {keys.map((key, index) => (
        <React.Fragment key={key}>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono border border-border">
            {key}
          </kbd>
          {index < keys.length - 1 && <span className="text-muted-foreground">+</span>}
        </React.Fragment>
      ))}
    </span>
  );
}

// ========== 高对比度检测 ==========

export function usePrefersHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    setPrefersHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersHighContrast;
}
