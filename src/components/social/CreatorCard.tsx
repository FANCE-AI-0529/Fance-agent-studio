import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FollowButton } from "./FollowButton";
import { CheckCircle, Users, Bot, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface CreatorCardProps {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  isVerified?: boolean;
  followersCount?: number;
  agentCount?: number;
  likesCount?: number;
  rank?: number;
  className?: string;
  showStats?: boolean;
  showFollowButton?: boolean;
}

export function CreatorCard({
  userId,
  displayName,
  avatarUrl,
  bio,
  isVerified,
  followersCount = 0,
  agentCount = 0,
  likesCount = 0,
  rank,
  className,
  showStats = true,
  showFollowButton = true,
}: CreatorCardProps) {
  const navigate = useNavigate();
  const name = displayName || "匿名用户";
  const initial = name.charAt(0).toUpperCase();

  const handleClick = () => {
    navigate(`/creator/${userId}`);
  };

  return (
    <Card 
      className={cn(
        "cursor-pointer hover:bg-accent/50 transition-colors",
        className
      )}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          {rank && rank <= 3 && (
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
              rank === 1 && "bg-yellow-500 text-yellow-950",
              rank === 2 && "bg-gray-400 text-gray-950",
              rank === 3 && "bg-amber-600 text-amber-950"
            )}>
              {rank}
            </div>
          )}
          {rank && rank > 3 && (
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
              {rank}
            </div>
          )}

          {/* Avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {initial}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-sm truncate">{name}</span>
              {isVerified && (
                <CheckCircle className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              )}
            </div>
            
            {bio && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {bio}
              </p>
            )}

            {showStats && (
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {followersCount.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Bot className="h-3 w-3" />
                  {agentCount}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {likesCount.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Follow button */}
          {showFollowButton && (
            <div onClick={e => e.stopPropagation()}>
              <FollowButton userId={userId} size="sm" variant="outline" showIcon={false} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
