import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  History,
  RotateCcw,
  Trash2,
  Clock,
  ChevronRight,
  Save,
  Eye,
  Loader2,
  FileText,
  GitBranch,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  useTemplateVersions,
  useCreateTemplateVersion,
  useRestoreTemplateVersion,
  useDeleteTemplateVersion,
  type TemplateVersion,
} from "@/hooks/useTemplateVersions";
import type { CustomTemplate } from "@/hooks/useCustomTemplates";

interface TemplateVersionHistoryProps {
  template: CustomTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateVersionHistory({
  template,
  open,
  onOpenChange,
}: TemplateVersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<TemplateVersion | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");

  const { data: versions = [], isLoading } = useTemplateVersions(template?.id || null);
  const createVersion = useCreateTemplateVersion();
  const restoreVersion = useRestoreTemplateVersion();
  const deleteVersion = useDeleteTemplateVersion();

  const handleSaveVersion = async () => {
    if (!template) return;
    await createVersion.mutateAsync({
      templateId: template.id,
      changeSummary: changeSummary || undefined,
    });
    setShowSaveDialog(false);
    setChangeSummary("");
  };

  const handleRestoreVersion = async () => {
    if (!template || !selectedVersion) return;
    await restoreVersion.mutateAsync({
      templateId: template.id,
      version: selectedVersion,
    });
    setShowRestoreConfirm(false);
    setSelectedVersion(null);
  };

  const handleDeleteVersion = async () => {
    if (!template || !selectedVersion) return;
    await deleteVersion.mutateAsync({
      templateId: template.id,
      versionId: selectedVersion.id,
    });
    setShowDeleteConfirm(false);
    setSelectedVersion(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              模板版本历史
            </DialogTitle>
            <DialogDescription>
              {template?.name} - 查看和管理模板的历史版本
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-4 h-[500px]">
            {/* Version List */}
            <div className="w-1/3 border rounded-lg overflow-hidden flex flex-col">
              <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
                <span className="text-sm font-medium">版本列表</span>
                <Button
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={createVersion.isPending}
                >
                  <Save className="h-4 w-4 mr-1" />
                  保存当前版本
                </Button>
              </div>

              <ScrollArea className="flex-1">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : versions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <GitBranch className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm">暂无历史版本</p>
                    <p className="text-xs">编辑模板后会自动保存版本</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-2">
                    {versions.map((version, index) => (
                      <Card
                        key={version.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-muted/50",
                          selectedVersion?.id === version.id && "border-primary bg-primary/5"
                        )}
                        onClick={() => setSelectedVersion(version)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                v{version.version_number}
                              </Badge>
                              {index === 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  最新
                                </Badge>
                              )}
                            </div>
                            <ChevronRight
                              className={cn(
                                "h-4 w-4 text-muted-foreground transition-transform",
                                selectedVersion?.id === version.id && "rotate-90"
                              )}
                            />
                          </div>
                          <p className="text-sm font-medium truncate">{version.name}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(version.created_at), "MM-dd HH:mm", { locale: zhCN })}
                          </div>
                          {version.change_summary && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {version.change_summary}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Version Details */}
            <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
              {selectedVersion ? (
                <>
                  <div className="p-3 border-b bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">版本 {selectedVersion.version_number}</h3>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(selectedVersion.created_at), "yyyy年M月d日 HH:mm:ss", { locale: zhCN })}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPreview(true)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          预览
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowRestoreConfirm(true)}
                          disabled={restoreVersion.isPending}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          恢复
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setShowDeleteConfirm(true)}
                          disabled={deleteVersion.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">模板名称</Label>
                        <p className="font-medium">{selectedVersion.name}</p>
                      </div>

                      {selectedVersion.description && (
                        <div>
                          <Label className="text-xs text-muted-foreground">描述</Label>
                          <p className="text-sm">{selectedVersion.description}</p>
                        </div>
                      )}

                      {selectedVersion.change_summary && (
                        <div>
                          <Label className="text-xs text-muted-foreground">变更说明</Label>
                          <p className="text-sm">{selectedVersion.change_summary}</p>
                        </div>
                      )}

                      <div className="flex gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">分类</Label>
                          <Badge variant="outline" className="mt-1">
                            {selectedVersion.category}
                          </Badge>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">步骤数</Label>
                          <p className="text-sm font-medium">{selectedVersion.steps.length} 步</p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">步骤列表</Label>
                        <div className="space-y-2">
                          {selectedVersion.steps.map((step, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-3 p-2 bg-muted/50 rounded-lg"
                            >
                              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{step.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {step.description}
                                </p>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {step.taskType}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <FileText className="h-12 w-12 mb-3 opacity-50" />
                  <p>选择一个版本查看详情</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Version Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>保存当前版本</DialogTitle>
            <DialogDescription>
              将模板的当前状态保存为一个新版本
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>变更说明（可选）</Label>
              <Input
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="描述此版本的变更内容..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              取消
            </Button>
            <Button onClick={handleSaveVersion} disabled={createVersion.isPending}>
              {createVersion.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              保存版本
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              版本预览 - v{selectedVersion?.version_number}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">名称</Label>
                  <p className="font-medium">{selectedVersion?.name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">分类</Label>
                  <p>{selectedVersion?.category}</p>
                </div>
              </div>
              {selectedVersion?.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">描述</Label>
                  <p className="text-sm">{selectedVersion?.description}</p>
                </div>
              )}
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">
                  步骤详情 ({selectedVersion?.steps.length} 步)
                </Label>
                <div className="space-y-3">
                  {selectedVersion?.steps.map((step, index) => (
                    <Card key={index}>
                      <CardHeader className="py-2 px-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs">
                            {index + 1}
                          </span>
                          {step.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="py-2 px-3 pt-0">
                        <p className="text-xs text-muted-foreground mb-2">{step.description}</p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge variant="outline">类型: {step.taskType}</Badge>
                          {step.outputKey && (
                            <Badge variant="secondary">输出: {step.outputKey}</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation */}
      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认恢复版本</AlertDialogTitle>
            <AlertDialogDescription>
              将模板恢复到版本 {selectedVersion?.version_number}？当前版本将被自动保存到历史记录中。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreVersion}>
              确认恢复
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除版本</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除版本 {selectedVersion?.version_number} 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVersion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
