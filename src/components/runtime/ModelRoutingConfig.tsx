import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Route,
  Plus,
  Trash2,
  ChevronDown,
  Cpu,
  Zap,
  DollarSign,
  Settings2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useModelRoutingRules,
  useCreateRoutingRule,
  useUpdateRoutingRule,
  useDeleteRoutingRule,
  routingModels,
  routingTemplates,
  ModelRoutingRule,
} from "@/hooks/useModelRouting";

interface ModelRoutingConfigProps {
  agentId?: string | null;
  agentName?: string;
}

export function ModelRoutingConfig({ agentId, agentName }: ModelRoutingConfigProps) {
  const [open, setOpen] = useState(false);
  const [showNewRule, setShowNewRule] = useState(false);
  const [editingRule, setEditingRule] = useState<ModelRoutingRule | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(100);
  const [targetModel, setTargetModel] = useState("google/gemini-2.5-flash");
  const [fallbackModel, setFallbackModel] = useState<string>("");
  const [taskType, setTaskType] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [inputTokensLt, setInputTokensLt] = useState("");
  const [keywords, setKeywords] = useState("");

  const { data: rules = [], isLoading } = useModelRoutingRules(agentId);
  const createMutation = useCreateRoutingRule();
  const updateMutation = useUpdateRoutingRule();
  const deleteMutation = useDeleteRoutingRule();

  const resetForm = () => {
    setName("");
    setDescription("");
    setPriority(100);
    setTargetModel("google/gemini-2.5-flash");
    setFallbackModel("");
    setTaskType("");
    setRiskLevel("");
    setInputTokensLt("");
    setKeywords("");
    setShowNewRule(false);
    setEditingRule(null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("请输入规则名称");
      return;
    }

    const conditions: Record<string, unknown> = {};
    if (taskType) conditions.task_type = taskType;
    if (riskLevel) conditions.risk_level = riskLevel;
    if (inputTokensLt) conditions.input_tokens_lt = parseInt(inputTokensLt);
    if (keywords) conditions.keywords = keywords.split(",").map(k => k.trim());

    try {
      if (editingRule) {
        await updateMutation.mutateAsync({
          id: editingRule.id,
          name,
          description,
          priority,
          conditions,
          target_model: targetModel,
          fallback_model: fallbackModel || null,
        });
      } else {
        await createMutation.mutateAsync({
          name,
          description,
          priority,
          conditions,
          target_model: targetModel,
          fallback_model: fallbackModel || null,
          agent_id: agentId,
        });
      }
      resetForm();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEdit = (rule: ModelRoutingRule) => {
    setEditingRule(rule);
    setName(rule.name);
    setDescription(rule.description || "");
    setPriority(rule.priority);
    setTargetModel(rule.target_model);
    setFallbackModel(rule.fallback_model || "");
    setTaskType(rule.conditions?.task_type as string || "");
    setRiskLevel(rule.conditions?.risk_level as string || "");
    setInputTokensLt(rule.conditions?.input_tokens_lt?.toString() || "");
    setKeywords((rule.conditions?.keywords as string[])?.join(", ") || "");
    setShowNewRule(true);
  };

  const handleApplyTemplate = (template: typeof routingTemplates[0]) => {
    setName(template.name);
    setDescription(template.description);
    setTargetModel(template.target_model);
    setFallbackModel((template as any).fallback_model || "");
    setTaskType((template.conditions as any).task_type || "");
    setRiskLevel((template.conditions as any).risk_level || "");
    setInputTokensLt((template.conditions as any).input_tokens_lt?.toString() || "");
    setShowNewRule(true);
    toast.success(`已应用模板「${template.name}」`);
  };

  const handleDelete = async (ruleId: string) => {
    await deleteMutation.mutateAsync(ruleId);
  };

  const handleToggleActive = async (rule: ModelRoutingRule) => {
    await updateMutation.mutateAsync({
      id: rule.id,
      is_active: !rule.is_active,
    });
  };

  const getModelInfo = (modelId: string) => {
    return routingModels.find(m => m.id === modelId);
  };

  const getCostColor = (tier: string) => {
    switch (tier) {
      case "low": return "text-green-500";
      case "medium": return "text-yellow-500";
      case "high": return "text-red-500";
      default: return "text-muted-foreground";
    }
  };

  const getSpeedBadge = (tier: string) => {
    switch (tier) {
      case "fastest": return { color: "bg-green-500/10 text-green-500", label: "极快" };
      case "fast": return { color: "bg-blue-500/10 text-blue-500", label: "快速" };
      case "medium": return { color: "bg-yellow-500/10 text-yellow-500", label: "中等" };
      case "slow": return { color: "bg-red-500/10 text-red-500", label: "较慢" };
      default: return { color: "bg-muted", label: tier };
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Route className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">模型路由</span>
          {rules.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1">
              {rules.length}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Route className="h-5 w-5 text-primary" />
            模型路由策略
          </SheetTitle>
          <SheetDescription>
            根据任务类型自动选择最佳模型，优化成本和性能
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4 py-4">
            {/* Quick Templates */}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                快速模板
              </Label>
              <div className="flex flex-wrap gap-2">
                {routingTemplates.map((template, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleApplyTemplate(template)}
                  >
                    <Zap className="h-3 w-3" />
                    {template.name.split(" → ")[0]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Existing Rules */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">
                  已配置规则 ({rules.length})
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1"
                  onClick={() => setShowNewRule(true)}
                >
                  <Plus className="h-3 w-3" />
                  新建规则
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-lg">
                  <Route className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">
                    暂无路由规则，将使用默认模型
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowNewRule(true)}
                  >
                    创建第一条规则
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {rules.map((rule) => {
                    const modelInfo = getModelInfo(rule.target_model);
                    const speedBadge = modelInfo ? getSpeedBadge(modelInfo.speedTier) : null;
                    
                    return (
                      <div
                        key={rule.id}
                        className={cn(
                          "border rounded-lg p-3 transition-all",
                          rule.is_active ? "bg-card" : "bg-muted/30 opacity-60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">
                                {rule.name}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1 h-4">
                                优先级 {rule.priority}
                              </Badge>
                            </div>
                            {rule.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                {rule.description}
                              </p>
                            )}
                            
                            {/* Routing visualization */}
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <div className="flex items-center gap-1 px-2 py-1 bg-secondary/50 rounded">
                                <Settings2 className="h-3 w-3" />
                                <span>
                                  {Object.keys(rule.conditions || {}).length > 0
                                    ? Object.entries(rule.conditions || {})
                                        .map(([k, v]) => `${k}=${v}`)
                                        .join(", ")
                                    : "所有请求"}
                                </span>
                              </div>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <div className="flex items-center gap-1 px-2 py-1 bg-primary/10 rounded">
                                <Cpu className="h-3 w-3 text-primary" />
                                <span>{modelInfo?.name || rule.target_model}</span>
                              </div>
                            </div>
                            
                            {/* Model stats */}
                            {modelInfo && (
                              <div className="flex items-center gap-2 mt-1.5">
                                {speedBadge && (
                                  <Badge variant="outline" className={cn("text-[10px] h-4 px-1", speedBadge.color)}>
                                    {speedBadge.label}
                                  </Badge>
                                )}
                                <span className={cn("text-[10px] flex items-center gap-0.5", getCostColor(modelInfo.costTier))}>
                                  <DollarSign className="h-2.5 w-2.5" />
                                  {modelInfo.costTier === "low" ? "低成本" : modelInfo.costTier === "medium" ? "中等" : "高成本"}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Switch
                              checked={rule.is_active}
                              onCheckedChange={() => handleToggleActive(rule)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(rule)}
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleDelete(rule.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* New/Edit Rule Form */}
            <Collapsible open={showNewRule} onOpenChange={setShowNewRule}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between"
                  onClick={() => setShowNewRule(!showNewRule)}
                >
                  <span>{editingRule ? "编辑规则" : "新建规则"}</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showNewRule && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">规则名称</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="如：翻译任务路由"
                      className="h-8 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">优先级 (越小越优先)</Label>
                    <Input
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(parseInt(e.target.value) || 100)}
                      className="h-8 mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">描述</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="可选，描述此规则的用途"
                    className="h-8 mt-1"
                  />
                </div>

                <div className="border-t pt-3">
                  <Label className="text-xs text-muted-foreground">匹配条件</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label className="text-xs">任务类型</Label>
                      <Select value={taskType} onValueChange={setTaskType}>
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue placeholder="选择任务类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">不限</SelectItem>
                          <SelectItem value="translation">翻译</SelectItem>
                          <SelectItem value="code_generation">代码生成</SelectItem>
                          <SelectItem value="analysis">分析</SelectItem>
                          <SelectItem value="summarization">摘要</SelectItem>
                          <SelectItem value="chat">对话</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">风险级别</Label>
                      <Select value={riskLevel} onValueChange={setRiskLevel}>
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue placeholder="选择风险级别" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">不限</SelectItem>
                          <SelectItem value="low">低风险</SelectItem>
                          <SelectItem value="medium">中风险</SelectItem>
                          <SelectItem value="high">高风险</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">输入Token &lt;</Label>
                      <Input
                        type="number"
                        value={inputTokensLt}
                        onChange={(e) => setInputTokensLt(e.target.value)}
                        placeholder="如：1000"
                        className="h-8 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">关键词（逗号分隔）</Label>
                      <Input
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="如：翻译,translate"
                        className="h-8 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <Label className="text-xs text-muted-foreground">目标模型</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <Label className="text-xs">主模型</Label>
                      <Select value={targetModel} onValueChange={setTargetModel}>
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {routingModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex items-center gap-2">
                                <span>{model.name}</span>
                                <span className={cn("text-[10px]", getCostColor(model.costTier))}>
                                  ${model.costTier}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">备选模型</Label>
                      <Select value={fallbackModel} onValueChange={setFallbackModel}>
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue placeholder="可选" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">无</SelectItem>
                          {routingModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={resetForm}
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleSave}
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    )}
                    {editingRule ? "更新规则" : "创建规则"}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Model Reference */}
            <div className="border-t pt-4">
              <Label className="text-xs text-muted-foreground mb-2 block">
                可用模型参考
              </Label>
              <div className="grid gap-2">
                {routingModels.map((model) => {
                  const speedBadge = getSpeedBadge(model.speedTier);
                  return (
                    <div
                      key={model.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 border border-border/50"
                    >
                      <div className="flex items-center gap-2">
                        <Cpu className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{model.name}</div>
                          <div className="text-xs text-muted-foreground">{model.description}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-[10px] h-4 px-1", speedBadge.color)}>
                          {speedBadge.label}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[10px] h-4 px-1", getCostColor(model.costTier))}>
                          <DollarSign className="h-2.5 w-2.5 mr-0.5" />
                          {model.costTier}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
