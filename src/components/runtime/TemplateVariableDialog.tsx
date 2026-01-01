import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Variable, Sparkles, AlertCircle, Check, Save, FolderOpen, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { TaskChainTemplate, TemplateStep } from "./TaskChainTemplates";
import {
  useVariablePresets,
  useSaveVariablePreset,
  useDeleteVariablePreset,
  type VariablePreset,
} from "@/hooks/useVariablePresets";

// Regex to match variables in format {{variableName}} or ${variableName}
const VARIABLE_REGEX = /\{\{(\w+)\}\}|\$\{(\w+)\}/g;

export interface TemplateVariable {
  name: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
  type?: "text" | "number" | "textarea";
}

interface ExtractedVariable {
  name: string;
  occurrences: Array<{
    stepIndex: number;
    stepName: string;
    field: string;
  }>;
}

interface TemplateVariableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TaskChainTemplate | null;
  onConfirm: (template: TaskChainTemplate, variables: Record<string, string>) => void;
}

// Extract variables from a string
function extractVariablesFromString(str: string): string[] {
  const matches = str.matchAll(VARIABLE_REGEX);
  const variables: string[] = [];
  for (const match of matches) {
    const varName = match[1] || match[2];
    if (varName && !variables.includes(varName)) {
      variables.push(varName);
    }
  }
  return variables;
}

// Extract all variables from template steps
function extractTemplateVariables(steps: TemplateStep[]): ExtractedVariable[] {
  const variableMap: Map<string, ExtractedVariable> = new Map();

  steps.forEach((step, stepIndex) => {
    const fieldsToCheck = [
      { field: "name", value: step.name },
      { field: "description", value: step.description },
      { field: "outputKey", value: step.outputKey },
    ];

    // Check input mapping values
    if (step.inputMapping) {
      Object.entries(step.inputMapping).forEach(([key, value]) => {
        fieldsToCheck.push({ field: `inputMapping.${key}`, value });
      });
    }

    fieldsToCheck.forEach(({ field, value }) => {
      if (!value) return;
      const vars = extractVariablesFromString(value);
      vars.forEach((varName) => {
        if (!variableMap.has(varName)) {
          variableMap.set(varName, { name: varName, occurrences: [] });
        }
        variableMap.get(varName)!.occurrences.push({
          stepIndex,
          stepName: step.name,
          field,
        });
      });
    });
  });

  return Array.from(variableMap.values());
}

// Replace variables in a string
function replaceVariables(str: string, values: Record<string, string>): string {
  return str.replace(VARIABLE_REGEX, (match, var1, var2) => {
    const varName = var1 || var2;
    return values[varName] !== undefined ? values[varName] : match;
  });
}

// Apply variables to template steps
function applyVariablesToTemplate(
  template: TaskChainTemplate,
  values: Record<string, string>
): TaskChainTemplate {
  const newSteps = template.steps.map((step) => {
    const newStep: TemplateStep = {
      ...step,
      name: replaceVariables(step.name, values),
      description: replaceVariables(step.description, values),
      outputKey: replaceVariables(step.outputKey, values),
    };

    if (step.inputMapping) {
      newStep.inputMapping = {};
      Object.entries(step.inputMapping).forEach(([key, value]) => {
        newStep.inputMapping![key] = replaceVariables(value, values);
      });
    }

    return newStep;
  });

  return {
    ...template,
    name: replaceVariables(template.name, values),
    description: replaceVariables(template.description, values),
    steps: newSteps,
  };
}

