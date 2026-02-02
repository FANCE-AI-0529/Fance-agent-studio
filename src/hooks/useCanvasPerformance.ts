/**
 * @file useCanvasPerformance.ts
 * @description 画布性能优化 Hook
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Node, Edge, useReactFlow, Viewport } from '@xyflow/react';

// ========== 虚拟化配置 ==========

interface VirtualizationConfig {
  enabled: boolean;
  buffer: number; // 视口外的缓冲区域（像素）
  minZoom: number; // 低于此缩放级别时禁用虚拟化
}

const defaultVirtualizationConfig: VirtualizationConfig = {
  enabled: true,
  buffer: 200,
  minZoom: 0.3,
};

// ========== 虚拟化 Hook ==========

interface UseVirtualizedNodesOptions {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  containerWidth: number;
  containerHeight: number;
  config?: Partial<VirtualizationConfig>;
}

export function useVirtualizedNodes({
  nodes,
  edges,
  viewport,
  containerWidth,
  containerHeight,
  config = {},
}: UseVirtualizedNodesOptions) {
  const mergedConfig = { ...defaultVirtualizationConfig, ...config };

  // 计算可视区域边界
  const visibleBounds = useMemo(() => {
    const { x, y, zoom } = viewport;
    const buffer = mergedConfig.buffer / zoom;

    return {
      left: -x / zoom - buffer,
      right: (-x + containerWidth) / zoom + buffer,
      top: -y / zoom - buffer,
      bottom: (-y + containerHeight) / zoom + buffer,
    };
  }, [viewport, containerWidth, containerHeight, mergedConfig.buffer]);

  // 过滤可视节点
  const visibleNodes = useMemo(() => {
    if (!mergedConfig.enabled || viewport.zoom < mergedConfig.minZoom) {
      return nodes;
    }

    return nodes.filter(node => {
      const nodeWidth = node.width || 200;
      const nodeHeight = node.height || 100;

      return (
        node.position.x + nodeWidth >= visibleBounds.left &&
        node.position.x <= visibleBounds.right &&
        node.position.y + nodeHeight >= visibleBounds.top &&
        node.position.y <= visibleBounds.bottom
      );
    });
  }, [nodes, visibleBounds, mergedConfig.enabled, mergedConfig.minZoom, viewport.zoom]);

  // 过滤可视边（两端节点至少一个可见）
  const visibleNodeIds = useMemo(
    () => new Set(visibleNodes.map(n => n.id)),
    [visibleNodes]
  );

  const visibleEdges = useMemo(() => {
    if (!mergedConfig.enabled || viewport.zoom < mergedConfig.minZoom) {
      return edges;
    }

    return edges.filter(
      edge => visibleNodeIds.has(edge.source) || visibleNodeIds.has(edge.target)
    );
  }, [edges, visibleNodeIds, mergedConfig.enabled, mergedConfig.minZoom, viewport.zoom]);

  return {
    visibleNodes,
    visibleEdges,
    totalNodes: nodes.length,
    visibleCount: visibleNodes.length,
    isVirtualized: mergedConfig.enabled && viewport.zoom >= mergedConfig.minZoom,
  };
}

// ========== 节点渲染缓存 ==========

interface NodeCache<T> {
  data: T;
  timestamp: number;
}

export function useNodeCache<T>(
  computeNode: (nodeId: string) => T,
  dependencies: unknown[],
  ttl = 5000
) {
  const cacheRef = useRef<Map<string, NodeCache<T>>>(new Map());

  const getNode = useCallback(
    (nodeId: string): T => {
      const cached = cacheRef.current.get(nodeId);
      const now = Date.now();

      if (cached && now - cached.timestamp < ttl) {
        return cached.data;
      }

      const data = computeNode(nodeId);
      cacheRef.current.set(nodeId, { data, timestamp: now });
      return data;
    },
    [computeNode, ttl, ...dependencies]
  );

  const invalidate = useCallback((nodeId?: string) => {
    if (nodeId) {
      cacheRef.current.delete(nodeId);
    } else {
      cacheRef.current.clear();
    }
  }, []);

  const invalidateAll = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return { getNode, invalidate, invalidateAll };
}

// ========== 批量更新优化 ==========

interface BatchUpdate<T> {
  type: 'add' | 'update' | 'remove';
  id: string;
  data?: T;
}

export function useBatchUpdates<T>(
  onFlush: (updates: BatchUpdate<T>[]) => void,
  delay = 16 // 约 60fps
) {
  const updatesRef = useRef<BatchUpdate<T>[]>([]);
  const timeoutRef = useRef<number | null>(null);

  const scheduleFlush = useCallback(() => {
    if (timeoutRef.current !== null) return;

    timeoutRef.current = window.setTimeout(() => {
      if (updatesRef.current.length > 0) {
        onFlush([...updatesRef.current]);
        updatesRef.current = [];
      }
      timeoutRef.current = null;
    }, delay);
  }, [onFlush, delay]);

  const add = useCallback(
    (id: string, data: T) => {
      updatesRef.current.push({ type: 'add', id, data });
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const update = useCallback(
    (id: string, data: Partial<T>) => {
      updatesRef.current.push({ type: 'update', id, data: data as T });
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const remove = useCallback(
    (id: string) => {
      updatesRef.current.push({ type: 'remove', id });
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const flush = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (updatesRef.current.length > 0) {
      onFlush([...updatesRef.current]);
      updatesRef.current = [];
    }
  }, [onFlush]);

  // 清理
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { add, update, remove, flush };
}

// ========== FPS 监控 ==========

export function useFPSMonitor(enabled = false) {
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const measureFPS = () => {
      frameCountRef.current++;
      const now = performance.now();
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / delta));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(measureFPS);
    };

    animationFrameRef.current = requestAnimationFrame(measureFPS);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled]);

  return fps;
}

// ========== 防抖视口更新 ==========

export function useDebouncedViewport(delay = 100) {
  const [debouncedViewport, setDebouncedViewport] = useState<Viewport | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const updateViewport = useCallback(
    (viewport: Viewport) => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setDebouncedViewport(viewport);
        timeoutRef.current = null;
      }, delay);
    },
    [delay]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { debouncedViewport, updateViewport };
}

// ========== 性能统计 ==========

interface PerformanceStats {
  nodeCount: number;
  edgeCount: number;
  visibleNodeCount: number;
  fps: number;
  renderTime: number;
  isPerformant: boolean;
}

export function useCanvasPerformanceStats(
  totalNodes: number,
  totalEdges: number,
  visibleNodes: number,
  fps: number
): PerformanceStats {
  const [renderTime, setRenderTime] = useState(0);
  const startTimeRef = useRef(performance.now());

  useEffect(() => {
    const endTime = performance.now();
    setRenderTime(endTime - startTimeRef.current);
    startTimeRef.current = endTime;
  });

  const isPerformant = fps >= 30 && renderTime < 16;

  return {
    nodeCount: totalNodes,
    edgeCount: totalEdges,
    visibleNodeCount: visibleNodes,
    fps,
    renderTime,
    isPerformant,
  };
}

// ========== 懒加载节点配置 ==========

export function useLazyNodeConfig(nodeId: string, delay = 300) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [nodeId, delay]);

  return isLoaded;
}
