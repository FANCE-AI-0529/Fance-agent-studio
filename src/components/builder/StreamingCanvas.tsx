import React, { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useStreamingGenerator } from '@/hooks/useStreamingGenerator';
import { useStreamingCanvas } from '@/hooks/useStreamingCanvas';
import { GhostNode } from './GhostNode';
import { ThinkingBubble } from './ThinkingBubble';
import { StreamingProgress } from './StreamingProgress';
import { Button } from '@/components/ui/button';
import { Play, Square, RotateCcw, Check } from 'lucide-react';

const nodeTypes = {
  ghost: GhostNode,
};

interface StreamingCanvasProps {
  description: string;
  autoStart?: boolean;
  onComplete?: (result: { nodes: any[]; edges: any[]; config: any }) => void;
  onError?: (error: string) => void;
  className?: string;
}

function StreamingCanvasInner({
  description,
  autoStart = false,
  onComplete,
  onError,
  className,
}: StreamingCanvasProps) {
  const {
    isStreaming,
    phase,
    progress,
    currentStep,
    currentThought,
    thoughts,
    error,
    errorRecoverable,
    nodes: streamingNodes,
    edges: streamingEdges,
    agentConfig,
    summary,
    startStreaming,
    stopStreaming,
    retry,
    reset,
  } = useStreamingGenerator({
    onComplete: (summaryData) => {
      console.log('Streaming complete:', summaryData);
    },
    onError: (err) => {
      console.error('Streaming error:', err);
      onError?.(err);
    },
  });

  const { nodes, edges, isComplete } = useStreamingCanvas();

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  // 同步流式节点到 ReactFlow
  useEffect(() => {
    setRfNodes(nodes);
  }, [nodes, setRfNodes]);

  // 同步流式连线到 ReactFlow
  useEffect(() => {
    setRfEdges(edges);
  }, [edges, setRfEdges]);

  // 自动开始
  useEffect(() => {
    if (autoStart && description && phase === 'idle') {
      startStreaming(description);
    }
  }, [autoStart, description, phase, startStreaming]);

  // 完成回调
  useEffect(() => {
    if (isComplete && agentConfig) {
      onComplete?.({
        nodes: streamingNodes,
        edges: streamingEdges,
        config: agentConfig,
      });
    }
  }, [isComplete, agentConfig, streamingNodes, streamingEdges, onComplete]);

  const handleStart = useCallback(() => {
    if (description) {
      startStreaming(description);
    }
  }, [description, startStreaming]);

  const handleRetry = useCallback(() => {
    if (description) {
      retry(description);
    }
  }, [description, retry]);

  return (
    <div className={cn("relative w-full h-full min-h-[400px]", className)}>
      {/* ReactFlow 画布 */}
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.5}
        className="bg-background"
      >
        <Background gap={20} size={1} />
        <Controls position="bottom-right" />
        <MiniMap 
          position="bottom-left"
          className="!bg-card !border-border"
          nodeColor={(node) => {
            const status = node.data?.status;
            if (status === 'ghost') return 'hsl(var(--primary) / 0.3)';
            if (status === 'materializing') return 'hsl(var(--primary) / 0.6)';
            return 'hsl(var(--primary))';
          }}
        />
      </ReactFlow>

      {/* 思维气泡 */}
      <div className="absolute bottom-24 left-4">
        <ThinkingBubble
          thoughts={thoughts}
          currentThought={currentThought}
          isActive={isStreaming}
        />
      </div>

      {/* 进度指示器 */}
      <div className="absolute top-4 right-4 w-72">
        <StreamingProgress
          progress={progress}
          phase={phase}
          currentStep={currentStep}
          isActive={isStreaming || isComplete}
          error={error}
        />
      </div>

      {/* 控制按钮 */}
      <AnimatePresence>
        {phase === 'idle' && !isStreaming && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <div className="flex flex-col items-center gap-4 p-8 bg-card/90 backdrop-blur-sm rounded-2xl border border-border shadow-xl">
              <div className="text-center mb-2">
                <h3 className="font-semibold mb-1">准备开始</h3>
                <p className="text-sm text-muted-foreground max-w-xs">
                  {description ? `"${description.slice(0, 50)}${description.length > 50 ? '...' : ''}"` : '等待输入描述...'}
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleStart}
                disabled={!description}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                开始流式生成
              </Button>
            </div>
          </motion.div>
        )}

        {error && errorRecoverable && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 right-4"
          >
            <Button variant="outline" onClick={handleRetry} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              重试
            </Button>
          </motion.div>
        )}

        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 right-4"
          >
            <Button variant="destructive" onClick={stopStreaming} className="gap-2">
              <Square className="h-4 w-4" />
              停止
            </Button>
          </motion.div>
        )}

        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute bottom-4 right-4"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">
                生成完成 · {summary?.totalNodes || 0} 个节点 · {summary?.totalEdges || 0} 条连线
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function StreamingCanvas(props: StreamingCanvasProps) {
  return (
    <ReactFlowProvider>
      <StreamingCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default StreamingCanvas;
