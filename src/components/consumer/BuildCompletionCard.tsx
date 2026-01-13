import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Eye, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface BuildCompletionCardProps {
  agent: {
    id: string;
    name: string;
    avatar?: { iconId: string; colorId: string };
    skills: string[];
    capabilities: string[];
    description?: string;
  };
  onStartChat: () => void;
  onViewDetails?: () => void;
  className?: string;
}

export function BuildCompletionCard({
  agent,
  onStartChat,
  onViewDetails,
  className,
}: BuildCompletionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "w-full max-w-md mx-auto",
        className
      )}
    >
      {/* Success animation */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        className="flex justify-center mb-6"
      >
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
              width: 120,
              height: 120,
              left: -20,
              top: -20,
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.2, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center">
            <Bot className="h-10 w-10 text-primary" />
          </div>
          
          {/* Success checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center border-2 border-background"
          >
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </motion.div>
        </div>
      </motion.div>

      {/* Agent info card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-lg"
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-semibold text-foreground mb-1">
            {agent.name}
          </h2>
          <p className="text-sm text-muted-foreground">
            你的专属数字员工已就绪
          </p>
        </div>

        {/* Description */}
        {agent.description && (
          <p className="text-sm text-muted-foreground text-center mb-4 line-clamp-2">
            {agent.description}
          </p>
        )}

        {/* Skills tags */}
        {agent.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {agent.skills.slice(0, 5).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {agent.skills.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{agent.skills.length - 5}
              </Badge>
            )}
          </div>
        )}

        {/* Capabilities */}
        {agent.capabilities.length > 0 && (
          <div className="bg-muted/30 rounded-xl p-3 mb-6">
            <p className="text-xs text-muted-foreground mb-2">核心能力</p>
            <ul className="space-y-1">
              {agent.capabilities.slice(0, 3).map((cap, i) => (
                <li key={i} className="text-sm text-foreground flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  {cap}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={onStartChat}
            className="w-full h-12 text-base gap-2"
            size="lg"
          >
            开始对话
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          {onViewDetails && (
            <Button
              onClick={onViewDetails}
              variant="ghost"
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
            >
              <Eye className="h-4 w-4" />
              查看构建详情
            </Button>
          )}
        </div>
      </motion.div>

      {/* Hint text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center text-xs text-muted-foreground/60 mt-4"
      >
        你可以随时在对话中调整和优化你的数字员工
      </motion.p>
    </motion.div>
  );
}
