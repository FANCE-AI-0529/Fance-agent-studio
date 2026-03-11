import { useState } from "react";
import { Database, Plus, Loader2 } from "lucide-react";
import { Button } from "../ui/button.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
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
import { useKnowledgeBases, useDeleteKnowledgeBase, type KnowledgeBase } from "../../hooks/useKnowledgeBases.ts";
import { useKnowledgeStore } from "../../stores/knowledgeStore.ts";
import { KnowledgeBaseList } from "./KnowledgeBaseList.tsx";
import { KnowledgeBaseDetail } from "./KnowledgeBaseDetail.tsx";
import { CreateKnowledgeBaseDialog } from "./CreateKnowledgeBaseDialog.tsx";
import { EditKnowledgeBaseDialog } from "./EditKnowledgeBaseDialog.tsx";
import { EmptyState } from "../ui/empty-state.tsx";

export function KnowledgeManager() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editTarget, setEditTarget] = useState<KnowledgeBase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBase | null>(null);
  const { data: knowledgeBases = [], isLoading } = useKnowledgeBases();
  const { selectedKnowledgeBaseId, setSelectedKnowledgeBase } = useKnowledgeStore();
  const deleteKnowledgeBase = useDeleteKnowledgeBase();

  const selectedKnowledgeBase = knowledgeBases.find(
    (kb) => kb.id === selectedKnowledgeBaseId
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteKnowledgeBase.mutateAsync(deleteTarget.id);
      if (selectedKnowledgeBaseId === deleteTarget.id) {
        setSelectedKnowledgeBase(null);
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="h-full flex">
      {/* Left Sidebar - Knowledge Base List */}
      <div className="w-72 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Database className="h-4 w-4" />
              知识库
            </h2>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              新建
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            管理文档、构建知识索引
          </p>
        </div>

        <ScrollArea className="flex-1">
          <KnowledgeBaseList
            knowledgeBases={knowledgeBases}
            isLoading={isLoading}
            selectedId={selectedKnowledgeBaseId}
            onSelect={setSelectedKnowledgeBase}
            onEdit={setEditTarget}
            onDelete={setDeleteTarget}
          />
        </ScrollArea>
      </div>

      {/* Right Content - Knowledge Base Detail */}
      <div className="flex-1 overflow-hidden">
        {selectedKnowledgeBase ? (
          <KnowledgeBaseDetail knowledgeBase={selectedKnowledgeBase} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <EmptyState
              icon={Database}
              title="选择或创建知识库"
              description="从左侧选择一个知识库，或创建新的知识库开始管理文档"
              action={{
                label: "创建知识库",
                onClick: () => setShowCreateDialog(true),
              }}
            />
          </div>
        )}
      </div>

      {/* Dialogs - rendered at top level to avoid portal conflicts */}
      <CreateKnowledgeBaseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <EditKnowledgeBaseDialog
        knowledgeBase={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除知识库</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除知识库 "{deleteTarget?.name}" 吗？此操作将删除所有文档和索引数据，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteKnowledgeBase.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteKnowledgeBase.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  删除中...
                </>
              ) : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
