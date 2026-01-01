import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Save,
  Settings,
  Zap,
  FileInput,
  FileOutput,
  Shield,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SkillParam {
  id: string;
  name: string;
  type: string;
  description: string;
  required: boolean;
  defaultValue?: string;
}

interface SkillConfig {
  name: string;
  description: string;
  category: string;
  permissions: string[];
  inputs: SkillParam[];
  outputs: SkillParam[];
  aiModel?: string;
  timeout?: number;
}

interface LowCodeConfiguratorProps {
  initialConfig?: SkillConfig;
  onSave: (config: SkillConfig, generatedFiles: {
    skillMd: string;
    handlerPy: string;
    configYaml: string;
  }) => void;
  onCancel?: () => void;
}

const categories = [
  { value: "nlp", label: "文本处理", icon: "📝" },
  { value: "data", label: "数据分析", icon: "📊" },
  { value: "integration", label: "外部集成", icon: "🔗" },
  { value: "automation", label: "自动化", icon: "⚡" },
  { value: "utility", label: "实用工具", icon: "🔧" },
];

const permissionOptions = [
  { value: "internet_access", label: "联网访问", description: "可以访问互联网" },
  { value: "read", label: "读取数据", description: "可以读取用户数据" },
  { value: "write", label: "写入数据", description: "可以写入或修改数据" },
  { value: "ai_inference", label: "AI 推理", description: "可以调用AI模型" },
];

const paramTypes = [
  { value: "string", label: "文本" },
  { value: "number", label: "数字" },
  { value: "boolean", label: "是/否" },
  { value: "array", label: "列表" },
  { value: "object", label: "对象" },
];

const defaultConfig: SkillConfig = {
  name: "",
  description: "",
  category: "nlp",
  permissions: ["read"],
  inputs: [],
  outputs: [],
  timeout: 30,
};

