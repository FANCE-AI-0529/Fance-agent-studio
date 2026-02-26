import { useState } from "react";
import { motion } from "framer-motion";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Upload, 
  Database, 
  FileText,
  Network,
  Trash2,
  MoreVertical,
  Eye,
  Settings,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { CreateKnowledgeBaseDialog } from "@/components/knowledge/CreateKnowledgeBaseDialog";
import { EditKnowledgeBaseDialog } from "@/components/knowledge/EditKnowledgeBaseDialog";
import { KnowledgeBaseDetail } from "@/components/knowledge/KnowledgeBaseDetail";
import { useKnowledgeBases, useDeleteKnowledgeBase, type KnowledgeBase } from "@/hooks/useKnowledgeBases";
import { cn } from "@/lib/utils";

export default function Knowledge() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedKBId, setSelectedKBId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<KnowledgeBase | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeBase | null>(null);
  const { data: knowledgeBases = [], isLoading } = useKnowledgeBases();
  const deleteKnowledgeBase = useDeleteKnowledgeBase();

  const filteredKBs = knowledgeBases.filter(kb => 
    kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    kb.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedKB = knowledgeBases.find(kb => kb.id === selectedKBId);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteKnowledgeBase.mutateAsync(deleteTarget.id);
      if (selectedKBId === deleteTarget.id) {
        setSelectedKBId(null);
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-background">
      {/* Left Panel - Knowledge Base List */}
      <div className="w-80 border-r border-border flex flex-col bg-card">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">知识库</h1>
            </div>
            <Button size="sm" onClick={() => setShowCreateDialog(true)} className="gap-1.5">
              <Plus className="h-4 w-4" />
              新建
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索知识库..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Knowledge Base List */}
        <div className="flex-1 overflow-auto p-2 scrollbar-thin">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredKBs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <Database className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? "未找到匹配的知识库" : "暂无知识库"}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setShowCreateDialog(true)}
              >
                创建第一个知识库
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredKBs.map((kb, index) => (
                <motion.div
                  key={kb.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      selectedKBId === kb.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => setSelectedKBId(kb.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm truncate">{kb.name}</h3>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] h-5",
                                kb.index_status === 'ready' && "border-status-executing text-status-executing",
                                kb.index_status === 'indexing' && "border-status-planning text-status-planning",
                                kb.index_status === 'pending' && "border-muted-foreground text-muted-foreground"
                              )}
                            >
                              {kb.index_status === 'ready' ? '已索引' : 
                               kb.index_status === 'indexing' ? '处理中' : '待处理'}
                            </Badge>
                          </div>
                          {kb.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{kb.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {kb.documents_count || 0} 文档
                            </span>
                            <span className="flex items-center gap-1">
                              <Database className="h-3 w-3" />
                              {kb.chunks_count || 0} 分片
                            </span>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedKBId(kb.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setEditTarget(kb);
                            }}>
                              <Settings className="h-4 w-4 mr-2" />
                              配置
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(kb);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Stats Footer */}
        <div className="p-3 border-t border-border bg-muted/30">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div>
              <div className="text-lg font-semibold text-foreground">{knowledgeBases.length}</div>
              <div className="text-[10px] text-muted-foreground">知识库</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-foreground">
                {knowledgeBases.reduce((sum, kb) => sum + (kb.documents_count || 0), 0)}
              </div>
              <div className="text-[10px] text-muted-foreground">总文档数</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Detail View */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedKB ? (
          <KnowledgeBaseDetail knowledgeBase={selectedKB} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-muted/20">
            <div className="text-center max-w-md px-6">
              <div className="w-20 h-20 rounded-2xl bg-cognitive/10 flex items-center justify-center mx-auto mb-6">
                <BookOpen className="h-10 w-10 text-cognitive" />
              </div>
              <h2 className="text-xl font-semibold mb-2">知识库管理</h2>
              <p className="text-muted-foreground mb-6">
                上传文档，构建语义图谱，为你的智能体提供长期记忆与知识检索能力。
              </p>
              
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Card className="p-4 text-left">
                  <Upload className="h-5 w-5 text-primary mb-2" />
                  <h3 className="font-medium text-sm mb-1">文档上传</h3>
                  <p className="text-xs text-muted-foreground">支持 PDF、Markdown、TXT 格式</p>
                </Card>
                <Card className="p-4 text-left">
                  <Network className="h-5 w-5 text-cognitive mb-2" />
                  <h3 className="font-medium text-sm mb-1">语义图谱</h3>
                  <p className="text-xs text-muted-foreground">自动提取实体与关系</p>
                </Card>
              </div>

              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                创建知识库
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <CreateKnowledgeBaseDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />

      {/* Edit Dialog */}
      <EditKnowledgeBaseDialog
        knowledgeBase={editTarget}
        open={!!editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除知识库</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除知识库「{deleteTarget?.name}」吗？此操作将删除所有文档和索引数据，无法恢复。
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
