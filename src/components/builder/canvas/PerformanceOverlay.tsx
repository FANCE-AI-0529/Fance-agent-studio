import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Cpu, Zap, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PerformanceMetrics {
  nodeCount: number;
  edgeCount: number;
  visibleNodeCount: number;
  fps: number;
  renderTime: number;
}

interface PerformanceOverlayProps {
  metrics: PerformanceMetrics;
  isVirtualizationActive: boolean;
  className?: string;
}

export const PerformanceOverlay = memo(({
  metrics,
  isVirtualizationActive,
  className,
}: PerformanceOverlayProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // Only show performance overlay in development or when virtualization is active
  useEffect(() => {
    const isDev = import.meta.env.DEV;
    setShowOverlay(isDev || isVirtualizationActive);
  }, [isVirtualizationActive]);

  if (!showOverlay) return null;

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return 'text-status-executing';
    if (fps >= 30) return 'text-amber-500';
    return 'text-destructive';
  };

  const getPerformanceLevel = () => {
    if (metrics.fps >= 55 && metrics.renderTime < 5) return 'excellent';
    if (metrics.fps >= 30 && metrics.renderTime < 16) return 'good';
    if (metrics.fps >= 20) return 'moderate';
    return 'poor';
  };

  const performanceLevel = getPerformanceLevel();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'absolute top-2 right-2 z-50',
          className
        )}
      >
        <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg shadow-lg">
          {/* Collapsed view */}
          {!isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="gap-2 h-8 px-3"
            >
              <Activity className="h-3.5 w-3.5" />
              <span className={cn('text-xs font-mono', getFPSColor(metrics.fps))}>
                {metrics.fps} FPS
              </span>
              {isVirtualizationActive && (
                <Badge variant="outline" className="h-5 text-[10px] px-1.5">
                  <Zap className="h-3 w-3 mr-0.5" />
                  虚拟化
                </Badge>
              )}
            </Button>
          )}

          {/* Expanded view */}
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="p-3 min-w-[200px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium">性能监控</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsExpanded(false)}
                >
                  <EyeOff className="h-3 w-3" />
                </Button>
              </div>

              {/* Performance indicator */}
              <div className={cn(
                'flex items-center gap-2 p-2 rounded-md mb-3',
                performanceLevel === 'excellent' && 'bg-status-executing/10',
                performanceLevel === 'good' && 'bg-status-executing/10',
                performanceLevel === 'moderate' && 'bg-status-planning/10',
                performanceLevel === 'poor' && 'bg-destructive/10',
              )}>
                <div className={cn(
                  'w-2 h-2 rounded-full',
                  performanceLevel === 'excellent' && 'bg-status-executing',
                  performanceLevel === 'good' && 'bg-status-executing',
                  performanceLevel === 'moderate' && 'bg-status-planning',
                  performanceLevel === 'poor' && 'bg-destructive',
                )} />
                <span className="text-xs font-medium capitalize">
                  {performanceLevel === 'excellent' && '优秀'}
                  {performanceLevel === 'good' && '良好'}
                  {performanceLevel === 'moderate' && '一般'}
                  {performanceLevel === 'poor' && '较差'}
                </span>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-md bg-muted/50">
                  <div className="text-muted-foreground mb-0.5">帧率</div>
                  <div className={cn('font-mono font-medium', getFPSColor(metrics.fps))}>
                    {metrics.fps} FPS
                  </div>
                </div>
                <div className="p-2 rounded-md bg-muted/50">
                  <div className="text-muted-foreground mb-0.5">渲染</div>
                  <div className="font-mono font-medium">
                    {metrics.renderTime.toFixed(1)}ms
                  </div>
                </div>
                <div className="p-2 rounded-md bg-muted/50">
                  <div className="text-muted-foreground mb-0.5">节点</div>
                  <div className="font-mono font-medium">
                    {metrics.visibleNodeCount}/{metrics.nodeCount}
                  </div>
                </div>
                <div className="p-2 rounded-md bg-muted/50">
                  <div className="text-muted-foreground mb-0.5">连线</div>
                  <div className="font-mono font-medium">
                    {metrics.edgeCount}
                  </div>
                </div>
              </div>

              {/* Virtualization status */}
              {isVirtualizationActive && (
                <div className="mt-3 p-2 rounded-md bg-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-primary font-medium">
                      虚拟化渲染已启用
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    仅渲染视口内的节点以提升性能
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
});

PerformanceOverlay.displayName = 'PerformanceOverlay';

export default PerformanceOverlay;
