import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar.tsx";
import { Card, CardContent } from "../ui/card.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Bot, Heart, Copy, Award, UserPlus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Activity } from "../../hooks/useActivities.ts";
import { formatActivityText } from "../../hooks/useActivities.ts";

interface ActivityFeedProps {
  activities: Activity[];
  isLoading?: boolean;
  showUser?: boolean;
}

function getActivityIcon(type: string) {
  switch (type) {
    case "create_agent":
    case "publish_agent":
      return <Bot className="h-4 w-4" />;
    case "like_agent":
      return <Heart className="h-4 w-4 text-red-500" />;
    case "clone_agent":
      return <Copy className="h-4 w-4" />;
    case "earn_achievement":
      return <Award className="h-4 w-4 text-yellow-500" />;
    case "follow_user":
      return <UserPlus className="h-4 w-4" />;
    case "publish_skill":
      return <Sparkles className="h-4 w-4 text-purple-500" />;
    default:
      return <Bot className="h-4 w-4" />;
  }
}

function ActivityItem({ activity, showUser }: { activity: Activity; showUser: boolean }) {
  const navigate = useNavigate();
  const user = activity.user;
  const name = user?.display_name || "匿名用户";
  const initial = name.charAt(0).toUpperCase();

  const handleUserClick = () => {
    navigate(`/creator/${activity.user_id}`);
  };

  const handleTargetClick = () => {
    if (activity.target_type === "agent" && activity.target_id) {
      navigate(`/hive?tab=builder&agentId=${activity.target_id}`);
    }
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      {showUser && (
        <Avatar 
          className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleUserClick}
        >
          <AvatarImage src={user?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {initial}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-full bg-muted">
            {getActivityIcon(activity.activity_type)}
          </div>
          <div className="flex-1 min-w-0">
            {showUser && (
              <span 
                className="font-medium text-sm cursor-pointer hover:underline"
                onClick={handleUserClick}
              >
                {name}
              </span>
            )}
            <span className={showUser ? "text-sm text-muted-foreground ml-1" : "text-sm"}>
              {formatActivityText(activity)}
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(activity.created_at), {
            addSuffix: true,
            locale: zhCN,
          })}
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed({ activities, isLoading, showUser = true }: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无动态
      </div>
    );
  }

  return (
    <div>
      {activities.map(activity => (
        <ActivityItem key={activity.id} activity={activity} showUser={showUser} />
      ))}
    </div>
  );
}
