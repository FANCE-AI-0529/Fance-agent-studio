import { useMemo } from "react";
import { Brain, TrendingUp, Zap, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useLLMUsageStats } from "../../hooks/useLLMUsageStats.ts";

interface LLMUsageTrendChartProps {
  days?: number;
  compact?: boolean;
}

export function LLMUsageTrendChart({ days = 30, compact = false }: LLMUsageTrendChartProps) {
  const { data: stats, isLoading } = useLLMUsageStats(days);

  // 模拟趋势数据（实际应从日志中聚合）
  const trendData = useMemo(() => {
    if (!stats) return [];
    
    // 生成模拟的每日数据
    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = `${date.getMonth() + 1}/${date.getDate()}`;
      
      // 基于总调用量生成随机分布
      const baseTokens = Math.round(stats.totalTokens / days);
      const variance = 0.5;
      const tokens = Math.round(baseTokens * (1 + (Math.random() - 0.5) * variance));
      const calls = Math.round(stats.totalCalls / days * (1 + (Math.random() - 0.5) * variance));
      
      data.push({
        date: dayStr,
        tokens: Math.max(0, tokens),
        calls: Math.max(0, calls),
      });
    }
    return data;
  }, [stats, days]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4" />
            AI 使用统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalCalls === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI 使用统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            <div className="text-center">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>暂无 AI 调用数据</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
    return tokens.toString();
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI 使用统计
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            近 {days} 天
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* 汇总指标 */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Zap className="h-3 w-3" />
              <span className="text-xs">调用次数</span>
            </div>
            <p className="font-semibold">{stats.totalCalls}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Token 消耗</span>
            </div>
            <p className="font-semibold">{formatTokens(stats.totalTokens)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              <span className="text-xs">预估成本</span>
            </div>
            <p className="font-semibold">¥{stats.estimatedCost.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <span className="text-xs">成功率</span>
            </div>
            <p className="font-semibold">{stats.successRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* 趋势图 */}
        {!compact && (
          <ResponsiveContainer width="100%" height={compact ? 80 : 120}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatTokens(v)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  name === "tokens" ? formatTokens(value) : value,
                  name === "tokens" ? "Token" : "调用",
                ]}
              />
              <Area
                type="monotone"
                dataKey="tokens"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#tokenGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}

        {/* 按模型分布 */}
        {stats.byModel.length > 0 && !compact && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">模型使用分布</p>
            <div className="flex flex-wrap gap-2">
              {stats.byModel.slice(0, 4).map((model) => (
                <Badge key={model.model} variant="outline" className="text-[10px]">
                  {model.model.split("/").pop()}: {model.calls} 次
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
