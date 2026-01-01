import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  History,
  RotateCcw,
  GitBranch,
  Clock,
  FileText,
  ChevronRight,
  Loader2,
  ArrowRight,
  Check,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  useSkillVersions,
  useRollbackSkill,
  compareVersions,
  SkillVersion,
} from "@/hooks/useSkillVersions";

interface SkillVersionHistoryProps {
  skillId: string | null;
  skillName?: string;
  currentContent?: string;
}

export function SkillVersionHistory({
  skillId,
  skillName,
  currentContent,
}: SkillVersionHistoryProps) {
  const [open, setOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<SkillVersion | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareVersion, setCompareVersion] = useState<SkillVersion | null>(null);

  const { data: versions = [], isLoading } = useSkillVersions(skillId);
  const rollbackMutation = useRollbackSkill();

  const handleRollback = async (version: SkillVersion) => {
    if (!skillId) return;
    await rollbackMutation.mutateAsync({
      skillId,
      versionId: version.id,
    });
    setOpen(false);
  };

  const getChangeTypeIcon = (type: string) => {
    switch (type) {
      case "create":
        return <FileText className="h-3.5 w-3.5 text-status-executing" />;
      case "publish":
        return <Check className="h-3.5 w-3.5 text-status-executing" />;
      case "rollback":
        return <RotateCcw className="h-3.5 w-3.5 text-status-confirm" />;
      default:
        return <GitBranch className="h-3.5 w-3.5 text-primary" />;
    }
  };

  const getChangeTypeBadge = (type: string) => {
    switch (type) {
      case "create":
        return { label: "创建", variant: "default" as const };
      case "publish":
        return { label: "发布", variant: "default" as const };
      case "rollback":
        return { label: "回滚", variant: "secondary" as const };
      default:
        return { label: "更新", variant: "outline" as const };
    }
  };

  const comparison = compareMode && selectedVersion && compareVersion
    ? compareVersions(selectedVersion, compareVersion)
    : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          disabled={!skillId}
        >
          <History className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">版本历史</span>
          {versions.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              {versions.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            版本历史
          </DialogTitle>
          <DialogDescription>
            {skillName ? `「${skillName}」的` : ""}版本历史记录，可查看变更或回滚到之前版本
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-4 min-h-0 mt-4">
          {/* Version List */}
          <div className="w-1/2 border rounded-lg overflow-hidden">
            <div className="p-3 border-b bg-secondary/30 flex items-center justify-between">
              <span className="text-sm font-medium">所有版本</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => {
                  setCompareMode(!compareMode);
                  setCompareVersion(null);
                }}
              >
                {compareMode ? "退出对比" : "版本对比"}
              </Button>
            </div>
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : versions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <History className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">暂无版本历史</p>
                  <p className="text-xs mt-1">保存技能后将自动记录版本</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {versions.map((version, idx) => {
                    const badge = getChangeTypeBadge(version.change_type);
                    const isSelected = selectedVersion?.id === version.id;
                    const isCompare = compareVersion?.id === version.id;
                    
                    return (
                      <div
                        key={version.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : isCompare
                            ? "border-status-confirm bg-status-confirm/5"
                            : "border-transparent hover:bg-secondary/50"
                        )}
                        onClick={() => {
                          if (compareMode && selectedVersion) {
                            setCompareVersion(version);
                          } else {
                            setSelectedVersion(version);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {getChangeTypeIcon(version.change_type)}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  v{version.version_number}
                                </span>
                                <Badge variant={badge.variant} className="text-[10px] h-4 px-1">
                                  {badge.label}
                                </Badge>
                                {idx === 0 && (
                                  <Badge variant="secondary" className="text-[10px] h-4 px-1">
                                    最新
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(version.created_at), {
                                  addSuffix: true,
                                  locale: zhCN,
                                })}
                              </div>
                            </div>
                          </div>
                          {isSelected && !compareMode && (
                            <ChevronRight className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        {version.change_summary && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {version.change_summary}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Version Details / Compare */}
          <div className="w-1/2 border rounded-lg overflow-hidden">
            <div className="p-3 border-b bg-secondary/30">
              <span className="text-sm font-medium">
                {compareMode ? "版本对比" : "版本详情"}
              </span>
            </div>
            <ScrollArea className="h-[400px]">
              {compareMode ? (
                comparison ? (
                  <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">v{selectedVersion?.version_number}</Badge>
                      <ArrowRight className="h-4 w-4" />
                      <Badge variant="outline">v{compareVersion?.version_number}</Badge>
                    </div>
                    
                    {comparison.changes.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        <Check className="h-6 w-6 mx-auto mb-2 text-status-executing" />
                        <p className="text-sm">两个版本内容相同</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">变更内容:</p>
                        {comparison.changes.map((change, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-2 rounded bg-status-confirm/10 text-sm"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 text-status-confirm" />
                            {change}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <GitBranch className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">选择两个版本进行对比</p>
                    <p className="text-xs mt-1">先选择基准版本，再选择对比版本</p>
                  </div>
                )
              ) : selectedVersion ? (
                <div className="p-4 space-y-4">
                  {/* Version Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">版本</span>
                      <span className="text-sm font-medium">{selectedVersion.version}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">版本号</span>
                      <span className="text-sm">#{selectedVersion.version_number}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">创建时间</span>
                      <span className="text-sm">
                        {new Date(selectedVersion.created_at).toLocaleString("zh-CN")}
                      </span>
                    </div>
                  </div>

                  {/* Metadata */}
                  {selectedVersion.metadata && (
                    <div className="border-t pt-4 space-y-2">
                      <span className="text-xs text-muted-foreground">元数据快照</span>
                      <div className="p-2 rounded bg-secondary/30 text-xs space-y-1">
                        <div>名称: {selectedVersion.metadata.name || "-"}</div>
                        <div>描述: {selectedVersion.metadata.description || "-"}</div>
                        <div>
                          权限: {selectedVersion.metadata.permissions?.join(", ") || "-"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Content Preview */}
                  <div className="border-t pt-4">
                    <span className="text-xs text-muted-foreground">内容预览</span>
                    <pre className="mt-2 p-3 rounded bg-muted/30 text-xs overflow-x-auto max-h-[150px]">
                      {selectedVersion.content.substring(0, 500)}
                      {selectedVersion.content.length > 500 && "..."}
                    </pre>
                  </div>

                  {/* Rollback Button */}
                  {versions[0]?.id !== selectedVersion.id && (
                    <Button
                      className="w-full gap-2"
                      onClick={() => handleRollback(selectedVersion)}
                      disabled={rollbackMutation.isPending}
                    >
                      {rollbackMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                      回滚到此版本
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">选择版本查看详情</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
