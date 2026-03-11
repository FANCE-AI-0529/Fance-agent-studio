import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible.tsx";
import {
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  Settings2,
  Variable,
  Shield,
  ArrowUpDown,
  Wand2,
  Check,
} from "lucide-react";
import { cn } from "../../lib/utils.ts";
import { parseSkillMd, SkillMetadata } from "./SkillValidator.tsx";

// Available permission options
const permissionOptions = [
  { id: "read", label: "读取", description: "读取文件和数据" },
  { id: "write", label: "写入", description: "写入文件和数据" },
  { id: "internet_access", label: "网络访问", description: "访问外部网络" },
  { id: "execute", label: "执行", description: "执行系统命令" },
  { id: "database_access", label: "数据库", description: "访问数据库" },
  { id: "file_system", label: "文件系统", description: "完整文件系统访问" },
];

// Input/Output types
const paramTypes = [
  { id: "string", label: "字符串" },
  { id: "number", label: "数字" },
  { id: "boolean", label: "布尔值" },
  { id: "object", label: "对象" },
  { id: "array", label: "数组" },
  { id: "file", label: "文件" },
];

interface SkillMetadataEditorProps {
  content: string;
  onChange: (content: string) => void;
  onMetadataChange?: (metadata: SkillMetadata) => void;
}

interface ParamItem {
  name: string;
  type: string;
  description: string;
  required?: boolean;
}

