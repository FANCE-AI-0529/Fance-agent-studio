import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Sparkles,
  Puzzle,
  Rocket,
  Check,
  ArrowRight,
  ArrowLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import AgentTemplates, { AgentTemplate } from "./AgentTemplates";
import { Skill } from "./SkillMarketplace";
import { cn } from "@/lib/utils";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const steps: WizardStep[] = [
  {
    id: "template",
    title: "选择模板",
    description: "从预设模板快速开始，或从零创建",
    icon: Sparkles,
  },
  {
    id: "basic",
    title: "基础配置",
    description: "设置智能体名称和用途",
    icon: Bot,
  },
  {
    id: "skills",
    title: "装载技能",
    description: "选择智能体需要的能力",
    icon: Puzzle,
  },
  {
    id: "deploy",
    title: "完成部署",
    description: "检查配置并部署智能体",
    icon: Rocket,
  },
];

interface BuilderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: {
    name: string;
    department: string;
    systemPrompt: string;
    selectedSkillIds: string[];
  }) => void;
  availableSkills: Skill[];
}

export function BuilderWizard({
  isOpen,
  onClose,
  onComplete,
  availableSkills,
}: BuilderWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  const handleSelectTemplate = (template: AgentTemplate) => {
    setName(template.name);
    setDepartment(template.department);
    setSystemPrompt(template.systemPrompt);
    setCurrentStep(1);
  };

  const handleSkipTemplate = () => {
    setCurrentStep(1);
  };

  const handleToggleSkill = (skillId: string) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleComplete = () => {
    onComplete({
      name,
      department,
      systemPrompt,
      selectedSkillIds,
    });
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return true; // Can skip template
      case 1:
        return name.trim() !== "";
      case 2:
        return true; // Skills are optional
      case 3:
        return name.trim() !== "";
      default:
        return false;
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-4xl mx-4 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Progress Steps */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex items-center gap-3 flex-1",
                    index !== steps.length - 1 && "relative"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : isCompleted
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="hidden sm:block">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        isActive
                          ? "text-foreground"
                          : isCompleted
                          ? "text-primary"
                          : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {step.description}
                    </div>
                  </div>
                  {index !== steps.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-px mx-4",
                        isCompleted ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="px-8 pb-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="template"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">
                    选择一个模板快速开始
                  </h2>
                  <p className="text-muted-foreground">
                    模板包含预设的配置和推荐技能，帮助你快速构建智能体
                  </p>
                </div>
                <AgentTemplates
                  onSelectTemplate={handleSelectTemplate}
                  inlineMode
                />
                <div className="flex justify-center pt-4">
                  <Button
                    variant="ghost"
                    onClick={handleSkipTemplate}
                    className="text-muted-foreground"
                  >
                    跳过，从零开始
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="basic"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 max-w-xl mx-auto"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold mb-2">设置基础信息</h2>
                  <p className="text-muted-foreground">
                    给你的智能体起个名字，描述它的用途
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      智能体名称 <span className="text-destructive">*</span>
                    </label>
                    <Input
                      placeholder="例如：客服助手、数据分析师"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 text-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">部门/领域</label>
                    <Input
                      placeholder="例如：客户服务、财务、技术支持"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      系统提示词（可选）
                    </label>
                    <Textarea
                      placeholder="描述智能体的角色、行为规范和专业知识..."
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      className="min-h-[120px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      系统提示词定义了智能体的"人设"，可以稍后在高级配置中修改
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="skills"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold mb-2">装载技能</h2>
                  <p className="text-muted-foreground">
                    选择智能体需要的能力，你可以稍后在画布中添加更多
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                  {availableSkills.map((skill) => {
                    const isSelected = selectedSkillIds.includes(skill.id);
                    return (
                      <Card
                        key={skill.id}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md"
                            : "border-border hover:border-primary/50"
                        )}
                        onClick={() => handleToggleSkill(skill.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <span className="font-medium text-sm">
                              {skill.name}
                            </span>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {skill.description}
                          </p>
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {skill.permissions.slice(0, 2).map((perm) => (
                              <Badge
                                key={perm}
                                variant="secondary"
                                className="text-[10px] px-1.5"
                              >
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {availableSkills.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Puzzle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>暂无可用技能</p>
                    <p className="text-sm">可以稍后在画布中添加技能</p>
                  </div>
                )}

                <div className="text-center">
                  <Badge variant="outline" className="text-sm">
                    已选择 {selectedSkillIds.length} 个技能
                  </Badge>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="deploy"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 max-w-xl mx-auto"
              >
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Rocket className="h-10 w-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">准备就绪！</h2>
                  <p className="text-muted-foreground">
                    检查以下配置，点击完成进入画布进行更多自定义
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <Bot className="h-5 w-5 text-primary" />
                      <span className="font-medium">{name || "未命名智能体"}</span>
                    </div>
                    {department && (
                      <Badge variant="outline" className="mb-2">
                        {department}
                      </Badge>
                    )}
                    {systemPrompt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {systemPrompt}
                      </p>
                    )}
                  </div>

                  {selectedSkillIds.length > 0 && (
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        <Puzzle className="h-4 w-4 text-cognitive" />
                        <span className="text-sm font-medium">
                          已选择的技能
                        </span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {selectedSkillIds.map((id) => {
                          const skill = availableSkills.find((s) => s.id === id);
                          return skill ? (
                            <Badge key={id} variant="secondary">
                              {skill.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="px-8 py-4 border-t border-border flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            上一步
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              disabled={!canProceed()}
            >
              下一步
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleComplete} disabled={!canProceed()}>
              <Check className="mr-2 h-4 w-4" />
              完成并进入画布
            </Button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
