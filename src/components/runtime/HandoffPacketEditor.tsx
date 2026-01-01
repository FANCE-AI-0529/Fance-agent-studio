import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Target,
  FileText,
  Users,
  Settings,
  AlertCircle,
  History,
  Tag,
  Trash2,
  Plus,
  Package,
} from "lucide-react";
import type {
  HandoffContext,
  KeyEntity,
  DoneStep,
  Artifact,
  UserPreferences,
} from "@/hooks/useTaskDelegation";

interface HandoffPacketEditorProps {
  value: HandoffContext;
  onChange: (value: HandoffContext) => void;
  sourceAgentName?: string;
  targetAgentName?: string;
}

const entityTypes = [
  { value: "person", label: "人物" },
  { value: "organization", label: "组织" },
  { value: "location", label: "地点" },
  { value: "date", label: "日期" },
  { value: "number", label: "数值" },
  { value: "policy", label: "政策" },
  { value: "document", label: "文档" },
  { value: "other", label: "其他" },
];

const artifactTypes = [
  { value: "document", label: "文档" },
  { value: "report", label: "报告" },
  { value: "form", label: "表单" },
  { value: "calculation", label: "计算" },
  { value: "data", label: "数据" },
  { value: "image", label: "图片" },
  { value: "other", label: "其他" },
];

