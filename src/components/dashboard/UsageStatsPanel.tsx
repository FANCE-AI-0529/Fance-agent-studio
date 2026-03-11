import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "../ui/chart.tsx";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../integrations/supabase/client.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { format, subDays, eachDayOfInterval, startOfDay, subHours, eachHourOfInterval } from "date-fns";
import { zhCN } from "date-fns/locale";

interface UsageData {
  totalCalls: number;
  totalTokens: number;
  totalSessions: number;
  avgLatency: number;
  callsToday: number;
  callsYesterday: number;
  tokensToday: number;
  hourlyData: { time: string; calls: number; tokens: number }[];
  dailyData: { date: string; calls: number; tokens: number; sessions: number }[];
}

export function UsageStatsPanel() {
  const { user } = useAuth();

  // Fetch LLM usage logs
  const { data: usageLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["llm-usage-logs", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("llm_usage_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch sessions count
  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery({
    queryKey: ["sessions-stats", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sessions")
        .select("id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate usage statistics
  const stats: UsageData = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = startOfDay(subDays(now, 1));

    // Basic stats from LLM logs
    const totalCalls = usageLogs.length;
    const totalTokens = usageLogs.reduce((sum, log) => sum + (log.total_tokens || 0), 0);
    const totalSessions = sessions.length;

    const latencies = usageLogs
      .filter((log) => log.latency_ms !== null)
      .map((log) => log.latency_ms as number);
    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    // Today vs yesterday
    const callsToday = usageLogs.filter((log) => new Date(log.created_at) >= today).length;
    const callsYesterday = usageLogs.filter((log) => {
      const date = new Date(log.created_at);
      return date >= yesterday && date < today;
    }).length;

    const tokensToday = usageLogs
      .filter((log) => new Date(log.created_at) >= today)
      .reduce((sum, log) => sum + (log.total_tokens || 0), 0);

    // Hourly data (last 24 hours)
    const last24Hours = eachHourOfInterval({
      start: subHours(now, 23),
      end: now,
    });
    const hourlyData = last24Hours.map((hour) => {
      const hourEnd = new Date(hour.getTime() + 60 * 60 * 1000);
      const hourLogs = usageLogs.filter((log) => {
        const logDate = new Date(log.created_at);
        return logDate >= hour && logDate < hourEnd;
      });

      return {
        time: format(hour, "HH:mm"),
        calls: hourLogs.length,
        tokens: hourLogs.reduce((sum, log) => sum + (log.total_tokens || 0), 0),
      };
    });

    // Daily data (last 7 days)
    const last7Days = eachDayOfInterval({
      start: subDays(now, 6),
      end: now,
    });
    const dailyData = last7Days.map((day) => {
      const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      const dayLogs = usageLogs.filter((log) => {
        const logDate = new Date(log.created_at);
        return logDate >= day && logDate < dayEnd;
      });
      const daySessions = sessions.filter((s) => {
        const date = new Date(s.created_at);
        return date >= day && date < dayEnd;
      });

      return {
        date: format(day, "MM/dd", { locale: zhCN }),
        calls: dayLogs.length,
        tokens: dayLogs.reduce((sum, log) => sum + (log.total_tokens || 0), 0),
        sessions: daySessions.length,
      };
    });

    return {
      totalCalls,
      totalTokens,
      totalSessions,
      avgLatency,
      callsToday,
      callsYesterday,
      tokensToday,
      hourlyData,
      dailyData,
    };
  }, [usageLogs, sessions]);

  const isLoading = isLoadingLogs || isLoadingSessions;

  const callsTrend = stats.callsYesterday > 0
    ? ((stats.callsToday - stats.callsYesterday) / stats.callsYesterday) * 100
    : stats.callsToday > 0 ? 100 : 0;

  const chartConfig = {
    calls: { label: "调用次数", color: "hsl(var(--chart-1))" },
    tokens: { label: "Token 消耗", color: "hsl(var(--chart-2))" },
    sessions: { label: "会话数", color: "hsl(var(--chart-3))" },
  };

  if (!user) {
    return (
      <div className="panel p-6 rounded-lg text-center text-muted-foreground">
        <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">登录后查看使用统计</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">使用量统计</h2>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                API 调用
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {isLoading ? "-" : stats.totalCalls.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 text-xs mt-1">
                {callsTrend >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-status-executing" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={callsTrend >= 0 ? "text-status-executing" : "text-destructive"}>
                  {callsTrend >= 0 ? "+" : ""}{callsTrend.toFixed(0)}%
                </span>
                <span className="text-muted-foreground">vs 昨日</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Token 消耗
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {isLoading ? "-" : stats.totalTokens.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                今日: {stats.tokensToday.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                会话总数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {isLoading ? "-" : stats.totalSessions.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                历史会话
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                平均延迟
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {isLoading ? "-" : `${stats.avgLatency.toFixed(0)} ms`}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                响应时间
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 24-hour trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium">24 小时调用趋势</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.hourlyData.some(d => d.calls > 0) ? (
                <ChartContainer config={chartConfig} className="h-[160px] w-full">
                  <AreaChart data={stats.hourlyData}>
                    <defs>
                      <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval={5}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="calls"
                      stroke="hsl(var(--chart-1))"
                      fill="url(#callsGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
                  暂无调用数据
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* 7-day stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-sm font-medium">7 天统计</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.dailyData.some(d => d.calls > 0 || d.sessions > 0) ? (
                <ChartContainer config={chartConfig} className="h-[160px] w-full">
                  <BarChart data={stats.dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="calls" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sessions" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="h-[160px] flex items-center justify-center text-muted-foreground text-sm">
                  暂无统计数据
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
