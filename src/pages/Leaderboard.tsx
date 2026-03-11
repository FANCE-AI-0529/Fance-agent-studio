import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.tsx";
import { Button } from "../components/ui/button.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";
import { LeaderboardCard } from "../components/social/LeaderboardCard.tsx";
import { 
  useCreatorLeaderboard, 
  useAgentLeaderboard,
  type LeaderboardPeriod,
  type LeaderboardType 
} from "../hooks/useLeaderboard.ts";
import { Trophy, TrendingUp, Users, Bot, Heart, Flame } from "lucide-react";
import { cn } from "../lib/utils.ts";

const periodOptions: { value: LeaderboardPeriod; label: string }[] = [
  { value: "daily", label: "日榜" },
  { value: "weekly", label: "周榜" },
  { value: "monthly", label: "月榜" },
  { value: "all", label: "总榜" },
];

const typeOptions: { value: LeaderboardType; label: string; icon: React.ReactNode }[] = [
  { value: "usage", label: "使用量", icon: <TrendingUp className="h-4 w-4" /> },
  { value: "likes", label: "点赞", icon: <Heart className="h-4 w-4" /> },
  { value: "followers", label: "粉丝", icon: <Users className="h-4 w-4" /> },
  { value: "agents", label: "创作数", icon: <Bot className="h-4 w-4" /> },
];

export default function Leaderboard() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [type, setType] = useState<LeaderboardType>("usage");

  const { data: creatorLeaderboard, isLoading: creatorsLoading } = useCreatorLeaderboard(period, type);
  const { data: agentLeaderboard, isLoading: agentsLoading } = useAgentLeaderboard(period);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">排行榜</h1>
            <p className="text-sm text-muted-foreground">
              发现优秀创作者和热门 Agent
            </p>
          </div>
        </div>

        {/* Period Filter */}
        <div className="flex gap-2">
          {periodOptions.map(option => (
            <Button
              key={option.value}
              variant={period === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <Tabs defaultValue="creators">
          <TabsList>
            <TabsTrigger value="creators">
              <Users className="h-4 w-4 mr-1" />
              创作者榜
            </TabsTrigger>
            <TabsTrigger value="agents">
              <Flame className="h-4 w-4 mr-1" />
              Agent 榜
            </TabsTrigger>
          </TabsList>

          {/* Creators Leaderboard */}
          <TabsContent value="creators" className="mt-4 space-y-4">
            {/* Type Filter */}
            <div className="flex gap-2 flex-wrap">
              {typeOptions.map(option => (
                <Button
                  key={option.value}
                  variant={type === option.value ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setType(option.value)}
                  className="gap-1"
                >
                  {option.icon}
                  {option.label}
                </Button>
              ))}
            </div>

            {creatorsLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : creatorLeaderboard?.length ? (
              <div className="space-y-2">
                {creatorLeaderboard.map(entry => (
                  <LeaderboardCard key={entry.userId} entry={entry} type={type} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                暂无数据
              </div>
            )}
          </TabsContent>

          {/* Agents Leaderboard */}
          <TabsContent value="agents" className="mt-4">
            {agentsLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : agentLeaderboard?.length ? (
              <div className="space-y-2">
                {agentLeaderboard.map((agent, index) => (
                  <Card 
                    key={agent.agentId}
                    className={cn(
                      "cursor-pointer hover:bg-accent/50 transition-colors",
                      agent.rank <= 3 && "border-primary/30"
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0",
                          agent.rank === 1 && "bg-yellow-500 text-yellow-950",
                          agent.rank === 2 && "bg-gray-400 text-gray-950",
                          agent.rank === 3 && "bg-amber-600 text-amber-950",
                          agent.rank > 3 && "bg-muted text-muted-foreground"
                        )}>
                          {agent.rank}
                        </div>

                        {/* Agent Icon */}
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{agent.name}</div>
                          <div className="text-xs text-muted-foreground">
                            by {agent.authorName || "匿名"}
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="text-right flex-shrink-0">
                          <div className="font-semibold text-sm">
                            {agent.usageCount.toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            次使用
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                暂无数据
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
