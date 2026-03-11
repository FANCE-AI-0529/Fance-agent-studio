// P3-05: Achievement System - Gamification incentive mechanism
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Trophy, 
  Star, 
  Flame, 
  Zap, 
  Crown, 
  Award,
  Medal,
  Target,
  Sparkles,
  Gift,
  Lock,
  CheckCircle,
  X
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Card, CardContent } from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import { Progress } from "../ui/progress.tsx";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import { cn } from "../../lib/utils.ts";
import { staggerContainer, staggerItem } from "../../lib/animations.ts";
import type { Achievement, AchievementCategory, AchievementTier } from "../../hooks/useAchievements.ts";

interface AchievementSystemProps {
  achievements: Achievement[];
  userPoints: number;
  userLevel: number;
  onClaimReward?: (achievementId: string) => void;
  className?: string;
}

// Tier configurations
const tierConfig: Record<AchievementTier, { 
  color: string; 
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  label: string;
}> = {
  bronze: { 
    color: "text-orange-600", 
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    icon: Medal,
    label: "青铜",
  },
  silver: { 
    color: "text-gray-400", 
    bgColor: "bg-gray-400/10",
    borderColor: "border-gray-400/30",
    icon: Award,
    label: "白银",
  },
  gold: { 
    color: "text-yellow-500", 
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    icon: Trophy,
    label: "黄金",
  },
  platinum: { 
    color: "text-cyan-400", 
    bgColor: "bg-cyan-400/10",
    borderColor: "border-cyan-400/30",
    icon: Crown,
    label: "铂金",
  },
  diamond: { 
    color: "text-purple-400", 
    bgColor: "bg-purple-400/10",
    borderColor: "border-purple-400/30",
    icon: Sparkles,
    label: "钻石",
  },
};

const categoryConfig: Record<AchievementCategory, {
  label: string;
  icon: React.ElementType;
  color: string;
}> = {
  creation: { label: "创造", icon: Zap, color: "text-blue-500" },
  exploration: { label: "探索", icon: Target, color: "text-green-500" },
  social: { label: "社交", icon: Star, color: "text-pink-500" },
  mastery: { label: "精通", icon: Flame, color: "text-orange-500" },
  special: { label: "特殊", icon: Gift, color: "text-purple-500" },
};

// Sample achievements data
export const defaultAchievements: Achievement[] = [
  {
    id: "first-agent",
    name: "初次创造",
    description: "创建你的第一个 Agent",
    icon: "🎉",
    category: "creation",
    tier: "bronze",
    requirement: 1,
    currentProgress: 0,
    isUnlocked: false,
    reward: { type: "points", value: 100 },
  },
  {
    id: "agent-master",
    name: "Agent 大师",
    description: "创建 10 个 Agent",
    icon: "🤖",
    category: "creation",
    tier: "gold",
    requirement: 10,
    currentProgress: 0,
    isUnlocked: false,
    reward: { type: "title", value: "Agent 大师" },
  },
  {
    id: "skill-collector",
    name: "技能收集者",
    description: "安装 20 个不同的技能",
    icon: "🧩",
    category: "exploration",
    tier: "silver",
    requirement: 20,
    currentProgress: 0,
    isUnlocked: false,
    reward: { type: "badge", value: "collector" },
  },
  {
    id: "popular-creator",
    name: "人气创作者",
    description: "获得 100 个点赞",
    icon: "⭐",
    category: "social",
    tier: "gold",
    requirement: 100,
    currentProgress: 0,
    isUnlocked: false,
    reward: { type: "feature", value: "priority_showcase" },
  },
  {
    id: "conversation-king",
    name: "对话之王",
    description: "完成 1000 次对话",
    icon: "👑",
    category: "mastery",
    tier: "platinum",
    requirement: 1000,
    currentProgress: 0,
    isUnlocked: false,
    reward: { type: "title", value: "对话之王" },
  },
  {
    id: "early-adopter",
    name: "早期支持者",
    description: "在产品上线首月注册",
    icon: "🌟",
    category: "special",
    tier: "diamond",
    requirement: 1,
    currentProgress: 1,
    isUnlocked: true,
    unlockedAt: new Date(),
    reward: { type: "badge", value: "pioneer" },
  },
];

