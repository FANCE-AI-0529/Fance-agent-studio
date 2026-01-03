import { motion } from "framer-motion";
import { Users, Bot, Sparkles, MessageCircle } from "lucide-react";
import { useCommunityStats } from "@/hooks/useCommunityStats";
import { Skeleton } from "@/components/ui/skeleton";

export function CommunityStats() {
  const { data: stats, isLoading } = useCommunityStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-8 py-8 border-t border-border">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-6 w-32" />
        ))}
      </div>
    );
  }

  const statsItems = [
    {
      icon: Users,
      value: formatLargeNumber(stats?.total_creators || 0),
      label: "创作者",
      suffix: "+",
    },
    {
      icon: Bot,
      value: formatLargeNumber(stats?.total_agents || 0),
      label: "Agent 已创建",
      suffix: "+",
    },
    {
      icon: Sparkles,
      value: formatLargeNumber(stats?.total_conversations || 0),
      label: "次对话",
      suffix: "+",
    },
    {
      icon: MessageCircle,
      value: stats?.daily_active_sessions || 0,
      label: "今日活跃",
      suffix: "",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="flex flex-wrap items-center justify-center gap-6 md:gap-8 py-8 border-t border-border"
    >
      {statsItems.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + index * 0.1 }}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <item.icon className="h-4 w-4" />
          <span className="text-sm">
            <span className="font-semibold text-foreground">
              {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
            </span>
            {item.suffix} {item.label}
          </span>
        </motion.div>
      ))}
    </motion.div>
  );
}

function formatLargeNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}
