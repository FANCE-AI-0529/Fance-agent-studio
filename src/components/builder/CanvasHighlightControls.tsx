// =====================================================
// 画布高亮动画控制器
// Canvas Highlight Controls - Playback UI
// =====================================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  Square, 
  SkipBack, 
  SkipForward,
  GitBranch,
  Repeat,
  X,
  Zap,
  Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCanvasHighlight } from '@/hooks/useCanvasHighlight';

export function CanvasHighlightControls() {
  const {
    isAnimating,
    isPaused,
    currentStep,
    highlightedPath,
    animationSpeed,
    loopAnimation,
    pathInfo,
    showDataSnapshot,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    stepForward,
    stepBackward,
    setAnimationSpeed,
    setLoopAnimation,
    setShowDataSnapshot,
    getCurrentNodeId,
  } = useCanvasHighlight();

  // 不显示控制器当没有动画时
  if (!isAnimating && highlightedPath.length === 0) {
    return null;
  }

  const currentNodeId = getCurrentNodeId();
  const progress = highlightedPath.length > 0 
    ? ((currentStep + 1) / highlightedPath.length) * 100 
    : 0;

  const speedOptions = [
    { value: '200', label: '快速', description: '0.2s' },
    { value: '500', label: '正常', description: '0.5s' },
    { value: '1000', label: '慢速', description: '1s' },
    { value: '2000', label: '超慢', description: '2s' },
  ];

  return (
    <AnimatePresence>
      {isAnimating && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <Card className="bg-background/95 backdrop-blur-md border shadow-xl">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-4">
                {/* 路径信息 */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-primary">
                    <GitBranch className="h-4 w-4" />
                    <span className="text-sm font-medium">数据流</span>
                  </div>
                  {pathInfo && (
                    <Badge variant="secondary" className="text-xs">
                      {pathInfo.dataTypes?.[0] || 'mixed'}
                    </Badge>
                  )}
                </div>

                {/* 分隔线 */}
                <div className="h-6 w-px bg-border" />

                {/* 进度指示 */}
                <div className="flex items-center gap-3 min-w-[120px]">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Zap className="h-3.5 w-3.5 text-primary" />
                    <span className="font-mono">
                      {currentStep + 1}/{highlightedPath.length}
                    </span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="w-20 h-1.5"
                  />
                </div>

                {/* 当前节点 */}
                {currentNodeId && (
                  <motion.div
                    key={currentNodeId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs text-muted-foreground max-w-[100px] truncate"
                    title={currentNodeId}
                  >
                    → {currentNodeId.split('-')[0]}
                  </motion.div>
                )}

                {/* 分隔线 */}
                <div className="h-6 w-px bg-border" />

                {/* 控制按钮 */}
                <TooltipProvider delayDuration={0}>
                  <div className="flex items-center gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={stepBackward}
                          disabled={currentStep === 0}
                        >
                          <SkipBack className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>上一步</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={isPaused ? resumeAnimation : pauseAnimation}
                        >
                          {isPaused ? (
                            <Play className="h-4 w-4" />
                          ) : (
                            <Pause className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isPaused ? '播放' : '暂停'}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={stepForward}
                          disabled={currentStep >= highlightedPath.length - 1 && !loopAnimation}
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>下一步</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={loopAnimation ? 'secondary' : 'ghost'}
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => setLoopAnimation(!loopAnimation)}
                        >
                          <Repeat className={cn(
                            "h-4 w-4",
                            loopAnimation && "text-primary"
                          )} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>循环播放</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant={showDataSnapshot ? 'secondary' : 'ghost'}
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => setShowDataSnapshot(!showDataSnapshot)}
                        >
                          <Database className={cn(
                            "h-4 w-4",
                            showDataSnapshot && "text-primary"
                          )} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{showDataSnapshot ? '隐藏数据快照' : '显示数据快照'}</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>

                {/* 分隔线 */}
                <div className="h-6 w-px bg-border" />

                {/* 速度控制 */}
                <Select 
                  value={String(animationSpeed)} 
                  onValueChange={(v) => setAnimationSpeed(Number(v))}
                >
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {speedOptions.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        className="text-xs"
                      >
                        <span className="flex items-center gap-2">
                          {option.label}
                          <span className="text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 关闭按钮 */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={stopAnimation}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>停止动画</TooltipContent>
                </Tooltip>
              </div>

              {/* 节点序列预览 */}
              <div className="mt-2 flex items-center gap-1 overflow-x-auto pb-1">
                {highlightedPath.map((nodeId, index) => (
                  <React.Fragment key={nodeId}>
                    <motion.button
                      onClick={() => {
                        pauseAnimation();
                        useCanvasHighlight().jumpToStep(index);
                      }}
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap transition-colors",
                        index === currentStep 
                          ? "bg-primary text-primary-foreground" 
                          : index < currentStep 
                            ? "bg-green-500/20 text-green-600"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                      animate={{
                        scale: index === currentStep ? 1.05 : 1,
                      }}
                    >
                      {nodeId.split('-')[0]}
                    </motion.button>
                    {index < highlightedPath.length - 1 && (
                      <span className={cn(
                        "text-xs",
                        index < currentStep ? "text-green-500" : "text-muted-foreground"
                      )}>
                        →
                      </span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
