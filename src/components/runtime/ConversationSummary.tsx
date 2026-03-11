import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  RefreshCw,
  Clock,
  MessageSquare,
  Tag,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Target,
  List,
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible.tsx";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip.tsx";
import { cn } from "../../lib/utils.ts";
import { toast } from "sonner";

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date;
}

export interface ConversationSummaryData {
  title: string;
  overview: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: string[];
  topics: string[];
  sentiment: "positive" | "neutral" | "negative";
  messageCount: number;
  duration: string;
  generatedAt: Date;
}

interface ConversationSummaryProps {
  messages: ConversationMessage[];
  onGenerateSummary?: (messages: ConversationMessage[]) => Promise<ConversationSummaryData>;
  className?: string;
}

// Mock summary generation (in real app, this would call an LLM)
async function generateMockSummary(messages: ConversationMessage[]): Promise<ConversationSummaryData> {
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const userMessages = messages.filter((m) => m.role === "user");
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  
  const firstTime = messages[0]?.createdAt || new Date();
  const lastTime = messages[messages.length - 1]?.createdAt || new Date();
  const durationMs = lastTime.getTime() - firstTime.getTime();
  const durationMins = Math.round(durationMs / 60000);

  return {
    title: "智能体配置与测试对话",
    overview: `本次对话共进行了 ${messages.length} 轮交互，主要讨论了智能体的配置、技能挂载和测试相关话题。用户提出了 ${userMessages.length} 个问题或请求，智能体给出了相应的解答和建议。`,
    keyPoints: [
      "讨论了工作流节点的配置方法",
      "解答了关于RAG检索的实现细节",
      "提供了技能开发的最佳实践建议",
      "确认了安全策略的配置要求",
    ],
    decisions: [
      "采用向量检索作为主要知识检索方式",
      "使用MPLP策略控制敏感操作",
      "配置自动保存功能防止数据丢失",
    ],
    actionItems: [
      "完成知识库文档上传",
      "测试工作流执行逻辑",
      "配置生产环境API密钥",
    ],
    topics: ["工作流配置", "RAG检索", "技能开发", "安全策略"],
    sentiment: "positive",
    messageCount: messages.length,
    duration: durationMins > 0 ? `${durationMins} 分钟` : "< 1 分钟",
    generatedAt: new Date(),
  };
}

export function ConversationSummary({
  messages,
  onGenerateSummary,
  className,
}: ConversationSummaryProps) {
  const [summary, setSummary] = useState<ConversationSummaryData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["overview"])
  );

  const shouldShowSummary = messages.length >= 6;

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    try {
      const result = onGenerateSummary
        ? await onGenerateSummary(messages)
        : await generateMockSummary(messages);
      setSummary(result);
      setIsExpanded(true);
      toast.success("对话摘要已生成");
    } catch (_error) {
      toast.error("摘要生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  }, [messages, onGenerateSummary]);

  const handleCopy = useCallback(() => {
    if (!summary) return;
    
    const text = `# ${summary.title}

## 概述
${summary.overview}

## 关键要点
${summary.keyPoints.map((p) => `- ${p}`).join("\n")}

## 决策事项
${summary.decisions.map((d) => `- ${d}`).join("\n")}

## 待办事项
${summary.actionItems.map((a) => `- ${a}`).join("\n")}

---
话题: ${summary.topics.join(", ")}
消息数: ${summary.messageCount}
时长: ${summary.duration}
`;
    
    navigator.clipboard.writeText(text);
    toast.success("摘要已复制到剪贴板");
  }, [summary]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  const sentimentConfig = {
    positive: { color: "text-status-executing", bg: "bg-status-executing/10", label: "积极" },
    neutral: { color: "text-muted-foreground", bg: "bg-muted", label: "中性" },
    negative: { color: "text-destructive", bg: "bg-destructive/10", label: "消极" },
  };

  if (!shouldShowSummary) {
    return null;
  }

  return (
    <div className={cn("border-t border-border bg-muted/30", className)}>
      {/* Trigger Button */}
      {!summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>对话已进行 {messages.length} 轮</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-1.5"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                生成摘要
              </>
            )}
          </Button>
        </motion.div>
      )}

      {/* Summary Content */}
      <AnimatePresence>
        {summary && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <div className="p-3 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{summary.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {summary.messageCount} 条消息
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {summary.duration}
                        </span>
                        <Badge
                          className={cn(
                            "text-[10px] px-1.5",
                            sentimentConfig[summary.sentiment].bg,
                            sentimentConfig[summary.sentiment].color
                          )}
                        >
                          {sentimentConfig[summary.sentiment].label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy();
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>复制摘要</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerate();
                            }}
                          >
                            <RefreshCw className={cn("h-3.5 w-3.5", isGenerating && "animate-spin")} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>重新生成</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <ScrollArea className="max-h-80">
                  <div className="px-3 pb-3 space-y-3">
                    {/* Overview */}
                    <SummarySection
                      title="概述"
                      icon={<Lightbulb className="h-4 w-4" />}
                      isExpanded={expandedSections.has("overview")}
                      onToggle={() => toggleSection("overview")}
                    >
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {summary.overview}
                      </p>
                    </SummarySection>

                    {/* Key Points */}
                    <SummarySection
                      title="关键要点"
                      icon={<Target className="h-4 w-4" />}
                      count={summary.keyPoints.length}
                      isExpanded={expandedSections.has("keyPoints")}
                      onToggle={() => toggleSection("keyPoints")}
                    >
                      <ul className="space-y-1.5">
                        {summary.keyPoints.map((point, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-status-executing mt-0.5 flex-shrink-0" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </SummarySection>

                    {/* Decisions */}
                    {summary.decisions.length > 0 && (
                      <SummarySection
                        title="决策事项"
                        icon={<AlertCircle className="h-4 w-4" />}
                        count={summary.decisions.length}
                        isExpanded={expandedSections.has("decisions")}
                        onToggle={() => toggleSection("decisions")}
                      >
                        <ul className="space-y-1.5">
                          {summary.decisions.map((decision, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Badge variant="secondary" className="text-[10px] px-1.5 flex-shrink-0">
                                {i + 1}
                              </Badge>
                              <span>{decision}</span>
                            </li>
                          ))}
                        </ul>
                      </SummarySection>
                    )}

                    {/* Action Items */}
                    {summary.actionItems.length > 0 && (
                      <SummarySection
                        title="待办事项"
                        icon={<List className="h-4 w-4" />}
                        count={summary.actionItems.length}
                        isExpanded={expandedSections.has("actionItems")}
                        onToggle={() => toggleSection("actionItems")}
                      >
                        <ul className="space-y-1.5">
                          {summary.actionItems.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <div className="w-4 h-4 rounded border border-border flex-shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </SummarySection>
                    )}

                    {/* Topics */}
                    <div className="flex items-center gap-2 flex-wrap pt-2">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      {summary.topics.map((topic) => (
                        <Badge key={topic} variant="outline" className="text-xs">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </CollapsibleContent>
            </Collapsible>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Summary Section Component
interface SummarySectionProps {
  title: string;
  icon: React.ReactNode;
  count?: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SummarySection({
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  children,
}: SummarySectionProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            <div className="text-primary">{icon}</div>
            <span className="text-sm font-medium">{title}</span>
            {count !== undefined && (
              <Badge variant="secondary" className="text-[10px]">
                {count}
              </Badge>
            )}
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 pt-2">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
