/**
 * useNanoClawExecutor — 封装 NanoClaw 模式下的完整执行流程
 *
 * 职责:
 * 1. 从 runtimeStore 读取端点和 token
 * 2. 包装 useTerminalStream，提供简化的 execute(command) 接口
 * 3. 处理容器选择（activeContainerId 或自动创建临时容器）
 * 4. 将 SSE 流事件转换为消息格式
 * 5. 集成 Vibe Loop 自愈
 */

import { useCallback, useRef, useState } from 'react';
import { useRuntimeStore } from '../stores/runtimeStore.ts';
import { useTerminalStream } from './useTerminalStream.ts';
import { supabase } from '../integrations/supabase/client.ts';

export interface ExecutionResult {
  success: boolean;
  output: string;
  exitCode: number;
  durationMs: number;
  containerId: string;
  commandId: string;
}

interface UseNanoClawExecutorReturn {
  /** Whether NanoClaw mode is active and connected */
  isReady: boolean;
  /** Whether currently executing a command */
  isExecuting: boolean;
  /** Accumulated output of current execution */
  currentOutput: string;
  /** Execute a command in NanoClaw container, returns full result */
  execute: (command: string, workingDir?: string) => Promise<ExecutionResult>;
  /** Cancel current execution */
  cancel: () => void;
}

export function useNanoClawExecutor(): UseNanoClawExecutorReturn {
  const store = useRuntimeStore();
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentOutput, setCurrentOutput] = useState('');
  const outputRef = useRef('');
  const activeCommandIdRef = useRef<string | null>(null);

  const endpoint = `${store.config.nanoclaw.endpoint}:${store.config.nanoclaw.port}`;
  const authToken = store.config.nanoclaw.authToken;

  const isReady =
    store.mode === 'nanoclaw' && store.connectionStatus === 'connected';

  const terminalStream = useTerminalStream({
    nanoclawEndpoint: endpoint,
    authToken,
    onOutput: (_cmdId, text, _isStderr) => {
      outputRef.current += text;
      setCurrentOutput(outputRef.current);
    },
  });

  /**
   * Auto-create a temporary container if none is active.
   * Returns the container ID to use.
   */
  const resolveContainerId = useCallback(async (): Promise<string> => {
    if (store.activeContainerId) return store.activeContainerId;

    // Create a temporary container via the gateway
    const { data, error } = await supabase.functions.invoke('nanoclaw-gateway', {
      body: {
        action: 'create_container',
        nanoclawEndpoint: endpoint,
        authToken,
        config: {
          groupName: 'temp-session',
          agentId: 'default',
          isolationLevel: 'full',
          mountPoints: [],
          resourceLimits: {
            maxCpuPercent: 50,
            maxMemoryMb: 512,
            maxDiskMb: 1024,
            maxProcesses: 10,
            networkEnabled: true,
          },
          environment: {},
        },
      },
    });

    if (error || !data?.id) {
      throw new Error(error?.message || '无法创建临时容器');
    }

    const containerId = data.id as string;
    store.addContainer({
      id: containerId,
      groupName: 'temp-session',
      agentId: 'default',
      status: 'running',
      createdAt: new Date(),
      lastActivityAt: new Date(),
      metrics: {
        cpuUsagePercent: 0,
        memoryUsageMb: 0,
        diskUsageMb: 0,
        activeProcesses: 0,
        networkBytesIn: 0,
        networkBytesOut: 0,
        uptimeMs: 0,
      },
    });
    store.setActiveContainer(containerId);
    return containerId;
  }, [store, endpoint, authToken]);

  const execute = useCallback(
    async (command: string, workingDir?: string): Promise<ExecutionResult> => {
      if (!isReady) {
        return {
          success: false,
          output: '❌ NanoClaw 未连接，请先在设置中配置并测试连接。',
          exitCode: -1,
          durationMs: 0,
          containerId: '',
          commandId: '',
        };
      }

      setIsExecuting(true);
      outputRef.current = '';
      setCurrentOutput('');

      let containerId = '';
      try {
        containerId = await resolveContainerId();
      } catch (err: any) {
        setIsExecuting(false);
        return {
          success: false,
          output: `❌ 容器分配失败: ${err.message}`,
          exitCode: -1,
          durationMs: 0,
          containerId: '',
          commandId: '',
        };
      }

      const startTime = Date.now();

      return new Promise<ExecutionResult>((resolve) => {
        // We track completion via a wrapper around the stream
        const originalOnComplete = terminalStream.state.lastExitCode;

        const runStream = async () => {
          try {
            const commandId = await terminalStream.executeStream(
              command,
              containerId,
              workingDir,
            );
            activeCommandIdRef.current = commandId;

            // Poll for stream completion (executeStream is promise-based and resolves when done)
            const elapsed = Date.now() - startTime;
            const exitCode = terminalStream.state.lastExitCode ?? 0;

            setIsExecuting(false);
            activeCommandIdRef.current = null;

            resolve({
              success: exitCode === 0,
              output: outputRef.current,
              exitCode,
              durationMs: elapsed,
              containerId,
              commandId,
            });
          } catch (err: Error) {
            setIsExecuting(false);
            activeCommandIdRef.current = null;
            resolve({
              success: false,
              output: outputRef.current || `执行错误: ${err.message}`,
              exitCode: -1,
              durationMs: Date.now() - startTime,
              containerId,
              commandId: '',
            });
          }
        };

        runStream();
      });
    },
    [isReady, resolveContainerId, terminalStream],
  );

  const cancel = useCallback(() => {
    if (activeCommandIdRef.current) {
      terminalStream.cancelStream(activeCommandIdRef.current);
      activeCommandIdRef.current = null;
    }
    setIsExecuting(false);
  }, [terminalStream]);

  return {
    isReady,
    isExecuting,
    currentOutput,
    execute,
    cancel,
  };
}
