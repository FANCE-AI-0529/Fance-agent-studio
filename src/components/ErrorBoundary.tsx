import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { fromNativeError, AppError } from '@/lib/errorTypes';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: AppError) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  appError?: AppError;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const appError = fromNativeError(error);
    return { hasError: true, error, appError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
    
    // 调用外部错误处理器
    if (this.props.onError && this.state.appError) {
      this.props.onError(this.state.appError);
    }
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, appError: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { appError } = this.state;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-background">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>出了点问题</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                {appError?.userMessage || this.state.error?.message || '页面加载时发生错误，请刷新重试'}
              </p>
              {appError && (
                <p className="text-xs text-muted-foreground">
                  错误代码: {appError.code}
                </p>
              )}
            </CardContent>
            <CardFooter className="flex justify-center gap-3">
              <Button variant="outline" onClick={this.handleGoHome}>
                <Home className="h-4 w-4 mr-2" />
                返回首页
              </Button>
              {appError?.recoverable ? (
                <Button onClick={this.handleRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重试
                </Button>
              ) : (
                <Button onClick={this.handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  刷新页面
                </Button>
              )}
            </CardFooter>
          </Card>
          
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <details className="mt-6 text-left text-xs text-muted-foreground max-w-2xl overflow-auto">
              <summary className="cursor-pointer flex items-center gap-2">
                <Bug className="h-3 w-3" />
                错误详情 (开发模式)
              </summary>
              <pre className="mt-2 p-4 bg-muted rounded-lg overflow-x-auto">
                {this.state.error?.stack}
                {'\n\n'}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
