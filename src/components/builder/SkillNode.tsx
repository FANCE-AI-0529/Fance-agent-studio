import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Sparkles, X, Database, Image, MessageSquare, FileCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const categoryIcons: Record<string, React.ElementType> = {
  analysis: Database,
  vision: Image,
  nlp: MessageSquare,
  code: FileCode,
};

export interface SkillNodeData {
  id: string;
  name: string;
  category: string;
  description: string;
  permissions: string[];
  onRemove?: (id: string) => void;
  [key: string]: unknown;
}

interface SkillNodeProps {
  data: SkillNodeData;
  selected?: boolean;
}

const SkillNode = memo(({ data, selected }: SkillNodeProps) => {
  const CategoryIcon = categoryIcons[data.category] || Sparkles;

  return (
    <div
      className={`node-card rounded-lg relative transition-all duration-200 ${
        selected ? "border-primary glow-primary" : ""
      }`}
      style={{ minWidth: 180 }}
    >
      {/* Connection handle - connects to agent */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-primary !border-2 !border-background"
      />

      {/* Remove button */}
      {data.onRemove && (
        <button
          onClick={() => data.onRemove?.(data.id)}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:scale-110 transition-transform"
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-md bg-cognitive/10 flex items-center justify-center">
          <CategoryIcon className="h-4 w-4 text-cognitive" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{data.name}</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
        {data.description}
      </p>

      {/* Permissions */}
      <div className="flex flex-wrap gap-1">
        {data.permissions.map((perm) => (
          <Badge
            key={perm}
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-4"
          >
            {perm}
          </Badge>
        ))}
      </div>
    </div>
  );
});

SkillNode.displayName = "SkillNode";

export default SkillNode;