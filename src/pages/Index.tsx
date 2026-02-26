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
  Sparkles,
  Wand2,
  Bot,
  MessageCircle,
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
import { UserStatsCards } from "@/components/dashboard/UserStatsCards";
import { DailyInspiration } from "@/components/dashboard/DailyInspiration";
import { WorkflowCapabilitiesCard } from "@/components/dashboard/WorkflowCapabilitiesCard";
import { ScenarioCards } from "@/components/dashboard/ScenarioCards";
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
    <div className="h-full overflow-y-auto scrollbar-thin">
      {/* Compact Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              {user ? `你好，${user.user_metadata?.display_name || user.email?.split("@")[0] || "用户"}` : "欢迎使用"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              打造你的专属AI助手
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasAgents && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  const lastDeployed = myAgents.find(a => a.status === 'deployed');
                  navigate(lastDeployed ? `/hive?tab=runtime&agentId=${lastDeployed.id}` : "/hive?tab=runtime");
                }} 
                className="gap-1.5"
              >
                <Play className="h-3.5 w-3.5" />
                继续对话
              </Button>
            )}
            <Button size="sm" onClick={handleStartWizard} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              新建助手
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-6">
        {/* Row 1: Stats Grid + Daily Inspiration - Bento Grid */}
        {user && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {/* Stats - takes 2 cols on xl */}
            <div className="xl:col-span-2">
              <UserStatsCards 
                conversationsToday={userStats?.conversationsToday ?? 0}
                timeSavedMinutes={userStats?.timeSavedMinutes ?? 0}
                tasksCompleted={userStats?.tasksCompleted ?? 0}
                weeklyGrowth={userStats?.weeklyGrowth ?? 0}
                isLoading={statsLoading}
              />
            </div>
            {/* Inspiration - compact single card on desktop */}
            <div className="xl:col-span-1">
              <DailyInspiration />
            </div>
          </div>
        )}

        {/* Row 2: My Agents - Horizontal scroll */}
        {user && hasAgents && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">我的助手</h2>
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
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
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
                    className="w-44 h-full min-h-[110px] flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">新建助手</span>
                  </button>
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* Row 3: Quick Start (for new users) or Workflow Capabilities */}
        {user && !hasAgents && (
          <QuickStartHero onStartWizard={handleStartWizard} />
        )}

        {/* Row 4: Two-column - Workflow + Scenarios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WorkflowCapabilitiesCard />
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">快速创建</h2>
            <ScenarioCards />
          </div>
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

/** Inline quick-start hero for new users */
function QuickStartHero({ onStartWizard }: { onStartWizard: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-border bg-card p-6"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              新用户专享
            </Badge>
          </div>
          <h2 className="text-lg font-semibold mb-1">10 分钟创建你的第一个 AI 助手</h2>
          <p className="text-sm text-muted-foreground">
            告诉 AI 你的需求，系统自动选择最佳能力组合，一键部署即可使用
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button onClick={onStartWizard} className="gap-1.5">
            <Wand2 className="h-4 w-4" />
            AI 帮我创建
          </Button>
          <Button variant="outline" asChild className="gap-1.5">
            <Link to="/hive?tab=builder">
              <Bot className="h-4 w-4" />
              浏览模板
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

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
      transition={{ delay: index * 0.04 }}
      className="flex-shrink-0 w-44"
    >
      <div className="group relative p-3.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        onClick={() => navigate(agent.status === 'deployed' ? `/hive?tab=runtime&agentId=${agent.id}` : `/hive?tab=builder&agentId=${agent.id}`)}
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-9 h-9 rounded-lg overflow-hidden group-hover:scale-105 transition-transform">
            <AgentAvatarDisplay 
              avatar={avatar || { iconId: 'bot', colorId: 'primary' }} 
              size="md" 
            />
          </div>
          <Badge 
            variant={agent.status === 'deployed' ? 'default' : 'secondary'}
            className="text-[10px] h-4 px-1.5"
          >
            {agent.status === 'deployed' ? '运行中' : '草稿'}
          </Badge>
        </div>
        <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
          {agent.name}
        </h3>
        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
          {agent.department || '通用助手'}
        </p>

        {/* Hover actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-3 w-3" />
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
