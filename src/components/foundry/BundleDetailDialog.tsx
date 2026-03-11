import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog.tsx";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar.tsx";
import { 
  Package, 
  Download, 
  Star, 
  User,
  Loader2,
  CreditCard,
  Check,
  ShoppingCart
} from "lucide-react";
import { supabase } from "../../integrations/supabase/client.ts";
import { useInstallBundle } from "../../hooks/useSkillBundleInstall.ts";
import { useIsBundlePurchased, useBundleCheckout, useVerifyPurchase } from "../../hooks/useBundlePurchase.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";
import type { SkillBundle } from "../../hooks/useSkillBundles.ts";
import { cn } from "../../lib/utils.ts";

interface BundleDetailDialogProps {
  bundle: SkillBundle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BundleDetailDialog({
  bundle,
  open,
  onOpenChange,
}: BundleDetailDialogProps) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const installBundle = useInstallBundle();
  const checkout = useBundleCheckout();
  const verifyPurchase = useVerifyPurchase();
  
  const { data: isPurchased = false, isLoading: checkingPurchase } = useIsBundlePurchased(bundle?.id);

  // Check for purchase success from URL params
  useEffect(() => {
    const purchaseStatus = searchParams.get("purchase");
    const purchasedBundleId = searchParams.get("bundle_id");
    
    if (purchaseStatus === "success" && purchasedBundleId && bundle?.id === purchasedBundleId) {
      verifyPurchase.mutate({ bundleId: purchasedBundleId });
      // Clean up URL params
      searchParams.delete("purchase");
      searchParams.delete("bundle_id");
      setSearchParams(searchParams);
    }
  }, [searchParams, bundle?.id]);

  // Fetch skills included in the bundle
  const { data: skills = [], isLoading: loadingSkills } = useQuery({
    queryKey: ["bundle_skills", bundle?.id],
    queryFn: async () => {
      if (!bundle?.skill_ids || bundle.skill_ids.length === 0) return [];

      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .in("id", bundle.skill_ids);

      if (error) throw error;
      return data;
    },
    enabled: !!bundle?.skill_ids && bundle.skill_ids.length > 0,
  });

  // Fetch author profile
  const { data: author } = useQuery({
    queryKey: ["profile", bundle?.author_id],
    queryFn: async () => {
      if (!bundle?.author_id) return null;

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", bundle.author_id)
        .single();

      return data;
    },
    enabled: !!bundle?.author_id,
  });

  if (!bundle) return null;

  const formatDownloads = (count: number | null) => {
    if (!count) return "0";
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const formatPrice = (price: number | null, isFree: boolean | null) => {
    if (isFree || !price || price === 0) return "免费";
    return `¥${price}`;
  };

  const isFreeBundle = bundle.is_free || !bundle.price || bundle.price === 0;
  const canInstall = isFreeBundle || isPurchased;

  const handleInstall = () => {
    if (!bundle.skill_ids || bundle.skill_ids.length === 0) return;

    installBundle.mutate({
      bundleId: bundle.id,
      skillIds: bundle.skill_ids,
    });
  };

  const handlePurchase = () => {
    if (!user) {
      globalThis.location.href = "/auth";
      return;
    }

    checkout.mutate({
      bundleId: bundle.id,
      bundleName: bundle.name,
      bundlePrice: bundle.price || 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            能力包详情
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Cover Image */}
          {bundle.cover_image ? (
            <div className="h-40 rounded-lg overflow-hidden">
              <img
                src={bundle.cover_image}
                alt={bundle.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-40 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <Package className="h-16 w-16 text-primary/40" />
            </div>
          )}

          {/* Bundle Info */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{bundle.name}</h2>
                  {bundle.is_featured && (
                    <Badge variant="secondary" className="bg-primary/20 text-primary">
                      精选
                    </Badge>
                  )}
                  {isPurchased && (
                    <Badge variant="outline" className="text-status-executing border-status-executing">
                      <Check className="h-3 w-3 mr-1" />
                      已购买
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mt-1">
                  {bundle.description || "暂无描述"}
                </p>
              </div>
              <span
                className={cn(
                  "text-xl font-bold",
                  isFreeBundle ? "text-status-executing" : "text-primary"
                )}
              >
                {formatPrice(bundle.price, bundle.is_free)}
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                {formatDownloads(bundle.downloads_count)} 次安装
              </span>
              <span className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                {bundle.skill_ids?.length || 0} 个能力
              </span>
            </div>

            {/* Author */}
            {author && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={author.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{author.display_name || "匿名用户"}</p>
                  <p className="text-xs text-muted-foreground">能力包作者</p>
                </div>
              </div>
            )}
          </div>

          {/* Skills List */}
          <div className="space-y-3">
            <h3 className="font-medium">包含的能力</h3>
            <ScrollArea className="h-48 border border-border rounded-lg">
              {loadingSkills ? (
                <div className="p-4 text-center text-muted-foreground">
                  加载中...
                </div>
              ) : skills.length > 0 ? (
                <div className="p-2 space-y-2">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Star className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{skill.name}</p>
                        {skill.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {skill.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        v{skill.version || "1.0.0"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  暂无能力信息
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          
          {canInstall ? (
            <Button
              onClick={handleInstall}
              disabled={installBundle.isPending || !bundle.skill_ids?.length}
              className="gap-2"
            >
              {installBundle.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  安装中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  安装全部 ({bundle.skill_ids?.length || 0} 个能力)
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handlePurchase}
              disabled={checkout.isPending || checkingPurchase}
              className="gap-2"
            >
              {checkout.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  立即购买 {formatPrice(bundle.price, bundle.is_free)}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
