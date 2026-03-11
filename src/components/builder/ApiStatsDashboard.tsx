import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  BarChart3,
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
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  Pie,
  PieChart,
  Legend,
} from "recharts";
import { useAgentApiLogs } from "../../hooks/useAgentApi.ts";
import { format, subDays, startOfDay, eachDayOfInterval, eachHourOfInterval, subHours, startOfHour } from "date-fns";
import { zhCN } from "date-fns/locale";

interface ApiStatsDashboardProps {
  agentId: string | null;
  apiKeyIds: string[];
}

interface ApiLog {
  id: string;
  api_key_id: string;
  agent_id: string;
  user_id: string;
  request_body: any;
  response_body: any;
  status_code: number;
  latency_ms: number | null;
  tokens_used: number | null;
  error_message: string | null;
  ip_address: string | null;
  created_at: string;
}

export function ApiStatsDashboard({ agentId, apiKeyIds }: ApiStatsDashboardProps) {
  // Fetch logs for all API keys
  const { data: allLogs = [] } = useAgentApiLogs(apiKeyIds.length > 0 ? apiKeyIds[0] : null, 500);

  // Calculate statistics from logs
  const stats = useMemo(() => {
    if (allLogs.length === 0) {
      return {
        totalCalls: 0,
        successRate: 0,
        avgLatency: 0,
        totalTokens: 0,
        callsToday: 0,
        callsYesterday: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        errorCount: 0,
        statusDistribution: [],
        hourlyData: [],
        dailyData: [],
        latencyDistribution: [],
      };
    }

    const now = new Date();
    const today = startOfDay(now);
    const yesterday = startOfDay(subDays(now, 1));

    // Basic stats
    const totalCalls = allLogs.length;
    const successfulCalls = allLogs.filter((log: ApiLog) => log.status_code >= 200 && log.status_code < 300).length;
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    const errorCount = allLogs.filter((log: ApiLog) => log.status_code >= 400).length;

    // Latency stats
    const latencies = allLogs
      .filter((log: ApiLog) => log.latency_ms !== null)
      .map((log: ApiLog) => log.latency_ms as number)
      .sort((a, b) => a - b);
    
    const avgLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;
    
    const p50Latency = latencies.length > 0 
      ? latencies[Math.floor(latencies.length * 0.5)] 
      : 0;
    const p95Latency = latencies.length > 0 
      ? latencies[Math.floor(latencies.length * 0.95)] 
      : 0;
    const p99Latency = latencies.length > 0 
      ? latencies[Math.floor(latencies.length * 0.99)] 
      : 0;

    // Token stats
    const totalTokens = allLogs
      .filter((log: ApiLog) => log.tokens_used !== null)
      .reduce((sum, log: ApiLog) => sum + (log.tokens_used || 0), 0);

    // Calls today vs yesterday
    const callsToday = allLogs.filter((log: ApiLog) => new Date(log.created_at) >= today).length;
    const callsYesterday = allLogs.filter((log: ApiLog) => {
      const date = new Date(log.created_at);
      return date >= yesterday && date < today;
    }).length;

    // Status code distribution
    const statusCounts: Record<string, number> = {};
    allLogs.forEach((log: ApiLog) => {
      const statusGroup = `${Math.floor(log.status_code / 100)}xx`;
      statusCounts[statusGroup] = (statusCounts[statusGroup] || 0) + 1;
    });
    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
      fill: name === '2xx' ? 'hsl(var(--chart-1))' : 
            name === '4xx' ? 'hsl(var(--chart-3))' : 
            name === '5xx' ? 'hsl(var(--chart-4))' : 'hsl(var(--chart-2))'
    }));

    // Hourly data (last 24 hours)
    const last24Hours = eachHourOfInterval({
      start: subHours(now, 23),
      end: now,
    });
    const hourlyData = last24Hours.map(hour => {
      const hourEnd = new Date(hour.getTime() + 60 * 60 * 1000);
      const hourLogs = allLogs.filter((log: ApiLog) => {
        const logDate = new Date(log.created_at);
        return logDate >= hour && logDate < hourEnd;
      });
      const hourSuccess = hourLogs.filter((log: ApiLog) => log.status_code >= 200 && log.status_code < 300).length;
      const hourLatencies = hourLogs
        .filter((log: ApiLog) => log.latency_ms !== null)
        .map((log: ApiLog) => log.latency_ms as number);
      
      return {
        time: format(hour, 'HH:mm'),
        calls: hourLogs.length,
        success: hourSuccess,
        errors: hourLogs.length - hourSuccess,
        avgLatency: hourLatencies.length > 0 
          ? Math.round(hourLatencies.reduce((a, b) => a + b, 0) / hourLatencies.length)
          : 0,
      };
    });

    // Daily data (last 7 days)
    const last7Days = eachDayOfInterval({
      start: subDays(now, 6),
      end: now,
    });
    const dailyData = last7Days.map(day => {
      const dayEnd = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      const dayLogs = allLogs.filter((log: ApiLog) => {
        const logDate = new Date(log.created_at);
        return logDate >= day && logDate < dayEnd;
      });
      const daySuccess = dayLogs.filter((log: ApiLog) => log.status_code >= 200 && log.status_code < 300).length;
      
      return {
        date: format(day, 'MM/dd', { locale: zhCN }),
        calls: dayLogs.length,
        success: daySuccess,
        errors: dayLogs.length - daySuccess,
        successRate: dayLogs.length > 0 ? Math.round((daySuccess / dayLogs.length) * 100) : 0,
      };
    });

    // Latency distribution
    const latencyBuckets = [
      { range: '<100ms', min: 0, max: 100 },
      { range: '100-300ms', min: 100, max: 300 },
      { range: '300-500ms', min: 300, max: 500 },
      { range: '500ms-1s', min: 500, max: 1000 },
      { range: '>1s', min: 1000, max: Infinity },
    ];
    const latencyDistribution = latencyBuckets.map(bucket => ({
      range: bucket.range,
      count: latencies.filter(l => l >= bucket.min && l < bucket.max).length,
    }));

    return {
      totalCalls,
      successRate,
      avgLatency,
      totalTokens,
      callsToday,
      callsYesterday,
      p50Latency,
      p95Latency,
      p99Latency,
      errorCount,
      statusDistribution,
      hourlyData,
      dailyData,
      latencyDistribution,
    };
  }, [allLogs]);

  const chartConfig = {
    calls: { label: "调用次数", color: "hsl(var(--chart-1))" },
    success: { label: "成功", color: "hsl(var(--chart-2))" },
    errors: { label: "失败", color: "hsl(var(--chart-4))" },
    avgLatency: { label: "平均延迟", color: "hsl(var(--chart-3))" },
  };

  const callsTrend = stats.callsYesterday > 0 
    ? ((stats.callsToday - stats.callsYesterday) / stats.callsYesterday) * 100 
    : 0;

  if (allLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h3 className="text-lg font-medium mb-2">暂无调用数据</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          开始使用 API 后，这里将显示详细的调用统计和性能指标
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                总调用次数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls.toLocaleString()}</div>
              <div className="flex items-center gap-1 text-xs mt-1">
                {callsTrend >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={callsTrend >= 0 ? "text-green-500" : "text-red-500"}>
                  {callsTrend >= 0 ? "+" : ""}{callsTrend.toFixed(1)}%
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                成功率
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
              <div className="flex items-center gap-2 text-xs mt-1">
                <Badge variant={stats.successRate >= 99 ? "default" : stats.successRate >= 95 ? "secondary" : "destructive"} className="text-[10px]">
                  {stats.errorCount} 个错误
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                平均延迟
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgLatency.toFixed(0)} ms</div>
              <div className="flex items-center gap-2 text-xs mt-1 text-muted-foreground">
                <span>P50: {stats.p50Latency}ms</span>
                <span>P95: {stats.p95Latency}ms</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Token 用量
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground mt-1">
                平均 {stats.totalCalls > 0 ? Math.round(stats.totalTokens / stats.totalCalls) : 0} / 请求
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Calls Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">24 小时调用趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
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
                    interval={3}
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Daily Success/Error Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">7 天成功/失败统计</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
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
                  <Bar dataKey="success" stackId="a" fill="hsl(var(--chart-2))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="errors" stackId="a" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">状态码分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[180px] w-full">
                <PieChart>
                  <Pie
                    data={stats.statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {stats.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className="text-xs">{value}</span>}
                  />
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Latency Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">延迟分布</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[180px] w-full">
                <BarChart data={stats.latencyDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis 
                    type="number"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    type="category"
                    dataKey="range"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(var(--chart-3))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Latency Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">延迟趋势 (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[180px] w-full">
                <LineChart data={stats.hourlyData}>
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
                    width={40}
                    unit="ms"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="avgLatency"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Performance Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">性能指标</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">P50 延迟</div>
                <div className="text-lg font-semibold">{stats.p50Latency} ms</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">P95 延迟</div>
                <div className="text-lg font-semibold">{stats.p95Latency} ms</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">P99 延迟</div>
                <div className="text-lg font-semibold">{stats.p99Latency} ms</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">今日调用</div>
                <div className="text-lg font-semibold">{stats.callsToday}</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">错误数</div>
                <div className="text-lg font-semibold text-destructive">{stats.errorCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
