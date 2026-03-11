import { motion } from "framer-motion";
import { Brain, Globe, Code2, GitBranch } from "lucide-react";
import { cn } from "../../lib/utils.ts";

interface PoweredByBadgeProps {
  className?: string;
}

const capabilities = [
  {
    icon: Brain,
    label: "多模型 AI",
    color: "text-blue-400",
  },
  {
    icon: Globe,
    label: "API 集成",
    color: "text-teal-400",
  },
  {
    icon: Code2,
    label: "代码沙箱",
    color: "text-amber-400",
  },
  {
    icon: GitBranch,
    label: "数据流",
    color: "text-purple-400",
  },
];

export function PoweredByBadge({ className }: PoweredByBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1, duration: 0.5 }}
      className={cn(
        "flex items-center justify-center gap-2 text-xs text-muted-foreground/50",
        className
      )}
    >
      <span className="text-[10px] uppercase tracking-wider">Powered by</span>
      <div className="flex items-center gap-3">
        {capabilities.map((cap, index) => {
          const Icon = cap.icon;
          return (
            <motion.div
              key={cap.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 + index * 0.1 }}
              className="flex items-center gap-1 group"
            >
              <Icon className={cn("h-3 w-3 transition-colors", cap.color, "opacity-50 group-hover:opacity-100")} />
              <span className="text-[10px] opacity-60 group-hover:opacity-100 transition-opacity">
                {cap.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
