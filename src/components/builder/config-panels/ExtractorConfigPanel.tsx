import React, { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { ScanSearch, Plus, Trash2 } from "lucide-react";
import { Label } from "../../ui/label.tsx";
import { Input } from "../../ui/input.tsx";
import { Textarea } from "../../ui/textarea.tsx";
import { Button } from "../../ui/button.tsx";
import { Switch } from "../../ui/switch.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select.tsx";
import { Separator } from "../../ui/separator.tsx";
import { Checkbox } from "../../ui/checkbox.tsx";

interface ParamSchema { name: string; type: string; required: boolean; description: string; enumValues?: string[] }

interface Props {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  nodes: Node[];
}

const models = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
];

export default function ExtractorConfigPanel({ node, onUpdate }: Props) {
  const data = node.data as any;
  const config = data?.config || {};
  
  const [model, setModel] = useState(config.model || "google/gemini-2.5-flash");
  const [extractionPrompt, setExtractionPrompt] = useState(config.extractionPrompt || "");
  const [strictMode, setStrictMode] = useState(config.strictMode ?? false);
  const [parameters, setParameters] = useState<ParamSchema[]>(config.parameters || []);

  useEffect(() => {
    onUpdate({ config: { model, extractionPrompt, strictMode, parameters } });
  }, [model, extractionPrompt, strictMode, parameters]);

  const addParam = () => setParameters((prev) => [...prev, { name: "", type: "string", required: true, description: "" }]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium"><ScanSearch className="h-3.5 w-3.5" /> 提取模型</Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>{models.map((m) => (<SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>))}</SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">提取指令</Label>
        <Textarea value={extractionPrompt} onChange={(e) => setExtractionPrompt(e.target.value)} className="min-h-[80px] text-xs" placeholder="从用户输入中提取以下参数..." />
      </div>

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">提取参数</Label>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={addParam}><Plus className="h-3 w-3" /> 添加</Button>
        </div>
        {parameters.map((p, i) => (
          <div key={i} className="p-3 border border-border rounded-lg space-y-2">
            <div className="flex gap-2 items-center">
              <Input className="h-7 text-xs flex-1" placeholder="参数名" value={p.name} onChange={(e) => setParameters((prev) => prev.map((pp, ii) => ii === i ? { ...pp, name: e.target.value } : pp))} />
              <Select value={p.type} onValueChange={(v) => setParameters((prev) => prev.map((pp, ii) => ii === i ? { ...pp, type: v } : pp))}>
                <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["string", "number", "boolean", "enum", "array"].map((t) => (<SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setParameters((prev) => prev.filter((_, ii) => ii !== i))}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <Input className="h-7 text-xs" placeholder="描述" value={p.description} onChange={(e) => setParameters((prev) => prev.map((pp, ii) => ii === i ? { ...pp, description: e.target.value } : pp))} />
            <div className="flex items-center gap-2">
              <Checkbox checked={p.required} onCheckedChange={(c) => setParameters((prev) => prev.map((pp, ii) => ii === i ? { ...pp, required: !!c } : pp))} />
              <span className="text-[10px] text-muted-foreground">必填</span>
            </div>
          </div>
        ))}
      </div>

      <Separator />

      <div className="flex items-center justify-between">
        <Label className="text-xs">严格模式</Label>
        <Switch checked={strictMode} onCheckedChange={setStrictMode} />
      </div>
    </div>
  );
}
