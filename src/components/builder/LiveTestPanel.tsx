import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Send, 
  X, 
  Minimize2, 
  Maximize2,
  Bot,
  User,
  Loader2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import VoiceInputButton from "@/components/runtime/VoiceInputButton";
import { supabase } from "@/integrations/supabase/client";
import { mergePersonalityWithPrompt, PersonalityConfig } from "@/utils/personalityToPrompt";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface LiveTestPanelProps {
  agentName: string;
  systemPrompt: string;
  personalityConfig?: PersonalityConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onAdjustmentRequest?: (adjustment: string) => void;
}

const LiveTestPanel: React.FC<LiveTestPanelProps> = ({
  agentName,
  systemPrompt,
  personalityConfig,
  isOpen,
  onClose,
  onAdjustmentRequest
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

  // Reset messages when agent config changes significantly
  useEffect(() => {
    if (messages.length > 0) {
      setMessages([]);
    }
  }, [systemPrompt]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim()
    };

    // Check for adjustment commands
    const adjustmentPatterns = [
      /^(说话|语气|风格).*(温柔|活泼|专业|严肃|幽默|简洁|详细)/,
      /^更(温柔|活泼|专业|严肃|幽默|简洁|详细)一点/,
      /^(温柔|活泼|专业|严肃|幽默|简洁|详细)一些/
    ];

    const isAdjustment = adjustmentPatterns.some(p => p.test(input.trim()));
    if (isAdjustment && onAdjustmentRequest) {
      onAdjustmentRequest(input.trim());
      setMessages(prev => [...prev, userMessage, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `好的，我会${input.trim().includes("温柔") ? "更温柔" : 
                  input.trim().includes("专业") ? "更专业" : 
                  input.trim().includes("幽默") ? "更幽默" : 
                  input.trim().includes("简洁") ? "更简洁" : "调整"}地回复你~`
      }]);
      setInput("");
      return;
    }

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const finalPrompt = mergePersonalityWithPrompt(
        systemPrompt || `你是${agentName || "AI助手"}，一个友好的AI助手。`,
        personalityConfig || null
      );

      const response = await supabase.functions.invoke("agent-chat", {
        body: {
          messages: [
            { role: "system", content: finalPrompt },
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage.content }
          ]
        }
      });

      if (response.error) throw response.error;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.data?.content || response.data?.message || "抱歉，我暂时无法回复。"
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "抱歉，测试对话出现了问题。请检查配置后重试。"
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoiceInput = (text: string) => {
    setInput(text);
  };

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-12 w-12 rounded-full shadow-lg"
        >
          <MessageSquare className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="w-80 h-96 flex flex-col shadow-xl border-border/50">
      <CardHeader className="py-2 px-3 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            实时测试
            <Badge variant="secondary" className="text-xs font-normal">
              {agentName || "未命名"}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-3" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
              <Bot className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">开始与 Agent 对话测试</p>
              <p className="text-xs mt-1 opacity-70">
                试试说"说话温柔一点"来调整风格
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {msg.content}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-3 w-3" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-3 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t border-border/50 flex-shrink-0">
          <div className="flex gap-1">
            <VoiceInputButton
              onTranscript={handleVoiceInput}
              disabled={isLoading}
              className="flex-shrink-0"
            />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="输入消息测试..."
              disabled={isLoading}
              className="text-sm h-9"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="flex-shrink-0 h-9 w-9"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveTestPanel;
