import { Bot, User, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FormattedText } from "./FormattedText";
import { TypewriterFormattedText } from "./TypewriterFormattedText";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MessageBubbleProps {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  skill?: string;
  isNew?: boolean;
  agentAvatar?: {
    iconId: string;
    colorId: string;
  };
}

// Agent avatar color themes
const avatarColors: Record<string, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-500/20", text: "text-blue-400" },
  purple: { bg: "bg-purple-500/20", text: "text-purple-400" },
  green: { bg: "bg-green-500/20", text: "text-green-400" },
  orange: { bg: "bg-orange-500/20", text: "text-orange-400" },
  pink: { bg: "bg-pink-500/20", text: "text-pink-400" },
  cyan: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
  red: { bg: "bg-red-500/20", text: "text-red-400" },
  yellow: { bg: "bg-yellow-500/20", text: "text-yellow-400" },
  indigo: { bg: "bg-indigo-500/20", text: "text-indigo-400" },
  teal: { bg: "bg-teal-500/20", text: "text-teal-400" },
  rose: { bg: "bg-rose-500/20", text: "text-rose-400" },
  emerald: { bg: "bg-emerald-500/20", text: "text-emerald-400" },
};

export function MessageBubble({
  id,
  role,
  content,
  timestamp,
  skill,
  isNew,
  agentAvatar,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const colorTheme = agentAvatar?.colorId ? avatarColors[agentAvatar.colorId] : avatarColors.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.3, 
        ease: [0.4, 0, 0.2, 1],
        scale: { duration: 0.2 }
      }}
      className={cn("flex gap-3", isUser ? "flex-row-reverse" : "")}
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 15 }}
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground" 
            : cn("border border-border", colorTheme.bg)
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className={cn("h-4 w-4", colorTheme.text)} />
        )}
      </motion.div>
      
      {/* Message Content */}
      <div className={cn("max-w-[75%] space-y-1.5", isUser ? "items-end" : "items-start")}>
        <motion.div
          initial={{ opacity: 0, x: isUser ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05, duration: 0.25 }}
          className={cn(
            "relative px-4 py-3 rounded-2xl shadow-sm",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md"
              : "bg-card border border-border rounded-bl-md"
          )}
        >
          {/* Message tail effect */}
          <div
            className={cn(
              "absolute bottom-0 w-3 h-3",
              isUser
                ? "-right-1.5 bg-primary"
                : "-left-1.5 bg-card border-l border-b border-border",
              isUser ? "clip-path-user" : "clip-path-assistant"
            )}
            style={{
              clipPath: isUser 
                ? "polygon(0 0, 0% 100%, 100% 100%)"
                : "polygon(100% 0, 0% 100%, 100% 100%)"
            }}
          />
          
          {/* Content */}
          <div className={cn("relative z-10", isUser ? "text-right" : "")}>
            {role === "assistant" && isNew ? (
              <TypewriterFormattedText 
                content={content} 
                className="text-sm leading-relaxed" 
                speed={10}
              />
            ) : (
              <FormattedText 
                content={content} 
                className={cn(
                  "text-sm leading-relaxed",
                  isUser && "text-primary-foreground"
                )} 
              />
            )}
          </div>
        </motion.div>
        
        {/* Meta info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={cn(
            "flex items-center gap-2 px-1",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          {skill && (
            <Badge 
              variant="outline" 
              className="text-[10px] gap-1 h-5 bg-background/50 backdrop-blur-sm border-border/50"
            >
              <CheckCircle2 className="h-2.5 w-2.5 text-status-executing" />
              {skill}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground/70">
            {timestamp.toLocaleTimeString("zh-CN", { 
              hour: "2-digit", 
              minute: "2-digit" 
            })}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
