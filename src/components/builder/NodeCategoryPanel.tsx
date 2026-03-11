import { useState, DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, GripVertical } from "lucide-react";
import { Badge } from "../ui/badge.tsx";
import { cn } from "../../lib/utils.ts";

export interface NodeCategoryItem {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  icon: React.ElementType;
  nodeType: string;
  color: string;
  isNew?: boolean;
}

export interface NodeCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: React.ElementType;
  color: string;
  nodes: NodeCategoryItem[];
}

interface NodeCategoryPanelProps {
  categories: NodeCategory[];
  language: 'zh' | 'en';
  onNodeDragStart: (e: DragEvent<HTMLDivElement>, node: NodeCategoryItem) => void;
}

// Color mapping for node categories
const colorClasses: Record<string, { border: string; bg: string; icon: string }> = {
  blue: {
    border: "border-blue-500/30 hover:border-blue-500/50",
    bg: "bg-blue-500/5",
    icon: "text-blue-500 bg-blue-500/20",
  },
  purple: {
    border: "border-purple-500/30 hover:border-purple-500/50",
    bg: "bg-purple-500/5",
    icon: "text-purple-500 bg-purple-500/20",
  },
  green: {
    border: "border-green-500/30 hover:border-green-500/50",
    bg: "bg-green-500/5",
    icon: "text-green-500 bg-green-500/20",
  },
  emerald: {
    border: "border-emerald-500/30 hover:border-emerald-500/50",
    bg: "bg-emerald-500/5",
    icon: "text-emerald-500 bg-emerald-500/20",
  },
  cyan: {
    border: "border-cyan-500/30 hover:border-cyan-500/50",
    bg: "bg-cyan-500/5",
    icon: "text-cyan-500 bg-cyan-500/20",
  },
  teal: {
    border: "border-teal-500/30 hover:border-teal-500/50",
    bg: "bg-teal-500/5",
    icon: "text-teal-500 bg-teal-500/20",
  },
  yellow: {
    border: "border-yellow-500/30 hover:border-yellow-500/50",
    bg: "bg-yellow-500/5",
    icon: "text-yellow-500 bg-yellow-500/20",
  },
  amber: {
    border: "border-amber-500/30 hover:border-amber-500/50",
    bg: "bg-amber-500/5",
    icon: "text-amber-500 bg-amber-500/20",
  },
  orange: {
    border: "border-orange-500/30 hover:border-orange-500/50",
    bg: "bg-orange-500/5",
    icon: "text-orange-500 bg-orange-500/20",
  },
  pink: {
    border: "border-pink-500/30 hover:border-pink-500/50",
    bg: "bg-pink-500/5",
    icon: "text-pink-500 bg-pink-500/20",
  },
  rose: {
    border: "border-rose-500/30 hover:border-rose-500/50",
    bg: "bg-rose-500/5",
    icon: "text-rose-500 bg-rose-500/20",
  },
  violet: {
    border: "border-violet-500/30 hover:border-violet-500/50",
    bg: "bg-violet-500/5",
    icon: "text-violet-500 bg-violet-500/20",
  },
  indigo: {
    border: "border-indigo-500/30 hover:border-indigo-500/50",
    bg: "bg-indigo-500/5",
    icon: "text-indigo-500 bg-indigo-500/20",
  },
};

const getColorClasses = (color: string) => {
  return colorClasses[color] || colorClasses.blue;
};

export function NodeCategoryPanel({ 
  categories, 
  language, 
  onNodeDragStart 
}: NodeCategoryPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map(c => c.id)) // All expanded by default
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-2" data-onboarding="logic-nodes">
      {categories.map((category) => {
        const CategoryIcon = category.icon;
        const isExpanded = expandedCategories.has(category.id);
        const catColors = getColorClasses(category.color);
        const newNodesCount = category.nodes.filter(n => n.isNew).length;

        return (
          <div key={category.id} className="rounded-lg border border-border overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category.id)}
              className={cn(
                "w-full flex items-center justify-between p-3 transition-colors",
                "hover:bg-accent/50",
                isExpanded && "border-b border-border"
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn("w-6 h-6 rounded flex items-center justify-center", catColors.icon)}>
                  <CategoryIcon className="h-3.5 w-3.5" />
                </div>
                <span className="font-medium text-sm">
                  {language === 'zh' ? category.name : category.nameEn}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5">
                  {category.nodes.length}
                </Badge>
                {newNodesCount > 0 && (
                  <Badge className="text-[10px] px-1.5 bg-gradient-to-r from-primary to-cognitive text-white border-0">
                    {newNodesCount} NEW
                  </Badge>
                )}
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isExpanded && "rotate-180"
              )} />
            </button>

            {/* Category Nodes */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-2 space-y-1.5 bg-accent/20">
                    {category.nodes.map((node) => {
                      const NodeIcon = node.icon;
                      const nodeColors = getColorClasses(node.color);

                      return (
                        <div
                          key={node.id}
                          draggable
                          onDragStart={(e) => onNodeDragStart(e, node)}
                          className={cn(
                            "p-2.5 rounded-lg border transition-all group cursor-grab active:cursor-grabbing",
                            nodeColors.border,
                            nodeColors.bg
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <div className={cn("w-5 h-5 rounded flex items-center justify-center", nodeColors.icon)}>
                                  <NodeIcon className="h-3 w-3" />
                                </div>
                                <span className="font-medium text-xs">
                                  {language === 'zh' ? node.name : node.nameEn}
                                </span>
                                {node.isNew && (
                                  <Badge className="text-[9px] px-1 py-0 h-4 bg-gradient-to-r from-primary to-cognitive text-white border-0">
                                    NEW
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 ml-7">
                                {language === 'zh' ? node.description : node.descriptionEn}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
