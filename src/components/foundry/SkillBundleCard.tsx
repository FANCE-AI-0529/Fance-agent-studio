import { Package, Download, ChevronRight, Edit2, ShoppingCart, Check } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SkillBundle } from "@/hooks/useSkillBundles";

// Category color mapping using design tokens
const categoryColors: Record<string, string> = {
  general: "bg-muted",
  development: "bg-primary/10",
  data: "bg-primary/10",
  content: "bg-primary/10",
  automation: "bg-primary/10",
  business: "bg-primary/10",
};

interface SkillBundleCardProps {
  bundle: SkillBundle;
  onView?: () => void;
  onInstall?: () => void;
  isInstalling?: boolean;
  onEdit?: () => void;
  isPurchased?: boolean;
}

export function SkillBundleCard({
  bundle,
  onView,
  onInstall,
  isInstalling,
  onEdit,
  isPurchased,
}: SkillBundleCardProps) {
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

  const skillCount = bundle.skill_ids?.length || 0;
  const isFreeBundle = bundle.is_free || !bundle.price || bundle.price === 0;
  const colorClass = categoryColors[bundle.category || "general"] || categoryColors.general;

  return (
    <Card className="group hover:border-primary/50 hover:shadow-lg transition-all overflow-hidden rounded-xl">
      {/* 封面图 */}
      {bundle.cover_image ? (
        <div className="h-32 bg-muted flex items-center justify-center overflow-hidden relative">
          <img
            src={bundle.cover_image}
            alt={bundle.name}
            className="w-full h-full object-cover"
          />
          {isPurchased && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-status-executing/90 text-white border-0 gap-1">
                <Check className="h-3 w-3" />
                已购买
              </Badge>
            </div>
          )}
        </div>
      ) : (
        <div className={cn("h-32 flex items-center justify-center relative", colorClass)}>
          <Package className="h-12 w-12 text-foreground/30" />
          {isPurchased && (
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="bg-status-executing/90 text-white border-0 gap-1">
                <Check className="h-3 w-3" />
                已购买
              </Badge>
            </div>
          )}
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold truncate">{bundle.name}</h4>
              {bundle.is_featured && (
                <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
                  精选
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {bundle.description || "暂无描述"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="gap-1">
            <Package className="h-3 w-3" />
            {skillCount} 个能力
          </Badge>
          <span className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            {formatDownloads(bundle.downloads_count)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-2 flex items-center justify-between">
        <span
          className={cn(
            "font-medium",
            isFreeBundle ? "text-status-executing" : "text-primary"
          )}
        >
          {formatPrice(bundle.price, bundle.is_free)}
        </span>
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit} className="gap-1">
              <Edit2 className="h-3 w-3" />
              编辑
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onView} className="gap-1">
            查看详情
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            onClick={onView}
            disabled={isInstalling}
          >
            {isFreeBundle || isPurchased ? (
              <>
                <Download className="h-3 w-3 mr-1" />
                安装
              </>
            ) : (
              <>
                <ShoppingCart className="h-3 w-3 mr-1" />
                购买
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
