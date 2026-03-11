import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  BookOpen, 
  Check, 
  X, 
  Upload, 
  Sparkles,
  FileText,
  Database,
  ChevronRight
} from 'lucide-react';
import { Button } from '../ui/button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Progress } from '../ui/progress.tsx';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { cn } from '../../lib/utils.ts';
import type { KnowledgeMatchResult, RAGDecision } from '../../hooks/useKnowledgeMatching.ts';

interface KnowledgeDecisionPanelProps {
  matches: KnowledgeMatchResult[];
  decision: RAGDecision;
  clarifyQuestion?: string;
  onSelect: (selectedIds: string[]) => void;
  onSelectAll: () => void;
  onSkip: () => void;
  onUpload: () => void;
  className?: string;
}

export function KnowledgeDecisionPanel({
  matches,
  decision,
  clarifyQuestion,
  onSelect,
  onSelectAll,
  onSkip,
  onUpload,
  className,
}: KnowledgeDecisionPanelProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onSelect(Array.from(selectedIds));
  };

  // 空白区界面
  if (decision === 'suggest_upload') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn('space-y-4', className)}
      >
        <Card className="border-dashed border-2 border-muted-foreground/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-5 w-5 text-muted-foreground" />
              未找到相关知识库
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              当前知识库中没有与您需求高度相关的内容。您可以：
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={onUpload}
              >
                <Upload className="h-5 w-5 text-primary" />
                <span className="text-xs">上传新文档</span>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2"
                onClick={onSkip}
              >
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span className="text-xs">纯对话模式</span>
              </Button>
              
              {matches.length > 0 && (
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setSelectedIds(new Set(matches.map(m => m.knowledgeBase.id)))}
                >
                  <FileText className="h-5 w-5 text-blue-500" />
                  <span className="text-xs">查看相似</span>
                </Button>
              )}
            </div>

            {/* 显示最接近的候选（如果有） */}
            {matches.length > 0 && selectedIds.size > 0 && (
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  最接近的知识库（匹配度较低）：
                </p>
                <div className="space-y-2">
                  {matches.map(match => (
                    <KnowledgeBaseCard
                      key={match.knowledgeBase.id}
                      match={match}
                      isSelected={selectedIds.has(match.knowledgeBase.id)}
                      onToggle={() => toggleSelection(match.knowledgeBase.id)}
                      showWarning
                    />
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handleConfirm} disabled={selectedIds.size === 0}>
                    仍然使用
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                    取消
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // 澄清区界面
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn('space-y-4', className)}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-primary" />
            知识库智能匹配
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {clarifyQuestion && (
            <p className="text-sm text-muted-foreground">
              {clarifyQuestion}
            </p>
          )}

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-3 pr-2">
              {matches.map(match => (
                <KnowledgeBaseCard
                  key={match.knowledgeBase.id}
                  match={match}
                  isSelected={selectedIds.has(match.knowledgeBase.id)}
                  onToggle={() => toggleSelection(match.knowledgeBase.id)}
                />
              ))}
            </div>
          </ScrollArea>

          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button 
              size="sm" 
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
            >
              <Check className="h-4 w-4 mr-1" />
              确认选择 ({selectedIds.size})
            </Button>
            
            {matches.length > 1 && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  setSelectedIds(new Set(matches.map(m => m.knowledgeBase.id)));
                  onSelectAll();
                }}
              >
                全部使用
              </Button>
            )}
            
            <Button size="sm" variant="ghost" onClick={onSkip}>
              <X className="h-4 w-4 mr-1" />
              不使用知识库
            </Button>
            
            <Button size="sm" variant="ghost" onClick={onUpload}>
              <Upload className="h-4 w-4 mr-1" />
              上传新文档
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// 知识库卡片组件
interface KnowledgeBaseCardProps {
  match: KnowledgeMatchResult;
  isSelected: boolean;
  onToggle: () => void;
  showWarning?: boolean;
}

function KnowledgeBaseCard({ match, isSelected, onToggle, showWarning }: KnowledgeBaseCardProps) {
  const { knowledgeBase, score, matchReason, decisionZone } = match;
  const scorePercent = Math.round(score * 100);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onToggle}
      className={cn(
        'p-3 rounded-lg border cursor-pointer transition-all',
        isSelected 
          ? 'border-primary bg-primary/5 ring-1 ring-primary/20' 
          : 'border-border hover:border-primary/50',
        showWarning && 'border-amber-500/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          <BookOpen className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{knowledgeBase.name}</h4>
            {decisionZone === 'auto' && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600">
                推荐
              </Badge>
            )}
            {showWarning && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600">
                匹配度低
              </Badge>
            )}
          </div>

          {knowledgeBase.usage_context && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {knowledgeBase.usage_context}
            </p>
          )}

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-muted-foreground">匹配度</span>
                <span className={cn(
                  'font-medium',
                  scorePercent >= 85 ? 'text-green-600' :
                  scorePercent >= 60 ? 'text-amber-600' : 'text-muted-foreground'
                )}>
                  {scorePercent}%
                </span>
              </div>
              <Progress 
                value={scorePercent} 
                className="h-1.5"
              />
            </div>

            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>{knowledgeBase.documents_count || 0} 文档</span>
            </div>
          </div>

          {knowledgeBase.intent_tags && knowledgeBase.intent_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {knowledgeBase.intent_tags.slice(0, 4).map(tag => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-[10px] px-1.5 py-0"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground mt-1.5">
            {matchReason}
          </p>
        </div>

        <ChevronRight className={cn(
          'h-4 w-4 shrink-0 transition-transform',
          isSelected ? 'text-primary rotate-90' : 'text-muted-foreground'
        )} />
      </div>
    </motion.div>
  );
}

// 自动挂载提示组件
interface AutoMountToastProps {
  knowledgeBase: {
    id: string;
    name: string;
  };
  score: number;
  onUndo: () => void;
}

export function AutoMountToast({ knowledgeBase, score, onUndo }: AutoMountToastProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
        <Check className="h-4 w-4 text-green-600" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">
          已自动挂载「{knowledgeBase.name}」
        </p>
        <p className="text-xs text-muted-foreground">
          匹配度 {Math.round(score * 100)}% | 基于语义分析
        </p>
      </div>
      <Button size="sm" variant="ghost" onClick={onUndo}>
        撤销
      </Button>
    </div>
  );
}
