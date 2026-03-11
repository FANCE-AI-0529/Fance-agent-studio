import React, { useState } from "react";
import { Play, Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog.tsx";
import { Button } from "../ui/button.tsx";
import { Input } from "../ui/input.tsx";
import { Label } from "../ui/label.tsx";
import { Textarea } from "../ui/textarea.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import type { Node } from "@xyflow/react";

interface WorkflowRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRun: (inputs: Record<string, unknown>) => void;
  isRunning: boolean;
  nodes: Node[];
}

export function WorkflowRunDialog({ open, onOpenChange, onRun, isRunning, nodes }: WorkflowRunDialogProps) {
  const [inputs, setInputs] = useState<Array<{ key: string; value: string }>>([
    { key: "query", value: "" },
  ]);

  // Auto-detect trigger node input fields
  const triggerNode = nodes.find(n => n.type === "trigger");
  const triggerFields = (triggerNode?.data as any)?.config?.inputFields || [];

  const handleRun = () => {
    const inputObj: Record<string, unknown> = {};
    for (const { key, value } of inputs) {
      if (key.trim()) inputObj[key.trim()] = value;
    }
    onRun(inputObj);
  };

  const addInput = () => setInputs(prev => [...prev, { key: "", value: "" }]);
  const removeInput = (index: number) => setInputs(prev => prev.filter((_, i) => i !== index));
  const updateInput = (index: number, field: "key" | "value", val: string) => {
    setInputs(prev => prev.map((item, i) => i === index ? { ...item, [field]: val } : item));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            运行工作流
          </DialogTitle>
          <DialogDescription>
            配置输入参数后运行工作流。这些参数可在节点中通过 {"{{start.key}}"} 引用。
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3 pr-2">
            {inputs.map((input, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">参数名</Label>
                  <Input
                    value={input.key}
                    onChange={(e) => updateInput(index, "key", e.target.value)}
                    placeholder="例如: query"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex-[2] space-y-1">
                  <Label className="text-xs">值</Label>
                  <Textarea
                    value={input.value}
                    onChange={(e) => updateInput(index, "value", e.target.value)}
                    placeholder="输入参数值..."
                    className="min-h-[60px] text-sm"
                  />
                </div>
                {inputs.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 mt-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeInput(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <Button variant="outline" size="sm" onClick={addInput} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          添加参数
        </Button>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleRun} disabled={isRunning} className="gap-1.5">
            {isRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            {isRunning ? "运行中..." : "开始运行"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