export function HandoffPacketEditor({
  value,
  onChange,
  sourceAgentName,
  targetAgentName,
}: HandoffPacketEditorProps) {
  const [newEntity, setNewEntity] = useState<Partial<KeyEntity>>({});
  const [newStep, setNewStep] = useState<Partial<DoneStep>>({});
  const [newArtifact, setNewArtifact] = useState<Partial<Artifact>>({});
  const [newConstraint, setNewConstraint] = useState("");

  // Add entity
  const addEntity = () => {
    if (!newEntity.name || !newEntity.type) return;
    const entity: KeyEntity = {
      name: newEntity.name,
      type: newEntity.type as KeyEntity["type"],
      value: newEntity.value,
      confidence: newEntity.confidence || 1,
      source: sourceAgentName,
    };
    onChange({
      ...value,
      keyEntities: [...(value.keyEntities || []), entity],
    });
    setNewEntity({});
  };

  // Remove entity
  const removeEntity = (index: number) => {
    const entities = [...(value.keyEntities || [])];
    entities.splice(index, 1);
    onChange({ ...value, keyEntities: entities });
  };

  // Add done step
  const addDoneStep = () => {
    if (!newStep.description) return;
    const step: DoneStep = {
      stepId: `step-${Date.now()}`,
      description: newStep.description,
      completedAt: new Date().toISOString(),
      agentId: sourceAgentName,
    };
    onChange({
      ...value,
      doneHistory: [...(value.doneHistory || []), step],
    });
    setNewStep({});
  };

  // Remove done step
  const removeDoneStep = (index: number) => {
    const steps = [...(value.doneHistory || [])];
    steps.splice(index, 1);
    onChange({ ...value, doneHistory: steps });
  };

  // Add artifact
  const addArtifact = () => {
    if (!newArtifact.name || !newArtifact.type) return;
    const artifact: Artifact = {
      id: `artifact-${Date.now()}`,
      type: newArtifact.type as Artifact["type"],
      name: newArtifact.name,
      content: newArtifact.content,
      createdAt: new Date().toISOString(),
      createdBy: sourceAgentName,
    };
    onChange({
      ...value,
      artifacts: [...(value.artifacts || []), artifact],
    });
    setNewArtifact({});
  };

  // Remove artifact
  const removeArtifact = (index: number) => {
    const artifacts = [...(value.artifacts || [])];
    artifacts.splice(index, 1);
    onChange({ ...value, artifacts: artifacts });
  };

  // Add constraint
  const addConstraint = () => {
    if (!newConstraint) return;
    onChange({
      ...value,
      constraints: [...(value.constraints || []), newConstraint],
    });
    setNewConstraint("");
  };

  // Remove constraint
  const removeConstraint = (index: number) => {
    const constraints = [...(value.constraints || [])];
    constraints.splice(index, 1);
    onChange({ ...value, constraints: constraints });
  };

  // Update user preferences
  const updatePreferences = (prefs: Partial<UserPreferences>) => {
    onChange({
      ...value,
      userPreferences: { ...(value.userPreferences || {}), ...prefs },
    });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          HandoffPacket 上下文配置
          {sourceAgentName && targetAgentName && (
            <Badge variant="outline" className="ml-2 text-xs">
              {sourceAgentName} → {targetAgentName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <Accordion type="multiple" defaultValue={["goal", "entities"]} className="px-4">
            {/* Goal Section */}
            <AccordionItem value="goal">
              <AccordionTrigger className="py-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span>任务目标 (Goal)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">任务目标</Label>
                    <Textarea
                      placeholder="描述本次任务需要完成的目标..."
                      value={value.goal || ""}
                      onChange={(e) => onChange({ ...value, goal: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">原始用户请求</Label>
                    <Textarea
                      placeholder="用户的原始问题或请求..."
                      value={value.userQuery || ""}
                      onChange={(e) => onChange({ ...value, userQuery: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">紧急程度</Label>
                      <Select
                        value={value.urgency || "normal"}
                        onValueChange={(v) =>
                          onChange({ ...value, urgency: v as HandoffContext["urgency"] })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">低</SelectItem>
                          <SelectItem value="normal">普通</SelectItem>
                          <SelectItem value="high">高</SelectItem>
                          <SelectItem value="urgent">紧急</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">会话轮次</Label>
                      <Input
                        type="number"
                        value={value.turnCount || 0}
                        onChange={(e) =>
                          onChange({ ...value, turnCount: parseInt(e.target.value) || 0 })
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Conversation Summary */}
            <AccordionItem value="summary">
              <AccordionTrigger className="py-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-500" />
                  <span>会话摘要</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Textarea
                  placeholder="总结之前的对话内容和关键信息..."
                  value={value.conversationSummary || ""}
                  onChange={(e) => onChange({ ...value, conversationSummary: e.target.value })}
                  rows={4}
                />
              </AccordionContent>
            </AccordionItem>

            {/* Key Entities */}
            <AccordionItem value="entities">
              <AccordionTrigger className="py-2">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-purple-500" />
                  <span>关键实体 ({value.keyEntities?.length || 0})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {/* Existing entities */}
                  {value.keyEntities?.map((entity, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                    >
                      <Badge variant="outline" className="text-xs">
                        {entityTypes.find((t) => t.value === entity.type)?.label}
                      </Badge>
                      <span className="flex-1 text-sm font-medium">{entity.name}</span>
                      {entity.value && (
                        <span className="text-xs text-muted-foreground">{entity.value}</span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEntity(index)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  {/* Add new entity */}
                  <div className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="实体名称"
                      value={newEntity.name || ""}
                      onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
                    />
                    <Select
                      value={newEntity.type || ""}
                      onValueChange={(v) =>
                        setNewEntity({ ...newEntity, type: v as KeyEntity["type"] })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {entityTypes.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="值(可选)"
                      value={newEntity.value || ""}
                      onChange={(e) => setNewEntity({ ...newEntity, value: e.target.value })}
                    />
                    <Button onClick={addEntity} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Done History */}
            <AccordionItem value="history">
              <AccordionTrigger className="py-2">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-orange-500" />
                  <span>已完成步骤 ({value.doneHistory?.length || 0})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {/* Existing steps */}
                  {value.doneHistory?.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                    >
                      <Badge variant="secondary" className="text-xs">
                        步骤 {index + 1}
                      </Badge>
                      <span className="flex-1 text-sm">{step.description}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDoneStep(index)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  {/* Add new step */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="描述已完成的步骤..."
                      value={newStep.description || ""}
                      onChange={(e) => setNewStep({ ...newStep, description: e.target.value })}
                      className="flex-1"
                    />
                    <Button onClick={addDoneStep} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Constraints */}
            <AccordionItem value="constraints">
              <AccordionTrigger className="py-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span>约束条件 ({value.constraints?.length || 0})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {/* Existing constraints */}
                  {value.constraints?.map((constraint, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-lg"
                    >
                      <span className="flex-1 text-sm">{constraint}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeConstraint(index)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  {/* Add new constraint */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="添加约束条件(如法规、政策限制)..."
                      value={newConstraint}
                      onChange={(e) => setNewConstraint(e.target.value)}
                      className="flex-1"
                    />
                    <Button onClick={addConstraint} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  <Separator className="my-2" />

                  {/* Legal requirements */}
                  <div>
                    <Label className="text-xs text-muted-foreground">法规要求</Label>
                    <Textarea
                      placeholder="需要遵守的法律法规..."
                      value={value.legalRequirements?.join("\n") || ""}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          legalRequirements: e.target.value.split("\n").filter(Boolean),
                        })
                      }
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Artifacts */}
            <AccordionItem value="artifacts">
              <AccordionTrigger className="py-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-cyan-500" />
                  <span>生成文件 ({value.artifacts?.length || 0})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {/* Existing artifacts */}
                  {value.artifacts?.map((artifact, index) => (
                    <div
                      key={index}
                      className="p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {artifactTypes.find((t) => t.value === artifact.type)?.label}
                        </Badge>
                        <span className="flex-1 text-sm font-medium">{artifact.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArtifact(index)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      {artifact.content && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {artifact.content.substring(0, 100)}...
                        </p>
                      )}
                    </div>
                  ))}

                  {/* Add new artifact */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="文件名称"
                        value={newArtifact.name || ""}
                        onChange={(e) => setNewArtifact({ ...newArtifact, name: e.target.value })}
                      />
                      <Select
                        value={newArtifact.type || ""}
                        onValueChange={(v) =>
                          setNewArtifact({ ...newArtifact, type: v as Artifact["type"] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="类型" />
                        </SelectTrigger>
                        <SelectContent>
                          {artifactTypes.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={addArtifact} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="文件内容(可选)..."
                      value={newArtifact.content || ""}
                      onChange={(e) => setNewArtifact({ ...newArtifact, content: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* User Preferences */}
            <AccordionItem value="preferences">
              <AccordionTrigger className="py-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  <span>用户偏好</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">语言</Label>
                      <Select
                        value={value.userPreferences?.language || "zh"}
                        onValueChange={(v) => updatePreferences({ language: v })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zh">中文</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">响应格式</Label>
                      <Select
                        value={value.userPreferences?.responseFormat || "detailed"}
                        onValueChange={(v) =>
                          updatePreferences({
                            responseFormat: v as UserPreferences["responseFormat"],
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="brief">简洁</SelectItem>
                          <SelectItem value="detailed">详细</SelectItem>
                          <SelectItem value="structured">结构化</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">重点关注(每行一个)</Label>
                    <Textarea
                      placeholder="需要重点关注的主题..."
                      value={value.userPreferences?.priorityFocus?.join("\n") || ""}
                      onChange={(e) =>
                        updatePreferences({
                          priorityFocus: e.target.value.split("\n").filter(Boolean),
                        })
                      }
                      rows={2}
                      className="mt-1"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* User Profile */}
            <AccordionItem value="profile">
              <AccordionTrigger className="py-2">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-gray-500" />
                  <span>用户信息</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">部门</Label>
                    <Input
                      placeholder="所属部门"
                      value={value.userProfile?.department || ""}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          userProfile: { ...(value.userProfile || {}), department: e.target.value },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">角色</Label>
                    <Input
                      placeholder="用户角色"
                      value={value.userProfile?.role || ""}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          userProfile: { ...(value.userProfile || {}), role: e.target.value },
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">访问级别</Label>
                    <Select
                      value={value.userProfile?.accessLevel || "standard"}
                      onValueChange={(v) =>
                        onChange({
                          ...value,
                          userProfile: { ...(value.userProfile || {}), accessLevel: v },
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">公开</SelectItem>
                        <SelectItem value="standard">标准</SelectItem>
                        <SelectItem value="confidential">机密</SelectItem>
                        <SelectItem value="secret">绝密</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
