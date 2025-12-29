import { Settings, Rocket, Shield, Trash2, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skill } from "./SkillMarketplace";

interface AgentConfig {
  name: string;
  department: string;
  model: "claude-3.5" | "gpt-4";
}

interface AgentConfigPanelProps {
  config: AgentConfig;
  onConfigChange: (config: AgentConfig) => void;
  skills: Skill[];
  onRemoveSkill: (skillId: string) => void;
  onDeploy: () => void;
  onShowManifest: () => void;
  canDeploy: boolean;
}

export function AgentConfigPanel({
  config,
  onConfigChange,
  skills,
  onRemoveSkill,
  onDeploy,
  onShowManifest,
  canDeploy,
}: AgentConfigPanelProps) {
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
                placeholder="所属部门"
                value={config.department}
                onChange={(e) =>
                  onConfigChange({ ...config, department: e.target.value })
                }
                className="bg-background"
              />
            </div>
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