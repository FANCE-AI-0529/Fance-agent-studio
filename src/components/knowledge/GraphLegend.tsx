import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Building2, Lightbulb, MapPin, Calendar, Package, Cpu } from "lucide-react";
import { nodeTypeStyles } from "@/hooks/useKnowledgeGraph";
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

interface GraphLegendProps {
  onFilterChange: (type: string | null) => void;
  activeFilter: string | null;
}

export function GraphLegend({ onFilterChange, activeFilter }: GraphLegendProps) {
  return (
    <Card className="bg-card/80 backdrop-blur-sm shadow-lg">
      <CardContent className="p-2">
        <div className="flex flex-wrap gap-1">
          {Object.entries(nodeTypeStyles).map(([type, style]) => {
            const Icon = iconMap[type] || Lightbulb;
            const isActive = activeFilter === type;
            
            return (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 gap-1 text-xs",
                  isActive && "bg-muted"
                )}
                onClick={() => onFilterChange(isActive ? null : type)}
              >
                <div
                  className="w-3 h-3 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: style.bgColor, border: `1px solid ${style.color}` }}
                >
                  <Icon className="w-2 h-2" style={{ color: style.color }} />
                </div>
                <span>{style.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}