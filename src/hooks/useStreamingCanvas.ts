import { useEffect, useMemo, useCallback } from 'react';
import { Node, Edge, useReactFlow } from '@xyflow/react';
import { useStreamingNodes, useStreamingEdges, useStreamingPhase } from '../stores/streamingStore.ts';
import { StreamingNode, StreamingEdge } from '../types/streaming.ts';

export interface UseStreamingCanvasOptions {
  autoFitView?: boolean;
  fitViewPadding?: number;
  animateViewport?: boolean;
}

export function useStreamingCanvas(options: UseStreamingCanvasOptions = {}) {
  const {
    autoFitView = true,
    fitViewPadding = 0.2,
    animateViewport = true,
  } = options;

  const streamingNodes = useStreamingNodes();
  const streamingEdges = useStreamingEdges();
  const phase = useStreamingPhase();
  const reactFlow = useReactFlow();

  // 将 StreamingNode 转换为 ReactFlow Node
  const nodes: Node[] = useMemo(() => {
    return streamingNodes.map((node: StreamingNode) => ({
      id: node.id,
      type: 'ghost', // 使用 GhostNode 组件
      position: node.position,
      data: {
        ...node,
        label: node.label,
        description: node.description,
        nodeType: node.nodeType,
        status: node.status,
      },
      // 根据状态设置样式
      style: {
        opacity: node.status === 'ghost' ? 0.5 : node.status === 'materializing' ? 0.8 : 1,
      },
    }));
  }, [streamingNodes]);

  // 将 StreamingEdge 转换为 ReactFlow Edge
  const edges: Edge[] = useMemo(() => {
    return streamingEdges.map((edge: StreamingEdge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'default',
      animated: edge.status === 'drawing',
      style: {
        strokeDasharray: edge.status === 'drawing' ? '5,5' : undefined,
        opacity: edge.status === 'drawing' ? 0.6 : 1,
        strokeWidth: 2,
      },
    }));
  }, [streamingEdges]);

  // 当有新节点时自动调整视口
  useEffect(() => {
    if (autoFitView && nodes.length > 0 && reactFlow) {
      const timer = setTimeout(() => {
        reactFlow.fitView({
          padding: fitViewPadding,
          duration: animateViewport ? 300 : 0,
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [nodes.length, autoFitView, fitViewPadding, animateViewport, reactFlow]);

  // 聚焦到最新添加的节点
  const focusLatestNode = useCallback(() => {
    if (nodes.length > 0 && reactFlow) {
      const latestNode = nodes[nodes.length - 1];
      reactFlow.setCenter(
        latestNode.position.x + 70, // 节点中心偏移
        latestNode.position.y + 40,
        { duration: 300, zoom: 1 }
      );
    }
  }, [nodes, reactFlow]);

  // 获取节点统计
  const nodeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    streamingNodes.forEach((node: StreamingNode) => {
      const type = node.nodeType || 'unknown';
      stats[type] = (stats[type] || 0) + 1;
    });
    return stats;
  }, [streamingNodes]);

  // 获取状态统计
  const statusStats = useMemo(() => {
    let ghost = 0;
    let materializing = 0;
    let solid = 0;

    streamingNodes.forEach((node: StreamingNode) => {
      if (node.status === 'ghost') ghost++;
      else if (node.status === 'materializing') materializing++;
      else solid++;
    });

    return { ghost, materializing, solid };
  }, [streamingNodes]);

  return {
    // ReactFlow 数据
    nodes,
    edges,
    
    // 状态
    phase,
    isGenerating: phase === 'generating' || phase === 'connecting',
    isComplete: phase === 'completed',
    
    // 统计
    nodeStats,
    statusStats,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    
    // 方法
    focusLatestNode,
  };
}
