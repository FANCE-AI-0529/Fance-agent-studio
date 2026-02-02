import { motion } from "framer-motion";
import { 
  Brain, 
  Globe, 
  Code2, 
  GitBranch,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QuickAddPanelProps {
  onAddNode: (nodeType: string) => void;
  onOpenMarketplace: () => void;
  className?: string;
}

const quickNodes = [
  {
    nodeType: "llm",
    name: "LLM",
    icon: Brain,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    hoverColor: "hover:border-blue-500/50",
  },
  {
    nodeType: "httpRequest",
    name: "HTTP",
    icon: Globe,
    color: "bg-teal-500/10 text-teal-500 border-teal-500/30",
    hoverColor: "hover:border-teal-500/50",
  },
  {
    nodeType: "code",
    name: "Code",
    icon: Code2,
    color: "bg-amber-500/10 text-amber-500 border-amber-500/30",
    hoverColor: "hover:border-amber-500/50",
  },
  {
    nodeType: "condition",
    name: "条件",
    icon: GitBranch,
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    hoverColor: "hover:border-yellow-500/50",
  },
];

export function QuickAddPanel({ 
  onAddNode, 
  onOpenMarketplace,
  className 
}: QuickAddPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        "w-[320px] p-6 rounded-2xl",
        "bg-card/95 backdrop-blur-sm border border-border shadow-2xl",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">快速添加节点</h3>
          <p className="text-xs text-muted-foreground">选择一个节点开始构建工作流</p>
        </div>
      </div>

      {/* Quick Nodes */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {quickNodes.map((node, index) => {
          const Icon = node.icon;
          return (
            <motion.button
              key={node.nodeType}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              onClick={() => onAddNode(node.nodeType)}
              className={cn(
                "flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all",
                node.color,
                node.hoverColor,
                "hover:scale-105 active:scale-95"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{node.name}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-muted-foreground">或</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Open Marketplace Button */}
      <Button 
        variant="outline" 
        className="w-full h-9 text-xs gap-2"
        onClick={onOpenMarketplace}
      >
        从左侧节点库拖拽节点到画布
        <ArrowRight className="h-3 w-3" />
      </Button>
    </motion.div>
  );
}
