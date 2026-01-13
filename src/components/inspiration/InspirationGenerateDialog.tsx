import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wand2, Sparkles, Brain, Loader2, CheckCircle2, Zap } from "lucide-react";
import { DailyInspiration } from "@/hooks/useDailyInspiration";
import { motion, AnimatePresence } from "framer-motion";

interface InspirationGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inspiration: DailyInspiration;
  steps: string[];
  skills: string[];
}

export function InspirationGenerateDialog({
  open,
  onOpenChange,
  inspiration,
  steps,
  skills,
}: InspirationGenerateDialogProps) {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const buildAgentDescription = () => {
    const skillsText = skills.join('、');
    const stepsText = steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

    return `
请创建一个「${inspiration.title}」智能体。

## 功能需求
${inspiration.description || inspiration.title}

## 核心技能
需要具备以下能力：${skillsText}

## 实现步骤
${stepsText}

## 用户故事
${inspiration.story_content || '帮助用户高效完成任务'}
    `.trim();
  };

  const handleConfirm = () => {
    setIsGenerating(true);
    
    const description = buildAgentDescription();
    const encodedDesc = encodeURIComponent(description);
    const encodedTitle = encodeURIComponent(inspiration.title);
    const encodedCategory = encodeURIComponent(inspiration.category || '通用');
    
    // Short delay for visual feedback
    setTimeout(() => {
      navigate(`/builder?inspiration=${inspiration.id}&autoGenerate=true&desc=${encodedDesc}&title=${encodedTitle}&category=${encodedCategory}`);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            一键生成智能体
          </DialogTitle>
          <DialogDescription>
            根据「{inspiration.title}」自动创建专属智能体
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Auto-configuration preview */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-cognitive" />
              将自动配置：
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {skills.length} 个推荐技能
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="flex items-center gap-1">
                  <Brain className="h-3.5 w-3.5" />
                  Manus 规划内核
                </span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                基于场景优化的系统提示词
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {steps.length} 个工作流步骤
              </li>
            </ul>
          </div>

          {/* Skills preview */}
          <div>
            <h4 className="text-sm font-medium mb-2">推荐技能预览：</h4>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <motion.div
                  key={skill}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Badge variant="secondary" className="px-3 py-1.5">
                    <Sparkles className="h-3 w-3 mr-1.5 text-cognitive" />
                    {skill}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isGenerating}>
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在跳转...
                </motion.div>
              ) : (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Wand2 className="h-4 w-4" />
                  开始生成
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
