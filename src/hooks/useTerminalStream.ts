/**
 * useTerminalStream - SSE-based streaming terminal hook
 * Connects to nanoclaw-stream Edge Function for real-time container output
 */

import { useState, useCallback, useRef } from 'react';
import type { TerminalCommand } from '@/types/openCode';

export type StreamEventType = 'stdout' | 'stderr' | 'status' | 'exit';

export interface StreamEvent {
  type: StreamEventType;
  content?: string;
  exitCode?: number;
  durationMs?: number;
  phase?: string;
  progress?: number;
}

export interface TerminalStreamState {
  isStreaming: boolean;
  currentPhase: string | null;
  progress: number | null;
  lastExitCode: number | null;
}

interface UseTerminalStreamOptions {
  nanoclawEndpoint: string;
  authToken: string;
  onCommand?: (cmd: TerminalCommand) => void;
  onOutput?: (commandId: string, output: string, isStderr: boolean) => void;
  onComplete?: (commandId: string, exitCode: number, durationMs: number) => void;
  onError?: (commandId: string, error: string) => void;
}

interface UseTerminalStreamReturn {
  state: TerminalStreamState;
  executeStream: (command: string, containerId: string, workingDir?: string) => Promise<string>;
  cancelStream: (commandId: string) => void;
  cancelAll: () => void;
}

export function useTerminalStream(options: UseTerminalStreamOptions): UseTerminalStreamReturn {
  const { nanoclawEndpoint, authToken, onCommand, onOutput, onComplete, onError } = options;
  
  const [state, setState] = useState<TerminalStreamState>({
    isStreaming: false,
    currentPhase: null,
    progress: null,
    lastExitCode: null,
  });

  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const activeStreamsRef = useRef(0);

  const executeStream = useCallback(async (
    command: string,
    containerId: string,
    workingDir?: string,
  ): Promise<string> => {
    const commandId = crypto.randomUUID();
    const abortController = new AbortController();
    abortControllersRef.current.set(commandId, abortController);
    activeStreamsRef.current++;

    // Emit command start
    const cmd: TerminalCommand = {
      id: commandId,
      command,
      output: '',
      status: 'running',
      timestamp: new Date(),
    };
    onCommand?.(cmd);

    setState(prev => ({
      ...prev,
      isStreaming: true,
      currentPhase: 'executing',
      progress: null,
    }));

    try {
      const streamUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nanoclaw-stream`;
      
      const response = await fetch(streamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          nanoclawEndpoint,
          authToken,
          command,
          containerId,
          workingDir,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stream error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n\n')) !== -1) {
          const eventBlock = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 2);

          let eventType = 'message';
          let eventData = '';

          for (const line of eventBlock.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6);
            }
          }

          if (!eventData) continue;

          try {
            const parsed: StreamEvent = JSON.parse(eventData);

            switch (eventType) {
              case 'stdout':
                onOutput?.(commandId, parsed.content || '', false);
                break;
              case 'stderr':
                onOutput?.(commandId, parsed.content || '', true);
                break;
              case 'status':
                setState(prev => ({
                  ...prev,
                  currentPhase: parsed.phase || null,
                  progress: parsed.progress ?? null,
                }));
                break;
              case 'exit':
                const exitCode = parsed.exitCode ?? 0;
                const durationMs = parsed.durationMs ?? 0;
                onComplete?.(commandId, exitCode, durationMs);
                setState(prev => ({
                  ...prev,
                  lastExitCode: exitCode,
                }));
                break;
            }
          } catch {
            // Ignore malformed JSON
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        onError?.(commandId, error.message || 'Stream failed');
      }
    } finally {
      abortControllersRef.current.delete(commandId);
      activeStreamsRef.current--;
      
      if (activeStreamsRef.current <= 0) {
        activeStreamsRef.current = 0;
        setState(prev => ({
          ...prev,
          isStreaming: false,
          currentPhase: null,
          progress: null,
        }));
      }
    }

    return commandId;
  }, [nanoclawEndpoint, authToken, onCommand, onOutput, onComplete, onError]);

  const cancelStream = useCallback((commandId: string) => {
    const controller = abortControllersRef.current.get(commandId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(commandId);
    }
  }, []);

  const cancelAll = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
    activeStreamsRef.current = 0;
    setState({
      isStreaming: false,
      currentPhase: null,
      progress: null,
      lastExitCode: null,
    });
  }, []);

  return { state, executeStream, cancelStream, cancelAll };
}
