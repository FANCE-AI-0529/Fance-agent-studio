import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDownloadTrends } from "@/hooks/useDownloadTrends";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

interface DownloadTrendChartProps {
  days?: number;
}

export function DownloadTrendChart({ days = 7 }: DownloadTrendChartProps) {
  const { data: trends, isLoading } = useDownloadTrends(days);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            下载趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = (trends || []).map((item) => ({
    date: format(parseISO(item.date), "M/d", { locale: zhCN }),
    downloads: item.count,
  }));

  const totalDownloads = chartData.reduce((sum, item) => sum + item.downloads, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            下载趋势
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            近{days}天共 {totalDownloads} 次
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {totalDownloads === 0 ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
            暂无下载数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Line
                type="monotone"
                dataKey="downloads"
                name="下载量"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
