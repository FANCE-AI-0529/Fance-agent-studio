import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Headphones, 
  BarChart3, 
  Code, 
  FileText, 
  Zap, 
  LayoutGrid 
} from "lucide-react";

export type BundleCategory = 
  | "all" 
  | "customer_service" 
  | "data_analysis" 
  | "development" 
  | "content" 
  | "automation"
  | "general";

interface CategoryInfo {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const BUNDLE_CATEGORIES: Record<BundleCategory, CategoryInfo> = {
  all: { label: "全部", icon: LayoutGrid },
  customer_service: { label: "客服", icon: Headphones },
  data_analysis: { label: "数据分析", icon: BarChart3 },
  development: { label: "开发", icon: Code },
  content: { label: "内容", icon: FileText },
  automation: { label: "自动化", icon: Zap },
  general: { label: "通用", icon: LayoutGrid },
};

interface BundleCategoryFilterProps {
  activeCategory: BundleCategory;
  onCategoryChange: (category: BundleCategory) => void;
}

export function BundleCategoryFilter({
  activeCategory,
  onCategoryChange,
}: BundleCategoryFilterProps) {
  const categories: BundleCategory[] = [
    "all",
    "customer_service",
    "data_analysis",
    "development",
    "content",
    "automation",
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {categories.map((category) => {
        const { label, icon: Icon } = BUNDLE_CATEGORIES[category];
        const isActive = activeCategory === category;

        return (
          <Badge
            key={category}
            variant={isActive ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all gap-1.5 px-3 py-1.5",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
            onClick={() => onCategoryChange(category)}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Badge>
        );
      })}
    </div>
  );
}
