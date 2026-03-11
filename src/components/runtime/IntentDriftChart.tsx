import { useMemo } from "react";
import { TrendingDown, AlertTriangle, CheckCircle, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from "recharts";
import { cn } from "../../lib/utils.ts";

interface IntentDriftDataPoint {
  turn: number;
  similarity: number;
  driftDetected: boolean;
  severity: "none" | "low" | "medium" | "high" | "critical";
}

interface IntentDriftChartProps {
  data?: IntentDriftDataPoint[];
  isLoading?: boolean;
  currentTurn?: number;
  thresholds?: {
    low: number;
    medium: number;
    high: number;
  };
}

const defaultThresholds = {
  low: 0.85,
  medium: 0.7,
  high: 0.5,
};

export function IntentDriftChart({
  data = [],
  isLoading = false,
  currentTurn = 0,
  thresholds = defaultThresholds,
}: IntentDriftChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) {
      // 模拟数据用于演示
      return Array.from({ length: 10 }, (_, i) => ({
        turn: i + 1,
        similarity: Math.max(0.3, 1 - i * 0.05 + (Math.random() - 0.5) * 0.1),
        driftDetected: i > 5,
        severity: i < 3 ? "none" : i < 5 ? "low" : i < 7 ? "medium" : "high",
      }));
    }
    return data;
  }, [data]);

  const avgSimilarity = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.similarity, 0) / chartData.length
    : 1;

  const driftCount = chartData.filter((d) => d.driftDetected).length;
  
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-destructive";
      case "high":
        return "text-destructive";
      case "medium":
        return "text-amber-500";
      case "low":
        return "text-amber-400";
      default:
        return "text-status-executing";
    }
  };

  const getOverallStatus = () => {
    if (avgSimilarity >= thresholds.low) {
      return { icon: CheckCircle, label: "意图稳定", color: "text-status-executing" };
    }
    if (avgSimilarity >= thresholds.medium) {
      return { icon: AlertTriangle, label: "轻微偏离", color: "text-amber-500" };
    }
    return { icon: TrendingDown, label: "显著偏离", color: "text-destructive" };
  };

  const status = getOverallStatus();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            意图漂移追踪
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            意图漂移追踪
          </CardTitle>
          <div className="flex items-center gap-2">
            <status.icon className={cn("h-4 w-4", status.color)} />
            <span className={cn("text-sm font-medium", status.color)}>
              {status.label}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* 统计摘要 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">对话轮次</p>
            <p className="font-semibold">{currentTurn || chartData.length}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">平均相似度</p>
            <p className="font-semibold">{(avgSimilarity * 100).toFixed(0)}%</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">漂移次数</p>
            <p className={cn(
              "font-semibold",
              driftCount > 0 ? "text-amber-500" : "text-status-executing"
            )}>
              {driftCount}
            </p>
          </div>
        </div>

        {/* 图表 */}
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="similarityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.5} />
            <XAxis
              dataKey="turn"
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
              label={{ value: "对话轮次", position: "bottom", fontSize: 10, offset: -5 }}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "相似度"]}
              labelFormatter={(label) => `第 ${label} 轮`}
            />
            {/* 阈值参考线 */}
            <ReferenceLine
              y={thresholds.low}
              stroke="hsl(var(--status-executing))"
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <ReferenceLine
              y={thresholds.medium}
              stroke="hsl(var(--amber-500))"
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <ReferenceLine
              y={thresholds.high}
              stroke="hsl(var(--destructive))"
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <Area
              type="monotone"
              dataKey="similarity"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#similarityGradient)"
            />
            <Line
              type="monotone"
              dataKey="similarity"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (!payload.driftDetected) return null;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill="hsl(var(--destructive))"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* 图例 */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-status-executing" />
            <span>稳定 (&gt;85%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>偏离 (50-85%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span>严重 (&lt;50%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