export function TemplateVariableDialog({
  open,
  onOpenChange,
  template,
  onConfirm,
}: TemplateVariableDialogProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [presetName, setPresetName] = useState("");
  const [showSavePreset, setShowSavePreset] = useState(false);

  // Preset hooks
  const { data: presets = [] } = useVariablePresets();
  const savePreset = useSaveVariablePreset();
  const deletePreset = useDeleteVariablePreset();

  // Extract variables from template
  const extractedVariables = useMemo(() => {
    if (!template) return [];
    return extractTemplateVariables(template.steps);
  }, [template]);

  // Also check template-level variables definition
  const definedVariables = useMemo(() => {
    if (!template) return [];
    // Check if template has defined variables
    const vars: TemplateVariable[] = [];
    template.steps.forEach((step) => {
      if ((step as any).variables) {
        vars.push(...(step as any).variables);
      }
    });
    return vars;
  }, [template]);

  // Merge extracted and defined variables
  const allVariables = useMemo(() => {
    const varMap = new Map<string, ExtractedVariable & { definition?: TemplateVariable }>();
    
    extractedVariables.forEach((v) => {
      varMap.set(v.name, { ...v });
    });

    definedVariables.forEach((def) => {
      if (varMap.has(def.name)) {
        varMap.get(def.name)!.definition = def;
      } else {
        varMap.set(def.name, {
          name: def.name,
          occurrences: [],
          definition: def,
        });
      }
    });

    return Array.from(varMap.values());
  }, [extractedVariables, definedVariables]);

  // Filter presets that have matching variables
  const matchingPresets = useMemo(() => {
    if (allVariables.length === 0) return [];
    const varNames = new Set(allVariables.map((v) => v.name));
    return presets.filter((preset) => {
      const presetVarNames = Object.keys(preset.values);
      // Check if preset has any matching variables
      return presetVarNames.some((name) => varNames.has(name));
    });
  }, [presets, allVariables]);

  // Initialize default values
  useEffect(() => {
    if (!open || allVariables.length === 0) return;
    
    const defaults: Record<string, string> = {};
    allVariables.forEach((v) => {
      if (v.definition?.defaultValue) {
        defaults[v.name] = v.definition.defaultValue;
      } else {
        defaults[v.name] = "";
      }
    });
    setVariableValues(defaults);
    setPresetName("");
    setShowSavePreset(false);
  }, [open, allVariables]);

  const handleConfirm = () => {
    if (!template) return;

    // Check required variables
    const missing = allVariables.filter(
      (v) => v.definition?.required && !variableValues[v.name]
    );
    if (missing.length > 0) {
      return;
    }

    const processedTemplate = applyVariablesToTemplate(template, variableValues);
    onConfirm(processedTemplate, variableValues);
    onOpenChange(false);
  };

  const handleSkip = () => {
    if (!template) return;
    onConfirm(template, {});
    onOpenChange(false);
  };

  const handleLoadPreset = (preset: VariablePreset) => {
    setVariableValues((prev) => ({
      ...prev,
      ...preset.values,
    }));
    toast.success(`已加载预设: ${preset.name}`);
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      toast.error("请输入预设名称");
      return;
    }

    // Only save non-empty values
    const valuesToSave: Record<string, string> = {};
    Object.entries(variableValues).forEach(([key, value]) => {
      if (value) {
        valuesToSave[key] = value;
      }
    });

    if (Object.keys(valuesToSave).length === 0) {
      toast.error("请至少填写一个变量值");
      return;
    }

    try {
      await savePreset.mutateAsync({
        name: presetName.trim(),
        values: valuesToSave,
      });
      toast.success("预设已保存");
      setShowSavePreset(false);
      setPresetName("");
    } catch (error) {
      toast.error("保存预设失败");
    }
  };

  const handleDeletePreset = async (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deletePreset.mutateAsync(presetId);
      toast.success("预设已删除");
    } catch (error) {
      toast.error("删除预设失败");
    }
  };

  const isAllFilled = allVariables.every(
    (v) => !v.definition?.required || variableValues[v.name]
  );

  const hasFilledValues = Object.values(variableValues).some((v) => v);

  if (!template) return null;

  // If no variables, skip dialog
  if (allVariables.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Variable className="h-5 w-5 text-primary" />
            填写模板变量
          </DialogTitle>
          <DialogDescription>
            此模板包含 {allVariables.length} 个变量，请填写具体值后使用
          </DialogDescription>
        </DialogHeader>

        {/* Preset Actions */}
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={matchingPresets.length === 0}>
                <FolderOpen className="h-4 w-4 mr-1" />
                加载预设
                {matchingPresets.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px]">
                    {matchingPresets.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {matchingPresets.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  暂无可用预设
                </div>
              ) : (
                matchingPresets.map((preset) => (
                  <DropdownMenuItem
                    key={preset.id}
                    onClick={() => handleLoadPreset(preset)}
                    className="flex items-center justify-between group"
                  >
                    <span className="truncate">{preset.name}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px]">
                        {Object.keys(preset.values).length} 变量
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100"
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover open={showSavePreset} onOpenChange={setShowSavePreset}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={!hasFilledValues}>
                <Save className="h-4 w-4 mr-1" />
                保存预设
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-sm">预设名称</Label>
                  <Input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="输入预设名称..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSavePreset();
                      }
                    }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  将保存当前填写的 {Object.values(variableValues).filter(Boolean).length} 个变量值
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSavePreset(false)}
                  >
                    取消
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSavePreset}
                    disabled={!presetName.trim() || savePreset.isPending}
                  >
                    {savePreset.isPending ? "保存中..." : "保存"}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            {allVariables.map((variable) => {
              const def = variable.definition;
              const isTextarea = def?.type === "textarea";
              const isRequired = def?.required;
              const isFilled = !!variableValues[variable.name];

              return (
                <div key={variable.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                        {"{{" + variable.name + "}}"}
                      </code>
                      {isRequired && (
                        <Badge variant="destructive" className="text-[10px]">
                          必填
                        </Badge>
                      )}
                      {isFilled && (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      )}
                    </Label>
                  </div>

                  {def?.description && (
                    <p className="text-xs text-muted-foreground">{def.description}</p>
                  )}

                  {variable.occurrences.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {variable.occurrences.slice(0, 3).map((occ, i) => (
                        <Badge key={i} variant="outline" className="text-[10px]">
                          步骤 {occ.stepIndex + 1}: {occ.field}
                        </Badge>
                      ))}
                      {variable.occurrences.length > 3 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{variable.occurrences.length - 3} 处
                        </Badge>
                      )}
                    </div>
                  )}

                  {isTextarea ? (
                    <Textarea
                      value={variableValues[variable.name] || ""}
                      onChange={(e) =>
                        setVariableValues((prev) => ({
                          ...prev,
                          [variable.name]: e.target.value,
                        }))
                      }
                      placeholder={def?.defaultValue || `输入 ${variable.name} 的值`}
                      rows={3}
                      className={cn(
                        "text-sm",
                        isRequired && !isFilled && "border-destructive/50"
                      )}
                    />
                  ) : (
                    <Input
                      type={def?.type === "number" ? "number" : "text"}
                      value={variableValues[variable.name] || ""}
                      onChange={(e) =>
                        setVariableValues((prev) => ({
                          ...prev,
                          [variable.name]: e.target.value,
                        }))
                      }
                      placeholder={def?.defaultValue || `输入 ${variable.name} 的值`}
                      className={cn(
                        isRequired && !isFilled && "border-destructive/50"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {!isAllFilled && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 p-2 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            请填写所有必填变量
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="ghost" onClick={handleSkip}>
            跳过，使用原值
          </Button>
          <Button onClick={handleConfirm} disabled={!isAllFilled}>
            <Sparkles className="h-4 w-4 mr-1" />
            应用变量
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { extractVariablesFromString, replaceVariables, extractTemplateVariables };
