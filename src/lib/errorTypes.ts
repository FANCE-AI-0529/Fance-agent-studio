/**
 * @file errorTypes.ts
 * @description 统一错误类型定义
 */

// 错误类型枚举
export type ErrorType = 'network' | 'business' | 'permission' | 'validation' | 'unknown';

// 错误严重级别
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// 应用错误接口
export interface AppError {
  /** 错误代码 */
  code: string;
  /** 错误类型 */
  type: ErrorType;
  /** 技术错误消息（用于日志） */
  message: string;
  /** 用户友好的错误消息 */
  userMessage: string;
  /** 是否可恢复 */
  recoverable: boolean;
  /** 错误严重级别 */
  severity: ErrorSeverity;
  /** 重试操作 */
  retryAction?: () => Promise<void>;
  /** 原始错误对象 */
  originalError?: unknown;
  /** 错误发生时间 */
  timestamp: Date;
  /** 上下文信息 */
  context?: Record<string, unknown>;
}

// 错误代码映射
export const ERROR_CODES = {
  // 网络错误
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // 业务错误
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  INVALID_CONFIG: 'INVALID_CONFIG',
  OPERATION_FAILED: 'OPERATION_FAILED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  
  // 权限错误
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  
  // 验证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  
  // 未知错误
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// 错误消息映射
export const ERROR_MESSAGES: Record<string, { zh: string; en: string }> = {
  [ERROR_CODES.NETWORK_TIMEOUT]: {
    zh: '请求超时，请检查网络连接后重试',
    en: 'Request timeout, please check your network and try again',
  },
  [ERROR_CODES.NETWORK_OFFLINE]: {
    zh: '网络已断开，请检查网络连接',
    en: 'Network is offline, please check your connection',
  },
  [ERROR_CODES.NETWORK_ERROR]: {
    zh: '网络请求失败，请稍后重试',
    en: 'Network request failed, please try again later',
  },
  [ERROR_CODES.AGENT_NOT_FOUND]: {
    zh: '未找到指定的智能体',
    en: 'Agent not found',
  },
  [ERROR_CODES.SKILL_NOT_FOUND]: {
    zh: '未找到指定的技能',
    en: 'Skill not found',
  },
  [ERROR_CODES.INVALID_CONFIG]: {
    zh: '配置无效，请检查后重试',
    en: 'Invalid configuration, please check and try again',
  },
  [ERROR_CODES.OPERATION_FAILED]: {
    zh: '操作失败，请稍后重试',
    en: 'Operation failed, please try again later',
  },
  [ERROR_CODES.QUOTA_EXCEEDED]: {
    zh: '已超出配额限制',
    en: 'Quota exceeded',
  },
  [ERROR_CODES.UNAUTHORIZED]: {
    zh: '请先登录',
    en: 'Please log in first',
  },
  [ERROR_CODES.FORBIDDEN]: {
    zh: '没有权限执行此操作',
    en: 'You do not have permission to perform this action',
  },
  [ERROR_CODES.SESSION_EXPIRED]: {
    zh: '登录已过期，请重新登录',
    en: 'Session expired, please log in again',
  },
  [ERROR_CODES.VALIDATION_ERROR]: {
    zh: '输入验证失败',
    en: 'Validation failed',
  },
  [ERROR_CODES.INVALID_INPUT]: {
    zh: '输入内容无效',
    en: 'Invalid input',
  },
  [ERROR_CODES.REQUIRED_FIELD]: {
    zh: '必填字段不能为空',
    en: 'Required field cannot be empty',
  },
  [ERROR_CODES.UNKNOWN_ERROR]: {
    zh: '发生未知错误，请稍后重试',
    en: 'An unknown error occurred, please try again later',
  },
};

// 创建 AppError 的工厂函数
export function createAppError(
  code: string,
  type: ErrorType,
  options?: {
    message?: string;
    userMessage?: string;
    recoverable?: boolean;
    severity?: ErrorSeverity;
    retryAction?: () => Promise<void>;
    originalError?: unknown;
    context?: Record<string, unknown>;
  }
): AppError {
  const errorMessage = ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
  
  return {
    code,
    type,
    message: options?.message || errorMessage.en,
    userMessage: options?.userMessage || errorMessage.zh,
    recoverable: options?.recoverable ?? (type === 'network' || type === 'business'),
    severity: options?.severity ?? (type === 'permission' ? 'error' : 'warning'),
    retryAction: options?.retryAction,
    originalError: options?.originalError,
    timestamp: new Date(),
    context: options?.context,
  };
}

// 判断错误是否为 AppError
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'type' in error &&
    'message' in error &&
    'userMessage' in error
  );
}

// 从原生错误转换为 AppError
export function fromNativeError(error: unknown, context?: Record<string, unknown>): AppError {
  // 已经是 AppError
  if (isAppError(error)) {
    return error;
  }

  // 网络错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createAppError(ERROR_CODES.NETWORK_ERROR, 'network', {
      originalError: error,
      context,
    });
  }

  // Supabase 错误
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const supaError = error as { code: string; message?: string };
    
    if (supaError.code === 'PGRST301' || supaError.code === '401') {
      return createAppError(ERROR_CODES.UNAUTHORIZED, 'permission', {
        originalError: error,
        context,
      });
    }
    
    if (supaError.code === '403' || supaError.code === 'PGRST204') {
      return createAppError(ERROR_CODES.FORBIDDEN, 'permission', {
        originalError: error,
        context,
      });
    }
  }

  // Error 实例
  if (error instanceof Error) {
    return createAppError(ERROR_CODES.UNKNOWN_ERROR, 'unknown', {
      message: error.message,
      originalError: error,
      context,
    });
  }

  // 未知错误
  return createAppError(ERROR_CODES.UNKNOWN_ERROR, 'unknown', {
    originalError: error,
    context,
  });
}
