// =====================================================
// API 告警趋势图表
// Alert Trend Chart - Visualize alert history over time
// =====================================================

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, Activity } from "lucide-react";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AlertLog {
  id: string;
  alert_type: string;
  threshold_value: number;
  actual_value: number;
  created_at: string;
  notification_sent: boolean;
}

interface AlertTrendChartProps {
  logs: AlertLog[];
  className?: string;
}

export function AlertTrendChart({ logs, className }: AlertTrendChartProps) {
  // 处理过去 30 天的数据
  const chartData = useMemo(() => {
    const today = new Date();
    const thirtyDaysAgo = subDays(today, 30);
    const days = eachDayOfInterval({ start: thirtyDaysAgo, end: today });

    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayLogs = logs.filter((log) => {
        const logDate = new Date(log.created_at);
        return logDate >= dayStart && logDate < dayEnd;
      });

      return {
        date: format(day, "MM/dd", { locale: zhCN }),
        fullDate: format(day, "yyyy-MM-dd"),
        total: dayLogs.length,
        errorRate: dayLogs.filter((l) => l.alert_type === "error_rate").length,
        latency: dayLogs.filter((l) => l.alert_type === "latency").length,
        errorCount: dayLogs.filter((l) => l.alert_type === "error_count").length,
        notified: dayLogs.filter((l) => l.notification_sent).length,
        failed: dayLogs.filter((l) => !l.notification_sent).length,
      };
    });
  }, [logs]);

  // 按类型统计
  const typeStats = useMemo(() => {
    const stats = {
      error_rate: { count: 0, avgActual: 0, avgThreshold: 0 },
      latency: { count: 0, avgActual: 0, avgThreshold: 0 },
      error_count: { count: 0, avgActual: 0, avgThreshold: 0 },
    };

    logs.forEach((log) => {
      const type = log.alert_type as keyof typeof stats;
      if (stats[type]) {
        stats[type].count += 1;
        stats[type].avgActual += log.actual_value;
        stats[type].avgThreshold += log.threshold_value;
      }
    });

    Object.keys(stats).forEach((key) => {
      const type = key as keyof typeof stats;
      if (stats[type].count > 0) {
        stats[type].avgActual /= stats[type].count;
        stats[type].avgThreshold /= stats[type].count;
      }
    });

    return stats;
  }, [logs]);

  // 趋势计算（最近 7 天 vs 之前 7 天）
  const trend = useMemo(() => {
    const recent = chartData.slice(-7).reduce((sum, d) => sum + d.total, 0);
    const previous = chartData.slice(-14, -7).reduce((sum, d) => sum + d.total, 0);
    const change = previous === 0 ? 0 : ((recent - previous) / previous) * 100;
    return { recent, previous, change };
  }, [chartData]);

  const getTrendIcon = () => {
    if (trend.change > 10) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend.change < -10) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = () => {
    if (trend.change > 10) return "text-red-500";
    if (trend.change < -10) return "text-green-500";
    return "text-muted-foreground";
  };

  const typeLabels: Record<string, { label: string; icon: typeof AlertTriangle; color: string }> = {
    error_rate: { label: "错误率", icon: AlertTriangle, color: "hsl(var(--destructive))" },
    latency: { label: "延迟", icon: Clock, color: "hsl(var(--primary))" },
    error_count: { label: "错误数", icon: Activity, color: "hsl(var(--chart-3))" },
  };

  if (logs.length === 0) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <div className="text-sm">暂无告警数据</div>
            <div className="text-xs mt-1">告警触发后将在此显示趋势</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>告警趋势分析</span>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <span className={cn("text-xs font-normal", getTrendColor())}>
              {trend.change > 0 ? "+" : ""}
              {trend.change.toFixed(1)}% 较上周
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 概览统计 */}
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(typeStats).map(([type, stats]) => {
            const config = typeLabels[type];
            const Icon = config.icon;
            return (
              <div
                key={type}
                className="p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4" style={{ color: config.color }} />
                  <span className="text-xs font-medium">{config.label}</span>
                </div>
                <div className="text-lg font-semibold">{stats.count}</div>
                {stats.count > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    平均超出 {((stats.avgActual - stats.avgThreshold) / stats.avgThreshold * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <Tabs defaultValue="line" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="line" className="text-xs">趋势图</TabsTrigger>
            <TabsTrigger value="bar" className="text-xs">分布图</TabsTrigger>
          </TabsList>

          <TabsContent value="line" className="mt-3">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Legend
                    iconSize={8}
                    wrapperStyle={{ fontSize: "10px" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="errorRate"
                    name="错误率"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="latency"
                    name="延迟"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="errorCount"
                    name="错误数"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="bar" className="mt-3">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    className="fill-muted-foreground"
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    labelFormatter={(label) => `日期: ${label}`}
                  />
                  <Legend
                    iconSize={8}
                    wrapperStyle={{ fontSize: "10px" }}
                  />
                  <Bar
                    dataKey="notified"
                    name="已通知"
                    fill="hsl(var(--primary))"
                    radius={[2, 2, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="failed"
                    name="通知失败"
                    fill="hsl(var(--destructive))"
                    radius={[2, 2, 0, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>

        {/* 最近告警摘要 */}
        <div className="pt-3 border-t border-border/50">
          <div className="text-xs font-medium mb-2">最近 7 天摘要</div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              共 <span className="font-medium text-foreground">{trend.recent}</span> 次告警
            </span>
            <span>
              通知成功率{" "}
              <span className="font-medium text-foreground">
                {logs.length > 0
                  ? ((logs.filter((l) => l.notification_sent).length / logs.length) * 100).toFixed(0)
                  : 0}
                %
              </span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
