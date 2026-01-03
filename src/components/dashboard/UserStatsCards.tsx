import { motion } from "framer-motion";
import { MessageCircle, Clock, CheckCircle2, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface UserStat {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: typeof MessageCircle;
  color: string;
  path?: string;
}

interface UserStatsCardsProps {
  conversationsToday?: number;
  timeSavedMinutes?: number;
  tasksCompleted?: number;
  weeklyGrowth?: number;
  isLoading?: boolean;
}

export function UserStatsCards({
  conversationsToday = 0,
  timeSavedMinutes = 0,
  tasksCompleted = 0,
  weeklyGrowth = 0,
  isLoading = false,
}: UserStatsCardsProps) {
  const navigate = useNavigate();
  
  const stats: UserStat[] = [
    {
      label: "今日对话",
      value: conversationsToday.toString(),
      change: conversationsToday > 0 ? "今天活跃" : "开始对话吧",
      trend: conversationsToday > 0 ? "up" : "neutral",
      icon: MessageCircle,
      color: "primary",
      path: "/runtime",
    },
    {
      label: "节省时间",
      value: timeSavedMinutes > 60 
        ? `${Math.floor(timeSavedMinutes / 60)}小时` 
        : `${timeSavedMinutes}分钟`,
      change: timeSavedMinutes > 0 ? "比手动快" : "开始体验",
      trend: timeSavedMinutes > 0 ? "up" : "neutral",
      icon: Clock,
      color: "cognitive",
      path: "/runtime",
    },
    {
      label: "完成任务",
      value: tasksCompleted.toString(),
      change: tasksCompleted > 0 ? "本周完成" : "创建任务",
      trend: tasksCompleted > 0 ? "up" : "neutral",
      icon: CheckCircle2,
      color: "governance",
      path: "/runtime",
    },
    {
      label: "效率提升",
      value: weeklyGrowth > 0 ? `+${weeklyGrowth}%` : "--",
      change: weeklyGrowth > 0 ? "较上周" : "持续使用解锁",
      trend: weeklyGrowth > 0 ? "up" : "neutral",
      icon: TrendingUp,
      color: "status-executing",
      path: "/profile",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="panel p-4 rounded-xl">
            <Skeleton className="h-10 w-10 rounded-lg mb-3" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          className="panel p-4 rounded-xl cursor-pointer hover:border-primary/50 transition-colors"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => stat.path && navigate(stat.path)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg bg-${stat.color}/10 flex items-center justify-center`}>
              <stat.icon className={`h-5 w-5 text-${stat.color}`} />
            </div>
            {stat.trend === "up" && (
              <span className="text-xs text-status-executing font-medium">↑</span>
            )}
          </div>
          <div className="text-2xl font-bold font-mono mb-1">
            {stat.value}
          </div>
          <div className="text-xs text-muted-foreground">{stat.label}</div>
          <div className="text-[10px] text-muted-foreground/70 mt-1">
            {stat.change}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
