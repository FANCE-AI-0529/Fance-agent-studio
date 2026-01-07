import { memo } from "react";
import { Position } from "@xyflow/react";
import { Bot, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import MultiPortHandle from "./ports/MultiPortHandle";
import { standardPorts } from "./ports/portTypes";

export interface AgentNodeData {
  name: string;
  department: string;
  model: string;
  skillCount: number;
  [key: string]: unknown;
}

interface AgentNodeProps {
  id: string;
  data: AgentNodeData;
  selected?: boolean;
}

const AgentNode = memo(({ id, data, selected }: AgentNodeProps) => {
  // Input ports (left side)
  const inputPorts = standardPorts.agent.inputs;
  // Output ports (right side)
  const outputPorts = standardPorts.agent.outputs;

  return (
    <div
      className={cn(
        "relative bg-card border-2 rounded-xl p-4 transition-all duration-200",
        selected ? "border-primary ring-2 ring-primary/30" : "border-primary/50",
        "min-w-[240px]"
      )}
    >
      {/* Input ports on left side */}
      <MultiPortHandle
        ports={inputPorts}
        position={Position.Left}
        nodeId={id}
      />

      {/* Output ports on right side */}
      <MultiPortHandle
        ports={outputPorts}
        position={Position.Right}
        nodeId={id}
      />

      {/* Agent Icon */}
      <div className="flex items-center justify-center mb-3">
        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/30">
          <Bot className="h-8 w-8 text-primary" />
        </div>
      </div>

      {/* Name */}
      <div className="text-center mb-3">
        <h3 className="font-semibold text-sm mb-0.5">
          {data.name || "未命名 Agent"}
        </h3>
        <p className="text-xs text-muted-foreground">
          {data.department || "选择部门"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center p-2 rounded-lg bg-secondary/50">
          <div className="text-lg font-bold text-primary">{data.skillCount}</div>
          <div className="text-[10px] text-muted-foreground">已装载技能</div>
        </div>
        <div className="text-center p-2 rounded-lg bg-secondary/50">
          <div className="text-xs font-medium">{data.model}</div>
          <div className="text-[10px] text-muted-foreground">基础模型</div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
        <span className="text-xs text-muted-foreground">待部署</span>
      </div>

      {/* Settings indicator */}
      <div className="absolute top-2 right-2">
        <Settings className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Port labels - Left side */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 space-y-3 text-[10px] text-muted-foreground text-right hidden group-hover:block">
        {inputPorts.map((port) => (
          <div key={port.id}>{port.label}</div>
        ))}
      </div>

      {/* Port labels - Right side */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full pl-2 space-y-3 text-[10px] text-muted-foreground hidden group-hover:block">
        {outputPorts.map((port) => (
          <div key={port.id}>{port.label}</div>
        ))}
      </div>
    </div>
  );
});

AgentNode.displayName = "AgentNode";

export default AgentNode;