function AchievementCard({ 
  achievement, 
  onClaim 
}: { 
  achievement: Achievement;
  onClaim?: () => void;
}) {
  const tier = tierConfig[achievement.tier];
  const category = categoryConfig[achievement.category];
  const TierIcon = tier.icon;
  const CategoryIcon = category.icon;
  
  const progress = Math.min(100, (achievement.currentProgress / achievement.requirement) * 100);
  const canClaim = achievement.isUnlocked && achievement.reward;

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ scale: 1.02 }}
      className="group"
    >
      <Card className={cn(
        "relative overflow-hidden transition-all",
        achievement.isUnlocked 
          ? `${tier.borderColor} border-2` 
          : "border-border opacity-75"
      )}>
        {/* Tier indicator */}
        <div className={cn(
          "absolute top-0 right-0 px-2 py-1 text-[10px] font-medium rounded-bl-lg",
          tier.bgColor, tier.color
        )}>
          {tier.label}
        </div>

        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Icon */}
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
              achievement.isUnlocked ? tier.bgColor : "bg-muted"
            )}>
              {achievement.isUnlocked ? (
                achievement.icon
              ) : (
                <Lock className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className={cn(
                  "font-medium text-sm",
                  !achievement.isUnlocked && "text-muted-foreground"
                )}>
                  {achievement.name}
                </h4>
                <CategoryIcon className={cn("h-3 w-3", category.color)} />
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">
                {achievement.description}
              </p>

              {/* Progress */}
              {!achievement.isUnlocked && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">进度</span>
                    <span className="font-mono">
                      {achievement.currentProgress}/{achievement.requirement}
                    </span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}

              {/* Unlocked state */}
              {achievement.isUnlocked && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-xs text-green-500">
                    <CheckCircle className="h-3 w-3" />
                    已解锁
                    {achievement.unlockedAt && (
                      <span className="text-muted-foreground ml-1">
                        {achievement.unlockedAt.toLocaleDateString("zh-CN")}
                      </span>
                    )}
                  </div>
                  
                  {canClaim && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-6 text-xs"
                      onClick={onClaim}
                    >
                      <Gift className="h-3 w-3 mr-1" />
                      领取奖励
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AchievementSystem({
  achievements,
  userPoints,
  userLevel,
  onClaimReward,
  className,
}: AchievementSystemProps) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | "all">("all");

  const stats = useMemo(() => {
    const unlocked = achievements.filter(a => a.isUnlocked).length;
    const total = achievements.length;
    const percentage = Math.round((unlocked / total) * 100);
    
    const byCategory = Object.keys(categoryConfig).reduce((acc, cat) => {
      const catAchievements = achievements.filter(a => a.category === cat);
      acc[cat as AchievementCategory] = {
        unlocked: catAchievements.filter(a => a.isUnlocked).length,
        total: catAchievements.length,
      };
      return acc;
    }, {} as Record<AchievementCategory, { unlocked: number; total: number }>);

    return { unlocked, total, percentage, byCategory };
  }, [achievements]);

  const filteredAchievements = useMemo(() => {
    if (selectedCategory === "all") return achievements;
    return achievements.filter(a => a.category === selectedCategory);
  }, [achievements, selectedCategory]);

  // Calculate level progress
  const levelProgress = useMemo(() => {
    const pointsPerLevel = 500;
    const currentLevelPoints = userPoints % pointsPerLevel;
    return (currentLevelPoints / pointsPerLevel) * 100;
  }, [userPoints]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={cn("space-y-6", className)}
    >
      {/* Header with stats */}
      <motion.div variants={staggerItem}>
        <Card className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <Trophy className="h-8 w-8 text-primary" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                    Lv.{userLevel}
                  </div>
                </div>
                
                <div>
                  <h2 className="text-xl font-bold">成就系统</h2>
                  <p className="text-sm text-muted-foreground">
                    已解锁 {stats.unlocked}/{stats.total} 个成就
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{userPoints}</div>
                  <div className="text-xs text-muted-foreground">总积分</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">{stats.unlocked}</div>
                  <div className="text-xs text-muted-foreground">已解锁</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-500">{stats.percentage}%</div>
                  <div className="text-xs text-muted-foreground">完成度</div>
                </div>
              </div>
            </div>

            {/* Level progress bar */}
            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">等级进度</span>
                <span className="font-mono">Lv.{userLevel} → Lv.{userLevel + 1}</span>
              </div>
              <Progress value={levelProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Category tabs */}
      <motion.div variants={staggerItem}>
        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all" className="gap-1">
              <Award className="h-4 w-4" />
              全部
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {stats.unlocked}/{stats.total}
              </Badge>
            </TabsTrigger>
            {Object.entries(categoryConfig).map(([key, config]) => {
              const CategoryIcon = config.icon;
              const catStats = stats.byCategory[key as AchievementCategory];
              return (
                <TabsTrigger key={key} value={key} className="gap-1">
                  <CategoryIcon className={cn("h-4 w-4", config.color)} />
                  {config.label}
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {catStats?.unlocked || 0}/{catStats?.total || 0}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </motion.div>

      {/* Achievement grid */}
      <motion.div 
        variants={staggerContainer}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <AnimatePresence mode="popLayout">
          {filteredAchievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              onClaim={() => onClaimReward?.(achievement.id)}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// Achievement unlock notification
export function AchievementUnlockNotification({
  achievement,
  onClose,
}: {
  achievement: Achievement;
  onClose: () => void;
}) {
  const tier = tierConfig[achievement.tier];

  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      className="fixed top-4 right-4 z-50"
    >
      <Card className={cn(
        "w-80 overflow-hidden border-2",
        tier.borderColor
      )}>
        <div className={cn("h-1", tier.bgColor.replace("/10", ""))} />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <motion.div 
              initial={{ rotate: -10, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                tier.bgColor
              )}
            >
              {achievement.icon}
            </motion.div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground">成就解锁!</span>
                <Badge className={cn("text-[10px]", tier.bgColor, tier.color)}>
                  {tier.label}
                </Badge>
              </div>
              <h4 className="font-semibold">{achievement.name}</h4>
              <p className="text-xs text-muted-foreground">{achievement.description}</p>
              
              {achievement.reward && (
                <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                  <Gift className="h-3 w-3" />
                  奖励已发放
                </div>
              )}
            </div>
            
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
