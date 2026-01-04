import { useLLMUsageStats } from "@/hooks/useLLMUsageStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Activity, 
  Zap, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Bot,
  Cpu
} from "lucide-react";

interface LLMUsageStatsProps {
  days?: number;
  compact?: boolean;
}

export function LLMUsageStats({ days = 30, compact = false }: LLMUsageStatsProps) {
  const { data: stats, isLoading, error } = useLLMUsageStats(days);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <span>无法加载 AI 使用统计</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            AI 使用概览
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{stats.totalCalls}</p>
              <p className="text-xs text-muted-foreground">调用次数</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatTokens(stats.totalTokens)}</p>
              <p className="text-xs text-muted-foreground">Token 消耗</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">成功率</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">总调用</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalCalls}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Token 消耗</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatTokens(stats.totalTokens)}</p>
            <p className="text-xs text-muted-foreground">
              输入: {formatTokens(stats.promptTokens)} / 输出: {formatTokens(stats.completionTokens)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">平均延迟</span>
            </div>
            <p className="text-2xl font-bold mt-1">{Math.round(stats.avgLatency)}ms</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">成功率</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.successRate.toFixed(1)}%</p>
            <Progress value={stats.successRate} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Model Usage */}
      {stats.byModel.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4" />
              按模型统计
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byModel.map((model) => (
                <div key={model.model} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      {model.model.split('/').pop()}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{model.calls} 次</span>
                    <span className="text-muted-foreground">{formatTokens(model.tokens)} tokens</span>
                    <span className="text-muted-foreground">{Math.round(model.avgLatency)}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Usage */}
      {stats.byModule.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">按功能模块统计</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.byModule.map((module) => {
                const percentage = stats.totalCalls > 0 
                  ? (module.calls / stats.totalCalls) * 100 
                  : 0;
                return (
                  <div key={module.module} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{module.module}</span>
                      <span className="text-muted-foreground">{module.calls} 次</span>
                    </div>
                    <Progress value={percentage} className="h-1" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Errors */}
      {stats.recentErrors.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              最近错误
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentErrors.map((error, i) => (
                <div key={i} className="text-sm p-2 bg-destructive/5 rounded">
                  <div className="flex justify-between">
                    <Badge variant="outline" className="text-xs">{error.model}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(error.createdAt).toLocaleString('zh-CN')}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{error.error}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}
