import React, { useState } from "react";
import { Star, MessageSquare, User, ThumbsUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useSkillRatings, 
  useMySkillRating, 
  useSubmitRating,
  useDeleteRating,
  type SkillRating 
} from "@/hooks/useSkillRating";

interface SkillRatingCardProps {
  skillId: string;
  skillName: string;
  averageRating?: number;
  totalRatings?: number;
  className?: string;
}

// Star rating input component
function StarRatingInput({ 
  value, 
  onChange, 
  size = "md",
  readonly = false 
}: { 
  value: number; 
  onChange?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
}) {
  const [hoverValue, setHoverValue] = useState(0);
  
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn(
            "transition-transform",
            !readonly && "hover:scale-110 cursor-pointer",
            readonly && "cursor-default"
          )}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            className={cn(
              sizeClasses[size],
              "transition-colors",
              (hoverValue || value) >= star
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/40"
            )}
          />
        </button>
      ))}
    </div>
  );
}

// Rating distribution bar
function RatingDistribution({ ratings }: { ratings: SkillRating[] }) {
  const distribution = [5, 4, 3, 2, 1].map(star => {
    const count = ratings.filter(r => r.rating === star).length;
    const percentage = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
    return { star, count, percentage };
  });

  return (
    <div className="space-y-2">
      {distribution.map(({ star, count, percentage }) => (
        <div key={star} className="flex items-center gap-2 text-xs">
          <span className="w-3 text-muted-foreground">{star}</span>
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <Progress value={percentage} className="h-2 flex-1" />
          <span className="w-8 text-right text-muted-foreground">{count}</span>
        </div>
      ))}
    </div>
  );
}

// Single review item
function ReviewItem({ rating }: { rating: SkillRating }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 py-3"
    >
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary/10 text-primary text-xs">
          <User className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <StarRatingInput value={rating.rating} readonly size="sm" />
          <span className="text-xs text-muted-foreground">
            {format(new Date(rating.created_at), "yyyy年M月d日", { locale: zhCN })}
          </span>
        </div>
        {rating.review && (
          <p className="text-sm text-muted-foreground">{rating.review}</p>
        )}
      </div>
    </motion.div>
  );
}

// Rating form
function RatingForm({ 
  skillId,
  existingRating,
  onSuccess 
}: { 
  skillId: string;
  existingRating: SkillRating | null;
  onSuccess?: () => void;
}) {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [review, setReview] = useState(existingRating?.review || "");
  const { mutate: submitRating, isPending } = useSubmitRating();
  const { mutate: deleteRating, isPending: isDeleting } = useDeleteRating();

  const handleSubmit = () => {
    if (rating === 0) return;
    submitRating({ skillId, rating, review }, {
      onSuccess: () => {
        onSuccess?.();
      }
    });
  };

  const handleDelete = () => {
    deleteRating(skillId, {
      onSuccess: () => {
        setRating(0);
        setReview("");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">你的评分</span>
        <StarRatingInput value={rating} onChange={setRating} size="lg" />
      </div>
      
      <Textarea
        placeholder="分享你的使用体验...（可选）"
        value={review}
        onChange={(e) => setReview(e.target.value)}
        className="resize-none"
        rows={3}
      />
      
      <div className="flex items-center gap-2">
        <Button 
          onClick={handleSubmit} 
          disabled={rating === 0 || isPending}
          className="flex-1"
        >
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {existingRating ? "更新评价" : "提交评价"}
        </Button>
        
        {existingRating && (
          <Button 
            variant="outline" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "删除"}
          </Button>
        )}
      </div>
    </div>
  );
}

// Main component
export function SkillRatingCard({ 
  skillId, 
  skillName,
  averageRating = 0,
  totalRatings = 0,
  className 
}: SkillRatingCardProps) {
  const [showForm, setShowForm] = useState(false);
  const { data: ratings, isLoading } = useSkillRatings(skillId);
  const { data: myRating } = useMySkillRating(skillId);

  const displayedRatings = ratings?.slice(0, 5) || [];
  const actualAverage = ratings?.length 
    ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
    : averageRating;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            评价与评论
          </CardTitle>
          <Badge variant="secondary" className="gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {actualAverage.toFixed(1)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Rating Overview */}
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">
              {actualAverage.toFixed(1)}
            </div>
            <StarRatingInput value={Math.round(actualAverage)} readonly size="sm" />
            <div className="text-xs text-muted-foreground mt-1">
              {ratings?.length || totalRatings} 条评价
            </div>
          </div>
          
          <div className="flex-1">
            {ratings && ratings.length > 0 && (
              <RatingDistribution ratings={ratings} />
            )}
          </div>
        </div>

        <Separator />

        {/* Rating Form Toggle */}
        <AnimatePresence mode="wait">
          {showForm ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <RatingForm 
                skillId={skillId} 
                existingRating={myRating || null}
                onSuccess={() => setShowForm(false)}
              />
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => setShowForm(false)}
              >
                取消
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowForm(true)}
              >
                <Star className="h-4 w-4 mr-2" />
                {myRating ? "修改我的评价" : "写评价"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews List */}
        {displayedRatings.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              <h4 className="text-sm font-medium">最新评价</h4>
              <div className="divide-y divide-border">
                {displayedRatings.map((rating) => (
                  <ReviewItem key={rating.id} rating={rating} />
                ))}
              </div>
              
              {(ratings?.length || 0) > 5 && (
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
                  查看全部 {ratings?.length} 条评价
                </Button>
              )}
            </div>
          </>
        )}

        {isLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SkillRatingCard;
