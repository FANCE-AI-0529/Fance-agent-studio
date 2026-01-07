import { useState } from "react";
import { Settings2, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteKnowledgeBase, type KnowledgeBase } from "@/hooks/useKnowledgeBases";
import { useKnowledgeStore } from "@/stores/knowledgeStore";
import { DocumentUploader } from "./DocumentUploader";
import { DocumentList } from "./DocumentList";
import { ChunkPreview } from "./ChunkPreview";
import { EntityExtractionToggle } from "./EntityExtractionToggle";

interface KnowledgeBaseDetailProps {
  knowledgeBase: KnowledgeBase;
}

export function KnowledgeBaseDetail({ knowledgeBase }: KnowledgeBaseDetailProps) {
  const [activeTab, setActiveTab] = useState("documents");
  const { selectedDocumentId } = useKnowledgeStore();
  const deleteKnowledgeBase = useDeleteKnowledgeBase();
  const { setSelectedKnowledgeBase } = useKnowledgeStore();

  const handleDelete = async () => {
    await deleteKnowledgeBase.mutateAsync(knowledgeBase.id);
    setSelectedKnowledgeBase(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{knowledgeBase.name}</h2>
            {knowledgeBase.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {knowledgeBase.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {knowledgeBase.department && (
                <Badge variant="secondary">{knowledgeBase.department}</Badge>
              )}
              <span>分块大小: {knowledgeBase.chunk_size || 512} tokens</span>
              <span>重叠: {knowledgeBase.chunk_overlap || 50} tokens</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <EntityExtractionToggle knowledgeBaseId={knowledgeBase.id} />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>删除知识库</AlertDialogTitle>
                  <AlertDialogDescription>
                    确定要删除知识库 "{knowledgeBase.name}" 吗？此操作将删除所有文档和索引数据，无法恢复。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="p-4 border-b border-border">
        <DocumentUploader knowledgeBaseId={knowledgeBase.id} />
      </div>

      {/* Content Tabs */}
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-2">
              <TabsList>
                <TabsTrigger value="documents">文档列表</TabsTrigger>
                <TabsTrigger value="chunks" disabled={!selectedDocumentId}>
                  切片预览
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="documents" className="flex-1 overflow-hidden m-0 px-4 pb-4">
              <DocumentList knowledgeBaseId={knowledgeBase.id} />
            </TabsContent>
            <TabsContent value="chunks" className="flex-1 overflow-hidden m-0 px-4 pb-4">
              {selectedDocumentId && (
                <ChunkPreview documentId={selectedDocumentId} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
