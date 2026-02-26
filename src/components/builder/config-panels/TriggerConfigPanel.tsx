import React, { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { Zap, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface InputField { name: string; type: string; required: boolean; description: string }

interface Props {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  nodes: Node[];
}

export default function TriggerConfigPanel({ node, onUpdate }: Props) {
  const data = node.data as any;
  const [triggerType, setTriggerType] = useState(data?.triggerType || "chat");
  const [inputFields, setInputFields] = useState<InputField[]>(data?.inputFields || []);
  const [startMessage, setStartMessage] = useState(data?.config?.startMessage || "");
  const [schedule, setSchedule] = useState(data?.config?.schedule || "");

  useEffect(() => {
    onUpdate({
      triggerType,
      inputFields,
      config: { startMessage, schedule },
    });
  }, [triggerType, inputFields, startMessage, schedule]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium"><Zap className="h-3.5 w-3.5" /> 触发类型</Label>
        <Select value={triggerType} onValueChange={setTriggerType}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="chat">用户对话</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
            <SelectItem value="timer">定时任务</SelectItem>
            <SelectItem value="event">系统事件</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {triggerType === "chat" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">开场消息</Label>
          <Input value={startMessage} onChange={(e) => setStartMessage(e.target.value)} placeholder="你好！有什么可以帮你的？" />
        </div>
      )}

      {triggerType === "timer" && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Cron 表达式</Label>
          <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="0 */5 * * *" className="font-mono" />
        </div>
      )}

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">输入变量声明</Label>
          <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setInputFields((prev) => [...prev, { name: "", type: "string", required: true, description: "" }])}>
            <Plus className="h-3 w-3" /> 添加
          </Button>
        </div>
        {inputFields.map((f, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input className="h-7 text-xs flex-1" placeholder="变量名" value={f.name} onChange={(e) => setInputFields((prev) => prev.map((ff, ii) => ii === i ? { ...ff, name: e.target.value } : ff))} />
            <Select value={f.type} onValueChange={(v) => setInputFields((prev) => prev.map((ff, ii) => ii === i ? { ...ff, type: v } : ff))}>
              <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["string", "number", "boolean", "object", "array", "file"].map((t) => (<SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setInputFields((prev) => prev.filter((_, ii) => ii !== i))}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
