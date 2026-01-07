import { memo, useMemo } from "react";
import { Position, Handle } from "@xyflow/react";
import { GitBranch, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MultiPortHandle from "@/components/builder/ports/MultiPortHandle";
import { standardPorts, branchColors, getPortHandleId } from "@/components/builder/ports/portTypes";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "greater_equal"
  | "less_equal"
  | "contains"
  | "starts_with"
  | "ends_with"
  | "is_empty"
  | "is_not_empty"
  | "regex_match";

export interface ConditionRule {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string | number;
  combineWith?: "and" | "or";
}

export interface ConditionNodeData {
  id: string;
  name: string;
  description?: string;
  rules: ConditionRule[];
  expression?: string;
  mode: "simple" | "expression";
  onRemove?: (id: string) => void;
  onConfigure?: (id: string) => void;
  [key: string]: unknown;
}

interface ConditionNodeProps {
  id: string;
  data: ConditionNodeData;
  selected?: boolean;
}

const operatorLabels: Record<ConditionOperator, string> = {
  equals: "==",
  not_equals: "!=",
  greater_than: ">",
  less_than: "<",
  greater_equal: ">=",
  less_equal: "<=",
  contains: "包含",
  starts_with: "开头",
  ends_with: "结尾",
  is_empty: "为空",
  is_not_empty: "非空",
  regex_match: "正则",
};

// Generate condition preview text
function generateConditionPreview(rules: ConditionRule[]): string {
  if (rules.length === 0) return "未配置条件";

  return rules
    .map((rule, index) => {
      const op = operatorLabels[rule.operator];
      let condition = "";
      
      if (rule.operator === "is_empty" || rule.operator === "is_not_empty") {
        condition = `${rule.field} ${op}`;
      } else {
        condition = `${rule.field} ${op} ${rule.value}`;
      }

      if (index > 0 && rules[index - 1].combineWith) {
        return `${rules[index - 1].combineWith?.toUpperCase()} ${condition}`;
      }
      return condition;
    })
    .join(" ");
}

const ConditionNode = memo(({ id, data, selected }: ConditionNodeProps) => {
  const conditionPreview = useMemo(() => {
    if (data.mode === "expression" && data.expression) {
      return data.expression;
    }
    return generateConditionPreview(data.rules);
  }, [data.mode, data.expression, data.rules]);

  return (
    <div
      className={cn(
        "relative min-w-[260px] max-w-[300px] bg-card border-2 rounded-xl shadow-lg transition-all duration-200",
        selected
          ? "border-primary shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
          : "border-yellow-500/50 hover:border-yellow-500"
      )}
    >
      {/* Input Ports */}
      <MultiPortHandle
        ports={standardPorts.condition.inputs}
        position={Position.Left}
        nodeId={id}
      />

      {/* Custom True/False Output Handles */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-6 translate-x-1/2">
        {/* True Handle */}
        <div className="relative group">
          <Handle
            type="source"
            position={Position.Right}
            id={getPortHandleId(id, "true-out", "output")}
            className={cn(
              "!w-3 !h-3 !border-2 !border-green-500 !bg-green-500",
              "transition-all duration-200",
              "hover:!w-4 hover:!h-4 hover:shadow-[0_0_8px_rgba(34,197,94,0.6)]"
            )}
            style={{ position: 'relative', top: 0, right: 0, transform: 'none' }}
          />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <Badge className="bg-green-500 text-white text-[10px] whitespace-nowrap">
              True
            </Badge>
          </div>
        </div>

        {/* False Handle */}
        <div className="relative group">
          <Handle
            type="source"
            position={Position.Right}
            id={getPortHandleId(id, "false-out", "output")}
            className={cn(
              "!w-3 !h-3 !border-2 !border-red-500 !bg-red-500",
              "transition-all duration-200",
              "hover:!w-4 hover:!h-4 hover:shadow-[0_0_8px_rgba(239,68,68,0.6)]"
            )}
            style={{ position: 'relative', top: 0, right: 0, transform: 'none' }}
          />
          <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <Badge className="bg-red-500 text-white text-[10px] whitespace-nowrap">
              False
            </Badge>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-yellow-500/10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
            <GitBranch className="h-4 w-4 text-yellow-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{data.name || "条件判断"}</h3>
            <p className="text-[10px] text-muted-foreground">IF / ELSE</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {data.onConfigure && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => data.onConfigure?.(data.id)}
            >
              <Settings className="h-3 w-3" />
            </Button>
          )}
          {data.onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={() => data.onRemove?.(data.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Mode Badge */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">配置模式</span>
          <Badge variant="secondary" className="text-[10px]">
            {data.mode === "simple" ? "简单规则" : "表达式"}
          </Badge>
        </div>

        {/* Condition Preview */}
        <div className="p-2 bg-muted/50 rounded-md border border-dashed border-muted-foreground/30">
          <code className="text-xs font-mono text-yellow-600 dark:text-yellow-400 break-all">
            {conditionPreview.length > 50 
              ? conditionPreview.slice(0, 50) + "..." 
              : conditionPreview}
          </code>
        </div>

        {/* Output Labels */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-green-600 dark:text-green-400">True</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[10px] text-red-600 dark:text-red-400">False</span>
          </div>
        </div>
      </div>
    </div>
  );
});

ConditionNode.displayName = "ConditionNode";

export default ConditionNode;
