// IPC 授权卡片 (IPC Authorization Card)

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Terminal, Clock, Check, X, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import type { IPCAuthRequestPayload } from '../../types/runtime.ts';
import type { RiskLevel } from '../../constants/dangerousPatterns.ts';

interface IPCAuthorizationCardProps {
  request: IPCAuthRequestPayload;
  onApprove: (operationId: string, permanent: boolean) => void;
  onReject: (operationId: string) => void;
  className?: string;
}

const riskConfig: Record<RiskLevel, { icon: typeof Shield; color: string; bgColor: string; label: string }> = {
  low: {
    icon: Shield,
    color: 'text-primary',
    bgColor: 'bg-primary/10 border-primary/30',
    label: '低风险',
  },
  medium: {
    icon: Shield,
    color: 'text-status-confirm',
    bgColor: 'bg-status-confirm/10 border-status-confirm/30',
    label: '中风险',
  },
  high: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10 border-destructive/30',
    label: '高风险',
  },
  critical: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/15 border-destructive/40',
    label: '严重风险',
  },
};

export function IPCAuthorizationCard({ request, onApprove, onReject, className }: IPCAuthorizationCardProps) {
  const [remainingMs, setRemainingMs] = useState(request.timeoutMs);
  const config = riskConfig[request.riskLevel];
  const Icon = config.icon;

  // 倒计时
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingMs(prev => {
        const next = prev - 1000;
        if (next <= 0) {
          onReject(request.operationId);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [request.operationId, onReject]);

  const handleApprove = useCallback((permanent: boolean) => {
    onApprove(request.operationId, permanent);
  }, [request.operationId, onApprove]);

  const handleReject = useCallback(() => {
    onReject(request.operationId);
  }, [request.operationId, onReject]);

  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const progressPercent = (remainingMs / request.timeoutMs) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn('border-2', config.bgColor, className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Icon className={cn('h-4 w-4', config.color)} />
              <span>IPC 操作授权请求</span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn('text-[10px]', config.color)}>
                {config.label}
              </Badge>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{remainingSeconds}s</span>
              </div>
            </div>
          </div>
          {/* 超时进度条 */}
          <div className="w-full h-0.5 bg-muted rounded-full mt-2 overflow-hidden">
            <motion.div
              className={cn('h-full rounded-full', 
                remainingSeconds > 10 ? 'bg-primary' : 'bg-destructive'
              )}
              style={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* 命令预览 */}
          <div className="rounded-md bg-background/50 border border-border/50 p-2.5">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Terminal className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium">将要执行的命令</span>
            </div>
            <pre className="text-xs font-mono text-foreground/90 whitespace-pre-wrap break-all">
              {request.command}
            </pre>
          </div>

          {/* 风险描述 */}
          <div className="text-xs text-muted-foreground">
            <span className={cn('font-medium', config.color)}>风险说明：</span>
            {request.riskDescription}
          </div>

          {/* 上下文信息 */}
          {request.context?.workingDirectory && (
            <div className="text-[10px] text-muted-foreground">
              <span className="font-medium">工作目录：</span>
              <code className="ml-1 px-1 py-0.5 rounded bg-muted font-mono">
                {request.context.workingDirectory as string}
              </code>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="destructive"
              className="flex-1 h-8 text-xs"
              onClick={handleReject}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              拒绝
            </Button>
            <Button
              size="sm"
              variant="default"
              className="flex-1 h-8 text-xs"
              onClick={() => handleApprove(false)}
            >
              <Check className="h-3.5 w-3.5 mr-1" />
              批准
            </Button>
            {request.riskLevel !== 'critical' && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => handleApprove(true)}
                title="永久授权此类操作"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
