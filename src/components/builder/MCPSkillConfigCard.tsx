import { useState } from "react";
import { Card } from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { 
  Wrench, 
  Key, 
  Trash2, 
  Settings, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { MCPBadge, MCPInfoBadges } from "../foundry/MCPBadge.tsx";
import { MCPEnvVarsEditor } from "./MCPEnvVarsEditor.tsx";
import { MCPToolSelectorDialog, type MCPSkillData, type MCPTool } from "./MCPToolSelectorDialog.tsx";
import { permissionMeta, type MPLPPermission } from "../../data/mcpPermissionMapping.ts";

interface MCPSkillConfigCardProps {
  skill: MCPSkillData & {
    enabled_tools?: string[];
    env_vars?: Record<string, string>;
    detected_permissions?: string[];
  };
  onUpdateToolBinding: (skillId: string, enabledTools: string[], permissions: string[]) => void;
  onUpdateEnvVars: (skillId: string, envVars: Record<string, string>) => void;
  onRemove: (skillId: string) => void;
}

export function MCPSkillConfigCard({
  skill,
  onUpdateToolBinding,
  onUpdateEnvVars,
  onRemove,
}: MCPSkillConfigCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToolSelector, setShowToolSelector] = useState(false);
  const [showEnvEditor, setShowEnvEditor] = useState(false);

  const tools = skill.mcp_tools || [];
  const enabledTools = skill.enabled_tools || [];
  const envVars = skill.env_vars || {};
  const permissions = skill.detected_permissions || [];

  const configuredEnvCount = Object.values(envVars).filter((v) => v?.trim()).length;
  const hasWarning = enabledTools.length === 0 && tools.length > 0;

  return (
    <>
      <Card className={`p-3 ${hasWarning ? "border-amber-500/50" : ""}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-medium text-sm truncate">{skill.name}</span>
                <MCPBadge />
              </div>
              <MCPInfoBadges
                runtime={skill.runtime_env}
                scope={skill.scope}
                isOfficial={skill.is_official}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 shrink-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick Stats */}
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Wrench className="h-3 w-3" />
            <span>
              {enabledTools.length}/{tools.length} Tools
            </span>
            {hasWarning && <AlertCircle className="h-3 w-3 text-amber-500" />}
          </div>
          <div className="flex items-center gap-1">
            <Key className="h-3 w-3" />
            <span>{configuredEnvCount} 变量</span>
            {configuredEnvCount > 0 && <CheckCircle className="h-3 w-3 text-green-500" />}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* Tool Binding */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">工具绑定</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setShowToolSelector(true)}
                >
                  <Settings className="h-3 w-3 mr-1" />
                  配置
                </Button>
              </div>
              {enabledTools.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {enabledTools.slice(0, 5).map((tool) => (
                    <Badge key={tool} variant="secondary" className="text-[10px]">
                      {tool}
                    </Badge>
                  ))}
                  {enabledTools.length > 5 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{enabledTools.length - 5}
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-xs text-amber-500">未选择任何工具</p>
              )}
            </div>

            {/* Environment Variables */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">环境变量</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setShowEnvEditor(true)}
                >
                  <Key className="h-3 w-3 mr-1" />
                  配置
                </Button>
              </div>
              {configuredEnvCount > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {Object.keys(envVars)
                    .filter((k) => envVars[k]?.trim())
                    .slice(0, 3)
                    .map((key) => (
                      <Badge key={key} variant="outline" className="text-[10px]">
                        {key}
                      </Badge>
                    ))}
                  {configuredEnvCount > 3 && (
                    <Badge variant="outline" className="text-[10px]">
                      +{configuredEnvCount - 3}
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">无环境变量配置</p>
              )}
            </div>

            {/* Detected Permissions */}
            {permissions.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">所需权限</span>
                <div className="flex flex-wrap gap-1">
                  {permissions.map((perm) => {
                    const meta = permissionMeta[perm as MPLPPermission];
                    return (
                      <Badge
                        key={perm}
                        variant="outline"
                        className={`text-[10px] ${meta?.color || ""}`}
                      >
                        {meta?.label || perm}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Remove Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onRemove(skill.id)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              移除技能
            </Button>
          </div>
        )}
      </Card>

      {/* Tool Selector Dialog */}
      <MCPToolSelectorDialog
        open={showToolSelector}
        onOpenChange={setShowToolSelector}
        skill={skill}
        onConfirm={(tools, permissions) => {
          onUpdateToolBinding(skill.id, tools, permissions);
          setShowToolSelector(false);
        }}
        onCancel={() => setShowToolSelector(false)}
      />

      {/* Env Vars Editor Dialog */}
      <MCPEnvVarsEditor
        open={showEnvEditor}
        onOpenChange={setShowEnvEditor}
        skillName={skill.name}
        category={skill.category}
        envVars={envVars}
        onSave={(vars) => onUpdateEnvVars(skill.id, vars)}
      />
    </>
  );
}
