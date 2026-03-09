import { useCallback, useRef } from 'react';
import { useStreamingStore } from '@/stores/streamingStore';
import { StreamEvent, parseSSEEvent, GenerationPhase } from '@/types/streaming';

const STREAMING_GENERATOR_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/streaming-generator`;

export interface UseStreamingGeneratorOptions {
  onNodeAdd?: (node: StreamEvent) => void;
  onEdgeAdd?: (edge: StreamEvent) => void;
  onThinking?: (thought: string) => void;
  onComplete?: (summary: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}

export function useStreamingGenerator(options: UseStreamingGeneratorOptions = {}) {
  const store = useStreamingStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(async (description: string, generateFullWorkflow = true) => {
    // 重置状态
    store.resetSession();
    
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();
    
    // 开始会话
    const sessionId = `stream_${Date.now()}`;
    store.startSession(sessionId);
    store.setPhase('analyzing');

    try {
      const response = await fetch(STREAMING_GENERATOR_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ description, generateFullWorkflow }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 按行处理 SSE 事件
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // 保留不完整的行

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              continue;
            }

            const event = parseSSEEvent(data);
            if (event) {
              handleStreamEvent(event, options);
            }
          }
        }
      }

      // 处理剩余的 buffer
      if (buffer.startsWith('data: ')) {
        const data = buffer.slice(6).trim();
        if (data && data !== '[DONE]') {
          const event = parseSSEEvent(data);
          if (event) {
            handleStreamEvent(event, options);
          }
        }
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (import.meta.env.DEV) console.debug('Streaming aborted');
        return;
      }
      
      const errorMessage = error instanceof Error ? error.message : '流式生成失败';
      store.setError(errorMessage, true);
      options.onError?.(errorMessage);
    }
  }, [store, options]);

  const handleStreamEvent = useCallback((event: StreamEvent, opts: UseStreamingGeneratorOptions) => {
    switch (event.type) {
      case 'thinking':
        store.addThought({
          type: 'thinking',
          thought: event.thought,
          category: event.category,
          timestamp: event.timestamp || Date.now(),
        });
        opts.onThinking?.(event.thought);
        break;

      case 'node':
        if (event.action === 'add') {
          store.addNode(event.node);
          opts.onNodeAdd?.(event);
        } else if (event.action === 'update') {
          store.updateNode(event.node.id, event.node);
        } else if (event.action === 'finalize') {
          store.finalizeNode(event.node.id);
        }
        
        // 更新阶段
        if (store.phase !== 'generating') {
          store.setPhase('generating');
        }
        break;

      case 'edge':
        if (event.action === 'add') {
          store.addEdge(event.edge);
          opts.onEdgeAdd?.(event);
        } else if (event.action === 'finalize') {
          store.finalizeEdge(event.edge.id);
        }
        
        // 更新阶段
        if (store.phase !== 'connecting') {
          store.setPhase('connecting');
        }
        break;

      case 'config':
        // 配置事件 - 可以扩展处理
        break;

      case 'progress':
        store.updateProgress(event.progress, event.step, event.estimatedRemaining);
        
        // 根据步骤更新阶段
        const stepToPhase: Record<string, GenerationPhase> = {
          analyze: 'analyzing',
          plan: 'planning',
          generate: 'generating',
          connect: 'connecting',
          validate: 'validating',
          complete: 'completed',
        };
        const newPhase = stepToPhase[event.step];
        if (newPhase) {
          store.setPhase(newPhase);
        }
        break;

      case 'complete':
        store.complete(event.agentConfig, event.summary);
        opts.onComplete?.(event.summary as unknown as Record<string, unknown>);
        break;

      case 'error':
        store.setError(event.message, event.recoverable);
        opts.onError?.(event.message);
        break;
    }
  }, [store]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    store.endSession();
  }, [store]);

  const retry = useCallback(async (description: string) => {
    stopStreaming();
    await startStreaming(description);
  }, [stopStreaming, startStreaming]);

  return {
    // 状态
    isStreaming: store.isStreaming,
    phase: store.phase,
    progress: store.progress,
    currentStep: store.currentStep,
    currentThought: store.currentThought,
    thoughts: store.thoughts,
    error: store.error,
    errorRecoverable: store.errorRecoverable,
    
    // 数据
    nodes: store.getNodesArray(),
    edges: store.getEdgesArray(),
    agentConfig: store.agentConfig,
    summary: store.summary,
    
    // 方法
    startStreaming,
    stopStreaming,
    retry,
    reset: store.resetSession,
  };
}
