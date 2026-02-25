import { motion } from "framer-motion";
import { Terminal, MessageCircle, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppModeStore } from "@/stores/appModeStore";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConsumerSyncBadge } from "@/components/consumer/ConsumerSyncBadge";
import logoIcon from "@/assets/logo-icon.png";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ConsumerHeader() {
  const { toggleMode } = useAppModeStore();
  const navigate = useNavigate();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 h-16"
    >
      <div className="h-full max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <motion.div 
          className="flex items-center gap-3 cursor-pointer"
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/')}
        >
          <div className="relative">
            <img src={logoIcon} alt="Agent Studio" className="w-9 h-9 rounded-xl object-cover" />
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-foreground tracking-tight">
              Agent Studio
            </span>
            <span className="text-[10px] text-muted-foreground/60 -mt-0.5">
              智能数字员工平台
            </span>
          </div>
        </motion.div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Studio Live Sync indicator */}
          <ConsumerSyncBadge />
          
          <ThemeToggle />
          
          {/* Chat history */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/runtime')}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>对话记录</TooltipContent>
          </Tooltip>

          {/* Profile */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                onClick={() => navigate('/profile')}
              >
                <User className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>个人中心</TooltipContent>
          </Tooltip>

          {/* Developer mode toggle - more visible */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMode}
                className="h-9 gap-2 text-xs border-primary/30 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <Terminal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">开发者模式</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex items-center gap-2">
                <span>进入开发者工作室</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                  Ctrl+Shift+D
                </kbd>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </motion.header>
  );
}
