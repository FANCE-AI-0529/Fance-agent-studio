import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

interface TrendData {
  date: string;
  generated_count: number;
  accepted_count: number;
  email_sent_count: number;
}

interface InviteTrendChartProps {
  data: TrendData[];
  isLoading: boolean;
}

export function InviteTrendChart({ data, isLoading }: InviteTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            邀请码趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Format data for chart (reverse to show oldest first)
  const chartData = [...data]
    .reverse()
    .slice(-14) // Last 14 days
    .map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          邀请码趋势（近 14 天）
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            暂无数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorGenerated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorEmail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <YAxis 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                className="fill-muted-foreground"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="generated_count"
                name="生成"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#colorGenerated)"
              />
              <Area
                type="monotone"
                dataKey="accepted_count"
                name="已使用"
                stroke="hsl(142, 76%, 36%)"
                fillOpacity={1}
                fill="url(#colorAccepted)"
              />
              <Area
                type="monotone"
                dataKey="email_sent_count"
                name="邮件发送"
                stroke="hsl(38, 92%, 50%)"
                fillOpacity={1}
                fill="url(#colorEmail)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
