// =====================================================
// 画布高亮动画 Hook
// Canvas Highlight Hook - Animation Logic Controller
// =====================================================

import { useCallback, useEffect, useRef } from 'react';
import { useCanvasHighlightStore } from '@/stores/canvasHighlightStore';
import type { DataFlowPath } from '@/types/verificationTypes';

export function useCanvasHighlight() {
  const store = useCanvasHighlightStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 清理定时器
  const clearAnimationInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);
  
  // 启动动画
  const startAnimation = useCallback((path: DataFlowPath) => {
    clearAnimationInterval();
    store.startPathAnimation(path);
  }, [store, clearAnimationInterval]);
  
  // 停止动画
  const stopAnimation = useCallback(() => {
    clearAnimationInterval();
    store.stopAnimation();
  }, [store, clearAnimationInterval]);
  
  // 动画循环逻辑
  useEffect(() => {
    const { isAnimating, isPaused, animationSpeed, highlightedPath, loopAnimation } = store;
    
    if (isAnimating && !isPaused) {
      clearAnimationInterval();
      
      intervalRef.current = setInterval(() => {
        const state = useCanvasHighlightStore.getState();
        const { currentStep, highlightedPath: path, loopAnimation: loop } = state;
        
        if (currentStep >= path.length - 1) {
          if (loop) {
            state.jumpToStep(0);
          } else {
            state.pauseAnimation();
          }
        } else {
          state.stepForward();
        }
      }, animationSpeed);
    } else {
      clearAnimationInterval();
    }
    
    return clearAnimationInterval;
  }, [store.isAnimating, store.isPaused, store.animationSpeed, clearAnimationInterval]);
  
  // 获取节点高亮类名
  const getNodeHighlightClass = useCallback((nodeId: string): string => {
    const status = store.isNodeHighlighted(nodeId);
    
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
  }, [store]);
  
  // 获取边高亮配置
  const getEdgeHighlightData = useCallback((edgeId: string) => {
    const status = store.isEdgeHighlighted(edgeId);
    
    return {
      animated: status === 'active',
      status,
      style: {
        stroke: status === 'active' ? 'hsl(var(--primary))' : 
                status === 'passed' ? 'hsl(142, 76%, 36%)' : 
                undefined,
        strokeWidth: status === 'active' ? 4 : status === 'passed' ? 3 : 2,
        opacity: status === 'waiting' ? 0.3 : 1,
      },
    };
  }, [store]);
  
  // 组件卸载时清理
  useEffect(() => {
    return () => {
      clearAnimationInterval();
    };
  }, [clearAnimationInterval]);
  
  return {
    // Store 状态
    isAnimating: store.isAnimating,
    isPaused: store.isPaused,
    currentStep: store.currentStep,
    highlightedPath: store.highlightedPath,
    highlightedEdges: store.highlightedEdges,
    animationSpeed: store.animationSpeed,
    loopAnimation: store.loopAnimation,
    pathInfo: store.pathInfo,
    highlightConfig: store.highlightConfig,
    
    // 核心动作
    startAnimation,
    stopAnimation,
    pauseAnimation: store.pauseAnimation,
    resumeAnimation: store.resumeAnimation,
    
    // 步进控制
    stepForward: store.stepForward,
    stepBackward: store.stepBackward,
    jumpToStep: store.jumpToStep,
    
    // 配置
    setAnimationSpeed: store.setAnimationSpeed,
    setLoopAnimation: store.setLoopAnimation,
    setHighlightConfig: store.setHighlightConfig,
    
    // 查询
    isNodeHighlighted: store.isNodeHighlighted,
    isEdgeHighlighted: store.isEdgeHighlighted,
    getCurrentNodeId: store.getCurrentNodeId,
    
    // 辅助函数
    getNodeHighlightClass,
    getEdgeHighlightData,
    
    // 重置
    reset: store.reset,
  };
}
