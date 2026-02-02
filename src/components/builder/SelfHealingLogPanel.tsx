// =====================================================
// 错误自愈日志面板
// Self-Healing Log Panel - Visualize healing process
// =====================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Zap,
  ChevronDown,
  ChevronRight,
  Trash2,
  ArrowRight,
  Activity,
  FileCode,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { HealingResult, ErrorAnalysis } from "@/hooks/useSelfHealing";

interface HealingLogEntry {
  id: string;
  timestamp: Date;
  analysis: ErrorAnalysis;
  result: HealingResult;
  originalDescription: string;
  failedSkillNames: string[];
}

interface SelfHealingLogPanelProps {
  healingLog: string[];
  isHealing: boolean;
  healingProgress: number;
  healingHistory?: HealingLogEntry[];
  onClearHistory?: () => void;
  className?: string;
}

export function SelfHealingLogPanel({
  healingLog,
  isHealing,
  healingProgress,
  healingHistory = [],
  onClearHistory,
  className,
}: SelfHealingLogPanelProps) {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleEntry = (id: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case "regenerate":
        return <RefreshCw className="h-3.5 w-3.5" />;
      case "simplify":
        return <FileCode className="h-3.5 w-3.5" />;
      case "remove":
        return <Trash2 className="h-3.5 w-3.5" />;
      case "retry":
        return <RotateCcw className="h-3.5 w-3.5" />;
      default:
        return <Wrench className="h-3.5 w-3.5" />;
    }
  };

  const getStrategyLabel = (strategy: string) => {
    switch (strategy) {
      case "regenerate":
        return "重新生成";
      case "simplify":
        return "简化配置";
      case "remove":
        return "移除组件";
      case "retry":
        return "重试执行";
      default:
        return strategy;
    }
  };

  const getErrorTypeLabel = (errorType: string) => {
    switch (errorType) {
      case "yaml_syntax":
        return "YAML 语法错误";
      case "tool_not_found":
        return "工具未找到";
      case "prompt_error":
        return "提示词错误";
      case "timeout":
        return "执行超时";
      default:
        return "未知错误";
    }
  };

  const getErrorTypeColor = (errorType: string) => {
    switch (errorType) {
      case "yaml_syntax":
        return "text-orange-500";
      case "tool_not_found":
        return "text-red-500";
      case "prompt_error":
        return "text-yellow-500";
      case "timeout":
        return "text-blue-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className={cn("border-border/50", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            错误自愈日志
          </div>
          {healingHistory.length > 0 && onClearHistory && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearHistory}
              className="h-7 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              清空历史
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 当前自愈进度 */}
        <AnimatePresence>
          {isHealing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 rounded-lg border border-primary/30 bg-primary/5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="relative">
                  <RefreshCw className="h-5 w-5 text-primary animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">正在执行自愈...</div>
                  <div className="text-xs text-muted-foreground">
                    自动修复检测到的问题
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {healingProgress}%
                </Badge>
              </div>
              <Progress value={healingProgress} className="h-1.5" />
              
              {/* 实时日志 */}
              {healingLog.length > 0 && (
                <ScrollArea className="h-24 mt-3">
                  <div className="space-y-1 font-mono text-xs">
                    {healingLog.map((log, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "text-muted-foreground",
                          log.includes("✓") && "text-green-500",
                          log.includes("❌") && "text-red-500"
                        )}
                      >
                        {log}
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 历史记录 */}
        {healingHistory.length > 0 ? (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {healingHistory.map((entry) => (
                <Collapsible
                  key={entry.id}
                  open={expandedEntries.has(entry.id)}
                  onOpenChange={() => toggleEntry(entry.id)}
                >
                  <CollapsibleTrigger asChild>
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        entry.result.success
                          ? "bg-green-500/5 border-green-500/20 hover:border-green-500/40"
                          : "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {entry.result.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <div className="text-sm font-medium flex items-center gap-2">
                              {entry.failedSkillNames.join(", ") || "未知组件"}
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[10px]",
                                  getErrorTypeColor(entry.analysis.errorType)
                                )}
                              >
                                {getErrorTypeLabel(entry.analysis.errorType)}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {entry.timestamp.toLocaleString("zh-CN")}
                              <span className="mx-1">•</span>
                              <span className="flex items-center gap-1">
                                {getStrategyIcon(entry.analysis.fixStrategy)}
                                {getStrategyLabel(entry.analysis.fixStrategy)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {entry.result.attempts} 次尝试
                          </Badge>
                          {expandedEntries.has(entry.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 ml-7 p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      {/* 修复详情 */}
                      <div className="space-y-3">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            修复建议
                          </div>
                          <div className="text-sm">{entry.analysis.suggestion}</div>
                        </div>

                        {entry.result.regeneratedSkills.length > 0 && (
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              重新生成的技能
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {entry.result.regeneratedSkills.map((skill) => (
                                <Badge key={skill.id} variant="secondary" className="text-xs">
                                  {skill.name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 日志详情 */}
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            执行日志
                          </div>
                          <ScrollArea className="h-24">
                            <div className="space-y-0.5 font-mono text-[11px]">
                              {entry.result.healingLog.map((log, idx) => (
                                <div
                                  key={idx}
                                  className={cn(
                                    "text-muted-foreground",
                                    log.includes("✓") && "text-green-500",
                                    log.includes("❌") && "text-red-500"
                                  )}
                                >
                                  {log}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        ) : !isHealing ? (
          <div className="text-center py-8">
            <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">暂无自愈记录</div>
            <div className="text-xs text-muted-foreground/70 mt-1">
              当检测到错误时，系统将自动尝试修复
            </div>
          </div>
        ) : null}

        {/* 统计摘要 */}
        {healingHistory.length > 0 && (
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-500">
                {healingHistory.filter((h) => h.result.success).length}
              </div>
              <div className="text-xs text-muted-foreground">成功修复</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-500">
                {healingHistory.filter((h) => !h.result.success).length}
              </div>
              <div className="text-xs text-muted-foreground">修复失败</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-muted-foreground">
                {healingHistory.reduce((sum, h) => sum + h.result.attempts, 0)}
              </div>
              <div className="text-xs text-muted-foreground">总尝试次数</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
