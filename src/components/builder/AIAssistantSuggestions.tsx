// P3-04: AI Assistant Suggestions - Smart recommendations for next configuration steps
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Lightbulb, 
  Sparkles, 
  ArrowRight, 
  X, 
  Wand2, 
  AlertCircle,
  CheckCircle,
  Zap,
  Shield,
  Target,
  Brain,
  Puzzle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Card, CardContent, CardHeader } from "../ui/card.tsx";
import { Badge } from "../ui/badge.tsx";
import { Progress } from "../ui/progress.tsx";
import { cn } from "../../lib/utils.ts";
import { slideUpVariants, staggerContainer, staggerItem } from "../../lib/animations.ts";

interface Suggestion {
  id: string;
  type: "optimization" | "warning" | "feature" | "security" | "performance";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  impact: string;
  actionLabel: string;
  category: string;
  autoFix?: boolean;
}

interface AgentConfig {
  name?: string;
  systemPrompt?: string;
  model?: string;
  skills?: string[];
  mplpPolicy?: string;
  nodes?: any[];
  edges?: any[];
}

interface AIAssistantSuggestionsProps {
  agentConfig: AgentConfig;
  onApplySuggestion?: (suggestion: Suggestion) => void;
  onDismiss?: (suggestionId: string) => void;
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const typeIcons: Record<Suggestion["type"], React.ElementType> = {
  optimization: Zap,
  warning: AlertCircle,
  feature: Sparkles,
  security: Shield,
  performance: Target,
};

const typeColors: Record<Suggestion["type"], string> = {
  optimization: "text-blue-500 bg-blue-500/10",
  warning: "text-yellow-500 bg-yellow-500/10",
  feature: "text-purple-500 bg-purple-500/10",
  security: "text-red-500 bg-red-500/10",
  performance: "text-green-500 bg-green-500/10",
};

const priorityColors: Record<Suggestion["priority"], string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

// AI-powered suggestion generator
function generateSuggestions(config: AgentConfig): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Check system prompt quality
  if (!config.systemPrompt || config.systemPrompt.length < 100) {
    suggestions.push({
      id: "prompt-length",
      type: "warning",
      title: "系统提示词过短",
      description: "建议添加更详细的系统提示词，以提高 Agent 的响应质量和一致性。",
      priority: "high",
      impact: "提升 30% 响应质量",
      actionLabel: "优化提示词",
      category: "基础配置",
    });
  }

  // Check for persona definition
  if (config.systemPrompt && !/(你是|你扮演|你的角色|You are|Act as)/i.test(config.systemPrompt)) {
    suggestions.push({
      id: "persona-missing",
      type: "feature",
      title: "添加角色定义",
      description: "为 Agent 添加明确的角色定义可以让其行为更加一致和专业。",
      priority: "medium",
      impact: "提升用户体验",
      actionLabel: "添加角色",
      category: "人格配置",
    });
  }

  // Check skills
  if (!config.skills || config.skills.length === 0) {
    suggestions.push({
      id: "no-skills",
      type: "feature",
      title: "未挂载任何技能",
      description: "为 Agent 添加技能可以扩展其能力，如网络搜索、代码执行等。",
      priority: "medium",
      impact: "扩展 Agent 能力",
      actionLabel: "浏览技能库",
      category: "技能配置",
    });
  } else if (config.skills.length > 10) {
    suggestions.push({
      id: "too-many-skills",
      type: "performance",
      title: "技能数量过多",
      description: "挂载过多技能可能导致响应变慢和决策困难，建议精简到核心技能。",
      priority: "low",
      impact: "提升响应速度",
      actionLabel: "优化技能",
      category: "性能优化",
    });
  }

  // Check MPLP policy
  if (!config.mplpPolicy || config.mplpPolicy === "permissive") {
    suggestions.push({
      id: "security-policy",
      type: "security",
      title: "安全策略宽松",
      description: "当前安全策略较为宽松，建议根据使用场景调整权限边界。",
      priority: "medium",
      impact: "增强安全性",
      actionLabel: "调整策略",
      category: "安全配置",
    });
  }

  // Check graph complexity
  if (config.nodes && config.nodes.length > 20) {
    suggestions.push({
      id: "complex-graph",
      type: "optimization",
      title: "工作流结构复杂",
      description: "当前工作流节点较多，考虑将部分逻辑封装为子流程以提高可维护性。",
      priority: "low",
      impact: "提升可维护性",
      actionLabel: "优化结构",
      category: "架构优化",
      autoFix: true,
    });
  }

