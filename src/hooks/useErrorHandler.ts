/**
 * @file useErrorHandler.ts
 * @description 统一错误处理 Hook
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { 
  AppError, 
  fromNativeError, 
  isAppError,
  ERROR_CODES,
  createAppError 
} from '@/lib/errorTypes';

interface ErrorHandlerOptions {
  /** 是否显示 toast */
  showToast?: boolean;
  /** 是否记录到控制台 */
  logToConsole?: boolean;
  /** 自定义错误处理 */
  onError?: (error: AppError) => void;
}

interface UseErrorHandlerReturn {
  /** 当前错误 */
  error: AppError | null;
  /** 是否有错误 */
  hasError: boolean;
  /** 捕获并转换错误 */
  captureError: (error: unknown, context?: Record<string, unknown>) => AppError;
  /** 显示错误提示 */
  displayError: (error: AppError) => void;
  /** 上报错误 */
  reportError: (error: AppError) => Promise<void>;
  /** 尝试恢复错误 */
  recoverFromError: (error: AppError) => Promise<boolean>;
  /** 清除错误 */
  clearError: () => void;
  /** 包装异步函数以自动处理错误 */
  withErrorHandling: <T>(
    fn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ) => Promise<T | null>;
  /** 错误历史 */
  errorHistory: AppError[];
}

export function useErrorHandler(
  defaultOptions?: ErrorHandlerOptions
): UseErrorHandlerReturn {
  const [error, setError] = useState<AppError | null>(null);
  const [errorHistory, setErrorHistory] = useState<AppError[]>([]);

  const options = {
    showToast: true,
    logToConsole: true,
    ...defaultOptions,
  };

  // 捕获并转换错误
  const captureError = useCallback((
    rawError: unknown,
    context?: Record<string, unknown>
  ): AppError => {
    const appError = fromNativeError(rawError, context);
    setError(appError);
    setErrorHistory(prev => [...prev.slice(-9), appError]); // 保留最近10条
    return appError;
  }, []);

  // 显示错误提示
  const displayError = useCallback((appError: AppError) => {
    const toastOptions: Parameters<typeof toast.error>[1] = {
      description: appError.recoverable ? '点击重试' : undefined,
      action: appError.retryAction ? {
        label: '重试',
        onClick: () => appError.retryAction?.(),
      } : undefined,
    };

    switch (appError.severity) {
      case 'info':
        toast.info(appError.userMessage, toastOptions);
        break;
      case 'warning':
        toast.warning(appError.userMessage, toastOptions);
        break;
      case 'critical':
      case 'error':
      default:
        toast.error(appError.userMessage, toastOptions);
        break;
    }
  }, []);

  // 上报错误（可扩展到 Sentry 等服务）
  const reportError = useCallback(async (appError: AppError): Promise<void> => {
    if (options.logToConsole) {
      console.error('[ErrorHandler]', {
        code: appError.code,
        type: appError.type,
        message: appError.message,
        context: appError.context,
        timestamp: appError.timestamp,
      });
    }

    // TODO: 扩展到错误追踪服务
    // await sendToSentry(appError);
  }, [options.logToConsole]);

  // 尝试恢复错误
  const recoverFromError = useCallback(async (appError: AppError): Promise<boolean> => {
    if (!appError.recoverable || !appError.retryAction) {
      return false;
    }

    try {
      await appError.retryAction();
      setError(null);
      toast.success('操作已成功恢复');
      return true;
    } catch (retryError) {
      const newError = captureError(retryError, { retryAttempt: true });
      displayError(newError);
      return false;
    }
  }, [captureError, displayError]);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 包装异步函数以自动处理错误
  const withErrorHandling = useCallback(async <T>(
    fn: () => Promise<T>,
    handlerOptions?: ErrorHandlerOptions
  ): Promise<T | null> => {
    const mergedOptions = { ...options, ...handlerOptions };
    
    try {
      const result = await fn();
      return result;
    } catch (rawError) {
      const appError = captureError(rawError);
      
      if (mergedOptions.showToast) {
        displayError(appError);
      }
      
      await reportError(appError);
      
      mergedOptions.onError?.(appError);
      
      return null;
    }
  }, [options, captureError, displayError, reportError]);

  return {
    error,
    hasError: error !== null,
    captureError,
    displayError,
    reportError,
    recoverFromError,
    clearError,
    withErrorHandling,
    errorHistory,
  };
}

// 便捷的错误创建函数
export const createError = {
  network: (message?: string, retryAction?: () => Promise<void>) =>
    createAppError(ERROR_CODES.NETWORK_ERROR, 'network', { message, retryAction }),
  
  unauthorized: () =>
    createAppError(ERROR_CODES.UNAUTHORIZED, 'permission'),
  
  forbidden: () =>
    createAppError(ERROR_CODES.FORBIDDEN, 'permission'),
  
  validation: (message: string) =>
    createAppError(ERROR_CODES.VALIDATION_ERROR, 'validation', { 
      userMessage: message 
    }),
  
  business: (code: string, message: string) =>
    createAppError(code, 'business', { userMessage: message }),
};
