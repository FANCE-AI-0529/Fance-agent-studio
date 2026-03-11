import React, { useEffect, useState } from "react";
import { Users, Circle, MessageSquare, Wifi, WifiOff } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar.tsx";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip.tsx";
import { Input } from "../ui/input.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover.tsx";
import { cn } from "../../lib/utils.ts";
import { motion, AnimatePresence } from "framer-motion";
import { useCollaboration, CollaboratorPresence, CollaborationEvent } from "../../hooks/useCollaboration.ts";
import { useAuth } from "../../contexts/AuthContext.tsx";

interface CollaborationOverlayProps {
  agentId: string;
  enabled?: boolean;
  className?: string;
}

// Collaborator cursor component (for canvas overlay)
export function CollaboratorCursor({ 
  collaborator,
  containerRef 
}: { 
  collaborator: CollaboratorPresence;
  containerRef?: React.RefObject<HTMLDivElement>;
}) {
  if (!collaborator.cursorPosition) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      style={{
        position: "absolute",
        left: collaborator.cursorPosition.x,
        top: collaborator.cursorPosition.y,
        pointerEvents: "none",
        zIndex: 1000,
      }}
    >
      {/* Cursor arrow */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ transform: "rotate(-10deg)" }}
      >
        <path
          d="M5.5 3.21V20.79C5.5 21.6 6.52 22 7.09 21.4L11.34 16.75L17.3 18.04C18.08 18.21 18.74 17.44 18.42 16.7L9.69 2.45C9.25 1.69 8.04 1.79 7.74 2.6L5.6 8.55L5.5 3.21Z"
          fill={collaborator.color}
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>
      
      {/* Name label */}
      <div
        className="absolute left-5 top-5 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
        style={{ backgroundColor: collaborator.color }}
      >
        {collaborator.displayName || collaborator.email?.split("@")[0] || "用户"}
      </div>
    </motion.div>
  );
}

// Node selection indicator
export function CollaboratorNodeSelection({ 
  collaborator,
  nodePosition 
}: { 
  collaborator: CollaboratorPresence;
  nodePosition: { x: number; y: number; width: number; height: number };
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "absolute",
        left: nodePosition.x - 4,
        top: nodePosition.y - 4,
        width: nodePosition.width + 8,
        height: nodePosition.height + 8,
        border: `2px dashed ${collaborator.color}`,
        borderRadius: 8,
        pointerEvents: "none",
        zIndex: 999,
      }}
    >
      <div
        className="absolute -top-5 left-0 px-2 py-0.5 rounded text-xs text-white"
        style={{ backgroundColor: collaborator.color }}
      >
        {collaborator.displayName || "用户"} 正在编辑
      </div>
    </motion.div>
  );
}

// Chat message type
interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
  color: string;
}

// Collaboration status bar and chat
export function CollaborationOverlay({ 
  agentId, 
  enabled = true,
  className 
}: CollaborationOverlayProps) {
  const { user } = useAuth();
  const { 
    collaborators, 
    isConnected, 
    error,
    sendChatMessage,
    onEvent 
  } = useCollaboration({ agentId, enabled });
  
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");

  // Listen for chat messages
  useEffect(() => {
    const unsubscribe = onEvent((event: CollaborationEvent) => {
      if (event.type === "chat_message") {
        const collaborator = collaborators.find(c => c.id === event.userId);
        setChatMessages(prev => [
          ...prev.slice(-49), // Keep last 50 messages
          {
            id: crypto.randomUUID(),
            userId: event.userId,
            userName: collaborator?.displayName || event.userId.substring(0, 8),
            message: event.payload.message,
            timestamp: event.timestamp,
            color: collaborator?.color || "#888",
          },
        ]);
      }
    });

    return unsubscribe;
  }, [onEvent, collaborators]);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    sendChatMessage(messageInput.trim());
    
    // Add own message to chat
    setChatMessages(prev => [
      ...prev.slice(-49),
      {
        id: crypto.randomUUID(),
        userId: user?.id || "",
        userName: "你",
        message: messageInput.trim(),
        timestamp: new Date().toISOString(),
        color: "#3b82f6",
      },
    ]);
    setMessageInput("");
  };

  if (!enabled) return null;

  return (
    <div className={cn("fixed bottom-4 right-4 z-50 flex items-center gap-2", className)}>
      {/* Connection status */}
      <Badge 
        variant={isConnected ? "default" : "destructive"}
        className="gap-1"
      >
        {isConnected ? (
          <Wifi className="h-3 w-3" />
        ) : (
          <WifiOff className="h-3 w-3" />
        )}
        {isConnected ? "已连接" : "断开连接"}
      </Badge>

      {/* Collaborators avatars */}
      {collaborators.length > 0 && (
        <div className="flex -space-x-2">
          {collaborators.slice(0, 5).map((collaborator) => (
            <Tooltip key={collaborator.id}>
              <TooltipTrigger asChild>
                <Avatar 
                  className="h-8 w-8 border-2 border-background cursor-pointer"
                  style={{ borderColor: collaborator.color }}
                >
                  <AvatarFallback 
                    className="text-xs text-white"
                    style={{ backgroundColor: collaborator.color }}
                  >
                    {(collaborator.displayName || collaborator.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex items-center gap-2">
                  <Circle 
                    className="h-2 w-2 fill-green-500 text-green-500" 
                  />
                  {collaborator.displayName || collaborator.email || "协作者"}
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {collaborators.length > 5 && (
            <Avatar className="h-8 w-8 border-2 border-background">
              <AvatarFallback className="text-xs bg-muted">
                +{collaborators.length - 5}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      {/* Collaborator count */}
      <Badge variant="secondary" className="gap-1">
        <Users className="h-3 w-3" />
        {collaborators.length + 1}
      </Badge>

      {/* Chat popover */}
      <Popover open={chatOpen} onOpenChange={setChatOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="relative">
            <MessageSquare className="h-4 w-4" />
            {chatMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] text-primary-foreground flex items-center justify-center">
                {chatMessages.length > 9 ? "9+" : chatMessages.length}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                协作聊天
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[300px] p-4">
                <AnimatePresence initial={false}>
                  {chatMessages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3"
                    >
                      <div className="flex items-start gap-2">
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0"
                          style={{ backgroundColor: msg.color }}
                        >
                          {msg.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{msg.userName}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(msg.timestamp).toLocaleTimeString("zh-CN", { 
                                hour: "2-digit", 
                                minute: "2-digit" 
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground break-words">
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">暂无消息</p>
                  </div>
                )}
              </ScrollArea>
              <div className="p-3 border-t flex gap-2">
                <Input
                  placeholder="输入消息..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="h-8 text-sm"
                />
                <Button 
                  size="sm" 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                >
                  发送
                </Button>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default CollaborationOverlay;
