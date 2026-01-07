import { useState } from "react";
import { Database, Plus, FileText, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useKnowledgeBases } from "@/hooks/useKnowledgeBases";
import { useKnowledgeStore } from "@/stores/knowledgeStore";
import { KnowledgeBaseList } from "./KnowledgeBaseList";
import { KnowledgeBaseDetail } from "./KnowledgeBaseDetail";
import { CreateKnowledgeBaseDialog } from "./CreateKnowledgeBaseDialog";
import { EmptyState } from "@/components/ui/empty-state";

export function KnowledgeManager() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: knowledgeBases = [], isLoading } = useKnowledgeBases();
  const { selectedKnowledgeBaseId, setSelectedKnowledgeBase } = useKnowledgeStore();

  const selectedKnowledgeBase = knowledgeBases.find(
    (kb) => kb.id === selectedKnowledgeBaseId
  );

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

      <CreateKnowledgeBaseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
