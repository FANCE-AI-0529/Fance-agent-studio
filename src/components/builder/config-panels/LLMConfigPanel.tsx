import React, { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { Brain, Sparkles, Thermometer, Hash, MessageSquare, FileText, Zap } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import VariableInput from "../variables/VariableInput";

const models = [
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", speed: "快" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", speed: "中" },
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash", speed: "快" },
  { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro", speed: "中" },
  { value: "openai/gpt-5", label: "GPT-5", speed: "慢" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini", speed: "中" },
  { value: "openai/gpt-5-nano", label: "GPT-5 Nano", speed: "快" },
];

interface Props {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  nodes: Node[];
}

export default function LLMConfigPanel({ node, onUpdate, nodes }: Props) {
  const data = node.data as any;
  const config = data?.config || {};

  const [model, setModel] = useState(config.model || "google/gemini-2.5-flash");
  const [temperature, setTemperature] = useState(config.temperature ?? 0.7);
  const [topP, setTopP] = useState(config.topP ?? 0.95);
  const [maxTokens, setMaxTokens] = useState(config.maxTokens ?? 4096);
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt || "");
  const [enableStreaming, setEnableStreaming] = useState(config.enableStreaming ?? true);
  const [enableMemory, setEnableMemory] = useState(config.enableMemory ?? false);
  const [structuredOutput, setStructuredOutput] = useState(config.structuredOutput ?? false);
  const [outputSchema, setOutputSchema] = useState(config.outputSchema ? JSON.stringify(config.outputSchema, null, 2) : "");
  const [userMessage, setUserMessage] = useState(config.userMessage || "");

  useEffect(() => {
    onUpdate({
      config: {
        model, temperature, topP, maxTokens, systemPrompt, userMessage,
        enableStreaming, enableMemory, structuredOutput,
        outputSchema: outputSchema ? (() => { try { return JSON.parse(outputSchema); } catch { return undefined; } })() : undefined,
      },
    });
  }, [model, temperature, topP, maxTokens, systemPrompt, userMessage, enableStreaming, enableMemory, structuredOutput, outputSchema]);

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium">
          <Brain className="h-3.5 w-3.5" /> 模型选择
        </Label>
        <Select value={model} onValueChange={setModel}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                <div className="flex items-center gap-2">
                  <span>{m.label}</span>
                  <Badge variant="outline" className="text-[10px] px-1">{m.speed}</Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* System Prompt */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium">
          <MessageSquare className="h-3.5 w-3.5" /> System Prompt
        </Label>
        <VariableInput
          value={systemPrompt}
          onChange={setSystemPrompt}
          nodes={nodes}
          multiline
          placeholder="输入系统提示词，使用 {{ }} 引用变量..."
          className="min-h-[120px]"
        />
      </div>

      <Separator />

      {/* User Message / Prompt */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium">
          <MessageSquare className="h-3.5 w-3.5" /> 用户消息
        </Label>
        <VariableInput
          value={userMessage}
          onChange={setUserMessage}
          nodes={nodes}
          multiline
          placeholder="输入用户消息，使用 {{start.query}} 引用输入变量..."
          className="min-h-[80px]"
        />
        <p className="text-[10px] text-muted-foreground">
          可使用 {"{{start.query}}"} 引用触发器输入，或 {"{{nodeId.text}}"} 引用其他节点输出
        </p>
      </div>

      <Separator />

      {/* Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs font-medium">
            <Thermometer className="h-3.5 w-3.5" /> 温度
          </Label>
          <span className="text-xs text-muted-foreground">{temperature}</span>
        </div>
        <Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={0} max={2} step={0.1} />
      </div>

      {/* Top P */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Top P</Label>
          <span className="text-xs text-muted-foreground">{topP}</span>
        </div>
        <Slider value={[topP]} onValueChange={([v]) => setTopP(v)} min={0} max={1} step={0.05} />
      </div>

      {/* Max Tokens */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium">
          <Hash className="h-3.5 w-3.5" /> 最大 Token 数
        </Label>
        <Input type="number" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value) || 4096)} />
      </div>

      <Separator />

      {/* Toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs">
            <Zap className="h-3.5 w-3.5" /> 流式输出
          </Label>
          <Switch checked={enableStreaming} onCheckedChange={setEnableStreaming} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs">
            <Sparkles className="h-3.5 w-3.5" /> 开启记忆
          </Label>
          <Switch checked={enableMemory} onCheckedChange={setEnableMemory} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-xs">
            <FileText className="h-3.5 w-3.5" /> 结构化输出
          </Label>
          <Switch checked={structuredOutput} onCheckedChange={setStructuredOutput} />
        </div>
      </div>

      {/* Structured Output Schema */}
      {structuredOutput && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">输出 Schema (JSON)</Label>
          <Textarea
            value={outputSchema}
            onChange={(e) => setOutputSchema(e.target.value)}
            className="font-mono text-xs min-h-[100px]"
            placeholder='{"type": "object", "properties": {...}}'
          />
        </div>
      )}
    </div>
  );
}
