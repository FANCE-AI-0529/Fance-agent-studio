import React, { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { FileCode2 } from "lucide-react";
import { Label } from "../../ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select.tsx";
import { Badge } from "../../ui/badge.tsx";
import { Separator } from "../../ui/separator.tsx";
import VariableInput from "../variables/VariableInput.tsx";

interface Props {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  nodes: Node[];
}

export default function TemplateConfigPanel({ node, onUpdate, nodes }: Props) {
  const data = node.data as any;
  const [template, setTemplate] = useState(data?.template || "");
  const [outputFormat, setOutputFormat] = useState(data?.outputFormat || "text");

  const extractedVars: string[] = (template.match(/\{\{([^}]+)\}\}/g) || []).map((v: string) => v.replace(/\{\{|\}\}/g, "").trim());
  const uniqueVars = [...new Set(extractedVars)];

  useEffect(() => {
    onUpdate({ template, outputFormat });
  }, [template, outputFormat]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium">
          <FileCode2 className="h-3.5 w-3.5" /> 模板内容
        </Label>
        <VariableInput value={template} onChange={setTemplate} nodes={nodes} multiline placeholder="你好，{{user_name}}！\n今天是 {{date}}。" className="min-h-[200px] font-mono" />
      </div>

      {uniqueVars.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">检测到的变量</Label>
          <div className="flex flex-wrap gap-1">
            {uniqueVars.map((v, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{v}</Badge>
            ))}
          </div>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-medium">输出格式</Label>
        <Select value={outputFormat} onValueChange={setOutputFormat}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="text">纯文本</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
