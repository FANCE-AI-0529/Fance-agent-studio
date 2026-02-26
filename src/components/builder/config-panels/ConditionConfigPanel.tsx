import React, { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { GitBranch, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VariableInput from "../variables/VariableInput";

interface ConditionRule {
  id: string;
  field: string;
  operator: string;
  value: string;
  combineWith?: "and" | "or";
}

interface Props {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  nodes: Node[];
}

const operators = [
  { value: "equals", label: "等于 (==)" },
  { value: "not_equals", label: "不等于 (!=)" },
  { value: "greater_than", label: "大于 (>)" },
  { value: "less_than", label: "小于 (<)" },
  { value: "contains", label: "包含" },
  { value: "starts_with", label: "开头是" },
  { value: "ends_with", label: "结尾是" },
  { value: "is_empty", label: "为空" },
  { value: "is_not_empty", label: "非空" },
  { value: "regex_match", label: "正则匹配" },
];

export default function ConditionConfigPanel({ node, onUpdate, nodes }: Props) {
  const data = node.data as any;
  const [mode, setMode] = useState<"simple" | "expression">(data?.mode || "simple");
  const [rules, setRules] = useState<ConditionRule[]>(
    data?.rules || [{ id: "1", field: "", operator: "equals", value: "" }]
  );
  const [expression, setExpression] = useState(data?.expression || "");

  useEffect(() => {
    onUpdate({ mode, rules, expression });
  }, [mode, rules, expression]);

  const addRule = () => {
    setRules((prev) => [
      ...prev,
      { id: Date.now().toString(), field: "", operator: "equals", value: "", combineWith: "and" },
    ]);
  };

  return (
    <div className="space-y-6">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "simple" | "expression")}>
        <TabsList className="w-full h-8">
          <TabsTrigger value="simple" className="text-xs flex-1">简单规则</TabsTrigger>
          <TabsTrigger value="expression" className="text-xs flex-1">表达式</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-3 mt-3">
          {rules.map((rule, i) => (
            <div key={rule.id} className="space-y-2 p-3 border border-border rounded-lg">
              {i > 0 && (
                <Select value={rule.combineWith || "and"} onValueChange={(v) => setRules((prev) => prev.map((r, ii) => ii === i ? { ...r, combineWith: v as "and" | "or" } : r))}>
                  <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and" className="text-xs">AND</SelectItem>
                    <SelectItem value="or" className="text-xs">OR</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <div className="flex gap-2">
                <VariableInput value={rule.field} onChange={(v) => setRules((prev) => prev.map((r, ii) => ii === i ? { ...r, field: v } : r))} nodes={nodes} placeholder="字段 / {{变量}}" className="flex-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRules((prev) => prev.filter((_, ii) => ii !== i))} disabled={rules.length <= 1}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Select value={rule.operator} onValueChange={(v) => setRules((prev) => prev.map((r, ii) => ii === i ? { ...r, operator: v } : r))}>
                  <SelectTrigger className="h-7 text-xs w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>{operators.map((op) => (<SelectItem key={op.value} value={op.value} className="text-xs">{op.label}</SelectItem>))}</SelectContent>
                </Select>
                {!["is_empty", "is_not_empty"].includes(rule.operator) && (
                  <VariableInput value={rule.value} onChange={(v) => setRules((prev) => prev.map((r, ii) => ii === i ? { ...r, value: v } : r))} nodes={nodes} placeholder="值" className="flex-1" />
                )}
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1" onClick={addRule}>
            <Plus className="h-3 w-3" /> 添加条件
          </Button>
        </TabsContent>

        <TabsContent value="expression" className="mt-3">
          <VariableInput value={expression} onChange={setExpression} nodes={nodes} multiline placeholder="{{node1.output}} > 100 && {{node2.status}} === 'success'" className="min-h-[120px] font-mono" />
          <p className="text-[10px] text-muted-foreground mt-1">支持 JavaScript 表达式语法</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
