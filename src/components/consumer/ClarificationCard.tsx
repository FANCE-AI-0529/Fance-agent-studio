// =====================================================
// 澄清卡片组件 - 知识库选择交互
// Clarification Card - Knowledge Base Selection
// =====================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Database, FileText, Sparkles, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { KnowledgeMatchResult } from "@/hooks/useKnowledgeMatching";

interface ClarificationCardProps {
  question: string;
  matches: KnowledgeMatchResult[];
  onSelect: (selectedIds: string[]) => void;
  onSkip: () => void;
  allowMultiSelect?: boolean;
  className?: string;
}

export function ClarificationCard({
  question,
  matches,
  onSelect,
  onSkip,
  allowMultiSelect = false,
  className,
}: ClarificationCardProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = (id: string) => {
    if (allowMultiSelect) {
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  };

  const handleConfirm = async () => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    // Small delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    onSelect(selectedIds);
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 200));
    onSkip();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "w-full max-w-md mx-auto",
        className
      )}
    >
      <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-lg">
        {/* AI Avatar and Question */}
        <div className="flex items-start gap-3 mb-5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center flex-shrink-0"
          >
            <Brain className="h-5 w-5 text-primary" />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
            className="flex-1"
          >
            <p className="text-sm text-foreground leading-relaxed">
              {question || "我发现了几个相关的知识库，您想基于哪个进行构建？"}
            </p>
          </motion.div>
        </div>

        {/* Knowledge Base Options */}
        <div className="space-y-2.5 mb-4">
          <AnimatePresence>
            {matches.map((match, index) => {
              const isSelected = selectedIds.includes(match.knowledgeBase.id);
              const scorePercent = Math.round(match.score * 100);
              
              return (
                <motion.button
                  key={match.knowledgeBase.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.08 }}
                  onClick={() => handleToggle(match.knowledgeBase.id)}
                  disabled={isSubmitting}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl border transition-all duration-200",
                    "hover:shadow-md active:scale-[0.98]",
                    isSelected
                      ? "bg-primary/10 border-primary/40 shadow-sm"
                      : "bg-muted/30 border-border/50 hover:border-primary/30 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      isSelected ? "bg-primary/20" : "bg-muted"
                    )}>
                      <FileText className={cn(
                        "h-4.5 w-4.5",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "font-medium text-sm truncate",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {match.knowledgeBase.name}
                        </span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                          >
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          </motion.div>
                        )}
                      </div>
                      
                      {/* Description */}
                      {match.knowledgeBase.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {match.knowledgeBase.description}
                        </p>
                      )}
                      
                      {/* Match Score */}
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={scorePercent} 
                          className="h-1.5 flex-1 bg-muted"
                        />
                        <span className={cn(
                          "text-xs font-medium tabular-nums",
                          scorePercent >= 80 ? "text-green-500" :
                          scorePercent >= 60 ? "text-primary" : "text-muted-foreground"
                        )}>
                          {scorePercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex-1 text-muted-foreground hover:text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            仅用通用知识
          </Button>
          
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={selectedIds.length === 0 || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Database className="h-3.5 w-3.5" />
              </motion.div>
            ) : (
              <>
                <Database className="h-3.5 w-3.5 mr-1.5" />
                使用选中
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
