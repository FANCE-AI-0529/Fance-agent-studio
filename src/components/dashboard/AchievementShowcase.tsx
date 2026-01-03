import { motion } from "framer-motion";
import { Trophy, ChevronRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, Link } from "react-router-dom";
import { 
  useUserAchievements, 
  useAchievementProgress, 
  getNextAchievement,
  ACHIEVEMENT_DEFINITIONS,
  Achievement
} from "@/hooks/useAchievements";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AchievementShowcase() {
  const navigate = useNavigate();
  const { data: achievements = [], isLoading: achievementsLoading } = useUserAchievements();
  const { data: progress, isLoading: progressLoading } = useAchievementProgress();

  const isLoading = achievementsLoading || progressLoading;
  const nextAchievement = getNextAchievement(achievements, progress || null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">我的成就</h2>
        </div>
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">我的成就</h2>
          <span className="text-sm text-muted-foreground">
            ({achievements.length}/{ACHIEVEMENT_DEFINITIONS.reduce((sum, d) => sum + d.levels.length, 0)})
          </span>
        </div>
        <Link to="/achievements">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
            查看全部
            <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {/* Earned Achievements */}
        <div className="flex flex-wrap gap-2 mb-4">
          <TooltipProvider>
            {ACHIEVEMENT_DEFINITIONS.map((def) => {
              const earned = achievements.find(a => a.achievement_type === def.type);
              const isEarned = !!earned;
              
              return (
                <Tooltip key={def.type}>
                  <TooltipTrigger>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                        ${isEarned 
                          ? "bg-primary/10 border-2 border-primary/30" 
                          : "bg-muted/50 border border-border opacity-50"
                        }
                      `}
                    >
                      {isEarned ? def.icon : <Lock className="h-4 w-4 text-muted-foreground" />}
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-center">
                      <p className="font-medium">{def.name}</p>
                      <p className="text-xs text-muted-foreground">{def.description}</p>
                      {isEarned && earned && (
                        <p className="text-xs text-primary mt-1">
                          等级 {earned.achievement_level} · {new Date(earned.earned_at).toLocaleDateString("zh-CN")}
                        </p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>

        {/* Next Achievement Progress */}
        {nextAchievement && (
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{nextAchievement.definition.icon}</span>
                <div>
                  <p className="text-sm font-medium">
                    下一个成就: {nextAchievement.definition.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {nextAchievement.definition.levels.find(l => l.level === nextAchievement.nextLevel)?.description}
                  </p>
                </div>
              </div>
              <span className="text-sm font-mono">
                {nextAchievement.current}/{nextAchievement.required}
              </span>
            </div>
            <Progress 
              value={(nextAchievement.current / nextAchievement.required) * 100} 
              className="h-2"
            />
          </div>
        )}

        {/* All Completed */}
        {!nextAchievement && achievements.length > 0 && (
          <div className="pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              🎉 恭喜！你已解锁所有成就！
            </p>
          </div>
        )}

        {/* No Achievements Yet */}
        {achievements.length === 0 && (
          <div className="pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground mb-2">
              开始创建你的第一个 Agent，解锁第一个成就！
            </p>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate("/builder?wizard=true")}
            >
              立即开始
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
