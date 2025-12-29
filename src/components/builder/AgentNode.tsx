import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface AgentNodeData {
  name: string;
  department: string;
  model: string;
  skillCount: number;
  [key: string]: unknown;
}

interface AgentNodeProps {
  data: AgentNodeData;
  selected?: boolean;
}

const AgentNode = memo(({ data, selected }: AgentNodeProps) => {
  return (
    <div
      className={`relative bg-card border-2 rounded-xl p-4 transition-all duration-200 ${
        selected ? "border-primary glow-primary" : "border-primary/50"
      }`}
      style={{ minWidth: 220 }}
    >
      {/* Connection handle - receives from skills */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
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
        <div className="w-2 h-2 rounded-full bg-status-idle" />
        <span className="text-xs text-muted-foreground">待部署</span>
      </div>

      {/* Settings indicator */}
      <div className="absolute top-2 right-2">
        <Settings className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
});

AgentNode.displayName = "AgentNode";

export default AgentNode;