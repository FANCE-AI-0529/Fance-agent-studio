// 沙箱执行 Hook (Sandbox Execution Hook)

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSandboxStore } from '@/stores/sandboxStore';
import type { 
  SandboxConfig, 
  SandboxExecutionResult, 
  SandboxExecuteRequest,
  ExecutionMetrics,
} from '@/types/sandbox';

interface UseSandboxExecutionOptions {
  onSuccess?: (result: SandboxExecutionResult) => void;
  onError?: (error: { code: string; message: string }) => void;
  onNetworkBlocked?: (domain: string, requiredPermission?: string) => void;
}

export function useSandboxExecution(options: UseSandboxExecutionOptions = {}) {
  const { toast } = useToast();
  const store = useSandboxStore();
  
  const [isExecuting, setIsExecuting] = useState(false);
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  /**
   * 执行技能代码
   */
  const execute = useCallback(async (
    skillCode: string,
    input: unknown,
    config?: Partial<SandboxConfig>,
    grantedPermissions: string[] = []
  ): Promise<SandboxExecutionResult> => {
    setIsExecuting(true);
    setError(null);
    
    const executionId = crypto.randomUUID();
    store.setExecuting(true, executionId);
    
    const fullConfig: SandboxConfig = {
      ...store.config,
      ...config,
    };
    
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('sandbox-execute', {
        body: {
          skillCode,
          input,
          config: fullConfig,
          grantedPermissions,
        } as Omit<SandboxExecuteRequest, 'mplpToken'>,
      });
      
      if (invokeError) {
        throw new Error(invokeError.message);
      }
      
      const result = data as SandboxExecutionResult;
      
      // 更新指标
      setMetrics(result.metrics);
      
      // 更新统计
      store.updateStats(result.networkLogs);
      
      // 添加到历史
      store.addToHistory({
        id: executionId,
        success: result.success,
        metrics: result.metrics,
        networkLogs: result.networkLogs,
        error: result.error ? { code: result.error.code, message: result.error.message } : undefined,
      });
      
      // 保存最后结果
      store.setLastResult(result);
      
      // 处理错误
      if (!result.success && result.error) {
        setError({ code: result.error.code, message: result.error.message });
        
        // 特殊处理网络阻止
        if (result.error.code === 'NETWORK_BLOCKED') {
          const blockedLog = result.networkLogs.find(l => l.status === 'blocked');
          if (blockedLog) {
            options.onNetworkBlocked?.(blockedLog.domain, blockedLog.blockReason);
            
            toast({
              title: '网络访问被拒绝',
              description: blockedLog.blockReason || `域名 ${blockedLog.domain} 未授权`,
              variant: 'destructive',
            });
          }
        } else if (result.error.code === 'TIMEOUT') {
          toast({
            title: '执行超时',
            description: `执行时间超过 ${fullConfig.timeoutMs}ms 限制`,
            variant: 'destructive',
          });
        } else if (result.error.code === 'NETWORK_RATE_LIMITED') {
          toast({
            title: '网络请求过多',
            description: `超过最大请求数 ${fullConfig.limits.maxNetworkRequests} 限制`,
            variant: 'destructive',
          });
        }
        
        options.onError?.(result.error);
      } else {
        options.onSuccess?.(result);
      }
      
      return result;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const executionError = { code: 'RUNTIME_ERROR' as const, message: errorMessage };
      
      setError(executionError);
      
      const failedResult: SandboxExecutionResult = {
        success: false,
        error: executionError,
        metrics: {
          cpuTimeMs: 0,
          memoryPeakMb: 0,
          executionTimeMs: 0,
          networkRequestsCount: 0,
          networkBytesIn: 0,
          networkBytesOut: 0,
        },
        networkLogs: [],
      };
      
      store.addToHistory({
        id: executionId,
        success: false,
        metrics: failedResult.metrics,
        networkLogs: [],
        error: executionError,
      });
      
      options.onError?.(executionError);
      
      toast({
        title: '执行失败',
        description: errorMessage,
        variant: 'destructive',
      });
      
      return failedResult;
      
    } finally {
      setIsExecuting(false);
      store.setExecuting(false);
    }
  }, [store, options, toast]);

  /**
   * 验证代码安全性 (静态分析)
   */
  const validateCode = useCallback((code: string): { 
    valid: boolean; 
    warnings: string[]; 
    errors: string[];
  } => {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // 检查危险模式
    const dangerousPatterns = [
      { pattern: /\beval\s*\(/g, message: '使用 eval() 是不安全的' },
      { pattern: /\bFunction\s*\(/g, message: '动态创建 Function 是不安全的' },
      { pattern: /\bprocess\./g, message: '访问 process 对象是不允许的' },
      { pattern: /\brequire\s*\(/g, message: '使用 require() 是不允许的' },
      { pattern: /\bimport\s*\(/g, message: '动态 import 是不允许的' },
      { pattern: /\b__dirname\b/g, message: '访问 __dirname 是不允许的' },
      { pattern: /\b__filename\b/g, message: '访问 __filename 是不允许的' },
    ];
    
    for (const { pattern, message } of dangerousPatterns) {
      if (pattern.test(code)) {
        errors.push(message);
      }
    }
    
    // 检查警告模式
    const warningPatterns = [
      { pattern: /while\s*\(\s*true\s*\)/g, message: '检测到可能的无限循环' },
      { pattern: /for\s*\(\s*;\s*;\s*\)/g, message: '检测到可能的无限循环' },
      { pattern: /setInterval/g, message: '使用 setInterval 可能导致资源问题' },
    ];
    
    for (const { pattern, message } of warningPatterns) {
      if (pattern.test(code)) {
        warnings.push(message);
      }
    }
    
    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }, []);

  return {
    execute,
    validateCode,
    isExecuting,
    metrics,
    error,
    config: store.config,
    setConfig: store.setConfig,
    setPreset: store.setPreset,
    executionHistory: store.executionHistory,
    lastResult: store.lastResult,
  };
}
