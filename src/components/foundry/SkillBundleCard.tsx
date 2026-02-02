import { Package, Download, ChevronRight, Edit2, ShoppingCart, Check, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SkillBundle } from "@/hooks/useSkillBundles";

// Category gradient backgrounds using design tokens
const categoryGradients: Record<string, string> = {
  general: "from-muted/80 to-muted",
  development: "from-primary/20 to-primary/5",
  data: "from-primary/15 to-primary/5",
  content: "from-accent/20 to-accent/5",
  automation: "from-primary/25 to-primary/10",
  business: "from-secondary/30 to-secondary/10",
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
  const gradientClass = categoryGradients[bundle.category || "general"] || categoryGradients.general;

  return (
    <Card 
      className={cn(
        "group relative overflow-hidden rounded-xl transition-all duration-300",
        "hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5",
        "cursor-pointer"
      )}
      onClick={onView}
    >
      {/* Cover Image / Gradient Background */}
      <div className={cn(
        "relative h-28 overflow-hidden",
        !bundle.cover_image && `bg-gradient-to-br ${gradientClass}`
      )}>
        {bundle.cover_image ? (
          <img
            src={bundle.cover_image}
            alt={bundle.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="h-10 w-10 text-foreground/20" />
          </div>
        )}
        
        {/* Overlay gradient for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        
        {/* Top badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          {bundle.is_featured && (
            <Badge className="bg-primary/90 text-primary-foreground border-0 gap-1 text-[10px] px-1.5 py-0.5">
              <Star className="h-2.5 w-2.5 fill-current" />
              精选
            </Badge>
          )}
          {isPurchased && (
            <Badge className="bg-status-executing/90 text-white border-0 gap-1 text-[10px] px-1.5 py-0.5 ml-auto">
              <Check className="h-2.5 w-2.5" />
              已购买
            </Badge>
          )}
        </div>

        {/* Price tag - positioned at bottom right of cover */}
        <div className="absolute bottom-2 right-2">
          <span
            className={cn(
              "text-sm font-bold px-2 py-0.5 rounded-md backdrop-blur-sm",
              isFreeBundle 
                ? "bg-status-executing/20 text-status-executing" 
                : "bg-primary/20 text-primary"
            )}
          >
            {formatPrice(bundle.price, bundle.is_free)}
          </span>
        </div>
      </div>

      <CardContent className="p-3 space-y-2">
        {/* Title */}
        <h4 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
          {bundle.name}
        </h4>

        {/* Description - simplified */}
        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
          {bundle.description || "暂无描述"}
        </p>

        {/* Metrics row - cleaner layout */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              <span className="font-medium text-foreground">{skillCount}</span>
              <span>能力</span>
            </span>
            <span className="flex items-center gap-1">
              <Download className="h-3 w-3" />
              <span className="font-medium text-foreground">{formatDownloads(bundle.downloads_count)}</span>
            </span>
          </div>
        </div>

        {/* Action buttons - simplified */}
        <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          {onEdit && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onEdit} 
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Edit2 className="h-3 w-3 mr-1" />
              编辑
            </Button>
          )}
          <div className="flex-1" />
          <Button
            size="sm"
            className="h-7 text-xs"
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
            <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
