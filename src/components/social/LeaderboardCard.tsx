import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, TrendingUp, TrendingDown, Minus, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/hooks/useLeaderboard";

interface LeaderboardCardProps {
  entry: LeaderboardEntry;
  type: "usage" | "likes" | "followers" | "agents";
  className?: string;
}

function formatValue(value: number, type: string): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

function getValueLabel(type: string): string {
  switch (type) {
    case "usage": return "次使用";
    case "likes": return "点赞";
    case "followers": return "粉丝";
    case "agents": return "个 Agent";
    default: return "";
  }
}

export function LeaderboardCard({ entry, type, className }: LeaderboardCardProps) {
  const navigate = useNavigate();
  const name = entry.displayName || "匿名用户";
  const initial = name.charAt(0).toUpperCase();

  const handleClick = () => {
    navigate(`/creator/${entry.userId}`);
  };

  const TrendIcon = entry.trend === "up" ? TrendingUp :
                    entry.trend === "down" ? TrendingDown : Minus;
  const trendColor = entry.trend === "up" ? "text-green-500" :
                     entry.trend === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:bg-accent/50 transition-colors",
        entry.rank <= 3 && "border-primary/30",
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Rank */}
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
            entry.rank === 1 && "bg-yellow-500 text-yellow-950",
            entry.rank === 2 && "bg-gray-400 text-gray-950",
            entry.rank === 3 && "bg-amber-600 text-amber-950",
            entry.rank > 3 && "bg-muted text-muted-foreground"
          )}>
            {entry.rank}
          </div>

          {/* Avatar */}
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={entry.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {initial}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm truncate">{name}</span>
              {entry.isVerified && (
                <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              )}
            </div>
            {entry.agentCount !== undefined && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Bot className="h-3 w-3" />
                {entry.agentCount} 个 Agent
              </div>
            )}
          </div>

          {/* Value */}
          <div className="text-right flex-shrink-0">
            <div className="font-semibold text-sm">
              {formatValue(entry.value, type)}
            </div>
            <div className="text-xs text-muted-foreground">
              {getValueLabel(type)}
            </div>
          </div>

          {/* Trend */}
          {entry.trend && (
            <TrendIcon className={cn("h-4 w-4 flex-shrink-0", trendColor)} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
