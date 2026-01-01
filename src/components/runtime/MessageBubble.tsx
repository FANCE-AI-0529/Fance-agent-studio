import { Bot, User, CheckCircle2, Copy, RefreshCw, Check, Pencil, X, ThumbsUp, ThumbsDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormattedText } from "./FormattedText";
import { TypewriterFormattedText } from "./TypewriterFormattedText";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useMessageFeedback } from "@/hooks/useMessageFeedback";

interface MessageAttachment {
  id: string;
  type: 'image' | 'document';
  name: string;
  url: string;
  mimeType: string;
}

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
  attachments?: MessageAttachment[];
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
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
  attachments,
  onRegenerate,
  onEdit,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const colorTheme = agentAvatar?.colorId ? avatarColors[agentAvatar.colorId] : avatarColors.blue;
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Feedback hook for assistant messages
  const { feedback, isLoading: feedbackLoading, submitFeedback, isLiked, isDisliked } = useMessageFeedback(id);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(editContent.length, editContent.length);
    }
  }, [isEditing]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success("已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("复制失败");
    }
  };

  const handleRegenerate = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };

  const handleStartEdit = () => {
    setEditContent(content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(content);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== content && onEdit) {
      onEdit(editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.3, 
        ease: [0.4, 0, 0.2, 1],
        scale: { duration: 0.2 }
      }}
      className={cn("flex gap-3 group", isUser ? "flex-row-reverse" : "")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="editing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-2"
            >
              <Textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[80px] resize-none bg-card border-primary/50 focus-visible:ring-primary"
                placeholder="编辑消息..."
              />
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="h-7 px-2 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || editContent === content}
                  className="h-7 px-2"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  保存并重新生成
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="display"
              initial={{ opacity: 0, x: isUser ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
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
              
              {/* Attachments */}
              {attachments && attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="relative">
                      {attachment.type === 'image' ? (
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="max-w-[200px] max-h-[150px] rounded-lg object-cover cursor-pointer hover:opacity-90"
                          onClick={() => window.open(attachment.url, '_blank')}
                        />
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg text-xs">
                          <span className="truncate max-w-[120px]">{attachment.name}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
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
          )}
        </AnimatePresence>
        
        {/* Meta info and action buttons */}
        {!isEditing && (
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
            
            {/* Action buttons - show on hover */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: isHovered ? 1 : 0, 
                scale: isHovered ? 1 : 0.8 
              }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1"
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handleCopy}
                title="复制内容"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
              
              {isUser && onEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={handleStartEdit}
                  title="编辑消息"
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              )}
              
              {!isUser && onRegenerate && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={handleRegenerate}
                  title="重新生成"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              )}
              
              {/* Feedback buttons for assistant messages */}
              {!isUser && (
                <>
                  <div className="w-px h-4 bg-border/50 mx-1" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 transition-colors",
                      isLiked 
                        ? "text-green-500 hover:text-green-600" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => submitFeedback("like")}
                    disabled={feedbackLoading}
                    title="有帮助"
                  >
                    <ThumbsUp className={cn("h-3 w-3", isLiked && "fill-current")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 transition-colors",
                      isDisliked 
                        ? "text-red-500 hover:text-red-600" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => submitFeedback("dislike")}
                    disabled={feedbackLoading}
                    title="没有帮助"
                  >
                    <ThumbsDown className={cn("h-3 w-3", isDisliked && "fill-current")} />
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
