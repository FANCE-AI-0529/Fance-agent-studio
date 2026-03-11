import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../ui/dialog.tsx";
import { Button } from "../../ui/button.tsx";
import { Input } from "../../ui/input.tsx";
import { Label } from "../../ui/label.tsx";
import { Textarea } from "../../ui/textarea.tsx";
import { Checkbox } from "../../ui/checkbox.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select.tsx";
import type { GlobalVariable, VariableType } from "./variableTypes.ts";

interface GlobalVariableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variable?: GlobalVariable;
  onSave: (variable: GlobalVariable) => void;
}

const variableTypes: VariableType[] = ["string", "number", "boolean", "object", "array", "any"];

export function GlobalVariableDialog({
  open,
  onOpenChange,
  variable,
  onSave,
}: GlobalVariableDialogProps) {
  const [name, setName] = useState(variable?.name || "");
  const [type, setType] = useState<VariableType>(variable?.type || "string");
  const [value, setValue] = useState(
    variable?.value !== undefined ? JSON.stringify(variable.value) : ""
  );
  const [description, setDescription] = useState(variable?.description || "");
  const [isSecret, setIsSecret] = useState(variable?.isSecret || false);

  const handleSave = () => {
    let parsedValue: unknown = value;
    
    try {
      if (type === "number") {
        parsedValue = Number(value);
      } else if (type === "boolean") {
        parsedValue = value.toLowerCase() === "true";
      } else if (type === "object" || type === "array") {
        parsedValue = JSON.parse(value);
      }
    } catch {
      // Keep as string if parsing fails
    }

    const newVariable: GlobalVariable = {
      id: variable?.id || `global-${Date.now()}`,
      name,
      type,
      scope: "global",
      value: parsedValue,
      description,
      isSecret,
    };

    onSave(newVariable);
    onOpenChange(false);
  };

  const isValid = name.trim().length > 0 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {variable ? "编辑全局变量" : "添加全局变量"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="var-name">变量名称</Label>
            <Input
              id="var-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="user_id"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              使用字母、数字和下划线，以字母或下划线开头
            </p>
          </div>

          <div className="space-y-2">
            <Label>变量类型</Label>
            <Select value={type} onValueChange={(v) => setType(v as VariableType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {variableTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="var-value">默认值</Label>
            <Input
              id="var-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "string" ? '"example"' : "42"}
              className="font-mono"
              type={isSecret ? "password" : "text"}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="var-secret"
              checked={isSecret}
              onCheckedChange={(checked) => setIsSecret(checked === true)}
            />
            <Label htmlFor="var-secret" className="text-sm cursor-pointer">
              标记为敏感数据（如 API Key）
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="var-desc">描述（可选）</Label>
            <Textarea
              id="var-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="变量的用途说明..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
