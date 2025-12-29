import { Settings, Rocket, Shield, Trash2, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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

interface AgentConfigPanelProps {
  config: AgentConfig;
  onConfigChange: (config: AgentConfig) => void;
  skills: Skill[];
  onRemoveSkill: (skillId: string) => void;
  onDeploy: () => void;
  onShowManifest: () => void;
  canDeploy: boolean;
  selectedSkill: Skill | null;
}

const departments = [
  { value: "政务服务", label: "政务服务" },
  { value: "城市管理", label: "城市管理" },
  { value: "民生保障", label: "民生保障" },
  { value: "经济发展", label: "经济发展" },
  { value: "生态环保", label: "生态环保" },
  { value: "应急管理", label: "应急管理" },
];

export function AgentConfigPanel({
  config,
  onConfigChange,
  skills,
  onRemoveSkill,
  onDeploy,
  onShowManifest,
  canDeploy,
  selectedSkill,
}: AgentConfigPanelProps) {
  // Show skill details when a skill node is selected
  if (selectedSkill) {
    return (
      <div className="w-80 border-l border-border flex flex-col bg-card/50">
        {/* Header */}
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-cognitive" />
            <span className="font-semibold text-sm">技能详情</span>
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

          {/* Permissions */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              所需权限
            </label>
            <div className="flex flex-wrap gap-1">
              {selectedSkill.permissions.map((perm) => (
                <Badge
                  key={perm}
                  variant="secondary"
                  className="text-xs"
                >
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
              <Select
                value={config.department}
                onValueChange={(value) =>
                  onConfigChange({ ...config, department: value })
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="选择所属部门" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="flex items-center justify-between p-2 rounded border border-border bg-card"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{skill.name}</div>
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
              ))}
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
          部署到城市网络
        </Button>
      </div>
    </div>
  );
}
