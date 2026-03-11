import { useEffect } from "react";
import { GitCompare, Plus, Minus, Pencil, ArrowUpDown, Package, Link2, FileJson, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs.tsx";
import { useSnapshotDiff } from "../../hooks/useSnapshotDiff.ts";
import { cn } from "../../lib/utils.ts";

interface SnapshotDiffViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromSnapshotId: string | null;
  toSnapshotId: string | null;
  agentId: string | null;
}

export function SnapshotDiffViewer({
  open,
  onOpenChange,
  fromSnapshotId,
  toSnapshotId,
  agentId,
}: SnapshotDiffViewerProps) {
  const { diff, isComparing, compareSnapshots, compareWithCurrent, clearDiff } = useSnapshotDiff();

  useEffect(() => {
    if (open && fromSnapshotId) {
      if (toSnapshotId && toSnapshotId !== "current") {
        compareSnapshots(fromSnapshotId, toSnapshotId);
      } else if (agentId) {
        compareWithCurrent(fromSnapshotId, agentId);
      }
    }
  }, [open, fromSnapshotId, toSnapshotId, agentId, compareSnapshots, compareWithCurrent]);

  useEffect(() => {
    if (!open) {
      clearDiff();
    }
  }, [open, clearDiff]);

  const getDiffTypeIcon = (type: string) => {
    switch (type) {
      case "add":
        return <Plus className="h-3 w-3 text-status-executing" />;
      case "remove":
        return <Minus className="h-3 w-3 text-destructive" />;
      case "modify":
        return <Pencil className="h-3 w-3 text-amber-500" />;
      case "upgrade":
        return <ArrowUpDown className="h-3 w-3 text-primary" />;
      case "downgrade":
        return <ArrowUpDown className="h-3 w-3 text-amber-500" />;
      default:
        return null;
    }
  };

  const getDiffTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      add: { label: "新增", className: "bg-status-executing/10 text-status-executing" },
      remove: { label: "删除", className: "bg-destructive/10 text-destructive" },
      modify: { label: "修改", className: "bg-amber-500/10 text-amber-500" },
      upgrade: { label: "升级", className: "bg-primary/10 text-primary" },
      downgrade: { label: "降级", className: "bg-amber-500/10 text-amber-500" },
    };
    const v = variants[type] || { label: type, className: "" };
    return (
      <Badge variant="outline" className={cn("text-[10px]", v.className)}>
        {v.label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-primary" />
            版本对比
          </DialogTitle>
        </DialogHeader>

        {isComparing ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">正在对比版本...</span>
          </div>
        ) : diff ? (
          <div className="flex-1 overflow-hidden">
            {/* 汇总信息 */}
            <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">总变更:</span>
                <Badge variant="secondary">{diff.summary.totalChanges}</Badge>
              </div>
              <div className="flex items-center gap-1 text-status-executing">
                <Plus className="h-3.5 w-3.5" />
                <span className="text-sm">{diff.summary.additions} 新增</span>
              </div>
              <div className="flex items-center gap-1 text-destructive">
                <Minus className="h-3.5 w-3.5" />
                <span className="text-sm">{diff.summary.deletions} 删除</span>
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                <Pencil className="h-3.5 w-3.5" />
                <span className="text-sm">{diff.summary.modifications} 修改</span>
              </div>
            </div>

            <Tabs defaultValue="nodes" className="flex-1">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="nodes" className="gap-2">
                  <Package className="h-3.5 w-3.5" />
                  节点 ({diff.nodeDiff.length})
                </TabsTrigger>
                <TabsTrigger value="edges" className="gap-2">
                  <Link2 className="h-3.5 w-3.5" />
                  连线 ({diff.edgeDiff.length})
                </TabsTrigger>
                <TabsTrigger value="skills" className="gap-2">
                  <Package className="h-3.5 w-3.5" />
                  技能 ({diff.skillDiff.length})
                </TabsTrigger>
                <TabsTrigger value="manifest" className="gap-2">
                  <FileJson className="h-3.5 w-3.5" />
                  配置 ({diff.manifestDiff.length})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[400px] mt-4">
                <TabsContent value="nodes" className="mt-0">
                  {diff.nodeDiff.length === 0 ? (
                    <EmptyDiff message="节点无变化" />
                  ) : (
                    <div className="space-y-2">
                      {diff.nodeDiff.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getDiffTypeIcon(item.type)}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{item.nodeId}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {item.nodeType}
                                </Badge>
                              </div>
                              {item.changes && item.changes.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.changes.length} 个属性变更
                                </p>
                              )}
                            </div>
                          </div>
                          {getDiffTypeBadge(item.type)}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="edges" className="mt-0">
                  {diff.edgeDiff.length === 0 ? (
                    <EmptyDiff message="连线无变化" />
                  ) : (
                    <div className="space-y-2">
                      {diff.edgeDiff.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getDiffTypeIcon(item.type)}
                            <div>
                              <span className="font-mono text-sm">
                                {item.source} → {item.target}
                              </span>
                            </div>
                          </div>
                          {getDiffTypeBadge(item.type)}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="skills" className="mt-0">
                  {diff.skillDiff.length === 0 ? (
                    <EmptyDiff message="技能无变化" />
                  ) : (
                    <div className="space-y-2">
                      {diff.skillDiff.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getDiffTypeIcon(item.type)}
                            <div>
                              <span className="font-medium text-sm">{item.skillName}</span>
                              {(item.oldVersion || item.newVersion) && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {item.oldVersion && `v${item.oldVersion}`}
                                  {item.oldVersion && item.newVersion && " → "}
                                  {item.newVersion && `v${item.newVersion}`}
                                </p>
                              )}
                            </div>
                          </div>
                          {getDiffTypeBadge(item.type)}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="manifest" className="mt-0">
                  {diff.manifestDiff.length === 0 ? (
                    <EmptyDiff message="配置无变化" />
                  ) : (
                    <div className="space-y-2">
                      {diff.manifestDiff.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-3 border rounded-lg"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {getDiffTypeIcon(item.type)}
                              <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
                                {item.path}
                              </code>
                            </div>
                            {getDiffTypeBadge(item.type)}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {item.oldValue !== undefined && (
                              <div className="bg-destructive/5 p-2 rounded border border-destructive/20">
                                <span className="text-destructive font-medium">旧值:</span>
                                <pre className="mt-1 overflow-auto max-h-20">
                                  {JSON.stringify(item.oldValue, null, 2)}
                                </pre>
                              </div>
                            )}
                            {item.newValue !== undefined && (
                              <div className="bg-status-executing/5 p-2 rounded border border-status-executing/20">
                                <span className="text-status-executing font-medium">新值:</span>
                                <pre className="mt-1 overflow-auto max-h-20">
                                  {JSON.stringify(item.newValue, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <GitCompare className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>选择两个版本进行对比</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmptyDiff({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  );
}
