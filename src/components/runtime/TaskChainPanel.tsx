import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Link2,
  Play,
  Pause,
  XCircle,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  GitBranch,
  Layers,
  Eye,
  RefreshCw,
  Workflow,
  Edit3,
  Sparkles,
  Save,
} from "lucide-react";
import { TaskChainVisualEditor } from "./TaskChainVisualEditor";
import { TaskChainTemplates, type TaskChainTemplate } from "./TaskChainTemplates";
import {
  useTaskChains,
  useTaskChain,
  useCreateChain,
  useExecuteChain,
  useCancelChain,
  useDeleteChain,
  useRealtimeChainUpdates,
  chainStatusColors,
  chainStatusLabels,
  stepStatusColors,
  stepStatusLabels,
  executionModeLabels,
  type TaskChain,
  type ChainStep,
} from "@/hooks/useTaskChains";
import { useDeployedAgents } from "@/hooks/useAgents";
import { taskTypeLabels } from "@/hooks/useTaskDelegation";

interface TaskChainPanelProps {
  currentAgentId?: string;
}

interface StepConfig {
  name: string;
  description: string;
  taskType: string;
  targetAgentId: string;
  inputMapping: Record<string, string>;
  outputKey: string;
  parallelGroup: number;
}

export function TaskChainPanel({ currentAgentId }: TaskChainPanelProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showVisualEditor, setShowVisualEditor] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [chainToSaveAsTemplate, setChainToSaveAsTemplate] = useState<TaskChain | null>(null);
  const [editingChain, setEditingChain] = useState<TaskChain | null>(null);
  const [selectedChainId, setSelectedChainId] = useState<string | null>(null);
  
  // Create form state
  const [chainName, setChainName] = useState("");
  const [chainDescription, setChainDescription] = useState("");
  const [executionMode, setExecutionMode] = useState<"sequential" | "parallel" | "mixed">("sequential");
  const [steps, setSteps] = useState<StepConfig[]>([
    { name: "", description: "", taskType: "general", targetAgentId: "", inputMapping: {}, outputKey: "", parallelGroup: 0 }
  ]);
  const [initialContext, setInitialContext] = useState("");

  const { data: chains = [], isLoading: chainsLoading, refetch: refetchChains } = useTaskChains();
  const { data: selectedChain, refetch: refetchChain } = useTaskChain(selectedChainId);
  const { data: agents = [] } = useDeployedAgents();
  
  const createChain = useCreateChain();
  const executeChain = useExecuteChain();
  const cancelChain = useCancelChain();
  const deleteChain = useDeleteChain();

  // Real-time updates
  const handleChainUpdate = useCallback(() => {
    refetchChains();
    if (selectedChainId) refetchChain();
  }, [refetchChains, refetchChain, selectedChainId]);

  useRealtimeChainUpdates(selectedChainId, handleChainUpdate);

  const addStep = () => {
    setSteps([
      ...steps,
      {
        name: "",
        description: "",
        taskType: "general",
        targetAgentId: "",
        inputMapping: {},
        outputKey: "",
        parallelGroup: executionMode === "parallel" ? 0 : steps.length,
      },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof StepConfig, value: any) => {
    const newSteps = [...steps];
    (newSteps[index] as any)[field] = value;
    setSteps(newSteps);
  };

  const handleCreate = async () => {
    if (!chainName || steps.length === 0 || steps.some(s => !s.name)) return;

    await createChain.mutateAsync({
      name: chainName,
      description: chainDescription,
      executionMode,
      sourceAgentId: currentAgentId,
      steps: steps.map((s, i) => ({
        name: s.name,
        description: s.description,
        taskType: s.taskType,
        targetAgentId: s.targetAgentId || currentAgentId,
        inputMapping: s.inputMapping,
        outputKey: s.outputKey || `step_${i}`,
        parallelGroup: s.parallelGroup,
      })),
    });

    setShowCreateDialog(false);
    resetForm();
  };

  const resetForm = () => {
    setChainName("");
    setChainDescription("");
    setExecutionMode("sequential");
    setSteps([{ name: "", description: "", taskType: "general", targetAgentId: "", inputMapping: {}, outputKey: "", parallelGroup: 0 }]);
    setInitialContext("");
  };

  const handleSelectTemplate = async (template: TaskChainTemplate) => {
    // Create chain directly from template
    await createChain.mutateAsync({
      name: template.name,
      description: template.description,
      executionMode: template.executionMode,
      sourceAgentId: currentAgentId,
      steps: template.steps.map((s, i) => ({
        name: s.name,
        description: s.description,
        taskType: s.taskType,
        targetAgentId: currentAgentId,
        inputMapping: s.inputMapping || {},
        outputKey: s.outputKey || `step_${i}`,
        parallelGroup: s.parallelGroup ?? i,
      })),
    });
    setShowTemplates(false);
  };

  const handleExecute = async (chainId: string) => {
    let context = {};
    if (initialContext) {
      try {
        context = JSON.parse(initialContext);
      } catch {
        context = { userInput: initialContext };
      }
    }
    await executeChain.mutateAsync({ chainId, initialContext: context });
  };

  const viewChainDetail = (chain: TaskChain) => {
    setSelectedChainId(chain.id);
    setShowDetailDialog(true);
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            任务链
          </div>
          <div className="flex gap-1">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowTemplates(true)}
            >
              <Sparkles className="h-4 w-4 mr-1" />
              模板
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                setEditingChain(null);
                setShowVisualEditor(true);
              }}
            >
              <Workflow className="h-4 w-4 mr-1" />
              可视化
            </Button>
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              新建
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chainsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : chains.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Layers className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>暂无任务链</p>
            <p className="text-xs">创建任务链以自动串联多步骤任务</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {chains.map((chain) => (
                <Card key={chain.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{chain.name}</span>
                          <Badge
                            variant="outline"
                            style={{ borderColor: chainStatusColors[chain.status], color: chainStatusColors[chain.status] }}
                          >
                            {chainStatusLabels[chain.status]}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {executionModeLabels[chain.execution_mode]}
                          </Badge>
                        </div>
                        {chain.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {chain.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{chain.total_steps} 步骤</span>
                          {chain.status === "running" && (
                            <div className="flex items-center gap-1">
                              <Progress 
                                value={(chain.completed_steps / chain.total_steps) * 100} 
                                className="w-20 h-1" 
                              />
                              <span>{chain.completed_steps}/{chain.total_steps}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewChainDetail(chain)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {chain.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedChainId(chain.id);
                              setEditingChain(chain);
                              setShowVisualEditor(true);
                            }}
                          >
                            <Edit3 className="h-4 w-4 text-primary" />
                          </Button>
                        )}
                        {chain.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExecute(chain.id)}
                            disabled={executeChain.isPending}
                          >
                            {executeChain.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4 text-green-500" />
                            )}
                          </Button>
                        )}
                        {chain.status === "running" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelChain.mutate(chain.id)}
                          >
                            <XCircle className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                        {["draft", "completed", "failed", "cancelled"].includes(chain.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteChain.mutate(chain.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                创建任务链
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>任务链名称</Label>
                    <Input
                      value={chainName}
                      onChange={(e) => setChainName(e.target.value)}
                      placeholder="例: 税务申报流程"
                    />
                  </div>
                  <div>
                    <Label>执行模式</Label>
                    <Select value={executionMode} onValueChange={(v: any) => setExecutionMode(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sequential">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4" />
                            串行执行
                          </div>
                        </SelectItem>
                        <SelectItem value="parallel">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            并行执行
                          </div>
                        </SelectItem>
                        <SelectItem value="mixed">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4" />
                            混合模式
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>描述</Label>
                  <Textarea
                    value={chainDescription}
                    onChange={(e) => setChainDescription(e.target.value)}
                    placeholder="任务链的整体描述..."
                    rows={2}
                  />
                </div>

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>执行步骤</Label>
                    <Button variant="outline" size="sm" onClick={addStep}>
                      <Plus className="h-4 w-4 mr-1" />
                      添加步骤
                    </Button>
                  </div>
                  <Accordion type="multiple" defaultValue={["step-0"]} className="space-y-2">
                    {steps.map((step, index) => (
                      <AccordionItem key={index} value={`step-${index}`} className="border rounded-lg px-3">
                        <AccordionTrigger className="py-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              步骤 {index + 1}
                            </Badge>
                            {step.name && <span className="text-sm">{step.name}</span>}
                            {executionMode === "mixed" && (
                              <Badge variant="outline" className="text-xs">
                                组 {step.parallelGroup}
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">步骤名称</Label>
                                <Input
                                  value={step.name}
                                  onChange={(e) => updateStep(index, "name", e.target.value)}
                                  placeholder="例: 收集用户信息"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">任务类型</Label>
                                <Select
                                  value={step.taskType}
                                  onValueChange={(v) => updateStep(index, "taskType", v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(taskTypeLabels).map(([value, label]) => (
                                      <SelectItem key={value} value={value}>
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">步骤描述</Label>
                              <Textarea
                                value={step.description}
                                onChange={(e) => updateStep(index, "description", e.target.value)}
                                placeholder="详细描述这个步骤需要完成的任务..."
                                rows={2}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <Label className="text-xs">目标Agent</Label>
                                <Select
                                  value={step.targetAgentId}
                                  onValueChange={(v) => updateStep(index, "targetAgentId", v)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="使用源Agent" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {agents.map((agent) => (
                                      <SelectItem key={agent.id} value={agent.id}>
                                        {agent.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">输出键名</Label>
                                <Input
                                  value={step.outputKey}
                                  onChange={(e) => updateStep(index, "outputKey", e.target.value)}
                                  placeholder={`step_${index}`}
                                />
                              </div>
                            </div>
                            {executionMode === "mixed" && (
                              <div>
                                <Label className="text-xs">并行组 (相同组号的步骤并行执行)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={step.parallelGroup}
                                  onChange={(e) => updateStep(index, "parallelGroup", parseInt(e.target.value) || 0)}
                                />
                              </div>
                            )}
                            {index > 0 && (
                              <div>
                                <Label className="text-xs">输入映射 (引用前步骤结果)</Label>
                                <Textarea
                                  placeholder='{"user_data": "$prev.data", "summary": "$step.step_0.summary"}'
                                  value={JSON.stringify(step.inputMapping) === "{}" ? "" : JSON.stringify(step.inputMapping)}
                                  onChange={(e) => {
                                    try {
                                      updateStep(index, "inputMapping", JSON.parse(e.target.value || "{}"));
                                    } catch {
                                      // Invalid JSON, ignore
                                    }
                                  }}
                                  rows={2}
                                  className="font-mono text-xs"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  使用 $prev.* 引用上一步结果，$step.name.* 引用指定步骤结果
                                </p>
                              </div>
                            )}
                            {steps.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeStep(index)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                删除步骤
                              </Button>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>

                <Separator />

                <div>
                  <Label>初始上下文 (可选)</Label>
                  <Textarea
                    value={initialContext}
                    onChange={(e) => setInitialContext(e.target.value)}
                    placeholder='{"user_name": "张三", "query": "如何申报个税"}'
                    rows={2}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    JSON格式的初始数据，可在步骤中通过 $context.* 引用
                  </p>
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!chainName || steps.some(s => !s.name) || createChain.isPending}
              >
                {createChain.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                {selectedChain?.name || "任务链详情"}
                {selectedChain && (
                  <Badge
                    variant="outline"
                    style={{ 
                      borderColor: chainStatusColors[selectedChain.status], 
                      color: chainStatusColors[selectedChain.status] 
                    }}
                  >
                    {chainStatusLabels[selectedChain.status]}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedChain && (
              <ScrollArea className="max-h-[70vh]">
                <div className="space-y-4 pr-4">
                  {selectedChain.description && (
                    <p className="text-sm text-muted-foreground">{selectedChain.description}</p>
                  )}
                  
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-primary">{selectedChain.total_steps}</div>
                      <div className="text-xs text-muted-foreground">总步骤</div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-500">{selectedChain.completed_steps}</div>
                      <div className="text-xs text-muted-foreground">已完成</div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-2xl font-bold text-red-500">{selectedChain.failed_steps}</div>
                      <div className="text-xs text-muted-foreground">失败</div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="text-lg font-medium">
                        {executionModeLabels[selectedChain.execution_mode]}
                      </div>
                      <div className="text-xs text-muted-foreground">执行模式</div>
                    </div>
                  </div>

                  {selectedChain.status === "running" && (
                    <Progress 
                      value={(selectedChain.completed_steps / selectedChain.total_steps) * 100} 
                      className="h-2"
                    />
                  )}

                  <Separator />

                  <div>
                    <Label className="text-sm font-medium">执行步骤</Label>
                    <div className="mt-2 space-y-2">
                      {selectedChain.steps?.map((step, index) => (
                        <Card key={step.id} className="overflow-hidden">
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {getStepIcon(step.status)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    步骤 {index + 1}
                                  </Badge>
                                  <span className="font-medium text-sm">{step.name}</span>
                                  <Badge
                                    variant="outline"
                                    style={{ 
                                      borderColor: stepStatusColors[step.status],
                                      color: stepStatusColors[step.status]
                                    }}
                                    className="text-xs"
                                  >
                                    {stepStatusLabels[step.status]}
                                  </Badge>
                                </div>
                                {step.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {step.description}
                                  </p>
                                )}
                                {step.error_message && (
                                  <p className="text-xs text-red-500 mt-1">
                                    错误: {step.error_message}
                                  </p>
                                )}
                                {step.result && (
                                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                                    <pre className="whitespace-pre-wrap overflow-auto max-h-32">
                                      {typeof step.result === "string" 
                                        ? step.result 
                                        : JSON.stringify(step.result, null, 2)
                                      }
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {selectedChain.final_result && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-sm font-medium">最终结果</Label>
                        <div className="mt-2 p-3 bg-muted/50 rounded text-xs">
                          <pre className="whitespace-pre-wrap overflow-auto max-h-48">
                            {JSON.stringify(selectedChain.final_result, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </ScrollArea>
            )}
            <DialogFooter>
              {selectedChain?.status === "draft" && (
                <Button onClick={() => handleExecute(selectedChain.id)} disabled={executeChain.isPending}>
                  {executeChain.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  执行
                </Button>
              )}
              {selectedChain && selectedChain.steps && selectedChain.steps.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setChainToSaveAsTemplate({ ...selectedChain, steps: selectedChain.steps });
                    setShowSaveTemplateDialog(true);
                  }}
                >
                  <Save className="h-4 w-4 mr-1" />
                  保存为模板
                </Button>
              )}
              {["completed", "failed"].includes(selectedChain?.status || "") && (
                <Button variant="outline" onClick={() => refetchChain()}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  刷新
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Visual Editor Dialog */}
        <Dialog open={showVisualEditor} onOpenChange={setShowVisualEditor}>
          <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] p-0">
            <TaskChainVisualEditor
              chain={editingChain ? { ...editingChain, steps: selectedChain?.steps } : null}
              sourceAgentId={currentAgentId}
              onClose={() => {
                setShowVisualEditor(false);
                setEditingChain(null);
                refetchChains();
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Templates Dialog */}
        <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
          <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden">
            <TaskChainTemplates
              onSelectTemplate={handleSelectTemplate}
              onClose={() => setShowTemplates(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Save as Template Dialog */}
        <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
          <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden">
            <TaskChainTemplates
              onSelectTemplate={() => {}}
              onClose={() => setShowSaveTemplateDialog(false)}
              chainToSave={chainToSaveAsTemplate}
              onSaveComplete={() => {
                setShowSaveTemplateDialog(false);
                setChainToSaveAsTemplate(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
