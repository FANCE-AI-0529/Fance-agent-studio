import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { Plus, Bot, MessageCircle, Trash2, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMyAgents, useDeleteAgent } from "@/hooks/useAgents";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { toast } from "sonner";
import { AgentAvatarDisplay, AgentAvatar } from "@/components/builder/AgentAvatarPicker";
interface DockItemProps {
  agent?: {
    id: string;
    name: string;
    avatar?: AgentAvatar;
    hasActiveSession?: boolean;
  };
  isAddButton?: boolean;
  mouseX: any;
  onClick: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
}
function DockItem({
  agent,
  isAddButton,
  mouseX,
  onClick,
  onDelete,
  onEdit
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: 0
    };
    return val - bounds.x - bounds.width / 2;
  });
  const widthSync = useTransform(distance, [-150, 0, 150], [56, 72, 56]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12
  });
  const getAvatarUrl = (name: string) => {
    const seed = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
    return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=1a1a2e`;
  };
  const content = <motion.div ref={ref} style={{
    width
  }} onClick={onClick} whileHover={{
    y: -8
  }} whileTap={{
    scale: 0.95
  }} className="aspect-square cursor-pointer group">
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
          {isAddButton ? <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" /> : agent?.avatar?.iconId ? <AgentAvatarDisplay avatar={agent.avatar} size="lg" /> : <img src={getAvatarUrl(agent?.name || 'Agent')} alt={agent?.name} className="w-full h-full object-cover" />}
        </div>

        {/* Active session indicator */}
        {agent?.hasActiveSession && <motion.div initial={{
        scale: 0
      }} animate={{
        scale: 1
      }} className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-background flex items-center justify-center">
            <MessageCircle className="w-2 h-2 text-primary-foreground" />
          </motion.div>}

        {/* Tooltip */}
        <motion.div initial={{
        opacity: 0,
        y: 10
      }} whileHover={{
        opacity: 1,
        y: 0
      }} className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-popover border border-border text-xs whitespace-nowrap pointer-events-none shadow-lg">
          {isAddButton ? "创建新智能体" : agent?.name}
        </motion.div>
      </div>
    </motion.div>;
  if (isAddButton) {
    return content;
  }
  return <ContextMenu>
      <ContextMenuTrigger asChild>
        {content}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onClick}>
          <MessageCircle className="mr-2 h-4 w-4" />
          开始对话
        </ContextMenuItem>
        <ContextMenuItem onClick={onEdit}>
          <Edit className="mr-2 h-4 w-4" />
          编辑智能体
        </ContextMenuItem>
        <ContextMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          删除智能体
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>;
}
interface AgentDockProps {
  onCreateNew?: () => void;
}
export function AgentDock({
  onCreateNew
}: AgentDockProps) {
  const mouseX = useMotionValue(Infinity);
  const navigate = useNavigate();
  const result = useMyAgents();
  const agents = result.data;
  const isLoading = result.isLoading;
  const deleteAgent = useDeleteAgent();

  // Show all agents (no slicing)
  const allAgents = agents || [];
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
  const handleDeleteAgent = async (agentId: string, agentName: string) => {
    try {
      await deleteAgent.mutateAsync(agentId);
      toast.success(`已删除智能体 "${agentName}"`);
    } catch (error) {
      toast.error("删除失败，请重试");
    }
  };
  const handleEditAgent = (agentId: string) => {
    navigate(`/builder?agent=${agentId}`);
  };
  if (isLoading) {
    return null;
  }
  return;
}