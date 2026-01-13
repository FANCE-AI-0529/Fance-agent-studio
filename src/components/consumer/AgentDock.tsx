import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { Plus, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMyAgents } from "@/hooks/useAgents";

interface DockItemProps {
  agent?: {
    id: string;
    name: string;
    avatar?: string;
  };
  isAddButton?: boolean;
  mouseX: any;
  onClick: () => void;
}

function DockItem({ agent, isAddButton, mouseX, onClick }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [48, 64, 48]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

  const getAvatarUrl = (name: string) => {
    const seed = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=1a1a2e`;
  };

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      onClick={onClick}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.95 }}
      className="aspect-square cursor-pointer group"
    >
      <div className="relative w-full h-full">
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Button content */}
        <div className={`
          relative w-full h-full rounded-2xl
          flex items-center justify-center
          border border-border/50 group-hover:border-primary/50
          bg-card/80 backdrop-blur-sm
          transition-all duration-200
          overflow-hidden
        `}>
          {isAddButton ? (
            <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
          ) : agent?.avatar ? (
            <img 
              src={agent.avatar} 
              alt={agent.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <img 
              src={getAvatarUrl(agent?.name || 'Agent')} 
              alt={agent?.name}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileHover={{ opacity: 1, y: 0 }}
          className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-popover border border-border text-xs whitespace-nowrap pointer-events-none"
        >
          {isAddButton ? "创建新 Agent" : agent?.name}
        </motion.div>
      </div>
    </motion.div>
  );
}

interface AgentDockProps {
  onCreateNew?: () => void;
}

export function AgentDock({ onCreateNew }: AgentDockProps) {
  const mouseX = useMotionValue(Infinity);
  const navigate = useNavigate();
  const result = useMyAgents();
  const agents = result.data;
  const isLoading = result.isLoading;

  const recentAgents = (agents || []).slice(0, 5);

  const handleAgentClick = (agentId: string) => {
    navigate(`/runtime?agent=${agentId}`);
  };

  const handleCreateNew = () => {
    if (onCreateNew) {
      onCreateNew();
    } else {
      navigate('/builder');
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
    >
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="flex items-end gap-3 px-4 py-3 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50"
      >
        {recentAgents.length > 0 ? (
          <>
            {recentAgents.map((agent) => (
              <DockItem
                key={agent.id}
                agent={{
                  id: agent.id,
                  name: agent.name,
                  avatar: (agent.manifest as any)?.avatar,
                }}
                mouseX={mouseX}
                onClick={() => handleAgentClick(agent.id)}
              />
            ))}
            
            {/* Separator */}
            <div className="w-px h-10 bg-border/50 mx-1" />
          </>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground text-sm px-4">
            <Bot className="h-4 w-4" />
            <span>还没有 Agent</span>
          </div>
        )}

        {/* Add button */}
        <DockItem
          isAddButton
          mouseX={mouseX}
          onClick={handleCreateNew}
        />
      </motion.div>

      {/* Hint text */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center text-xs text-muted-foreground/40 mt-2"
      >
        最近使用的 Agent
      </motion.p>
    </motion.div>
  );
}
