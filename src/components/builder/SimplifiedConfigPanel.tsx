import { useState } from "react";
import {
  Settings,
  Rocket,
  ChevronDown,
  ChevronRight,
  Bot,
  Cpu,
  FileText,
  Shield,
  Variable,
  X,
  Eye,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skill } from "./SkillMarketplace";
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
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgentAvatarPicker, AgentAvatar, AgentAvatarDisplay } from "./AgentAvatarPicker";

export interface SimpleAgentConfig {
  name: string;
  department: string;
  model: string;  // 支持任意模型名称，会在运行时映射到有效的 Gateway 模型
  systemPrompt: string;
  avatar: AgentAvatar;
}

interface SimplifiedConfigPanelProps {
  config: SimpleAgentConfig;
  onConfigChange: (config: SimpleAgentConfig) => void;
  skills: Skill[];
  onRemoveSkill: (skillId: string) => void;
  onDeploy: () => void;
  onShowManifest: () => void;
  onSave: () => void;
  canDeploy: boolean;
  isSaving: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  agentId?: string | null;
  onDelete?: () => void;
  isDeleting?: boolean;
}

export function SimplifiedConfigPanel({
  config,
  onConfigChange,
  skills,
  onRemoveSkill,
  onDeploy,
  onShowManifest,
  onSave,
  canDeploy,
  isSaving,
  isCollapsed,
  onToggleCollapse,
  agentId,
  onDelete,
  isDeleting,
}: SimplifiedConfigPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    skills: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (isCollapsed) {
    return (
      <div className="w-14 border-l border-border flex flex-col bg-card/50 items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 mb-4"
          onClick={onToggleCollapse}
        >
          <Settings className="h-5 w-5" />
        </Button>
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <AgentAvatarDisplay avatar={config.avatar} size="sm" />
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <span className="text-xs font-bold">{skills.length}</span>
          </div>
        </div>
        <Button
          variant="default"
          size="icon"
          className="h-10 w-10 mt-4"
          onClick={onDeploy}
          disabled={!canDeploy || isSaving}
        >
          <Rocket className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full md:w-80 fixed md:relative inset-x-0 bottom-0 md:inset-auto max-h-[70vh] md:max-h-none border-t md:border-t-0 md:border-l border-border flex flex-col bg-card/95 md:bg-card/50 z-40 md:z-auto">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-card/80">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">智能体配置</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onToggleCollapse}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Basic Info Section */}
          <Collapsible
            open={expandedSections.basic}
            onOpenChange={() => toggleSection("basic")}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">基础信息</span>
                </div>
                {expandedSections.basic ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-3 space-y-3">
                {/* Avatar Picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">头像图标</Label>
                  <div className="flex items-center gap-3">
                    <AgentAvatarPicker
                      avatar={config.avatar}
                      onChange={(avatar) => onConfigChange({ ...config, avatar })}
                      size="md"
                    />
                    <div className="text-xs text-muted-foreground">
                      点击选择图标和颜色
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">名称</Label>
                  <Input
                    placeholder="智能体名称"
                    value={config.name}
                    onChange={(e) =>
                      onConfigChange({ ...config, name: e.target.value })
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">部门</Label>
                  <Input
                    placeholder="所属部门"
                    value={config.department}
                    onChange={(e) =>
                      onConfigChange({ ...config, department: e.target.value })
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">模型</Label>
                  <Select
                    value={config.model}
                    onValueChange={(value: "claude-3.5" | "gpt-4") =>
                      onConfigChange({ ...config, model: value })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-3.5">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-3.5 w-3.5" />
                          Claude 3.5 Sonnet
                        </div>
                      </SelectItem>
                      <SelectItem value="gpt-4">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-3.5 w-3.5" />
                          GPT-4 Turbo
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* System Prompt Section */}
          <Collapsible
            open={expandedSections.prompt}
            onOpenChange={() => toggleSection("prompt")}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cognitive" />
                  <span className="font-medium text-sm">系统提示词</span>
                </div>
                <div className="flex items-center gap-2">
                  {config.systemPrompt && (
                    <Badge variant="secondary" className="text-[10px]">
                      已配置
                    </Badge>
                  )}
                  {expandedSections.prompt ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-3">
                <Textarea
                  placeholder="定义智能体的角色、行为规范和专业知识..."
                  value={config.systemPrompt}
                  onChange={(e) =>
                    onConfigChange({ ...config, systemPrompt: e.target.value })
                  }
                  className="min-h-[120px] resize-none text-sm"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Skills Section */}
          <Collapsible
            open={expandedSections.skills}
            onOpenChange={() => toggleSection("skills")}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-governance" />
                  <span className="font-medium text-sm">已装载技能</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {skills.length}
                  </Badge>
                  {expandedSections.skills ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-3 space-y-2">
                {skills.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    <p>暂无技能</p>
                    <p className="text-xs mt-1">从左侧拖拽技能到画布</p>
                  </div>
                ) : (
                  skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {skill.name}
                        </div>
                        <div className="flex gap-1 mt-1">
                          {skill.permissions.slice(0, 2).map((perm) => (
                            <Badge
                              key={perm}
                              variant="outline"
                              className="text-[10px] px-1.5"
                            >
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onRemoveSkill(skill.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Advanced Section */}
          <Collapsible
            open={expandedSections.advanced}
            onOpenChange={() => toggleSection("advanced")}
          >
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex items-center gap-2">
                  <Variable className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm text-muted-foreground">
                    高级配置
                  </span>
                </div>
                {expandedSections.advanced ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-3 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 h-9"
                  onClick={onShowManifest}
                >
                  <Eye className="h-3.5 w-3.5" />
                  查看完整配置 (Manifest)
                </Button>
                <p className="text-[10px] text-muted-foreground px-1">
                  环境变量、技能覆写等高级配置可在完整配置中编辑
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t border-border bg-card/80 space-y-2">
        <Button
          className="w-full gap-2"
          onClick={onDeploy}
          disabled={!canDeploy || isSaving || isDeleting}
        >
          <Rocket className="h-4 w-4" />
          保存并部署
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={onSave}
          disabled={isSaving || isDeleting || !config.name.trim()}
        >
          仅保存草稿
        </Button>
        {agentId && onDelete && (
          <Button
            variant="outline"
            className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
            disabled={isSaving || isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除此智能体
          </Button>
        )}
      </div>
    </div>
  );
}
