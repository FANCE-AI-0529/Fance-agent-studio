import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils.ts';
import { ThinkingEvent, ThinkingCategory } from '../../types/streaming.ts';
import { ScrollArea } from '../ui/scroll-area.tsx';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible.tsx';
import { TypewriterFormattedText } from '../runtime/TypewriterFormattedText.tsx';

interface ThinkingBubbleProps {
  thoughts: ThinkingEvent[];
  currentThought: string;
  isActive: boolean;
  className?: string;
}

const categoryIcons: Record<ThinkingCategory, React.ElementType> = {
  analyze: Brain,
  decide: Sparkles,
  create: Sparkles,
  connect: Sparkles,
  validate: Sparkles,
};

const categoryLabels: Record<ThinkingCategory, string> = {
  analyze: '分析',
  decide: '决策',
  create: '创建',
  connect: '连接',
  validate: '验证',
};

export function ThinkingBubble({ 
  thoughts, 
  currentThought, 
  isActive,
  className 
}: ThinkingBubbleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!isActive && thoughts.length === 0) return null;
  
  const latestThought = thoughts[thoughts.length - 1];
  const category = latestThought?.category || 'analyze';
  const CategoryIcon = categoryIcons[category];

  return (
    <AnimatePresence>
      {(isActive || thoughts.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className={cn("z-50", className)}
        >
          <div className="relative max-w-sm">
            {/* 气泡尾巴 */}
            <div className="absolute -bottom-2 left-6 w-4 h-4 bg-card border-l border-b border-border rotate-[-45deg]" />
            
            {/* 主气泡 */}
            <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
              {/* 头部 */}
              <div className="flex items-start gap-3 p-4">
                {/* 头像 */}
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  {/* 思考动画指示器 */}
                  {isActive && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute -right-0.5 -top-0.5 w-3 h-3 bg-primary rounded-full"
                    />
                  )}
                </div>
                
                {/* 思考内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">AI 构建师</span>
                    {category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                        <CategoryIcon className="h-3 w-3" />
                        {categoryLabels[category]}
                      </span>
                    )}
                  </div>
                  
                  {/* 当前思考 - 打字机效果 */}
                  <div className="text-sm text-muted-foreground min-h-[20px]">
                    {isActive && currentThought ? (
                      <TypewriterFormattedText 
                        content={currentThought} 
                        speed={25}
                        enabled
                      />
                    ) : (
                      <span>{currentThought || thoughts[thoughts.length - 1]?.thought || '准备中...'}</span>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 历史思考 (折叠) */}
              {thoughts.length > 1 && (
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                  <CollapsibleTrigger className="w-full px-4 py-2 border-t border-border hover:bg-muted/50 transition-colors flex items-center justify-between text-xs text-muted-foreground">
                    <span>查看思考过程 ({thoughts.length - 1})</span>
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="h-32 px-4 pb-3">
                      <div className="space-y-2 pt-2">
                        {thoughts.slice(0, -1).reverse().map((thought, i) => {
                          const ThoughtIcon = thought.category ? categoryIcons[thought.category] : Brain;
                          return (
                            <div 
                              key={i} 
                              className="flex items-start gap-2 text-xs text-muted-foreground border-l-2 border-muted pl-2 py-1"
                            >
                              <ThoughtIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{thought.thought}</span>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default ThinkingBubble;
