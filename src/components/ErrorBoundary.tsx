import { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, Bug, MessageSquare, Copy, Check } from 'lucide-react';
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
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, copied: false };
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
    this.setState({ hasError: false, error: undefined, appError: undefined, errorInfo: undefined, copied: false });
  };

  handleCopyError = async () => {
    const errorDetails = `
错误信息: ${this.state.error?.message || '未知错误'}
错误代码: ${this.state.appError?.code || 'UNKNOWN'}
堆栈信息:
${this.state.error?.stack || '无堆栈信息'}

组件堆栈:
${this.state.errorInfo?.componentStack || '无组件堆栈'}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      console.error('Failed to copy error details');
    }
  };

  handleFeedback = () => {
    // Open feedback form or email
    const subject = encodeURIComponent(`错误反馈: ${this.state.appError?.code || 'UNKNOWN'}`);
    const body = encodeURIComponent(`
请描述您遇到的问题：


---
错误详情：
${this.state.error?.message || '未知错误'}
错误代码：${this.state.appError?.code || 'UNKNOWN'}
时间：${new Date().toISOString()}
    `);
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { appError, copied } = this.state;

      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-background">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="max-w-lg w-full shadow-lg">
              <CardHeader className="text-center pb-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4"
                >
                  <AlertTriangle className="h-10 w-10 text-destructive" />
                </motion.div>
                <CardTitle className="text-xl">哎呀，出了点问题</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">
                  {appError?.userMessage || this.state.error?.message || '页面加载时发生意外错误，请尝试刷新页面或稍后再试。'}
                </p>
                
                {appError && (
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span className="px-2 py-1 bg-muted rounded-md font-mono">
                      错误代码: {appError.code}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={this.handleCopyError}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-status-executing" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}

                {/* Helpful suggestions */}
                <div className="text-left bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                  <p className="font-medium">您可以尝试：</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>刷新页面重新加载</li>
                    <li>清除浏览器缓存后重试</li>
                    <li>检查网络连接是否正常</li>
                    <li>如问题持续，请联系技术支持</li>
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <div className="flex justify-center gap-3 w-full">
                  <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                    <Home className="h-4 w-4 mr-2" />
                    返回首页
                  </Button>
                  {appError?.recoverable ? (
                    <Button onClick={this.handleRetry} className="flex-1">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重试
                    </Button>
                  ) : (
                    <Button onClick={this.handleRefresh} className="flex-1">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      刷新页面
                    </Button>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={this.handleFeedback}
                  className="text-muted-foreground"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  反馈问题
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
          
          {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
            <motion.details 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-left text-xs text-muted-foreground max-w-2xl w-full"
            >
              <summary className="cursor-pointer flex items-center gap-2 p-2 rounded-lg hover:bg-muted">
                <Bug className="h-3 w-3" />
                错误详情 (开发模式)
              </summary>
              <pre className="mt-2 p-4 bg-card border border-border rounded-lg overflow-x-auto text-[10px] font-mono">
                {this.state.error?.stack}
                {'\n\n'}
                {this.state.errorInfo.componentStack}
              </pre>
            </motion.details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
