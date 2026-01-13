// =====================================================
// 生成历史记录面板 - Generation History Panel
// 管理和恢复工作流生成历史
// =====================================================

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Clock,
  Trash2,
  RotateCcw,
  GitCompare,
  Download,
  Upload,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Shield,
  Sparkles,
  X,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  useGenerationHistoryStore,
  GenerationRecord,
} from '@/stores/generationHistoryStore';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// ========== 类型定义 ==========

interface GenerationHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (record: GenerationRecord) => void;
}

interface HistoryItemProps {
  record: GenerationRecord;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onExport: () => void;
  onCompare?: () => void;
  compareMode?: boolean;
}

// ========== 历史记录项组件 ==========

function HistoryItem({
  record,
  isSelected,
  onSelect,
  onRestore,
  onDelete,
  onExport,
  onCompare,
  compareMode,
}: HistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const nodeCount = record.nodes.length;
  const edgeCount = record.edges.length;
  const stageCount = record.dsl.stages.length;
  const hasWarnings = (record.warnings?.length || 0) > 0;
  const hasInterventions = (record.interventions?.length || 0) > 0;
  const riskLevel = record.riskAssessment?.overallRisk || 'low';
  
  const formatTime = (date: Date) => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: zhCN });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'rounded-lg border transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/30'
      )}
    >
      {/* 头部 */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* 展开图标 */}
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        
        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {record.dsl.name || '未命名工作流'}
            </span>
            <Badge variant="outline" className="text-[10px]">
              v{record.dsl.version}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {record.description}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(record.timestamp)}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              {nodeCount} 节点
            </Badge>
            {hasWarnings && (
              <AlertTriangle className="h-3 w-3 text-yellow-500" />
            )}
            {hasInterventions && (
              <Shield className="h-3 w-3 text-blue-500" />
            )}
          </div>
        </div>
        
        {/* 操作菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRestore}>
              <RotateCcw className="h-4 w-4 mr-2" />
              恢复到画布
            </DropdownMenuItem>
            {compareMode && onCompare && (
              <DropdownMenuItem onClick={onCompare}>
                <GitCompare className="h-4 w-4 mr-2" />
                选择对比
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              导出 JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除记录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* 展开详情 */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border"
          >
            <div className="p-3 space-y-3">
              {/* 统计信息 */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 rounded bg-muted/30">
                  <p className="text-lg font-semibold">{nodeCount}</p>
                  <p className="text-[10px] text-muted-foreground">节点</p>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <p className="text-lg font-semibold">{edgeCount}</p>
                  <p className="text-[10px] text-muted-foreground">连接</p>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <p className="text-lg font-semibold">{stageCount}</p>
                  <p className="text-[10px] text-muted-foreground">阶段</p>
                </div>
                <div className="p-2 rounded bg-muted/30">
                  <p className={cn(
                    'text-lg font-semibold',
                    riskLevel === 'high' ? 'text-red-500' :
                    riskLevel === 'medium' ? 'text-yellow-500' :
                    'text-green-500'
                  )}>
                    {riskLevel === 'high' ? '高' : riskLevel === 'medium' ? '中' : '低'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">风险</p>
                </div>
              </div>
              
              {/* 治理策略 */}
              {record.dsl.governance && (
                <div className="text-xs">
                  <span className="text-muted-foreground">治理策略:</span>
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {record.dsl.governance.mplpPolicy}
                  </Badge>
                </div>
              )}
              
              {/* 警告和干预 */}
              {(hasWarnings || hasInterventions) && (
                <div className="flex flex-wrap gap-1">
                  {hasWarnings && (
                    <Badge variant="outline" className="text-[10px] text-yellow-500">
                      {record.warnings?.length} 个警告
                    </Badge>
                  )}
                  {hasInterventions && (
                    <Badge variant="outline" className="text-[10px] text-blue-500">
                      {record.interventions?.length} 个干预
                    </Badge>
                  )}
                </div>
              )}
              
              {/* 快速恢复按钮 */}
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={onRestore}
              >
                <RotateCcw className="h-4 w-4" />
                恢复此版本
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ========== 主组件 ==========

export function GenerationHistory({
  isOpen,
  onClose,
  onRestore,
}: GenerationHistoryProps) {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  
  const {
    history,
    deleteRecord,
    clearHistory,
    exportRecord,
    importRecord,
    compareRecords,
    selectRecord,
    selectedRecordId,
  } = useGenerationHistoryStore();
  
  const handleRestore = (record: GenerationRecord) => {
    onRestore(record);
    onClose();
    toast({
      title: '已恢复工作流',
      description: `"${record.dsl.name}" 已应用到画布`,
    });
  };
  
  const handleDelete = (id: string) => {
    deleteRecord(id);
    setDeleteConfirm(null);
    toast({
      title: '已删除记录',
    });
  };
  
  const handleExport = (id: string) => {
    const json = exportRecord(id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generation-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };
  
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const id = importRecord(text);
        if (id) {
          toast({
            title: '导入成功',
            description: '历史记录已添加',
          });
        } else {
          toast({
            title: '导入失败',
            description: '文件格式无效',
            variant: 'destructive',
          });
        }
      }
    };
    input.click();
  };
  
  const handleCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare((prev) => prev.filter((i) => i !== id));
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare((prev) => [...prev, id]);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed right-0 top-0 bottom-0 w-96 bg-card border-l border-border shadow-xl z-40 flex flex-col"
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <span className="font-semibold">生成历史</span>
            <Badge variant="secondary" className="text-[10px]">
              {history.length}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* 工具栏 */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleImport}
          >
            <Upload className="h-3.5 w-3.5" />
            导入
          </Button>
          <Button
            variant={compareMode ? 'secondary' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedForCompare([]);
            }}
          >
            <GitCompare className="h-3.5 w-3.5" />
            对比
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => clearHistory()}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            清空
          </Button>
        </div>
        
        {/* 对比模式提示 */}
        {compareMode && (
          <div className="px-4 py-2 bg-primary/5 text-xs text-primary border-b border-border">
            选择两条记录进行对比 ({selectedForCompare.length}/2)
            {selectedForCompare.length === 2 && (
              <Button
                size="sm"
                className="ml-2 h-6 text-xs"
                onClick={() => {
                  const diff = compareRecords(selectedForCompare[0], selectedForCompare[1]);
                  if (diff) {
                    toast({
                      title: '对比结果',
                      description: `新增 ${diff.addedNodes.length} 节点，删除 ${diff.removedNodes.length} 节点`,
                    });
                  }
                }}
              >
                查看差异
              </Button>
            )}
          </div>
        )}
        
        {/* 历史列表 */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">暂无生成记录</p>
                <p className="text-xs mt-1">使用 AI 生成器创建工作流</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {history.map((record) => (
                  <HistoryItem
                    key={record.id}
                    record={record}
                    isSelected={
                      selectedRecordId === record.id ||
                      selectedForCompare.includes(record.id)
                    }
                    onSelect={() => selectRecord(record.id)}
                    onRestore={() => handleRestore(record)}
                    onDelete={() => setDeleteConfirm(record.id)}
                    onExport={() => handleExport(record.id)}
                    onCompare={compareMode ? () => handleCompare(record.id) : undefined}
                    compareMode={compareMode}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </motion.div>
      
      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销。确定要删除这条生成记录吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default GenerationHistory;
