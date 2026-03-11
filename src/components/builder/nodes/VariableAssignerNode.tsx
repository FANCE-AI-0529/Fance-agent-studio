import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Variable, Plus, Trash2 } from "lucide-react";
import { cn } from "../../../lib/utils.ts";
import { Badge } from "../../ui/badge.tsx";
import { Button } from "../../ui/button.tsx";
import { Input } from "../../ui/input.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select.tsx";

export interface VariableAssignment {
  id: string;
  variableName: string;
  expression: string;
  dataType: "string" | "number" | "boolean" | "object" | "array";
}

export interface VariableAssignerNodeData {
  label?: string;
  assignments?: VariableAssignment[];
  [key: string]: unknown;
}

const dataTypes = [
  { value: "string", label: "字符串" },
  { value: "number", label: "数字" },
  { value: "boolean", label: "布尔" },
  { value: "object", label: "对象" },
  { value: "array", label: "数组" },
];

const VariableAssignerNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as VariableAssignerNodeData;
  const [assignments, setAssignments] = useState<VariableAssignment[]>(
    nodeData.assignments || [
      { id: "1", variableName: "result", expression: "{{input}}", dataType: "string" },
    ]
  );

  const addAssignment = () => {
    const newId = Date.now().toString();
    setAssignments(prev => [
      ...prev,
      { id: newId, variableName: "", expression: "", dataType: "string" }
    ]);
  };

  const removeAssignment = (id: string) => {
    if (assignments.length > 1) {
      setAssignments(prev => prev.filter(a => a.id !== id));
    }
  };

  const updateAssignment = (id: string, field: keyof VariableAssignment, value: string) => {
    setAssignments(prev => prev.map(a => 
      a.id === id ? { ...a, [field]: value } : a
    ));
  };

  return (
    <div
      className={cn(
        "bg-card rounded-xl border-2 shadow-lg min-w-[280px] max-w-[340px] transition-all duration-200",
        selected ? "border-pink-500 ring-2 ring-pink-500/20" : "border-border/50 hover:border-pink-400/50"
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="control-in"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
        style={{ top: 24 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="source-value"
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-background"
        style={{ top: 48 }}
      />

      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
          <Variable className="w-5 h-5 text-pink-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-foreground truncate">
            {nodeData.label || "变量赋值"}
          </h3>
          <p className="text-xs text-muted-foreground">设置工作流变量</p>
        </div>
        <Badge variant="outline" className="text-pink-500 border-pink-500/30 text-[10px]">
          SET
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Assignments List */}
        {assignments.map((assignment, index) => (
          <div key={assignment.id} className="space-y-2 p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-4">#{index + 1}</span>
              <Input
                value={assignment.variableName}
                onChange={(e) => updateAssignment(assignment.id, "variableName", e.target.value)}
                placeholder="变量名"
                className="h-7 text-xs flex-1"
              />
              <Select
                value={assignment.dataType}
                onValueChange={(v) => updateAssignment(assignment.id, "dataType", v)}
              >
                <SelectTrigger className="h-7 w-20 text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dataTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeAssignment(assignment.id)}
                disabled={assignments.length <= 1}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            </div>
            <Input
              value={assignment.expression}
              onChange={(e) => updateAssignment(assignment.id, "expression", e.target.value)}
              placeholder="表达式 (如 {{input.field}})"
              className="h-7 text-xs font-mono"
            />
          </div>
        ))}

        {/* Add Assignment Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-7"
          onClick={addAssignment}
          disabled={assignments.length >= 5}
        >
          <Plus className="w-3 h-3 mr-1" />
          添加赋值
        </Button>

        {/* Info */}
        <div className="text-[10px] text-muted-foreground">
          支持表达式：{"{{source.field}}"}, {"{{global.var}}"} 等
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="control-out"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-background"
        style={{ top: 24 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="assigned-out"
        className="!w-3 !h-3 !bg-pink-500 !border-2 !border-background"
        style={{ top: 48 }}
      />
    </div>
  );
});

VariableAssignerNode.displayName = "VariableAssignerNode";
export default VariableAssignerNode;
