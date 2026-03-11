import { Button } from "../ui/button.tsx";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { useIsFollowing, useToggleFollow } from "../../hooks/useFollow.ts";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils.ts";

interface FollowButtonProps {
  userId: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
}

export function FollowButton({
  userId,
  className,
  variant = "default",
  size = "default",
  showIcon = true,
}: FollowButtonProps) {
  const { user } = useAuth();
  const { data: isFollowing, isLoading: isCheckingFollow } = useIsFollowing(userId);
  const toggleFollow = useToggleFollow();

  // Don't show button for own profile
  if (user?.id === userId) {
    return null;
  }

  // Not logged in
  if (!user) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        {showIcon && <UserPlus className="h-4 w-4 mr-1" />}
        关注
      </Button>
    );
  }

  const handleClick = () => {
    toggleFollow.mutate({ targetUserId: userId, isFollowing: !!isFollowing });
  };

  const isLoading = isCheckingFollow || toggleFollow.isPending;

  return (
    <Button
      variant={isFollowing ? "outline" : variant}
      size={size}
      className={cn(
        isFollowing && "hover:bg-destructive/10 hover:text-destructive hover:border-destructive",
        className
      )}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          {showIcon && (isFollowing ? (
            <UserMinus className="h-4 w-4 mr-1" />
          ) : (
            <UserPlus className="h-4 w-4 mr-1" />
          ))}
          {isFollowing ? "已关注" : "关注"}
        </>
      )}
    </Button>
  );
}
