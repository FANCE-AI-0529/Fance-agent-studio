import { Package, Download, Star, ChevronRight } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SkillBundle } from "@/hooks/useSkillBundles";

interface SkillBundleCardProps {
  bundle: SkillBundle;
  onView?: () => void;
  onInstall?: () => void;
  isInstalling?: boolean;
}

export function SkillBundleCard({
  bundle,
  onView,
  onInstall,
  isInstalling,
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

  return (
    <Card className="group hover:shadow-md transition-all overflow-hidden">
      {/* 封面图 */}
      {bundle.cover_image ? (
        <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
          <img
            src={bundle.cover_image}
            alt={bundle.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <Package className="h-12 w-12 text-primary/40" />
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
            bundle.is_free ? "text-status-executing" : "text-primary"
          )}
        >
          {formatPrice(bundle.price, bundle.is_free)}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onView} className="gap-1">
            查看详情
            <ChevronRight className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            onClick={onInstall}
            disabled={isInstalling}
          >
            <Download className="h-3 w-3 mr-1" />
            安装全部
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
