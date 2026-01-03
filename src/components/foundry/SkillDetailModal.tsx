import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  Download,
  BadgeCheck,
  Calendar,
  User,
  Tag,
  MessageSquare,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSkillRatings, useMySkillRating, useSubmitRating } from "@/hooks/useSkillRating";
import { useInstallSkill, useIsSkillInstalled } from "@/hooks/useSkillInstall";
import { useAuth } from "@/contexts/AuthContext";
import type { MarketSkill } from "@/hooks/useSkillMarket";
import { format } from "date-fns";

interface SkillDetailModalProps {
  skill: MarketSkill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SkillDetailModal({ skill, open, onOpenChange }: SkillDetailModalProps) {
  const { user } = useAuth();
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const { data: ratings = [] } = useSkillRatings(skill?.id || "");
  const { data: myRating } = useMySkillRating(skill?.id || "");
  const { data: isInstalled } = useIsSkillInstalled(skill?.id || "");
  const installSkill = useInstallSkill();
  const submitRating = useSubmitRating();

  if (!skill) return null;

  const handleInstall = async () => {
    await installSkill.mutateAsync(skill.id);
  };

  const handleSubmitRating = async () => {
    await submitRating.mutateAsync({
      skillId: skill.id,
      rating: ratingValue,
      review: reviewText || undefined,
    });
    setShowRatingForm(false);
    setReviewText("");
  };

  const formatPrice = (price: number | null, isFree: boolean | null) => {
    if (isFree || !price || price === 0) return "免费";
    return `¥${price}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Star className="h-8 w-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-xl">{skill.name}</DialogTitle>
                {skill.is_verified && (
                  <BadgeCheck className="h-5 w-5 text-primary" />
                )}
                {skill.is_featured && (
                  <Badge className="bg-primary/20 text-primary">精选</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {skill.description || "暂无描述"}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  {skill.rating || 0} ({skill.ratings_count || 0} 评价)
                </span>
                <span className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  {skill.downloads_count || 0} 次安装
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  v{skill.version}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* 标签 */}
            {skill.tags && skill.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {skill.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* 权限 */}
            <div>
              <h4 className="font-medium mb-2">所需权限</h4>
              <div className="flex flex-wrap gap-2">
                {skill.permissions.map((perm) => (
                  <Badge key={perm} variant="outline">
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            {/* 评价区域 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  用户评价
                </h4>
                {user && isInstalled && !myRating && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRatingForm(true)}
                  >
                    写评价
                  </Button>
                )}
              </div>

              {/* 评分表单 */}
              {showRatingForm && (
                <div className="p-4 border rounded-lg mb-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">评分：</span>
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => setRatingValue(val)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={cn(
                            "h-6 w-6 transition-colors",
                            val <= ratingValue
                              ? "fill-primary text-primary"
                              : "text-muted-foreground"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    placeholder="写下你的使用体验..."
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleSubmitRating}
                      disabled={submitRating.isPending}
                    >
                      提交评价
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowRatingForm(false)}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}

              {/* 评价列表 */}
              {ratings.length > 0 ? (
                <div className="space-y-3">
                  {ratings.slice(0, 5).map((r) => (
                    <div key={r.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">用户</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <Star
                              key={val}
                              className={cn(
                                "h-3 w-3",
                                val <= r.rating
                                  ? "fill-primary text-primary"
                                  : "text-muted-foreground/30"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(r.created_at), "yyyy-MM-dd")}
                        </span>
                      </div>
                      {r.review && (
                        <p className="text-sm text-muted-foreground">{r.review}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  暂无评价
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        <Separator />

        {/* 底部操作栏 */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-lg font-semibold">
            {formatPrice(skill.price, skill.is_free)}
          </div>
          <Button
            size="lg"
            disabled={isInstalled || installSkill.isPending}
            onClick={handleInstall}
            className="gap-2"
          >
            {isInstalled ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                已安装
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                安装
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