export function SkillMetadataEditor({
  content,
  onChange,
  onMetadataChange,
}: SkillMetadataEditorProps) {
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    permissions: true,
    inputs: true,
    outputs: true,
  });

  // Parse current content
  const parsed = useMemo(() => parseSkillMd(content), [content]);
  const metadata = parsed.metadata;

  // Local state for editing
  const [name, setName] = useState(metadata?.name || "");
  const [version, setVersion] = useState(metadata?.version || "1.0.0");
  const [description, setDescription] = useState(metadata?.description || "");
  const [author, setAuthor] = useState(metadata?.author || "");
  const [permissions, setPermissions] = useState<string[]>(
    metadata?.permissions || []
  );
  const [inputs, setInputs] = useState<ParamItem[]>(
    (metadata?.inputs as ParamItem[]) || []
  );
  const [outputs, setOutputs] = useState<ParamItem[]>(
    (metadata?.outputs as ParamItem[]) || []
  );

  // Update local state when content changes externally
  useEffect(() => {
    if (metadata) {
      setName(metadata.name || "");
      setVersion(metadata.version || "1.0.0");
      setDescription(metadata.description || "");
      setAuthor(metadata.author || "");
      setPermissions(metadata.permissions || []);
      setInputs((metadata.inputs as ParamItem[]) || []);
      setOutputs((metadata.outputs as ParamItem[]) || []);
    }
  }, [metadata]);

  // Generate SKILL.md content from metadata
  const generateContent = useCallback(() => {
    const frontmatter = `---
name: "${name}"
version: "${version}"
description: "${description}"
author: "${author}"
permissions:
${permissions.length > 0 ? permissions.map(p => `  - ${p}`).join("\n") : "  - read"}
inputs:
${inputs.length > 0 
  ? inputs.map(i => `  - name: ${i.name}
    type: ${i.type}
    description: ${i.description}${i.required !== false ? "\n    required: true" : ""}`).join("\n")
  : `  - name: query
    type: string
    description: 输入参数`}
outputs:
${outputs.length > 0 
  ? outputs.map(o => `  - name: ${o.name}
    type: ${o.type}
    description: ${o.description}`).join("\n")
  : `  - name: response
    type: string
    description: 输出结果`}
---

# ${name || "技能名称"}

## 能力描述

${description || "描述此技能的功能和用途。"}

## 使用示例

\`\`\`
用户: 示例输入
助手: 示例输出
\`\`\`

## 注意事项

- 遵循最佳实践
- 正确处理错误情况
`;
    return frontmatter;
  }, [name, version, description, author, permissions, inputs, outputs]);

  // Apply changes to content
  const handleApplyChanges = useCallback(() => {
    const newContent = generateContent();
    onChange(newContent);
    
    if (onMetadataChange) {
      onMetadataChange({
        name,
        version,
        description,
        author,
        permissions,
        inputs,
        outputs,
      });
    }
  }, [generateContent, onChange, onMetadataChange, name, version, description, author, permissions, inputs, outputs]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const togglePermission = (permId: string) => {
    setPermissions(prev =>
      prev.includes(permId)
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  const addInput = () => {
    setInputs(prev => [
      ...prev,
      { name: `input_${prev.length + 1}`, type: "string", description: "", required: true },
    ]);
  };

  const updateInput = (index: number, field: keyof ParamItem, value: string | boolean) => {
    setInputs(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeInput = (index: number) => {
    setInputs(prev => prev.filter((_, i) => i !== index));
  };

  const addOutput = () => {
    setOutputs(prev => [
      ...prev,
      { name: `output_${prev.length + 1}`, type: "string", description: "" },
    ]);
  };

  const updateOutput = (index: number, field: keyof ParamItem, value: string) => {
    setOutputs(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  const removeOutput = (index: number) => {
    setOutputs(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">可视化编辑器</span>
        </div>
        <Button size="sm" onClick={handleApplyChanges} className="h-7 gap-1">
          <Check className="h-3.5 w-3.5" />
          应用更改
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Basic Info Section */}
          <Collapsible
            open={expandedSections.basic}
            onOpenChange={() => toggleSection("basic")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 h-auto"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cognitive" />
                  <span className="font-medium">基本信息</span>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedSections.basic && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">技能名称</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="my-skill"
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">版本号</Label>
                  <Input
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    className="h-8 mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">作者</Label>
                <Input
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Author name"
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">描述</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="技能功能描述..."
                  className="mt-1 min-h-[60px]"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Permissions Section */}
          <Collapsible
            open={expandedSections.permissions}
            onOpenChange={() => toggleSection("permissions")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 h-auto"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-governance" />
                  <span className="font-medium">权限配置</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    {permissions.length}
                  </Badge>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedSections.permissions && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-2">
                {permissionOptions.map((perm) => (
                  <div
                    key={perm.id}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                      permissions.includes(perm.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-secondary/50"
                    )}
                    onClick={() => togglePermission(perm.id)}
                  >
                    <Checkbox
                      checked={permissions.includes(perm.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium">{perm.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {perm.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Inputs Section */}
          <Collapsible
            open={expandedSections.inputs}
            onOpenChange={() => toggleSection("inputs")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 h-auto"
              >
                <div className="flex items-center gap-2">
                  <Variable className="h-4 w-4 text-primary" />
                  <span className="font-medium">输入参数</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    {inputs.length}
                  </Badge>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedSections.inputs && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-2">
              {inputs.map((input, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-border bg-secondary/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      参数 {idx + 1}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeInput(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">名称</Label>
                      <Input
                        value={input.name}
                        onChange={(e) => updateInput(idx, "name", e.target.value)}
                        placeholder="param_name"
                        className="h-7 mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">类型</Label>
                      <Select
                        value={input.type}
                        onValueChange={(v) => updateInput(idx, "type", v)}
                      >
                        <SelectTrigger className="h-7 mt-1 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paramTypes.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs">描述</Label>
                    <Input
                      value={input.description}
                      onChange={(e) => updateInput(idx, "description", e.target.value)}
                      placeholder="参数描述"
                      className="h-7 mt-1 text-xs"
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Checkbox
                      id={`required-${idx}`}
                      checked={input.required !== false}
                      onCheckedChange={(c) => updateInput(idx, "required", !!c)}
                    />
                    <Label htmlFor={`required-${idx}`} className="text-xs">
                      必填参数
                    </Label>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 gap-1"
                onClick={addInput}
              >
                <Plus className="h-3.5 w-3.5" />
                添加输入参数
              </Button>
            </CollapsibleContent>
          </Collapsible>

          {/* Outputs Section */}
          <Collapsible
            open={expandedSections.outputs}
            onOpenChange={() => toggleSection("outputs")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between px-3 py-2 h-auto"
              >
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 text-status-executing" />
                  <span className="font-medium">输出参数</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    {outputs.length}
                  </Badge>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    expandedSections.outputs && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-2">
              {outputs.map((output, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-border bg-secondary/20"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      输出 {idx + 1}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => removeOutput(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">名称</Label>
                      <Input
                        value={output.name}
                        onChange={(e) => updateOutput(idx, "name", e.target.value)}
                        placeholder="output_name"
                        className="h-7 mt-1 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">类型</Label>
                      <Select
                        value={output.type}
                        onValueChange={(v) => updateOutput(idx, "type", v)}
                      >
                        <SelectTrigger className="h-7 mt-1 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paramTypes.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Label className="text-xs">描述</Label>
                    <Input
                      value={output.description}
                      onChange={(e) => updateOutput(idx, "description", e.target.value)}
                      placeholder="输出描述"
                      className="h-7 mt-1 text-xs"
                    />
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 gap-1"
                onClick={addOutput}
              >
                <Plus className="h-3.5 w-3.5" />
                添加输出参数
              </Button>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>
    </div>
  );
}
