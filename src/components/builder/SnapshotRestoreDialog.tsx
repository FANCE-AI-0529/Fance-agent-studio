import { useEffect, useState } from "react";
import { RotateCcw, AlertTriangle, GitCommit, Clock, Loader2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAgentSnapshots } from "@/hooks/useAgentSnapshots";
import { format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { AgentSnapshot } from "@/types/gitops";

interface SnapshotRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string | null;
  agentId: string | null;
  onConfirm: () => Promise<void>;
  isRestoring: boolean;
}

export function SnapshotRestoreDialog({
  open,
  onOpenChange,
  snapshotId,
  agentId,
  onConfirm,
  isRestoring,
}: SnapshotRestoreDialogProps) {
  const [snapshot, setSnapshot] = useState<AgentSnapshot | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const { getSnapshot } = useAgentSnapshots(agentId);

  useEffect(() => {
    if (open && snapshotId) {
      getSnapshot(snapshotId).then(setSnapshot);
      setConfirmed(false);
    }
  }, [open, snapshotId, getSnapshot]);

  const handleConfirm = async () => {
    if (!confirmed) return;
    await onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-amber-500" />
            恢复到历史版本
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                此操作将把智能体恢复到选定的历史版本。当前状态将自动保存为备份。
              </p>

              {snapshot && (
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <GitCommit className="h-4 w-4 text-primary" />
                    <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                      {snapshot.commitHash}
                    </code>
                  </div>
                  <p className="text-sm">{snapshot.commitMessage}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(snapshot.createdAt), "yyyy年M月d日 HH:mm:ss", {
                      locale: zhCN,
                    })}
                  </div>
                  {snapshot.changeStats && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {snapshot.graphData.nodes.length} 个节点
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {snapshot.graphData.edges.length} 条连线
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {snapshot.mountedSkills.length} 个技能
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-start gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-600 dark:text-amber-400">
                    请注意
                  </p>
                  <p className="text-muted-foreground mt-1">
                    恢复操作会覆盖当前画布上的所有节点和配置。系统会自动创建当前状态的备份快照。
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirm"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked === true)}
                />
                <Label htmlFor="confirm" className="text-sm">
                  我已了解此操作的影响，确认恢复
                </Label>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRestoring}>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!confirmed || isRestoring}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isRestoring ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                恢复中...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                确认恢复
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
