// =====================================================
// 技能计量统计面板
// Skill Metering Stats - Token consumption visualization
// =====================================================

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Coins,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Clock,
  Activity,
  ChevronRight,
  Filter,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, eachDayOfInterval } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SkillUsageRecord {
  id: string;
  skill_id: string;
  tokens_charged: number;
  pricing_model: string;
  created_at: string;
  skills?: {
    name: string;
    category: string;
  };
}

interface SkillMeteringStatsProps {
  className?: string;
}

export function SkillMeteringStats({ className }: SkillMeteringStatsProps) {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<"7" | "14" | "30">("7");

  // 获取技能使用记录
  const { data: usageRecords = [], isLoading } = useQuery({
    queryKey: ["skill-usage-records", user?.id, timeRange],
    queryFn: async () => {
      if (!user) return [];

      const startDate = subDays(new Date(), parseInt(timeRange)).toISOString();

      const { data, error } = await supabase
        .from("skill_usage_records")
        .select(`
          id,
          skill_id,
          tokens_charged,
          pricing_model,
          created_at,
          skills (
            name,
            category
          )
        `)
        .eq("user_id", user.id)
        .gte("created_at", startDate)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as SkillUsageRecord[];
    },
    enabled: !!user,
  });

  // 按天统计
  const dailyData = useMemo(() => {
    const today = new Date();
    const daysAgo = subDays(today, parseInt(timeRange));
    const days = eachDayOfInterval({ start: daysAgo, end: today });

    return days.map((day) => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayRecords = usageRecords.filter((record) => {
        const recordDate = new Date(record.created_at);
        return recordDate >= dayStart && recordDate < dayEnd;
      });

      return {
        date: format(day, "MM/dd", { locale: zhCN }),
        tokens: dayRecords.reduce((sum, r) => sum + r.tokens_charged, 0),
        calls: dayRecords.length,
      };
    });
  }, [usageRecords, timeRange]);

  // 按技能统计
  const skillBreakdown = useMemo(() => {
    const breakdown: Record<string, { name: string; category: string; tokens: number; calls: number }> = {};

    usageRecords.forEach((record) => {
      const skillId = record.skill_id;
      if (!breakdown[skillId]) {
        breakdown[skillId] = {
          name: record.skills?.name || "未知技能",
          category: record.skills?.category || "other",
          tokens: 0,
          calls: 0,
        };
      }
      breakdown[skillId].tokens += record.tokens_charged;
      breakdown[skillId].calls += 1;
    });

    return Object.entries(breakdown)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.tokens - a.tokens);
  }, [usageRecords]);

  // 饼图数据
  const pieData = useMemo(() => {
    const topSkills = skillBreakdown.slice(0, 5);
    const othersTokens = skillBreakdown.slice(5).reduce((sum, s) => sum + s.tokens, 0);

    const data = topSkills.map((skill) => ({
      name: skill.name,
      value: skill.tokens,
    }));

    if (othersTokens > 0) {
      data.push({ name: "其他", value: othersTokens });
    }

    return data;
  }, [skillBreakdown]);

  // 趋势计算
  const trend = useMemo(() => {
    const midPoint = Math.floor(dailyData.length / 2);
    const recent = dailyData.slice(midPoint).reduce((sum, d) => sum + d.tokens, 0);
    const previous = dailyData.slice(0, midPoint).reduce((sum, d) => sum + d.tokens, 0);
    const change = previous === 0 ? 0 : ((recent - previous) / previous) * 100;
    return { recent, previous, change };
  }, [dailyData]);

  const totalTokens = usageRecords.reduce((sum, r) => sum + r.tokens_charged, 0);
  const totalCalls = usageRecords.length;
  const avgTokensPerCall = totalCalls > 0 ? totalTokens / totalCalls : 0;

  const COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--muted-foreground))",
  ];

  const getTrendIcon = () => {
    if (trend.change > 10) return <TrendingUp className="h-4 w-4 text-orange-500" />;
    if (trend.change < -10) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const categoryLabels: Record<string, string> = {
    automation: "自动化",
    data: "数据处理",
    integration: "集成",
    communication: "通讯",
    ai: "AI/ML",
    utility: "工具",
    other: "其他",
  };

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-primary" />
            技能消耗统计
          </div>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as "7" | "14" | "30")}>
            <SelectTrigger className="w-[100px] h-7 text-xs">
              <CalendarDays className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">最近 7 天</SelectItem>
              <SelectItem value="14">最近 14 天</SelectItem>
              <SelectItem value="30">最近 30 天</SelectItem>
            </SelectContent>
          </Select>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 概览卡片 */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">总消耗</span>
            </div>
            <div className="text-xl font-semibold">{totalTokens.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
              {getTrendIcon()}
              <span className={cn(
                trend.change > 10 && "text-orange-500",
                trend.change < -10 && "text-green-500"
              )}>
                {trend.change > 0 ? "+" : ""}{trend.change.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-chart-2" />
              <span className="text-xs text-muted-foreground">调用次数</span>
            </div>
            <div className="text-xl font-semibold">{totalCalls}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {skillBreakdown.length} 个技能
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-chart-3" />
              <span className="text-xs text-muted-foreground">平均消耗</span>
            </div>
            <div className="text-xl font-semibold">{avgTokensPerCall.toFixed(1)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Token/次</div>
          </div>
        </div>

        <Tabs defaultValue="trend" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="trend" className="text-xs">消耗趋势</TabsTrigger>
            <TabsTrigger value="breakdown" className="text-xs">技能分布</TabsTrigger>
            <TabsTrigger value="details" className="text-xs">明细列表</TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="mt-3">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
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
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [
                      value.toLocaleString(),
                      name === "tokens" ? "Token 消耗" : "调用次数",
                    ]}
                  />
                  <Bar
                    dataKey="tokens"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="mt-3">
            <div className="grid grid-cols-2 gap-4">
              {/* 饼图 */}
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} Token`, ""]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* 图例 */}
              <div className="space-y-2">
                {pieData.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="truncate max-w-[100px]">{item.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {((item.value / totalTokens) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="details" className="mt-3">
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {skillBreakdown.length > 0 ? (
                  skillBreakdown.map((skill, index) => (
                    <motion.div
                      key={skill.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-1 h-8 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <div>
                          <div className="text-sm font-medium">{skill.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] px-1">
                              {categoryLabels[skill.category] || skill.category}
                            </Badge>
                            <span>{skill.calls} 次调用</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          {skill.tokens.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-muted-foreground">Token</div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coins className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <div className="text-sm">暂无技能使用记录</div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
