import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { User, Building2, Lightbulb, MapPin, Calendar, Package, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  person: User,
  organization: Building2,
  concept: Lightbulb,
  location: MapPin,
  event: Calendar,
  product: Package,
  technology: Cpu,
};

interface GraphNodeData {
  label: string;
  nodeType: string;
  description?: string;
  importance: number;
  occurrences: number;
  style: {
    color: string;
    bgColor: string;
    label: string;
  };
}

export const GraphNodeComponent = memo(({ data, selected }: NodeProps<any>) => {
  const nodeData = data as GraphNodeData;
  const Icon = iconMap[nodeData.nodeType] || Lightbulb;
  
  // Size based on importance
  const size = Math.max(40, Math.min(80, 40 + nodeData.importance * 40));
  
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center cursor-pointer transition-all duration-200",
        "border-2 hover:scale-110",
        selected && "ring-2 ring-primary ring-offset-2"
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: nodeData.style.bgColor,
        borderColor: nodeData.style.color,
      }}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className="!bg-transparent !border-none" 
      />
      
      <div className="flex flex-col items-center">
        <Icon 
          className="mb-0.5" 
          style={{ 
            color: nodeData.style.color,
            width: size * 0.3,
            height: size * 0.3,
          }} 
        />
        <span 
          className="text-center font-medium leading-tight max-w-[80px] truncate px-1"
          style={{ 
            fontSize: Math.max(8, size * 0.15),
            color: nodeData.style.color,
          }}
        >
          {nodeData.label}
        </span>
      </div>
      
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="!bg-transparent !border-none" 
      />
    </div>
  );
});

GraphNodeComponent.displayName = "GraphNodeComponent";