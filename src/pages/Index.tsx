import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Play, 
  ArrowRight, 
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
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

  useEffect(() => {
    if (user) {
      logActivity();
    }
  }, [user]);

  const hasAgents = myAgents.length > 0;

  const handleStartWizard = () => {
    navigate("/hive?tab=builder&wizard=true");
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
            <p className="text-muted-foreground">
              打造你的专属AI助手，10分钟上手
            </p>
          </div>
          {hasAgents && (
            <Button onClick={() => {
              const lastDeployed = myAgents.find(a => a.status === 'deployed');
              navigate(lastDeployed ? `/hive?tab=runtime&agentId=${lastDeployed.id}` : "/hive?tab=runtime");
            }} className="gap-2">
              <Play className="h-4 w-4" />
              继续对话
            </Button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Row 1: Stats + Daily Inspiration side by side */}
        {user && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3">
              <h2 className="text-lg font-semibold mb-4">使用统计</h2>
              <UserStatsCards 
                conversationsToday={userStats?.conversationsToday ?? 0}
                timeSavedMinutes={userStats?.timeSavedMinutes ?? 0}
                tasksCompleted={userStats?.tasksCompleted ?? 0}
                weeklyGrowth={userStats?.weeklyGrowth ?? 0}
                isLoading={statsLoading}
              />
            </div>
            <div className="lg:col-span-2">
              <DailyInspiration />
            </div>
          </div>
        )}

        {/* Row 2: My Agents - Horizontal scroll */}
        {user && hasAgents && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">我的助手</h2>
              <Link to="/hive?tab=builder">
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
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                {myAgents.slice(0, 8).map((agent, index) => {
                  const avatar = (agent.manifest as any)?.avatar as AgentAvatar | undefined;
                  return (
                    <AgentCard
                      key={agent.id}
                      agent={agent}
                      avatar={avatar}
                      index={index}
                      onEdit={() => navigate(`/hive?tab=builder&agentId=${agent.id}`)}
                      onDelete={() => {
                        setAgentToDelete(agent);
                        setShowDeleteConfirm(true);
                      }}
                    />
                  );
                })}
                {/* Create new card */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex-shrink-0"
                >
                  <button
                    onClick={handleStartWizard}
                    className="w-48 h-full min-h-[120px] flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">新建助手</span>
                  </button>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* Workflow Capabilities */}
        <WorkflowCapabilitiesCard />

        {/* Quick Start Guide */}
        <QuickStartGuide 
          hasAgents={hasAgents} 
          onStartWizard={handleStartWizard}
        />

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

/** Compact horizontal-scroll agent card */
function AgentCard({ 
  agent, avatar, index, onEdit, onDelete 
}: { 
  agent: Agent; 
  avatar?: AgentAvatar; 
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex-shrink-0 w-48"
    >
      <div className="group relative p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        onClick={() => navigate(agent.status === 'deployed' ? `/hive?tab=runtime&agentId=${agent.id}` : `/hive?tab=builder&agentId=${agent.id}`)}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden group-hover:scale-110 transition-transform">
            <AgentAvatarDisplay 
              avatar={avatar || { iconId: 'bot', colorId: 'primary' }} 
              size="md" 
            />
          </div>
          <Badge 
            variant={agent.status === 'deployed' ? 'default' : 'secondary'}
            className="text-[10px] h-5"
          >
            {agent.status === 'deployed' ? '运行中' : '草稿'}
          </Badge>
        </div>
        <h3 className="font-medium text-sm truncate mb-1 group-hover:text-primary transition-colors">
          {agent.name}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {agent.department || '通用助手'}
        </p>

        {/* Hover actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Pencil className="h-4 w-4 mr-2" />
                编辑
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}

export default Index;
