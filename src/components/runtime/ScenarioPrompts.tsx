import { Lightbulb } from "lucide-react";
import { Button } from "../ui/button.tsx";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils.ts";

interface ScenarioPromptsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  className?: string;
}

export function ScenarioPrompts({ 
  prompts, 
  onSelect, 
  disabled = false,
  className 
}: ScenarioPromptsProps) {
  if (!prompts || prompts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn("mb-3", className)}
    >
      <div className="flex items-center gap-2 mb-2">
        <Lightbulb className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">推荐回复</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 bg-card/50 hover:bg-card border-border/50 hover:border-border transition-colors"
              onClick={() => onSelect(prompt)}
              disabled={disabled}
            >
              {prompt.length > 25 ? `${prompt.slice(0, 25)}...` : prompt}
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default ScenarioPrompts;
