import React from "react";
import { MainLayout } from "../components/layout/MainLayout.tsx";
import { LazyImage } from "../components/ui/LazyImage.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card.tsx";
import { Button } from "../components/ui/button.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.tsx";
import { Skeleton } from "../components/ui/skeleton.tsx";
import { useChallenges, useActiveChallenges } from "../hooks/useChallenges.ts";
import { Trophy, Clock, Users, ArrowRight, Flame, Calendar, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow, format, isPast, isFuture } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Challenge {
  id: string;
  title: string;
  description?: string;
  banner_url?: string;
  start_at: string;
  end_at: string;
  participants_count?: number;
}

const ChallengeCard = React.memo(function ChallengeCard({ challenge }: { challenge: Challenge }) {
  const now = new Date();
  const startDate = new Date(challenge.start_at);
  const endDate = new Date(challenge.end_at);
  
  const isActive = now >= startDate && now <= endDate;
  const isUpcoming = isFuture(startDate);
  const isEnded = isPast(endDate);

  const getStatusBadge = () => {
    if (isActive) return <Badge className="bg-status-executing">进行中</Badge>;
    if (isUpcoming) return <Badge variant="secondary">即将开始</Badge>;
    return <Badge variant="outline">已结束</Badge>;
  };

  const getTimeText = () => {
    if (isActive) {
      return `${formatDistanceToNow(endDate, { locale: zhCN })}后结束`;
    }
    if (isUpcoming) {
      return `${formatDistanceToNow(startDate, { locale: zhCN })}后开始`;
    }
    return `已于 ${format(endDate, "MM月dd日", { locale: zhCN })} 结束`;
  };

  return (
    <Card role="article" aria-labelledby={`challenge-${challenge.id}-title`} className="group hover:border-primary/50 transition-all">
      {challenge.banner_url && (
        <LazyImage src={challenge.banner_url} alt={challenge.title || ""} className="w-full h-32 object-cover rounded-t" />
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle id={`challenge-${challenge.id}-title`} className="text-lg group-hover:text-primary transition-colors">
              {challenge.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {challenge.description}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {challenge.entries_count || 0} 参赛
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {getTimeText()}
            </span>
          </div>
        </div>
        {challenge.prize_description && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg mb-4">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">{challenge.prize_description}</span>
          </div>
        )}
        <Link to={`/challenges/${challenge.id}`}>
          <Button className="w-full gap-2" variant={isActive ? "default" : "outline"}>
            {isActive ? "参与挑战" : "查看详情"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
});

export default function Challenges() {
  const { data: allChallenges = [], isLoading } = useChallenges();
  const { data: activeChallenges = [] } = useActiveChallenges();

  const upcomingChallenges = allChallenges.filter(c => isFuture(new Date(c.start_at)));
  const endedChallenges = allChallenges.filter(c => isPast(new Date(c.end_at)));

  return (
    <MainLayout>
      <div className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">挑战活动</h1>
            <p className="text-muted-foreground">参与创作挑战，赢取丰厚奖励</p>
          </div>

          {/* Active Challenges Highlight */}
          {activeChallenges.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-destructive" />
                <h2 className="text-lg font-semibold">正在进行</h2>
                <Badge variant="destructive" className="animate-pulse">
                  {activeChallenges.length} 个活动
                </Badge>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {activeChallenges.map((challenge) => (
                  <ChallengeCard key={challenge.id} challenge={challenge} />
                ))}
              </div>
            </div>
          )}

          {/* Tabs for All Challenges */}
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="upcoming" className="gap-1">
                <Calendar className="h-4 w-4" />
                即将开始 ({upcomingChallenges.length})
              </TabsTrigger>
              <TabsTrigger value="ended" className="gap-1">
                <Award className="h-4 w-4" />
                已结束 ({endedChallenges.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-10 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : allChallenges.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-medium mb-2">暂无挑战活动</h3>
                    <p className="text-muted-foreground">敬请期待更多精彩活动</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allChallenges.map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="mt-6">
              {upcomingChallenges.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">暂无即将开始的活动</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingChallenges.map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="ended" className="mt-6">
              {endedChallenges.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">暂无已结束的活动</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {endedChallenges.map((challenge) => (
                    <ChallengeCard key={challenge.id} challenge={challenge} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
