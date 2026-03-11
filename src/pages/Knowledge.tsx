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
  Loader2,
  FolderOpen,
} from "lucide-react";
import { Button } from "../components/ui/button.tsx";
import { Input } from "../components/ui/input.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { Progress } from "../components/ui/progress.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog.tsx";
import { CreateKnowledgeBaseDialog } from "../components/knowledge/CreateKnowledgeBaseDialog.tsx";
import { EditKnowledgeBaseDialog } from "../components/knowledge/EditKnowledgeBaseDialog.tsx";
import { KnowledgeBaseDetail } from "../components/knowledge/KnowledgeBaseDetail.tsx";
import { useKnowledgeBases, useDeleteKnowledgeBase, type KnowledgeBase } from "../hooks/useKnowledgeBases.ts";
import { cn } from "../lib/utils.ts";
import { Skeleton } from "../components/ui/skeleton.tsx";

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

  const totalDocs = knowledgeBases.reduce((sum, kb) => sum + (kb.documents_count || 0), 0);
  const totalChunks = knowledgeBases.reduce((sum, kb) => sum + (kb.chunks_count || 0), 0);

  return (
    <div className="h-full flex overflow-hidden bg-background">
      {/* Left Panel - Knowledge Base List */}
      <div className="w-80 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h1 className="font-semibold text-sm">知识库</h1>
            </div>
            <Button size="sm" variant="default" onClick={() => setShowCreateDialog(true)} className="gap-1 h-7 text-xs">
              <Plus className="h-3 w-3" />
              新建
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="搜索知识库..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>

        {/* Knowledge Base List */}
        <div className="flex-1 overflow-auto p-2 scrollbar-thin space-y-1.5">
          {isLoading ? (
            <div className="space-y-2 p-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 rounded-lg border border-border">
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-3 w-20 mb-2" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredKBs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <FolderOpen className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {searchQuery ? "未找到匹配的知识库" : "暂无知识库"}
              </p>
              <p className="text-xs text-muted-foreground/70 mb-3">
                {searchQuery ? "试试其他关键词" : "创建知识库开始管理文档"}
              </p>
              {!searchQuery && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setShowCreateDialog(true)}
                >
                  创建第一个知识库
                </Button>
              )}
            </div>
          ) : (
            filteredKBs.map((kb, index) => (
              <KnowledgeBaseCard
                key={kb.id}
                kb={kb}
                index={index}
                isSelected={selectedKBId === kb.id}
                onSelect={() => setSelectedKBId(kb.id)}
                onEdit={() => setEditTarget(kb)}
                onDelete={() => setDeleteTarget(kb)}
              />
            ))
          )}
        </div>

        {/* Stats Footer */}
        <div className="p-3 border-t border-border">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-sm font-semibold">{knowledgeBases.length}</div>
              <div className="text-[10px] text-muted-foreground">知识库</div>
            </div>
            <div>
              <div className="text-sm font-semibold">{totalDocs}</div>
              <div className="text-[10px] text-muted-foreground">文档</div>
            </div>
            <div>
              <div className="text-sm font-semibold">{totalChunks}</div>
              <div className="text-[10px] text-muted-foreground">分片</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Detail View */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedKB ? (
          <KnowledgeBaseDetail knowledgeBase={selectedKB} />
        ) : (
          <KnowledgeEmptyState onCreateClick={() => setShowCreateDialog(true)} />
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

/** Card-ified knowledge base list item */
function KnowledgeBaseCard({
  kb, index, isSelected, onSelect, onEdit, onDelete,
}: {
  kb: KnowledgeBase;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusConfig = {
    ready: { label: "已索引", className: "border-status-executing/30 text-status-executing bg-status-executing/10" },
    indexing: { label: "处理中", className: "border-status-planning/30 text-status-planning bg-status-planning/10" },
    failed: { label: "失败", className: "border-destructive/30 text-destructive bg-destructive/10" },
    pending: { label: "待处理", className: "border-muted-foreground/30 text-muted-foreground bg-muted" },
  };
  const status = statusConfig[kb.index_status] || statusConfig.pending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <div
        onClick={onSelect}
        className={cn(
          "group relative p-3 rounded-lg cursor-pointer transition-all",
          "border hover:-translate-y-[1px]",
          isSelected
            ? "border-primary/40 bg-primary/5 shadow-sm"
            : "border-border hover:border-primary/20 hover:bg-accent/30"
        )}
      >
        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-primary rounded-r-full" />
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-sm truncate">{kb.name}</h3>
              <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border", status.className)}>
                {kb.index_status === 'indexing' && <Loader2 className="h-2.5 w-2.5 animate-spin mr-0.5" />}
                {status.label}
              </Badge>
            </div>
            {kb.description && (
              <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">{kb.description}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" 
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSelect()}>
                <Eye className="h-4 w-4 mr-2" />
                查看详情
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setTimeout(() => onEdit(), 0);
              }}>
                <Settings className="h-4 w-4 mr-2" />
                配置
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats row with mini progress */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {kb.documents_count || 0} 文档
          </span>
          <span className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            {kb.chunks_count || 0} 分片
          </span>
          {kb.graph_enabled && (
            <span className="flex items-center gap-1">
              <Network className="h-3 w-3" />
              图谱
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/** Redesigned empty state with drag-drop visual */
function KnowledgeEmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-lg"
      >
        {/* Hero icon */}
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <BookOpen className="h-10 w-10 text-primary" />
        </div>

        <h2 className="text-lg font-semibold mb-2">知识库管理</h2>
        <p className="text-sm text-muted-foreground mb-8">
          上传文档，构建语义索引，为你的智能体提供长期记忆与知识检索能力
        </p>

        {/* Feature cards grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card text-left">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Upload className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm mb-0.5">文档上传</h3>
              <p className="text-xs text-muted-foreground">支持 PDF、MD、TXT</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card text-left">
            <div className="w-8 h-8 rounded-lg bg-cognitive/10 flex items-center justify-center flex-shrink-0">
              <Network className="h-4 w-4 text-cognitive" />
            </div>
            <div>
              <h3 className="font-medium text-sm mb-0.5">语义图谱</h3>
              <p className="text-xs text-muted-foreground">自动提取实体关系</p>
            </div>
          </div>
        </div>

        <Button onClick={onCreateClick} className="gap-2">
          <Plus className="h-4 w-4" />
          创建知识库
        </Button>
      </motion.div>
    </div>
  );
}
