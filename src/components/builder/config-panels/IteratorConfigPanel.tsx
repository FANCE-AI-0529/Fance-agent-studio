import React, { useState, useEffect } from "react";
import { Node } from "@xyflow/react";
import { Repeat, AlertCircle } from "lucide-react";
import { Label } from "../../ui/label.tsx";
import { Input } from "../../ui/input.tsx";
import { Slider } from "../../ui/slider.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select.tsx";
import { Separator } from "../../ui/separator.tsx";
import VariableInput from "../variables/VariableInput.tsx";

interface Props {
  node: Node;
  onUpdate: (data: Record<string, unknown>) => void;
  nodes: Node[];
}

export default function IteratorConfigPanel({ node, onUpdate, nodes }: Props) {
  const data = node.data as any;
  const [inputArray, setInputArray] = useState(data?.inputArrayVariable || "");
  const [parallelism, setParallelism] = useState(data?.parallelism ?? 1);
  const [maxIterations, setMaxIterations] = useState(data?.maxIterations ?? 100);
  const [errorStrategy, setErrorStrategy] = useState(data?.errorStrategy || "stop");
  const [itemVariable, setItemVariable] = useState(data?.itemVariable || "item");
  const [indexVariable, setIndexVariable] = useState(data?.indexVariable || "index");

  useEffect(() => {
    onUpdate({ inputArrayVariable: inputArray, parallelism, maxIterations, errorStrategy, itemVariable, indexVariable });
  }, [inputArray, parallelism, maxIterations, errorStrategy, itemVariable, indexVariable]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-xs font-medium"><Repeat className="h-3.5 w-3.5" /> 输入数组</Label>
        <VariableInput value={inputArray} onChange={setInputArray} nodes={nodes} placeholder="选择数组变量 {{node.output.list}}" />
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">元素变量名</Label>
          <Input value={itemVariable} onChange={(e) => setItemVariable(e.target.value)} className="h-7 text-xs font-mono" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">索引变量名</Label>
          <Input value={indexVariable} onChange={(e) => setIndexVariable(e.target.value)} className="h-7 text-xs font-mono" />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">并行度</Label>
          <span className="text-xs text-muted-foreground">{parallelism}</span>
        </div>
        <Slider value={[parallelism]} onValueChange={([v]) => setParallelism(v)} min={1} max={10} step={1} />
        <p className="text-[10px] text-muted-foreground">{parallelism === 1 ? "顺序执行" : `最多 ${parallelism} 个并行`}</p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium">错误处理</Label>
        <Select value={errorStrategy} onValueChange={setErrorStrategy}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="stop" className="text-xs">停止执行</SelectItem>
            <SelectItem value="skip" className="text-xs">跳过错误</SelectItem>
            <SelectItem value="collect" className="text-xs">收集错误</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">最大迭代次数</Label>
        <Input type="number" className="h-7 w-24 text-xs text-right" value={maxIterations} onChange={(e) => setMaxIterations(parseInt(e.target.value) || 100)} />
      </div>
    </div>
  );
}
