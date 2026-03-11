import { memo } from "react";
import { Position, Handle } from "@xyflow/react";
import { AlertCircle, Plus } from "lucide-react";
import { cn } from "../../../lib/utils.ts";

export interface PlaceholderNodeData {
  id: string;
  name: string;
  description?: string;
  slotId?: string;
  slotType?: 'perception' | 'decision' | 'action' | 'hybrid';
  required?: boolean;
  onFill?: (slotId: string) => void;
  [key: string]: unknown;
}

interface PlaceholderNodeProps {
  id: string;
  data: PlaceholderNodeData;
  selected?: boolean;
}

const slotTypeLabels: Record<string, string> = {
  perception: '感知能力',
  decision: '决策能力', 
  action: '执行能力',
  hybrid: '混合能力',
};

const PlaceholderNode = memo(({ id, data, selected }: PlaceholderNodeProps) => {
  const slotLabel = data.slotType ? slotTypeLabels[data.slotType] || data.slotType : '未知';
  
  return (
    <div
      className={cn(
        "rounded-lg relative transition-all duration-200",
        "bg-amber-500/5 border-2 border-dashed shadow-sm p-3",
        selected ? "border-amber-500 ring-2 ring-amber-500/30" : "border-amber-500/50",
        "min-w-[180px] max-w-[220px]"
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-amber-500/50 border-2 border-amber-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-amber-500/50 border-2 border-amber-500"
      />

      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-md bg-amber-500/10 flex items-center justify-center">
          <AlertCircle className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-sm text-amber-600 dark:text-amber-400 truncate block">
            {data.name}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
        {data.description || `需要 ${slotLabel}`}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
          {slotLabel}
        </span>
        {data.onFill && (
          <button
            onClick={() => data.onFill?.(data.slotId || id)}
            className="text-xs px-2 py-1 rounded bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-1 transition-colors"
          >
            <Plus className="h-3 w-3" />
            填充
          </button>
        )}
      </div>
    </div>
  );
});

PlaceholderNode.displayName = "PlaceholderNode";

export default PlaceholderNode;
