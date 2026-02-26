import React, { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { Code2, Plus, Trash2, Clock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface VarDecl { name: string; type: string }

interface Props {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  nodes: Node[];
}

export default function CodeConfigPanel({ node, onUpdate }: Props) {
  const data = node.data as any;
  const config = data?.config || {};

  const [language, setLanguage] = useState(config.language || "javascript");
  const [code, setCode] = useState(config.code || "");
  const [timeout, setTimeout_] = useState(config.timeout ?? 10000);
  const [inputVars, setInputVars] = useState<VarDecl[]>(config.inputVariables || []);
  const [outputVars, setOutputVars] = useState<VarDecl[]>(config.outputVariables || []);

  useEffect(() => {
    onUpdate({
      config: { language, code, timeout, inputVariables: inputVars, outputVariables: outputVars },
    });
  }, [language, code, timeout, inputVars, outputVars]);

  const addVar = (setter: React.Dispatch<React.SetStateAction<VarDecl[]>>) => {
    setter((prev) => [...prev, { name: "", type: "string" }]);
  };
  const removeVar = (setter: React.Dispatch<React.SetStateAction<VarDecl[]>>, idx: number) => {
    setter((prev) => prev.filter((_, i) => i !== idx));
  };
  const updateVar = (setter: React.Dispatch<React.SetStateAction<VarDecl[]>>, idx: number, field: keyof VarDecl, value: string) => {
    setter((prev) => prev.map((v, i) => (i === idx ? { ...v, [field]: value } : v)));
  };

  const VarTable = ({ vars, setter, label }: { vars: VarDecl[]; setter: React.Dispatch<React.SetStateAction<VarDecl[]>>; label: string }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{label}</Label>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => addVar(setter)}>
          <Plus className="h-3 w-3" /> 添加
        </Button>
      </div>
      {vars.map((v, i) => (
        <div key={i} className="flex gap-2 items-center">
          <Input className="h-7 text-xs flex-1" placeholder="变量名" value={v.name} onChange={(e) => updateVar(setter, i, "name", e.target.value)} />
          <Select value={v.type} onValueChange={(val) => updateVar(setter, i, "type", val)}>
            <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["string", "number", "boolean", "object", "array"].map((t) => (
                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeVar(setter, i)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Language */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium">
          <Code2 className="h-3.5 w-3.5" /> 编程语言
        </Label>
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="python">Python</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Code Editor */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">代码</Label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full min-h-[200px] p-3 bg-muted/50 border border-border rounded-md font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder={language === "javascript" ? "function main(inputs) {\n  return { result: inputs.text };\n}" : "def main(inputs):\n    return {\"result\": inputs[\"text\"]}"}
        />
        <p className="text-[10px] text-muted-foreground">函数签名: main(inputs) → outputs</p>
      </div>

      <Separator />

      <VarTable vars={inputVars} setter={setInputVars} label="输入变量" />
      <VarTable vars={outputVars} setter={setOutputVars} label="输出变量" />

      <Separator />

      {/* Timeout */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium">
          <Clock className="h-3.5 w-3.5" /> 超时时间 (ms)
        </Label>
        <Input type="number" value={timeout} onChange={(e) => setTimeout_(parseInt(e.target.value) || 10000)} />
      </div>
    </div>
  );
}
