// IPC 中间件系统 (IPC Middleware System)

import type { IPCMessage, IPCCommandPayload, IPCAuthRequestPayload } from '@/types/runtime';
import { DANGEROUS_PATTERNS, type DangerousPattern, classifyCommandRisk } from '@/constants/dangerousPatterns';

/**
 * IPC 中间件接口
 */
export type IPCMiddleware = (
  message: IPCMessage,
  next: () => Promise<IPCMessage | null>
) => Promise<IPCMessage | null>;

/**
 * 授权请求回调
 */
export type AuthorizationRequestHandler = (
  request: IPCAuthRequestPayload
) => Promise<{ approved: boolean; permanent: boolean }>;

/**
 * MPLP 拦截器 - 检测并拦截高危 IPC 操作
 */
export class MPLPInterceptor {
  private grantedPermissions: Set<string> = new Set();
  private permanentGrants: Set<string> = new Set();
  private authRequestHandler: AuthorizationRequestHandler | null = null;
  private pendingRequests: Map<string, {
    resolve: (value: { approved: boolean; permanent: boolean }) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }> = new Map();

  setAuthRequestHandler(handler: AuthorizationRequestHandler): void {
    this.authRequestHandler = handler;
  }

  addGrantedPermission(permission: string): void {
    this.grantedPermissions.add(permission);
  }

  addPermanentGrant(pattern: string): void {
    this.permanentGrants.add(pattern);
  }

  /**
   * 中间件实现
   */
  createMiddleware(): IPCMiddleware {
    return async (message, next) => {
      // 只拦截 command 类型消息
      if (message.type !== 'command') {
        return next();
      }

      const payload = message.payload as IPCCommandPayload;
      const riskResult = classifyCommandRisk(payload.command);

      // 低风险直接放行
      if (riskResult.level === 'low') {
        return next();
      }

      // 检查永久授权
      if (this.permanentGrants.has(riskResult.matchedPattern || '')) {
        return next();
      }

      // 检查已授权权限
      if (riskResult.requiredPermission && this.grantedPermissions.has(riskResult.requiredPermission)) {
        return next();
      }

      // 需要人类授权
      const authRequest: IPCAuthRequestPayload = {
        kind: 'authorization_request',
        operationId: message.id,
        command: payload.command,
        riskLevel: riskResult.level,
        riskDescription: riskResult.description,
        requiredPermission: riskResult.requiredPermission || 'ipc:execute_command',
        timeoutMs: riskResult.level === 'critical' ? 30000 : 60000,
        context: {
          workingDirectory: payload.workingDirectory,
          args: payload.args,
          matchedPatterns: riskResult.matchedPatterns,
        },
      };

      if (!this.authRequestHandler) {
        console.warn('[MPLP] No auth handler registered, blocking operation');
        return null; // 阻止执行
      }

      try {
        const response = await this.authRequestHandler(authRequest);

        if (response.permanent && riskResult.matchedPattern) {
          this.permanentGrants.add(riskResult.matchedPattern);
        }

        if (response.approved) {
          return next();
        }

        // 拒绝执行
        return null;
      } catch {
        // 超时或错误，默认拒绝
        return null;
      }
    };
  }

  /**
   * 响应授权请求
   */
  resolveAuthRequest(operationId: string, approved: boolean, permanent: boolean): void {
    const pending = this.pendingRequests.get(operationId);
    if (pending) {
      clearTimeout(pending.timeoutId);
      pending.resolve({ approved, permanent });
      this.pendingRequests.delete(operationId);
    }
  }

  /**
   * 重置所有授权
   */
  reset(): void {
    this.grantedPermissions.clear();
    this.permanentGrants.clear();
    this.pendingRequests.forEach(p => {
      clearTimeout(p.timeoutId);
      p.resolve({ approved: false, permanent: false });
    });
    this.pendingRequests.clear();
  }
}

/**
 * 审计日志中间件
 */
export class AuditLogger {
  private logs: Array<{
    timestamp: Date;
    messageId: string;
    type: string;
    source: string;
    target: string;
    summary: string;
    riskLevel?: string;
    blocked: boolean;
  }> = [];

  createMiddleware(): IPCMiddleware {
    return async (message, next) => {
      const startTime = Date.now();
      const result = await next();
      const blocked = result === null;

      let summary = `${message.type}`;
      if (message.type === 'command') {
        const payload = message.payload as IPCCommandPayload;
        summary = `CMD: ${payload.command.substring(0, 100)}`;
      }

      this.logs.push({
        timestamp: new Date(),
        messageId: message.id,
        type: message.type,
        source: message.source,
        target: message.target,
        summary,
        riskLevel: message.type === 'command' 
          ? (message.payload as IPCCommandPayload).riskLevel 
          : undefined,
        blocked,
      });

      // 保留最近 500 条日志
      if (this.logs.length > 500) {
        this.logs = this.logs.slice(-500);
      }

      return result;
    };
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

/**
 * 应用中间件链
 */
export async function applyMiddleware(
  message: IPCMessage,
  middlewares: IPCMiddleware[]
): Promise<IPCMessage | null> {
  let index = 0;

  const next = async (): Promise<IPCMessage | null> => {
    if (index >= middlewares.length) {
      return message; // 全部通过，返回原始消息
    }

    const middleware = middlewares[index++];
    return middleware(message, next);
  };

  return next();
}

/**
 * 创建标准中间件管道（MPLP 拦截 + 审计日志）
 */
export function createStandardPipeline(): {
  interceptor: MPLPInterceptor;
  auditLogger: AuditLogger;
  middlewares: IPCMiddleware[];
} {
  const interceptor = new MPLPInterceptor();
  const auditLogger = new AuditLogger();

  return {
    interceptor,
    auditLogger,
    middlewares: [
      interceptor.createMiddleware(),
      auditLogger.createMiddleware(),
    ],
  };
}
