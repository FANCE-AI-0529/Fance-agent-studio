// =====================================================
// 可高亮节点包装器组件
// Highlightable Node Wrapper - Animation Effects
// =====================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Check, Circle } from 'lucide-react';
import { cn } from '../../../lib/utils.ts';
import { useCanvasHighlight } from '../../../hooks/useCanvasHighlight.ts';

interface HighlightableNodeWrapperProps {
  nodeId: string;
  children: React.ReactNode;
  className?: string;
}

export function HighlightableNodeWrapper({ 
  nodeId, 
  children,
  className,
}: HighlightableNodeWrapperProps) {
  const { isNodeHighlighted, isAnimating } = useCanvasHighlight();
  
  const status = isNodeHighlighted(nodeId);
  const isActive = status === 'active';
  const isPassed = status === 'passed';
  const isWaiting = status === 'waiting';
  
  if (!isAnimating) {
    return <div className={className}>{children}</div>;
  }
  
  return (
    <motion.div
      animate={{
        scale: isActive ? 1.05 : 1,
        opacity: isWaiting ? 0.5 : 1,
      }}
      transition={{ 
        duration: 0.3, 
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      className={cn(
        'relative transition-all duration-300',
        isActive && 'ring-4 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/30',
        isPassed && 'ring-2 ring-green-500/60',
        isWaiting && 'opacity-50',
        className,
      )}
    >
      {children}
      
      {/* 数据流动指示器 - 当前活动 */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-3 -right-3 z-10"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                boxShadow: [
                  '0 0 0 0 hsl(var(--primary) / 0.4)',
                  '0 0 0 8px hsl(var(--primary) / 0)',
                  '0 0 0 0 hsl(var(--primary) / 0)',
                ],
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 1.2,
                ease: 'easeInOut',
              }}
              className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg"
            >
              <Zap className="h-4 w-4 text-primary-foreground" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 已通过标记 */}
      <AnimatePresence>
        {isPassed && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-md">
              <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 等待中标记 */}
      <AnimatePresence>
        {isWaiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
              <Circle className="h-3 w-3 text-muted-foreground" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 发光效果叠加层 */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
              borderRadius: 'inherit',
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 简化版本 - 仅添加类名，不包装 DOM
export function useNodeHighlightClass(nodeId: string): string {
  const { isNodeHighlighted, isAnimating } = useCanvasHighlight();
  
  if (!isAnimating) {
    return '';
  }
  
  const status = isNodeHighlighted(nodeId);
  
  switch (status) {
    case 'active':
      return 'ring-4 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-lg shadow-primary/30 animate-pulse';
    case 'passed':
      return 'ring-2 ring-green-500/60 opacity-90';
    case 'waiting':
      return 'opacity-40';
    default:
      return '';
  }
}
