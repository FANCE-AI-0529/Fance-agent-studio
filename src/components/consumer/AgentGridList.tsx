import { motion } from "framer-motion";
import { MessageCircle, Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMyAgents } from "../../hooks/useAgents.ts";
import { AgentAvatarDisplay, type AgentAvatar, getAvatarColor } from "../builder/AgentAvatarPicker.tsx";
import { cn } from "../../lib/utils.ts";

interface AgentGridListProps {
  onCreateNew?: () => void;
  className?: string;
}

export function AgentGridList({ onCreateNew, className }: AgentGridListProps) {
  const navigate = useNavigate();
  const { data: agents, isLoading } = useMyAgents();

  const handleAgentClick = (agentId: string) => {
    navigate(`/hive?tab=runtime&agentId=${agentId}`);
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      navigate('/hive?tab=builder');
    }
  };

  if (isLoading) {
    return null;
  }

  const hasAgents = agents && agents.length > 0;

  if (!hasAgents) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className={cn("w-full max-w-3xl mx-auto mt-12", className)}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">我的智能体</span>
          <span className="text-xs text-muted-foreground">({agents.length})</span>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>创建更多</span>
        </button>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 px-4">
        {agents.slice(0, 8).map((agent, index) => {
          const avatar = (agent.manifest as any)?.avatar as AgentAvatar | undefined;
          const resolvedAvatar = avatar || { iconId: 'bot', colorId: 'primary' };
          const colorConfig = getAvatarColor(resolvedAvatar.colorId);
          const description = (agent.manifest as any)?.description || (agent.manifest as any)?.originalDescription || '';
          
          return (
            <motion.button
              key={agent.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => handleAgentClick(agent.id)}
              className={cn(
                "group relative flex flex-col items-center gap-2.5 p-4 rounded-xl",
                "bg-card/50 hover:bg-card/80 backdrop-blur-sm",
                "border border-border/40 hover:border-primary/40",
                "transition-all duration-200"
              )}
            >
              {/* Avatar with gradient ring */}
              <div className="relative">
                {/* Gradient glow ring */}
                <div className={cn(
                  "absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm",
                  colorConfig.className
                )} />
                
                <div className="relative group-hover:scale-110 transition-transform duration-200">
                  <AgentAvatarDisplay 
                    avatar={resolvedAvatar} 
                    size="xl" 
                  />
                </div>
                
                {/* Hover chat icon overlay */}
                <div className="absolute inset-0 rounded-xl bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>

              {/* Name */}
              <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground truncate max-w-full">
                {agent.name}
              </span>

              {/* Description - one line truncated */}
              {description && (
                <span className="text-[10px] text-muted-foreground/70 truncate max-w-full leading-tight -mt-1">
                  {description.length > 20 ? description.slice(0, 20) + '…' : description}
                </span>
              )}

              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-xl bg-primary/10 opacity-0 group-hover:opacity-100 blur-xl transition-opacity -z-10" />
            </motion.button>
          );
        })}

        {/* Show more button if there are more than 8 agents */}
        {agents.length > 8 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            onClick={() => navigate('/agents')}
            className={cn(
              "flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
              "bg-muted/30 hover:bg-muted/50",
              "border border-dashed border-border/40 hover:border-primary/40",
              "transition-all duration-200"
            )}
          >
            <span className="text-lg font-medium text-muted-foreground">
              +{agents.length - 8}
            </span>
            <span className="text-xs text-muted-foreground">
              查看更多
            </span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
