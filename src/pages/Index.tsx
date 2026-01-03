import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Bot, 
  Play, 
  ArrowRight, 
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMyAgents } from "@/hooks/useAgents";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";
import { ScenarioCards } from "@/components/dashboard/ScenarioCards";
import { UserStatsCards } from "@/components/dashboard/UserStatsCards";
import { QuickStartGuide } from "@/components/dashboard/QuickStartGuide";
import { DailyInspiration } from "@/components/dashboard/DailyInspiration";
import { TrendingAgents } from "@/components/dashboard/TrendingAgents";
import { AchievementShowcase } from "@/components/dashboard/AchievementShowcase";
import { CommunityStats } from "@/components/dashboard/CommunityStats";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: myAgents = [], isLoading: agentsLoading } = useMyAgents();
  const { data: userStats, isLoading: statsLoading } = useUserStats();

  const hasAgents = myAgents.length > 0;

  const handleStartWizard = () => {
    navigate("/builder?wizard=true");
  };

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {user ? `你好，${user.user_metadata?.display_name || user.email?.split("@")[0] || "用户"}` : "欢迎使用"}
            </h1>
            <p className="text-muted-foreground">
              打造你的专属AI助手，10分钟上手
            </p>
          </div>
          {hasAgents && (
            <Button onClick={() => navigate("/runtime")} className="gap-2">
              <Play className="h-4 w-4" />
              继续对话
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Daily Inspiration - New Section */}
        <DailyInspiration />

        {/* Quick Start Guide */}
        <QuickStartGuide 
          hasAgents={hasAgents} 
          onStartWizard={handleStartWizard}
        />

        {/* Trending Agents - New Section */}
        <TrendingAgents />

        {/* Achievement Showcase - New Section (logged in users only) */}
        {user && <AchievementShowcase />}

        {/* User Stats */}
        {user && (
          <div>
            <h2 className="text-lg font-semibold mb-4">使用统计</h2>
            <UserStatsCards 
              conversationsToday={userStats?.conversationsToday ?? 0}
              timeSavedMinutes={userStats?.timeSavedMinutes ?? 0}
              tasksCompleted={userStats?.tasksCompleted ?? 0}
              weeklyGrowth={userStats?.weeklyGrowth ?? 0}
              isLoading={statsLoading}
            />
          </div>
        )}

        {/* Scenario Entry Points */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">我想创建...</h2>
              <p className="text-sm text-muted-foreground">选择一个场景，快速开始</p>
            </div>
          </div>
          <ScenarioCards />
        </div>

        {/* My Assistants */}
        {user && hasAgents && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">我的助手</h2>
              <Link to="/builder">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                  查看全部
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
            {agentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {myAgents.slice(0, 3).map((agent, index) => (
                  <motion.div
                    key={agent.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={agent.status === 'deployed' ? '/runtime' : `/builder/${agent.id}`}
                      className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Bot className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                            {agent.name}
                          </h3>
                          <Badge 
                            variant={agent.status === 'deployed' ? 'default' : 'secondary'}
                            className="text-[10px]"
                          >
                            {agent.status === 'deployed' ? '已部署' : '草稿'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {agent.department || '通用助手'}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  </motion.div>
                ))}
                {myAgents.length > 3 && (
                  <Link
                    to="/builder"
                    className="flex items-center justify-center p-4 rounded-xl border border-dashed border-border hover:border-primary/50 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">
                      +{myAgents.length - 3} 个助手
                    </span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Community Stats - Now using real data */}
        <CommunityStats />
      </div>
    </div>
  );
};

// Helper function for time display
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins} 分钟前`;
  if (diffHours < 24) return `${diffHours} 小时前`;
  if (diffDays < 7) return `${diffDays} 天前`;
  return date.toLocaleDateString("zh-CN");
}

export default Index;
