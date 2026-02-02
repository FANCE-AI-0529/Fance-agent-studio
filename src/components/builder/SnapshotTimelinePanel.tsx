import { useState, useEffect } from "react";
import { History, GitCommit, Tag, RotateCcw, Eye, Calendar, ChevronDown, ChevronRight, Clock, Layers, ArrowRight, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAgentSnapshots } from "@/hooks/useAgentSnapshots";
import { useTimeTravel } from "@/hooks/useTimeTravel";
import type { TimelineSnapshot, SnapshotTriggerSource } from "@/types/gitops";
import { format, parseISO, isToday, isYesterday, startOfDay } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { SnapshotCalendarPicker } from "./SnapshotCalendarPicker";
import { SnapshotDiffViewer } from "./SnapshotDiffViewer";
import { SnapshotRestoreDialog } from "./SnapshotRestoreDialog";

interface SnapshotTimelinePanelProps {
  agentId: string | null;
  onPreviewSnapshot?: (snapshotId: string) => void;
  onRestoreComplete?: () => void;
}

const triggerSourceLabels: Record<SnapshotTriggerSource, string> = {
  manual: "手动保存",
  auto: "自动保存",
  deploy: "部署",
  rollback: "回滚",
  import: "导入",
};

const triggerSourceColors: Record<SnapshotTriggerSource, string> = {
  manual: "bg-primary/10 text-primary",
  auto: "bg-muted text-muted-foreground",
  deploy: "bg-status-executing/10 text-status-executing",
  rollback: "bg-amber-500/10 text-amber-500",
  import: "bg-cyan-500/10 text-cyan-500",
};

