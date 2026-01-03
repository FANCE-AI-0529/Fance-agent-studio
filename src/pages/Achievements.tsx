import { motion } from "framer-motion";
import { Trophy, ChevronLeft, Lock, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { 
  useUserAchievements, 
  useAchievementProgress, 
  ACHIEVEMENT_DEFINITIONS,
} from "@/hooks/useAchievements";

const Achievements = () => {
  const navigate = useNavigate();
  const { data: achievements = [], isLoading: achievementsLoading } = useUserAchievements();
  const { data: progress, isLoading: progressLoading } = useAchievementProgress();

  const isLoading = achievementsLoading || progressLoading;

  const totalAchievements = ACHIEVEMENT_DEFINITIONS.reduce((sum, d) => sum + d.levels.length, 0);
  const earnedCount = achievements.length;

  // Get progress value for each achievement type
  const getProgressValue = (type: string): number => {
    if (!progress) return 0;
    switch (type) {
      case "first_agent":
      case "agent_master":
        return progress.totalAgents;
      case "popular_creator":
        return progress.totalLikes;
      case "helpful_hero":
        return progress.totalUsage;
      case "clone_master":
        return progress.totalClones;
      case "active_user":
        return progress.activeDays || 0;
      default:
        return 0;
    }
  };

  // Get quick action for each achievement type
  const getQuickAction = (type: string): { label: string; path: string } | null => {
    switch (type) {
      case "first_agent":
      case "agent_master":
        return { label: "创建 Agent", path: "/builder?wizard=true" };
      case "popular_creator":
      case "helpful_hero":
      case "clone_master":
        return { label: "发现热门", path: "/leaderboard" };
      case "active_user":
        return { label: "开始对话", path: "/runtime" };
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="p-6 border-b border-border">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="p-6 space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              成就中心
            </h1>
            <p className="text-muted-foreground text-sm">
              已解锁 {earnedCount}/{totalAchievements} 个成就
            </p>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Progress value={(earnedCount / totalAchievements) * 100} className="h-3" />
          </div>
          <span className="text-sm font-mono text-muted-foreground">
            {Math.round((earnedCount / totalAchievements) * 100)}%
          </span>
        </div>
      </div>

      {/* Achievement List */}
      <div className="p-6 space-y-6">
        {ACHIEVEMENT_DEFINITIONS.map((def, defIndex) => {
          const earnedLevels = achievements.filter(a => a.achievement_type === def.type);
          const maxEarnedLevel = earnedLevels.length > 0 
            ? Math.max(...earnedLevels.map(a => a.achievement_level))
            : 0;
          const currentProgress = getProgressValue(def.type);
          const quickAction = getQuickAction(def.type);

          return (
            <motion.div
              key={def.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: defIndex * 0.1 }}
              className="rounded-xl border border-border bg-card p-6"
            >
              {/* Achievement Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-3xl border border-primary/20">
                  {def.icon}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{def.name}</h3>
                  <p className="text-sm text-muted-foreground">{def.description}</p>
                </div>
                {quickAction && maxEarnedLevel < def.levels.length && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(quickAction.path)}
                    className="gap-1"
                  >
                    {quickAction.label}
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Levels */}
              <div className="space-y-3">
                {def.levels.map((level) => {
                  const isEarned = maxEarnedLevel >= level.level;
                  const earnedAchievement = earnedLevels.find(a => a.achievement_level === level.level);
                  const progressPercent = Math.min((currentProgress / level.requirement) * 100, 100);

                  return (
                    <div 
                      key={level.level}
                      className={`
                        flex items-center gap-4 p-3 rounded-lg transition-colors
                        ${isEarned ? "bg-primary/5 border border-primary/20" : "bg-muted/50 border border-border"}
                      `}
                    >
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center
                        ${isEarned ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                      `}>
                        {isEarned ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${isEarned ? "text-primary" : ""}`}>
                            等级 {level.level}: {level.description}
                          </span>
                          <span className="text-xs font-mono text-muted-foreground">
                            {isEarned ? "已解锁" : `${currentProgress}/${level.requirement}`}
                          </span>
                        </div>
                        {!isEarned && (
                          <Progress value={progressPercent} className="h-1.5" />
                        )}
                        {isEarned && earnedAchievement && (
                          <span className="text-[10px] text-muted-foreground">
                            解锁于 {new Date(earnedAchievement.earned_at).toLocaleDateString("zh-CN")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Achievements;
