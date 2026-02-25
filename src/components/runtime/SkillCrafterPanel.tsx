/**
 * SkillCrafterPanel - Autonomous Skill Forging UI
 * Input natural language → AI generates NanoClaw skill → Auto-apply to container
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hammer,
  Loader2,
  CheckCircle2,
  XCircle,
  Send,
  FileCode2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { craftSkill, type CraftingProgress, type CraftingPhase, type SkillPackage } from '@/services/skillCrafter';

interface SkillCrafterPanelProps {
  nanoclawEndpoint: string;
  authToken: string;
  containerId: string;
  className?: string;
}

const PHASE_LABELS: Record<CraftingPhase, { label: string; icon: React.ReactNode }> = {
  idle: { label: '就绪', icon: <Sparkles className="h-3.5 w-3.5" /> },
  generating: { label: 'AI 生成中', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  writing: { label: '写入容器', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  applying: { label: '应用技能', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  testing: { label: '测试验证', icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
  complete: { label: '锻造完成', icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
  error: { label: '锻造失败', icon: <XCircle className="h-3.5 w-3.5" /> },
};

export function SkillCrafterPanel({
  nanoclawEndpoint,
  authToken,
  containerId,
  className,
}: SkillCrafterPanelProps) {
  const [input, setInput] = useState('');
  const [progress, setProgress] = useState<CraftingProgress | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [result, setResult] = useState<SkillPackage | null>(null);

  const isCrafting = progress?.phase !== undefined && 
    !['idle', 'complete', 'error'].includes(progress.phase);

  const handleCraft = useCallback(async () => {
    if (!input.trim() || isCrafting) return;

    setProgress({ phase: 'generating', message: '初始化...', logs: [] });
    setResult(null);
    setIsExpanded(true);

    try {
      const skill = await craftSkill(input.trim(), {
        nanoclawEndpoint,
        authToken,
        containerId,
        onProgress: setProgress,
      });
      setResult(skill);
      setInput('');
    } catch {
      // Error already handled via onProgress
    }
  }, [input, isCrafting, nanoclawEndpoint, authToken, containerId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCraft();
    }
  };

  const phaseInfo = PHASE_LABELS[progress?.phase || 'idle'];

  return (
    <div className={cn(
      "border border-border/50 rounded-lg bg-card/50 backdrop-blur-sm overflow-hidden",
      className
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Hammer className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">技能锻造者</span>
          {progress && progress.phase !== 'idle' && (
            <Badge variant="secondary" className="gap-1 text-xs">
              {phaseInfo.icon}
              {phaseInfo.label}
            </Badge>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="描述你想要的能力..."
                  disabled={isCrafting}
                  className="flex-1 bg-secondary/30 rounded-lg px-3 py-2 text-sm
                    placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30
                    disabled:opacity-50"
                />
                <Button
                  size="sm"
                  onClick={handleCraft}
                  disabled={!input.trim() || isCrafting}
                  className="gap-1.5"
                >
                  {isCrafting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  锻造
                </Button>
              </div>

              {/* Progress Logs */}
              {progress && progress.logs.length > 0 && (
                <div className="space-y-1">
                  {progress.logs.slice(-5).map((log, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-xs font-mono px-2 py-1 rounded",
                        log.includes('[error]')
                          ? "text-destructive bg-destructive/10"
                          : log.includes('[complete]')
                          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                          : "text-muted-foreground bg-secondary/20"
                      )}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              )}

              {/* Result Preview */}
              {result && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <FileCode2 className="h-3.5 w-3.5" />
                    {showPreview ? '隐藏' : '预览'} SKILL.md
                  </button>
                  
                  {showPreview && (
                    <pre className="text-xs bg-secondary/30 rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-muted-foreground">
                      {result.skillMd}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
