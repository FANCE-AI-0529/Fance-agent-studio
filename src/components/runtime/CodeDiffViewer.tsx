/**
 * CodeDiffViewer - Side-by-Side Code Diff Display
 * Uses Monaco DiffEditor for professional code comparison
 */

import { useState, useCallback } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check, 
  XCircle, 
  FileCode, 
  Plus, 
  Minus, 
  ChevronDown,
  ChevronRight,
  Copy,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog.tsx';
import { cn } from '../../lib/utils.ts';
import { useToast } from '../../hooks/use-toast.ts';
import type { FileDiff } from '../../types/openCode.ts';

interface CodeDiffViewerProps {
  diff: FileDiff;
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  theme?: 'light' | 'dark';
}

export function CodeDiffViewer({
  diff,
  isOpen,
  onClose,
  onAccept,
  onReject,
  theme = 'dark',
}: CodeDiffViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { toast } = useToast();

  // Calculate line changes
  const calculateChanges = useCallback(() => {
    const originalLines = diff.originalContent.split('\n').length;
    const modifiedLines = diff.modifiedContent.split('\n').length;
    const additions = Math.max(0, modifiedLines - originalLines);
    const deletions = Math.max(0, originalLines - modifiedLines);
    
    return { additions, deletions, originalLines, modifiedLines };
  }, [diff.originalContent, diff.modifiedContent]);

  const changes = calculateChanges();

  const handleCopyModified = async () => {
    await navigator.clipboard.writeText(diff.modifiedContent);
    toast({
      title: "已复制",
      description: "修改后的代码已复制到剪贴板",
    });
  };

  const getActionBadge = () => {
    switch (diff.action) {
      case 'create':
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">新建</Badge>;
      case 'modify':
        return <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">修改</Badge>;
      case 'delete':
        return <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">删除</Badge>;
    }
  };

  const getLanguageFromPath = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescript',
      js: 'javascript',
      jsx: 'javascript',
      json: 'json',
      css: 'css',
      scss: 'scss',
      html: 'html',
      md: 'markdown',
      sql: 'sql',
      py: 'python',
      go: 'go',
      rs: 'rust',
    };
    return languageMap[ext || ''] || diff.language || 'plaintext';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn(
        "max-w-5xl p-0 gap-0 overflow-hidden",
        isFullscreen && "max-w-none w-screen h-screen"
      )}>
        {/* Header */}
        <DialogHeader className="p-4 border-b border-border bg-secondary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCode className="h-5 w-5 text-primary" />
              <DialogTitle className="font-mono text-sm">
                {diff.filePath}
              </DialogTitle>
              {getActionBadge()}
            </div>
            
            <div className="flex items-center gap-3">
              {/* Line change summary */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="flex items-center gap-1 text-emerald-500">
                  <Plus className="h-3 w-3" />
                  {changes.additions}
                </span>
                <span className="flex items-center gap-1 text-destructive">
                  <Minus className="h-3 w-3" />
                  {changes.deletions}
                </span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyModified}
              >
                <Copy className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Monaco Diff Editor */}
        <div className={cn(
          "w-full",
          isFullscreen ? "h-[calc(100vh-140px)]" : "h-[500px]"
        )}>
          <DiffEditor
            original={diff.originalContent}
            modified={diff.modifiedContent}
            language={getLanguageFromPath(diff.filePath)}
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            options={{
              readOnly: true,
              renderSideBySide: true,
              enableSplitViewResizing: true,
              ignoreTrimWhitespace: false,
              renderIndicators: true,
              originalEditable: false,
              minimap: { enabled: false },
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            }}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/30">
          <div className="text-xs text-muted-foreground">
            {diff.action === 'create' && '将创建新文件'}
            {diff.action === 'modify' && `共 ${changes.modifiedLines} 行`}
            {diff.action === 'delete' && '将删除此文件'}
          </div>
          
          <div className="flex items-center gap-2">
            {onReject && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReject}
                className="gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                拒绝
              </Button>
            )}
            {onAccept && (
              <Button
                size="sm"
                onClick={onAccept}
                className="gap-1.5"
              >
                <Check className="h-4 w-4" />
                接受变更
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline Diff Preview - Compact version for message bubbles
 */
interface InlineDiffPreviewProps {
  diff: FileDiff;
  onViewFull: () => void;
  className?: string;
}

export function InlineDiffPreview({
  diff,
  onViewFull,
  className,
}: InlineDiffPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const previewLines = diff.modifiedContent.split('\n').slice(0, 5);
  const hasMore = diff.modifiedContent.split('\n').length > 5;

  return (
    <div className={cn(
      "border border-border rounded-lg overflow-hidden bg-card/50",
      className
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <FileCode className="h-4 w-4 text-primary" />
          <span className="font-mono text-xs">{diff.filePath}</span>
        </div>
        
        <Badge variant="outline" className="text-xs">
          {diff.action}
        </Badge>
      </button>
      
      {/* Preview content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              <pre className="p-3 text-xs font-mono overflow-x-auto bg-secondary/20">
                {previewLines.map((line, i) => (
                  <div key={i} className="whitespace-pre">
                    <span className="text-muted-foreground mr-3 select-none">
                      {String(i + 1).padStart(3)}
                    </span>
                    {line}
                  </div>
                ))}
                {hasMore && (
                  <div className="text-muted-foreground italic mt-2">
                    ... 更多 {diff.modifiedContent.split('\n').length - 5} 行
                  </div>
                )}
              </pre>
              
              <div className="p-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewFull}
                  className="w-full text-xs"
                >
                  查看完整 Diff
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
