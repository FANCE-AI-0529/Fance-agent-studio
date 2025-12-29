import { Settings, Rocket, Shield, Trash2, Code2, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skill } from "./SkillMarketplace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface AgentConfig {
  name: string;
  department: string;
  model: "claude-3.5" | "gpt-4";
  systemPrompt: string;
}

export interface SkillConfigOverride {
  skillId: string;
  enabled: boolean;
  priority: number;
  parameters: Record<string, string | number | boolean>;
}

interface AgentConfigPanelProps {
  config: AgentConfig;
  onConfigChange: (config: AgentConfig) => void;
  skills: Skill[];
  onRemoveSkill: (skillId: string) => void;
  onDeploy: () => void;
  onShowManifest: () => void;
  canDeploy: boolean;
  selectedSkill: Skill | null;
  skillOverrides: Record<string, SkillConfigOverride>;
  onSkillOverrideChange: (skillId: string, override: SkillConfigOverride) => void;
}

// Department is now a free-form text field for flexibility

export function AgentConfigPanel({
  config,
  onConfigChange,
  skills,
  onRemoveSkill,
  onDeploy,
  onShowManifest,
  canDeploy,
  selectedSkill,
  skillOverrides,
  onSkillOverrideChange,
}: AgentConfigPanelProps) {
  // Show skill details when a skill node is selected
  if (selectedSkill) {
    const override = skillOverrides[selectedSkill.id] || {
      skillId: selectedSkill.id,
      enabled: true,
      priority: 1,
      parameters: {},
    };

    const handleOverrideChange = (updates: Partial<SkillConfigOverride>) => {
      onSkillOverrideChange(selectedSkill.id, { ...override, ...updates });
    };

    const handleParameterChange = (paramName: string, value: string | number | boolean) => {
      handleOverrideChange({
        parameters: { ...override.parameters, [paramName]: value },
      });
    };

    return (
      <div className="w-80 border-l border-border flex flex-col bg-card/50">
        {/* Header */}
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-cognitive" />
            <span className="font-semibold text-sm">技能配置</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Skill Name */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              技能名称
            </label>
            <div className="p-3 rounded-lg border border-border bg-secondary/30">
              <span className="font-medium">{selectedSkill.name}</span>
              <span className="text-xs text-muted-foreground ml-2">
                v{selectedSkill.version}
              </span>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              分类
            </label>
            <Badge variant="outline">{selectedSkill.category}</Badge>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              描述
            </label>
            <p className="text-sm text-muted-foreground">
              {selectedSkill.description || "暂无描述"}
            </p>
          </div>

          {/* Config Overrides Section */}
          <div className="space-y-3 pt-2 border-t border-border">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              配置覆写 (Config Overrides)
            </label>

            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div>
                <Label className="text-sm font-medium">启用技能</Label>
                <p className="text-xs text-muted-foreground">是否在运行时启用此技能</p>
              </div>
              <Switch
                checked={override.enabled}
                onCheckedChange={(enabled) => handleOverrideChange({ enabled })}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">优先级</Label>
              <Select
                value={override.priority.toString()}
                onValueChange={(value) =>
                  handleOverrideChange({ priority: parseInt(value) })
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - 最高优先</SelectItem>
                  <SelectItem value="2">2 - 高优先</SelectItem>
                  <SelectItem value="3">3 - 普通</SelectItem>
                  <SelectItem value="4">4 - 低优先</SelectItem>
                  <SelectItem value="5">5 - 最低优先</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic Parameters based on skill inputs */}
            {selectedSkill.inputs && selectedSkill.inputs.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  输入参数默认值
                </label>
                {selectedSkill.inputs.map((input) => (
                  <div key={input.name} className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      {input.name}
                      {input.required && (
                        <span className="text-destructive">*</span>
                      )}
                    </Label>
                    {input.description && (
                      <p className="text-[10px] text-muted-foreground">
                        {input.description}
                      </p>
                    )}
                    {input.type === "boolean" ? (
                      <Switch
                        checked={
                          override.parameters[input.name] as boolean || false
                        }
                        onCheckedChange={(value) =>
                          handleParameterChange(input.name, value)
                        }
                      />
                    ) : input.type === "number" ? (
                      <Input
                        type="number"
                        placeholder={`默认 ${input.name}`}
                        value={
                          (override.parameters[input.name] as number) || ""
                        }
                        onChange={(e) =>
                          handleParameterChange(
                            input.name,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="bg-background h-8"
                      />
                    ) : (
                      <Input
                        placeholder={`默认 ${input.name}`}
                        value={
                          (override.parameters[input.name] as string) || ""
                        }
                        onChange={(e) =>
                          handleParameterChange(input.name, e.target.value)
                        }
                        className="bg-background h-8"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Custom Parameters */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                自定义参数
              </label>
              <div className="space-y-2">
                <Input
                  placeholder="参数名=值 (如: timeout=30)"
                  className="bg-background h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const input = e.currentTarget;
                      const [key, value] = input.value.split("=");
                      if (key && value) {
                        const numValue = parseFloat(value);
                        handleParameterChange(
                          key.trim(),
                          isNaN(numValue) ? value.trim() : numValue
                        );
                        input.value = "";
                      }
                    }
                  }}
                />
                {Object.entries(override.parameters).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(override.parameters).map(([key, value]) => (
                      <Badge
                        key={key}
                        variant="secondary"
                        className="text-[10px] gap-1"
                      >
                        {key}={String(value)}
                        <button
                          onClick={() => {
                            const newParams = { ...override.parameters };
                            delete newParams[key];
                            handleOverrideChange({ parameters: newParams });
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              所需权限
            </label>
            <div className="flex flex-wrap gap-1">
              {selectedSkill.permissions.map((perm) => (
                <Badge key={perm} variant="secondary" className="text-xs">
                  {perm}
                </Badge>
              ))}
              {selectedSkill.permissions.length === 0 && (
                <span className="text-xs text-muted-foreground">无特殊权限</span>
              )}
            </div>
          </div>

          {/* Remove Skill */}
          <div className="pt-4">
            <Button
              variant="destructive"
              size="sm"
              className="w-full gap-2"
              onClick={() => onRemoveSkill(selectedSkill.id)}
            >
              <Trash2 className="h-4 w-4" />
              移除技能
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show agent config when agent node is selected or nothing is selected
  return (
    <div className="w-80 border-l border-border flex flex-col bg-card/50">
      {/* Header */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-governance" />
          <span className="font-semibold text-sm">Agent 配置</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Basic Info */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              基础信息
            </label>
            <div className="space-y-2">
              <Input
                placeholder="智能体名称"
                value={config.name}
                onChange={(e) =>
                  onConfigChange({ ...config, name: e.target.value })
                }
                className="bg-background"
              />
              <Input
                placeholder="所属部门/团队 (可选)"
                value={config.department}
                onChange={(e) =>
                  onConfigChange({ ...config, department: e.target.value })
                }
                className="bg-background"
              />
            </div>
          </div>

          {/* Role/System Prompt */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              角色设定 (System Prompt)
            </label>
            <Textarea
              placeholder="定义 Agent 的角色、行为和能力边界..."
              value={config.systemPrompt}
              onChange={(e) =>
                onConfigChange({ ...config, systemPrompt: e.target.value })
              }
              className="bg-background min-h-[100px] resize-none"
            />
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              基础模型
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onConfigChange({ ...config, model: "claude-3.5" })}
                className={`p-3 rounded-lg border text-sm text-center transition-colors ${
                  config.model === "claude-3.5"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-muted-foreground"
                }`}
              >
                Claude 3.5
              </button>
              <button
                onClick={() => onConfigChange({ ...config, model: "gpt-4" })}
                className={`p-3 rounded-lg border text-sm text-center transition-colors ${
                  config.model === "gpt-4"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-muted-foreground"
                }`}
              >
                GPT-4
              </button>
            </div>
          </div>

          {/* MPLP Policy */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              MPLP 策略
            </label>
            <div className="p-3 rounded-lg border border-border bg-secondary/30">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-governance" />
                <span className="text-xs font-medium">治理策略: 默认</span>
              </div>
              <p className="text-xs text-muted-foreground">
                敏感操作需人工确认，全链路日志记录
              </p>
            </div>
          </div>

          {/* Mounted Skills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                已装载技能 ({skills.length})
              </label>
            </div>
            <div className="space-y-2">
              {skills.map((skill) => {
                const override = skillOverrides[skill.id];
                const hasOverrides = override && Object.keys(override.parameters).length > 0;
                
                return (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between p-2 rounded border border-border bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="text-sm font-medium truncate">{skill.name}</div>
                        {hasOverrides && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            已配置
                          </Badge>
                        )}
                        {override && !override.enabled && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 bg-muted">
                            已禁用
                          </Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        v{skill.version}
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveSkill(skill.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
              {skills.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                  拖拽技能到画布中
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={onShowManifest}
          disabled={skills.length === 0}
        >
          <Code2 className="h-4 w-4" />
          查看 Manifest
        </Button>
        <Button
          className="w-full gap-2"
          size="lg"
          onClick={onDeploy}
          disabled={!canDeploy}
        >
          <Rocket className="h-4 w-4" />
          发布 Agent
        </Button>
      </div>
    </div>
  );
}
