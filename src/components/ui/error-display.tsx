/**
 * @file error-display.tsx
 * @description 统一错误展示组件
 */

import { AlertTriangle, RefreshCw, XCircle, Info, AlertCircle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AppError, ErrorSeverity } from '@/lib/errorTypes';
import { cn } from '@/lib/utils';

interface ErrorDisplayProps {
  error: AppError;
  variant?: 'inline' | 'card' | 'fullscreen';
  showDetails?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
  onGoHome?: () => void;
  className?: string;
}

const severityConfig: Record<ErrorSeverity, {
  icon: typeof AlertTriangle;
  className: string;
  alertVariant: 'default' | 'destructive';
}> = {
  info: {
    icon: Info,
    className: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
    alertVariant: 'default',
  },
  warning: {
    icon: AlertCircle,
    className: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950',
    alertVariant: 'default',
  },
  error: {
    icon: XCircle,
    className: 'text-destructive bg-destructive/10',
    alertVariant: 'destructive',
  },
  critical: {
    icon: AlertTriangle,
    className: 'text-destructive bg-destructive/20',
    alertVariant: 'destructive',
  },
};

// 内联错误提示
function InlineError({ 
  error, 
  showDetails, 
  onRetry, 
  onDismiss,
  className 
}: ErrorDisplayProps) {
  const config = severityConfig[error.severity];
  const Icon = config.icon;

  return (
    <Alert variant={config.alertVariant} className={cn(className)}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{error.userMessage}</AlertTitle>
      {showDetails && (
        <AlertDescription className="mt-2 text-xs opacity-70">
          错误代码: {error.code}
        </AlertDescription>
      )}
      {(onRetry || onDismiss) && (
        <div className="mt-3 flex gap-2">
          {error.recoverable && onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-3 w-3 mr-1" />
              重试
            </Button>
          )}
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              关闭
            </Button>
          )}
        </div>
      )}
    </Alert>
  );
}

// 卡片式错误展示
function CardError({ 
  error, 
  showDetails, 
  onRetry, 
  onDismiss, 
  onGoHome,
  className 
}: ErrorDisplayProps) {
  const config = severityConfig[error.severity];
  const Icon = config.icon;

  return (
    <Card className={cn('max-w-md mx-auto', className)}>
      <CardHeader className="text-center">
        <div className={cn(
          'w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4',
          config.className
        )}>
          <Icon className="h-6 w-6" />
        </div>
        <CardTitle className="text-lg">{error.userMessage}</CardTitle>
      </CardHeader>
      {showDetails && (
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">
            错误代码: {error.code}
          </p>
          {error.context && (
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(error.context, null, 2)}
            </pre>
          )}
        </CardContent>
      )}
      <CardFooter className="flex justify-center gap-2">
        {onGoHome && (
          <Button variant="outline" onClick={onGoHome}>
            <Home className="h-4 w-4 mr-2" />
            返回首页
          </Button>
        )}
        {error.recoverable && onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            重试
          </Button>
        )}
        {onDismiss && (
          <Button variant="ghost" onClick={onDismiss}>
            关闭
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

// 全屏错误展示
function FullscreenError({ 
  error, 
  showDetails, 
  onRetry, 
  onGoHome,
  className 
}: ErrorDisplayProps) {
  const config = severityConfig[error.severity];
  const Icon = config.icon;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-background',
      className
    )}>
      <div className={cn(
        'w-16 h-16 rounded-full flex items-center justify-center mb-6',
        config.className
      )}>
        <Icon className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-semibold mb-2">出了点问题</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        {error.userMessage}
      </p>
      {showDetails && (
        <p className="text-xs text-muted-foreground mb-4">
          错误代码: {error.code} | 时间: {error.timestamp.toLocaleTimeString()}
        </p>
      )}
      <div className="flex gap-3">
        {onGoHome && (
          <Button variant="outline" onClick={onGoHome}>
            <Home className="h-4 w-4 mr-2" />
            返回首页
          </Button>
        )}
        {error.recoverable && onRetry && (
          <Button onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新重试
          </Button>
        )}
      </div>
    </div>
  );
}

// 主组件
export function ErrorDisplay(props: ErrorDisplayProps) {
  const { variant = 'inline' } = props;

  switch (variant) {
    case 'card':
      return <CardError {...props} />;
    case 'fullscreen':
      return <FullscreenError {...props} />;
    case 'inline':
    default:
      return <InlineError {...props} />;
  }
}

// 简单的错误提示组件
export function SimpleErrorMessage({ 
  message, 
  onRetry,
  className 
}: { 
  message: string; 
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 text-destructive text-sm', className)}>
      <XCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
      {onRetry && (
        <Button size="sm" variant="ghost" onClick={onRetry} className="h-6 px-2">
          <RefreshCw className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

// 空状态错误
export function EmptyError({
  title = '暂无数据',
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <Info className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && (
        <Button variant="outline" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
