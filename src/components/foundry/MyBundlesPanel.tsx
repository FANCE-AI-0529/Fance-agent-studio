import { useState } from "react";
import { 
  Package, 
  Edit2, 
  Trash2, 
  Download, 
  MoreVertical,
  Loader2,
  Plus,
  Eye
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { Card, CardContent, CardHeader } from "../ui/card.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog.tsx";
import { useMyBundles, useDeleteBundle, SkillBundle } from "../../hooks/useSkillBundles.ts";
import { CreateBundleDialog } from "./CreateBundleDialog.tsx";
import { EditBundleDialog } from "./EditBundleDialog.tsx";
import { BundleDetailDialog } from "./BundleDetailDialog.tsx";
import { BUNDLE_CATEGORIES, BundleCategory } from "./BundleCategoryFilter.tsx";

export function MyBundlesPanel() {
  const { data: bundles = [], isLoading } = useMyBundles();
  const deleteBundle = useDeleteBundle();
  
  const [showCreate, setShowCreate] = useState(false);
  const [editBundle, setEditBundle] = useState<SkillBundle | null>(null);
  const [viewBundle, setViewBundle] = useState<SkillBundle | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = () => {
    if (deleteId) {
      deleteBundle.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const formatDownloads = (count: number | null) => {
    if (!count) return "0";
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  const totalDownloads = bundles.reduce(
    (sum, b) => sum + (b.downloads_count || 0),
    0
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{bundles.length}</div>
            <div className="text-sm text-muted-foreground">能力包数量</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatDownloads(totalDownloads)}</div>
            <div className="text-sm text-muted-foreground">总下载量</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {bundles.filter((b) => b.is_featured).length}
            </div>
            <div className="text-sm text-muted-foreground">精选推荐</div>
          </CardContent>
        </Card>
      </div>

      {/* 头部 */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">我的能力包</h3>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          创建能力包
        </Button>
      </div>

      {/* 能力包列表 */}
      {bundles.length > 0 ? (
        <div className="space-y-3">
          {bundles.map((bundle) => {
            const categoryInfo = BUNDLE_CATEGORIES[
              (bundle.category as BundleCategory) || "general"
            ];
            const CategoryIcon = categoryInfo?.icon;

            return (
              <Card key={bundle.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    {/* 左侧信息 */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* 封面 */}
                      {bundle.cover_image ? (
                        <img
                          src={bundle.cover_image}
                          alt={bundle.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="h-6 w-6 text-primary/60" />
                        </div>
                      )}

                      {/* 信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold truncate">{bundle.name}</h4>
                          {bundle.is_featured && (
                            <Badge variant="secondary" className="text-xs">
                              精选
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {bundle.description || "暂无描述"}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {bundle.skill_ids?.length || 0} 个能力
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {formatDownloads(bundle.downloads_count)}
                          </span>
                          {CategoryIcon && (
                            <span className="flex items-center gap-1">
                              <CategoryIcon className="h-3 w-3" />
                              {categoryInfo.label}
                            </span>
                          )}
                          <Badge
                            variant={bundle.is_free ? "outline" : "secondary"}
                            className="text-xs"
                          >
                            {bundle.is_free ? "免费" : `¥${bundle.price}`}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* 右侧操作 */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewBundle(bundle)}>
                          <Eye className="h-4 w-4 mr-2" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setEditBundle(bundle)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          编辑
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteId(bundle.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">你还没有创建能力包</p>
          <p className="text-sm text-muted-foreground mt-1">
            将多个相关能力打包，方便用户一键安装
          </p>
          <Button
            onClick={() => setShowCreate(true)}
            variant="outline"
            className="mt-4 gap-2"
          >
            <Plus className="h-4 w-4" />
            创建第一个能力包
          </Button>
        </div>
      )}

      {/* 创建对话框 */}
      <CreateBundleDialog open={showCreate} onOpenChange={setShowCreate} />

      {/* 编辑对话框 */}
      <EditBundleDialog
        bundle={editBundle}
        open={!!editBundle}
        onOpenChange={(open) => !open && setEditBundle(null)}
      />

      {/* 查看详情对话框 */}
      <BundleDetailDialog
        bundle={viewBundle}
        open={!!viewBundle}
        onOpenChange={(open) => !open && setViewBundle(null)}
      />

      {/* 删除确认 */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复，确定要删除这个能力包吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteBundle.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