  // Check for disconnected nodes
  if (config.nodes && config.edges) {
    const connectedNodes = new Set<string>();
    config.edges.forEach((edge: any) => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    const disconnected = config.nodes.filter((n: any) => !connectedNodes.has(n.id));
    if (disconnected.length > 0) {
      suggestions.push({
        id: "disconnected-nodes",
        type: "warning",
        title: `发现 ${disconnected.length} 个孤立节点`,
        description: "这些节点未与任何其他节点连接，可能是配置遗漏。",
        priority: "high",
        impact: "修复工作流",
        actionLabel: "查看节点",
        category: "工作流",
      });
    }
  }

  // Check model selection
  if (config.model && config.model.includes("gpt-4")) {
    suggestions.push({
      id: "model-cost",
      type: "optimization",
      title: "考虑模型成本",
      description: "GPT-4 性能强大但成本较高，对于简单任务可考虑使用 GPT-3.5 或 Claude。",
      priority: "low",
      impact: "降低 60% 成本",
      actionLabel: "对比模型",
      category: "成本优化",
    });
  }

  // Add enhancement suggestion if config is complete
  if (suggestions.length === 0) {
    suggestions.push({
      id: "all-good",
      type: "feature",
      title: "配置完整 🎉",
      description: "你的 Agent 配置看起来不错！可以考虑添加更多高级功能。",
      priority: "low",
      impact: "探索更多可能",
      actionLabel: "查看高级功能",
      category: "进阶",
    });
  }

  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function SuggestionCard({ 
  suggestion, 
  onApply, 
  onDismiss 
}: { 
  suggestion: Suggestion; 
  onApply: () => void;
  onDismiss: () => void;
}) {
  const Icon = typeIcons[suggestion.type];
  const colorClass = typeColors[suggestion.type];
  const priorityClass = priorityColors[suggestion.priority];

  return (
    <motion.div
      variants={staggerItem}
      layout
      exit={{ opacity: 0, x: -20 }}
      className="group"
    >
      <Card className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className={cn("p-2 rounded-lg h-fit", colorClass)}>
              <Icon className="h-4 w-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-medium mb-1">{suggestion.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {suggestion.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={onDismiss}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("text-[10px]", priorityClass)}>
                  {suggestion.priority === "high" ? "高优先" : 
                   suggestion.priority === "medium" ? "中优先" : "低优先"}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {suggestion.category}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  预期效果: {suggestion.impact}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" variant="default" className="h-7 text-xs" onClick={onApply}>
                  {suggestion.autoFix && <Wand2 className="h-3 w-3 mr-1" />}
                  {suggestion.actionLabel}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AIAssistantSuggestions({
  agentConfig,
  onApplySuggestion,
  onDismiss,
  className,
  isCollapsed = false,
  onToggleCollapse,
}: AIAssistantSuggestionsProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  
  const suggestions = useMemo(() => {
    return generateSuggestions(agentConfig).filter(s => !dismissedIds.has(s.id));
  }, [agentConfig, dismissedIds]);

  const handleDismiss = useCallback((id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    onDismiss?.(id);
  }, [onDismiss]);

  const handleApply = useCallback((suggestion: Suggestion) => {
    onApplySuggestion?.(suggestion);
  }, [onApplySuggestion]);

  const completionScore = useMemo(() => {
    const total = suggestions.length + dismissedIds.size;
    if (total === 0) return 100;
    return Math.round((dismissedIds.size / total) * 100);
  }, [suggestions.length, dismissedIds.size]);

  const highPriorityCount = suggestions.filter(s => s.priority === "high").length;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className={cn("space-y-4", className)}
    >
      {/* Header */}
      <motion.div variants={staggerItem}>
        <Card className="bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    AI 助手建议
                    {highPriorityCount > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {highPriorityCount} 个重要
                      </Badge>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    智能分析你的配置，提供优化建议
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium">{completionScore}%</div>
                  <div className="text-[10px] text-muted-foreground">配置完成度</div>
                </div>
                <Progress value={completionScore} className="w-20 h-2" />
                
                {onToggleCollapse && (
                  <Button variant="ghost" size="icon" onClick={onToggleCollapse}>
                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* Suggestions List */}
      <AnimatePresence mode="popLayout">
        {!isCollapsed && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {suggestions.length === 0 ? (
              <motion.div variants={staggerItem}>
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                    <h4 className="font-medium mb-1">配置完美！</h4>
                    <p className="text-sm text-muted-foreground">
                      所有建议已处理，你的 Agent 配置很棒
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={suggestion}
                  onApply={() => handleApply(suggestion)}
                  onDismiss={() => handleDismiss(suggestion.id)}
                />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Quick action bar for inline suggestions
export function AIQuickSuggestionBar({
  suggestions,
  onApply,
}: {
  suggestions: Suggestion[];
  onApply: (suggestion: Suggestion) => void;
}) {
  if (suggestions.length === 0) return null;

  const topSuggestion = suggestions[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20"
    >
      <Lightbulb className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="text-sm text-foreground/80 flex-1 truncate">
        {topSuggestion.title}
      </span>
      <Button 
        size="sm" 
        variant="ghost" 
        className="h-6 text-xs"
        onClick={() => onApply(topSuggestion)}
      >
        {topSuggestion.actionLabel}
      </Button>
    </motion.div>
  );
}