export function LowCodeConfigurator({
  initialConfig,
  onSave,
  onCancel,
}: LowCodeConfiguratorProps) {
  const [config, setConfig] = useState<SkillConfig>(initialConfig || defaultConfig);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    inputs: true,
    outputs: true,
    permissions: false,
    advanced: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const addParam = (type: "inputs" | "outputs") => {
    const newParam: SkillParam = {
      id: Date.now().toString(),
      name: "",
      type: "string",
      description: "",
      required: type === "inputs",
    };
    setConfig(prev => ({
      ...prev,
      [type]: [...prev[type], newParam],
    }));
  };

  const updateParam = (type: "inputs" | "outputs", id: string, field: keyof SkillParam, value: any) => {
    setConfig(prev => ({
      ...prev,
      [type]: prev[type].map(p => p.id === id ? { ...p, [field]: value } : p),
    }));
  };

  const removeParam = (type: "inputs" | "outputs", id: string) => {
    setConfig(prev => ({
      ...prev,
      [type]: prev[type].filter(p => p.id !== id),
    }));
  };

  const togglePermission = (permission: string) => {
    setConfig(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const generateFiles = (): { skillMd: string; handlerPy: string; configYaml: string } => {
    // 生成 SKILL.md
    const inputsYaml = config.inputs.map(input => `  - name: ${input.name}
    type: ${input.type}
    description: ${input.description}
    required: ${input.required}${input.defaultValue ? `\n    default: ${input.defaultValue}` : ""}`).join("\n");
    
    const outputsYaml = config.outputs.map(output => `  - name: ${output.name}
    type: ${output.type}
    description: ${output.description}`).join("\n");

    const skillMd = `---
name: "${config.name}"
version: "1.0.0"
description: "${config.description}"
author: "Agent OS Studio"
permissions:
${config.permissions.map(p => `  - ${p}`).join("\n")}
inputs:
${inputsYaml || "  []"}
outputs:
${outputsYaml || "  []"}
---

# ${config.name}

## 能力描述

${config.description}

## 使用示例

\`\`\`
用户: [示例输入]
助手: [示例输出]
\`\`\`

## 注意事项

- 请确保输入格式正确
- 处理结果会在几秒内返回
`;

    // 生成 handler.py
    const inputParams = config.inputs.map(i => `    ${i.name} = inputs.get("${i.name}", "")`).join("\n");
    const outputReturn = config.outputs.length > 0 
      ? `{\n        ${config.outputs.map(o => `"${o.name}": result`).join(",\n        ")}\n    }`
      : '{"result": result}';

    const handlerPy = `"""
${config.name} - ${config.description}
"""

from typing import Dict, Any


async def handle(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    处理请求
    
    Args:
        inputs: 输入参数字典
        
    Returns:
        处理结果
    """
${inputParams}
    
    # TODO: 实现具体逻辑
    result = "处理完成"
    
    return ${outputReturn}


def validate_inputs(inputs: Dict[str, Any]) -> bool:
    """验证输入参数"""
    required_fields = [${config.inputs.filter(i => i.required).map(i => `"${i.name}"`).join(", ")}]
    return all(field in inputs for field in required_fields)
`;

    // 生成 config.yaml
    const configYaml = `# ${config.name} 配置
runtime:
  python_version: "3.11"
  timeout_seconds: ${config.timeout || 30}
  memory_mb: 256

dependencies: []

environment:
  LOG_LEVEL: INFO
`;

    return { skillMd, handlerPy, configYaml };
  };

  const handleSave = () => {
    if (!config.name.trim()) {
      return;
    }
    const files = generateFiles();
    onSave(config, files);
  };

  const isValid = config.name.trim() && config.description.trim();

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {/* 头部 */}
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">可视化配置</h2>
              <p className="text-xs text-muted-foreground">无需编写代码，表单化创建能力</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
            <Button onClick={handleSave} disabled={!isValid} className="gap-2">
              <Save className="h-4 w-4" />
              保存能力
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-2xl mx-auto">
            {/* 基本信息 */}
            <ConfigSection
              title="基本信息"
              icon={<Sparkles className="h-4 w-4" />}
              expanded={expandedSections.basic}
              onToggle={() => toggleSection("basic")}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">能力名称 *</Label>
                  <Input
                    id="name"
                    placeholder="例如：智能摘要"
                    value={config.name}
                    onChange={(e) => setConfig(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">功能描述 *</Label>
                  <Textarea
                    id="description"
                    placeholder="描述这个能力可以做什么..."
                    value={config.description}
                    onChange={(e) => setConfig(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>分类</Label>
                  <Select
                    value={config.category}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            {cat.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ConfigSection>

            {/* 输入参数 */}
            <ConfigSection
              title="输入参数"
              icon={<FileInput className="h-4 w-4" />}
              expanded={expandedSections.inputs}
              onToggle={() => toggleSection("inputs")}
              badge={config.inputs.length > 0 ? `${config.inputs.length}` : undefined}
            >
              <div className="space-y-3">
                {config.inputs.map((param) => (
                  <ParamEditor
                    key={param.id}
                    param={param}
                    onUpdate={(field, value) => updateParam("inputs", param.id, field, value)}
                    onRemove={() => removeParam("inputs", param.id)}
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => addParam("inputs")}
                >
                  <Plus className="h-4 w-4" />
                  添加输入参数
                </Button>
              </div>
            </ConfigSection>

            {/* 输出参数 */}
            <ConfigSection
              title="输出参数"
              icon={<FileOutput className="h-4 w-4" />}
              expanded={expandedSections.outputs}
              onToggle={() => toggleSection("outputs")}
              badge={config.outputs.length > 0 ? `${config.outputs.length}` : undefined}
            >
              <div className="space-y-3">
                {config.outputs.map((param) => (
                  <ParamEditor
                    key={param.id}
                    param={param}
                    onUpdate={(field, value) => updateParam("outputs", param.id, field, value)}
                    onRemove={() => removeParam("outputs", param.id)}
                    showRequired={false}
                  />
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => addParam("outputs")}
                >
                  <Plus className="h-4 w-4" />
                  添加输出参数
                </Button>
              </div>
            </ConfigSection>

            {/* 权限配置 */}
            <ConfigSection
              title="权限配置"
              icon={<Shield className="h-4 w-4" />}
              expanded={expandedSections.permissions}
              onToggle={() => toggleSection("permissions")}
              badge={config.permissions.length > 0 ? `${config.permissions.length}` : undefined}
            >
              <div className="space-y-3">
                {permissionOptions.map((perm) => (
                  <div
                    key={perm.value}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      config.permissions.includes(perm.value) 
                        ? "border-primary/50 bg-primary/5" 
                        : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={config.permissions.includes(perm.value)}
                        onCheckedChange={() => togglePermission(perm.value)}
                      />
                      <div>
                        <p className="text-sm font-medium">{perm.label}</p>
                        <p className="text-xs text-muted-foreground">{perm.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ConfigSection>

            {/* 高级设置 */}
            <ConfigSection
              title="高级设置"
              icon={<Zap className="h-4 w-4" />}
              expanded={expandedSections.advanced}
              onToggle={() => toggleSection("advanced")}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>超时时间（秒）</Label>
                  <Input
                    type="number"
                    value={config.timeout}
                    onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                    min={1}
                    max={300}
                  />
                  <p className="text-xs text-muted-foreground">
                    能力执行的最大时间限制
                  </p>
                </div>
              </div>
            </ConfigSection>
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
}

// 配置区块组件
function ConfigSection({
  title,
  icon,
  expanded,
  onToggle,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <Collapsible open={expanded} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                {icon}
                {title}
                {badge && (
                  <Badge variant="secondary" className="text-xs">
                    {badge}
                  </Badge>
                )}
              </span>
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// 参数编辑器组件
function ParamEditor({
  param,
  onUpdate,
  onRemove,
  showRequired = true,
}: {
  param: SkillParam;
  onUpdate: (field: keyof SkillParam, value: any) => void;
  onRemove: () => void;
  showRequired?: boolean;
}) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">参数名</Label>
              <Input
                placeholder="如：text"
                value={param.name}
                onChange={(e) => onUpdate("name", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">类型</Label>
              <Select
                value={param.type}
                onValueChange={(value) => onUpdate("type", value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paramTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">描述</Label>
          <Input
            placeholder="参数的用途说明"
            value={param.description}
            onChange={(e) => onUpdate("description", e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        {showRequired && (
          <div className="flex items-center gap-2">
            <Switch
              checked={param.required}
              onCheckedChange={(checked) => onUpdate("required", checked)}
            />
            <Label className="text-xs text-muted-foreground">必填参数</Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
