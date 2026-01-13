// =====================================================
// 知识库挂载建议卡片
// Knowledge Mount Suggestion Card - Phase 4
// =====================================================

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Check, 
  X, 
  Brain,
  Loader2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { KnowledgeMountSuggestion } from '@/types/ragDecision';

interface KnowledgeMountCardProps {
  suggestion: KnowledgeMountSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
  isMounting?: boolean;
  className?: string;
}

export function KnowledgeMountCard({
  suggestion,
  onAccept,
  onDismiss,
  isMounting = false,
  className,
}: KnowledgeMountCardProps) {
  const matchPercent = Math.round(suggestion.matchScore * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={cn(
        "rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10",
        "p-4 shadow-lg backdrop-blur-sm",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 rounded-lg bg-primary/20">
          <Brain className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-sm text-foreground flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            知识库建议
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            这个问题我可能需要查阅额外资料才能准确回答
          </p>
        </div>
      </div>

      {/* Knowledge Base Card */}
      <div className="rounded-lg border border-border/50 bg-background/80 p-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded bg-secondary/50">
            <Database className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {suggestion.knowledgeBaseName}
              </span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {matchPercent}% 匹配
              </Badge>
            </div>
            {suggestion.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {suggestion.description}
              </p>
            )}
            {suggestion.reason && (
              <div className="flex items-start gap-1.5 mt-2">
                <AlertCircle className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-muted-foreground">
                  {suggestion.reason}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Match Score Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>匹配度</span>
            <span className="font-medium">{matchPercent}%</span>
          </div>
          <Progress 
            value={matchPercent} 
            className="h-1.5"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="default"
          size="sm"
          className="flex-1 gap-2"
          onClick={onAccept}
          disabled={isMounting}
        >
          {isMounting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {isMounting ? '挂载中...' : '挂载并回答'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDismiss}
          disabled={isMounting}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          不需要
        </Button>
      </div>
    </motion.div>
  );
}

// Compact inline version for chat
export function KnowledgeMountInline({
  suggestion,
  onAccept,
  onDismiss,
  isMounting = false,
}: KnowledgeMountCardProps) {
  const matchPercent = Math.round(suggestion.matchScore * 100);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="inline-flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20"
    >
      <Database className="h-4 w-4 text-primary" />
      <span className="text-xs">
        建议挂载「{suggestion.knowledgeBaseName}」({matchPercent}%)
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onAccept}
        disabled={isMounting}
      >
        {isMounting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5 text-green-500" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onDismiss}
        disabled={isMounting}
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </motion.div>
  );
}