export function SnapshotTimelinePanel({
  agentId,
  onPreviewSnapshot,
  onRestoreComplete,
}: SnapshotTimelinePanelProps) {
  const [viewMode, setViewMode] = useState<"timeline" | "calendar">("timeline");
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [compareSnapshotId, setCompareSnapshotId] = useState<string | null>(null);
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [timeline, setTimeline] = useState<TimelineSnapshot[]>([]);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const { snapshots, isLoading, getTimeline, restoreSnapshot } = useAgentSnapshots(agentId);
  const { previewBySnapshotId, clearPreview, previewSnapshot } = useTimeTravel(agentId);

  // 加载时间线
  useEffect(() => {
    if (agentId) {
      getTimeline(100).then(setTimeline);
    }
  }, [agentId, getTimeline, snapshots]);

  // 按日期分组
  const groupedSnapshots = timeline.reduce((acc, snapshot) => {
    const date = startOfDay(parseISO(snapshot.createdAt)).toISOString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(snapshot);
    return acc;
  }, {} as Record<string, TimelineSnapshot[]>);

  const sortedDates = Object.keys(groupedSnapshots).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  // 自动展开今天
  useEffect(() => {
    if (sortedDates.length > 0) {
      setExpandedDays(new Set([sortedDates[0]]));
    }
  }, [sortedDates.length]);

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  };

  const formatDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return "今天";
    if (isYesterday(date)) return "昨天";
    return format(date, "M月d日 EEEE", { locale: zhCN });
  };

  const handlePreview = async (snapshotId: string) => {
    setSelectedSnapshotId(snapshotId);
    await previewBySnapshotId(snapshotId);
    onPreviewSnapshot?.(snapshotId);
  };

  const handleCompare = (snapshotId: string) => {
    if (!selectedSnapshotId) {
      setSelectedSnapshotId(snapshotId);
    } else if (selectedSnapshotId !== snapshotId) {
      setCompareSnapshotId(snapshotId);
      setShowDiffViewer(true);
    }
  };

  const handleRestore = (snapshotId: string) => {
    setSelectedSnapshotId(snapshotId);
    setShowRestoreDialog(true);
  };

  const handleRestoreConfirm = async () => {
    if (!selectedSnapshotId) return;
    await restoreSnapshot.mutateAsync(selectedSnapshotId);
    setShowRestoreDialog(false);
    onRestoreComplete?.();
  };

  const handleDateSelect = async (date: Date) => {
    // 展开选中日期
    const dateStr = startOfDay(date).toISOString();
    setExpandedDays(new Set([dateStr]));
    setViewMode("timeline");
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            版本历史
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" />
              版本历史
              <Badge variant="secondary" className="text-[10px]">
                {timeline.length}
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "timeline" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setViewMode("timeline")}
                  >
                    <Layers className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>时间线视图</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "calendar" ? "secondary" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setViewMode("calendar")}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>日历视图</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          {viewMode === "calendar" ? (
            <div className="p-4">
              <SnapshotCalendarPicker
                agentId={agentId}
                onDateSelect={handleDateSelect}
              />
            </div>
          ) : (
            <ScrollArea className="h-full px-4 pb-4">
              {timeline.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GitCommit className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无版本记录</p>
                  <p className="text-xs mt-1">保存修改后将自动创建版本</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedDates.map((dateStr) => (
                    <Collapsible
                      key={dateStr}
                      open={expandedDays.has(dateStr)}
                      onOpenChange={() => toggleDay(dateStr)}
                    >
                      <CollapsibleTrigger asChild>
                        <button className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
                          {expandedDays.has(dateStr) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium text-sm">
                            {formatDateLabel(dateStr)}
                          </span>
                          <Badge variant="outline" className="text-[10px] ml-auto">
                            {groupedSnapshots[dateStr].length} 个版本
                          </Badge>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="relative ml-4 pl-4 border-l-2 border-border space-y-3 py-2">
                          {groupedSnapshots[dateStr].map((snapshot, idx) => (
                            <div
                              key={snapshot.id}
                              className={cn(
                                "relative group",
                                selectedSnapshotId === snapshot.id && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg"
                              )}
                            >
                              {/* 时间线节点 */}
                              <div className="absolute -left-[21px] top-3 w-3 h-3 rounded-full bg-background border-2 border-primary" />
                              
                              <div className="bg-card border rounded-lg p-3 hover:shadow-sm transition-shadow">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    {/* 提交信息 */}
                                    <div className="flex items-center gap-2 mb-1">
                                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                        {snapshot.commitHash}
                                      </code>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          "text-[10px]",
                                          triggerSourceColors[snapshot.triggerSource]
                                        )}
                                      >
                                        {triggerSourceLabels[snapshot.triggerSource]}
                                      </Badge>
                                    </div>
                                    
                                    <p className="text-sm truncate">
                                      {snapshot.commitMessage}
                                    </p>
                                    
                                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {format(parseISO(snapshot.createdAt), "HH:mm:ss")}
                                      </span>
                                      
                                      {snapshot.changeStats && (
                                        <span className="flex items-center gap-1">
                                          <span className="text-status-executing">
                                            +{snapshot.changeStats.nodesAdded || 0}
                                          </span>
                                          <span className="text-destructive">
                                            -{snapshot.changeStats.nodesRemoved || 0}
                                          </span>
                                        </span>
                                      )}
                                    </div>

                                    {/* 标签 */}
                                    {snapshot.tags && snapshot.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {snapshot.tags.map((tag) => (
                                          <Badge
                                            key={tag.id}
                                            variant="secondary"
                                            className="text-[10px]"
                                            style={{ 
                                              backgroundColor: `${tag.color}20`,
                                              color: tag.color,
                                              borderColor: `${tag.color}40`,
                                            }}
                                          >
                                            <Tag className="h-2.5 w-2.5 mr-1" />
                                            {tag.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* 操作按钮 */}
                                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handlePreview(snapshot.id)}
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>预览此版本</TooltipContent>
                                    </Tooltip>
                                    
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => handleCompare(snapshot.id)}
                                        >
                                          <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>对比版本</TooltipContent>
                                    </Tooltip>
                                    
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-amber-500 hover:text-amber-600"
                                          onClick={() => handleRestore(snapshot.id)}
                                        >
                                          <RotateCcw className="h-3.5 w-3.5" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>恢复到此版本</TooltipContent>
                                    </Tooltip>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </ScrollArea>
          )}
        </CardContent>

        {/* 预览提示 */}
        {previewSnapshot && (
          <div className="border-t p-3 bg-amber-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-amber-500" />
                <span>正在预览版本</span>
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  {previewSnapshot.commitHash}
                </code>
              </div>
              <Button variant="ghost" size="sm" onClick={clearPreview}>
                退出预览
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Diff 查看器 */}
      <SnapshotDiffViewer
        open={showDiffViewer}
        onOpenChange={setShowDiffViewer}
        fromSnapshotId={selectedSnapshotId}
        toSnapshotId={compareSnapshotId}
        agentId={agentId}
      />

      {/* 恢复确认对话框 */}
      <SnapshotRestoreDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        snapshotId={selectedSnapshotId}
        agentId={agentId}
        onConfirm={handleRestoreConfirm}
        isRestoring={restoreSnapshot.isPending}
      />
    </>
  );
}
