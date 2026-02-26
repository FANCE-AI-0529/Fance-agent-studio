import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Play, ArrowRight, Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMyAgents, useDeleteAgent, Agent } from "@/hooks/useAgents";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats } from "@/hooks/useUserStats";
import { useLogActivity } from "@/hooks/useAchievements";
import { toast } from "@/hooks/use-toast";
import { ScenarioCards } from "@/components/dashboard/ScenarioCards";
import { UserStatsCards } from "@/components/dashboard/UserStatsCards";
import { QuickStartGuide } from "@/components/dashboard/QuickStartGuide";
import { DailyInspiration } from "@/components/dashboard/DailyInspiration";
import { TrendingAgents } from "@/components/dashboard/TrendingAgents";
import { AchievementShowcase } from "@/components/dashboard/AchievementShowcase";
import { CommunityStats } from "@/components/dashboard/CommunityStats";
import { WorkflowCapabilitiesCard } from "@/components/dashboard/WorkflowCapabilitiesCard";
import { AgentAvatarDisplay, type AgentAvatar } from "@/components/builder/AgentAvatarPicker";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: myAgents = [], isLoading: agentsLoading } = useMyAgents();
  const { data: userStats, isLoading: statsLoading } = useUserStats();
  const logActivity = useLogActivity();
  const deleteAgent = useDeleteAgent();

  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Log activity when user visits dashboard
  useEffect(() => {
    if (user) {
      logActivity();
    }
  }, [user]);

  const hasAgents = myAgents.length > 0;

  const handleStartWizard = () => {
    navigate("/builder?wizard=true");
  };

  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;

    try {
      await deleteAgent.mutateAsync(agentToDelete.id);
      toast({
        title: "智能体已删除",
        description: `「${agentToDelete.name}」已被删除`,
      });
      setAgentToDelete(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      // Error already handled in hook
    }
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
            <p className="text-muted-foreground">打造你的专属AI助手，10分钟上手</p>
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

        {/* Workflow Capabilities Card - New Section */}
        <WorkflowCapabilitiesCard />

        {/* Quick Start Guide */}
        <QuickStartGuide hasAgents={hasAgents} onStartWizard={handleStartWizard} />

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
                {myAgents.slice(0, 3).map((agent, index) => {
                  const avatar = (agent.manifest as any)?.avatar as AgentAvatar | undefined;

                  return (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all">
                        <Link
                          to={agent.status === "deployed" ? "/runtime" : `/builder/${agent.id}`}
                          className="flex items-center gap-4 flex-1 min-w-0"
                        >
                          <div className="w-12 h-12 rounded-xl overflow-hidden group-hover:scale-110 transition-transform">
                            <AgentAvatarDisplay avatar={avatar || { iconId: "bot", colorId: "primary" }} size="lg" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                                {agent.name}
                              </h3>
                              <Badge
                                variant={agent.status === "deployed" ? "default" : "secondary"}
                                className="text-[10px]"
                              >
                                {agent.status === "deployed" ? "已部署" : "草稿"}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{agent.department || "通用助手"}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/builder/${agent.id}`)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                setAgentToDelete(agent);
                                setShowDeleteConfirm(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  );
                })}
                {myAgents.length > 3 && (
                  <Link
                    to="/builder"
                    className="flex items-center justify-center p-4 rounded-xl border border-dashed border-border hover:border-primary/50 transition-colors"
                  >
                    <span className="text-sm text-muted-foreground">+{myAgents.length - 3} 个助手</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Community Stats - Now using real data */}
        <CommunityStats />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确定删除此智能体？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除「{agentToDelete?.name}」及其所有配置和关联数据。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAgent.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteAgent}
              disabled={deleteAgent.isPending}
            >
              {deleteAgent.isPending ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Index;
