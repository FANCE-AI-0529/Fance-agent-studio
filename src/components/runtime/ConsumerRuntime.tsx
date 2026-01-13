import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Send, 
  Loader2, 
  Bot, 
  User,
  Sparkles,
  Terminal,
  Code2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuroraBackground } from "@/components/consumer/AuroraBackground";
import { useAppModeStore } from "@/stores/appModeStore";
import { useAuth } from "@/contexts/AuthContext";
import { useAgent } from "@/hooks/useAgents";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import logoIcon from "@/assets/logo-icon.png";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentConfig {
  name: string;
  systemPrompt: string;
  model: string;
}

export function ConsumerRuntime() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleMode, ejectToStudio } = useAppModeStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [chatSessionId] = useState(() => `session-${Date.now()}`);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get agentId from URL
  const agentId = searchParams.get('agentId');
  // Note: useAgent refetches automatically when window regains focus via React Query defaults
  const { data: agent, isLoading: isLoadingAgent } = useAgent(agentId);

  // Load agent config when agent data is available
  useEffect(() => {
    if (agent) {
      const manifest = agent.manifest as any;
      setAgentConfig({
        name: agent.name,
        systemPrompt: manifest?.systemPrompt || `你是${agent.name}，一个专业的AI助手。`,
        model: agent.model || 'gpt-4',
      });

      // Add welcome message
      if (messages.length === 0) {
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content: `你好！我是 ${agent.name}。${manifest?.description || '有什么我可以帮助你的吗？'}`,
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    }
  }, [agent]);

  // Handle initial prompt from URL (legacy support)
  useEffect(() => {
    const prompt = searchParams.get('prompt');
    if (prompt && !agentId) {
      handleSubmit(prompt);
      navigate('/runtime', { replace: true });
    }
  }, [searchParams, agentId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMode]);

  const handleSubmit = async (value?: string) => {
    const messageContent = value || input.trim();
    if (!messageContent || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const agentName = agentConfig?.name || '智能助手';
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `我已收到你的请求："${messageContent}"。\n\n作为${agentName}，我会帮助你完成这个任务。目前这是一个演示响应，实际功能正在开发中。\n\n你可以继续描述你的需求。`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Show loading state while fetching agent
  if (agentId && isLoadingAgent) {
    return (
      <AuroraBackground>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">正在加载...</p>
          </motion.div>
        </div>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-background/50 backdrop-blur-xl border-b border-border/50">
          <div className="h-full max-w-4xl mx-auto px-4 flex items-center justify-between">
            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Button>

            {/* Agent name or Logo */}
            <div className="flex items-center gap-2">
              {agentConfig ? (
                <>
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-sm">{agentConfig.name}</span>
                </>
              ) : (
                <>
                  <img src={logoIcon} alt="Fance OS" className="w-7 h-7 rounded-lg" />
                  <span className="font-semibold text-sm">Fance OS</span>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Open in Studio button - only show if we have an agent */}
              {agentId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        ejectToStudio({
                          agentId,
                          targetPage: 'builder',
                          chatSessionId,
                          returnUrl: `/runtime?agentId=${agentId}`,
                        });
                        // Navigate after animation starts
                        setTimeout(() => {
                          navigate(`/builder/${agentId}`);
                        }, 800);
                      }}
                      className="gap-2 border-primary/30 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Wrench className="h-4 w-4" />
                      <span className="hidden sm:inline">Open in Studio</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>查看 Agent 配置和调试</TooltipContent>
                </Tooltip>
              )}
              
              <ThemeToggle />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleMode}
                    className="h-9 w-9 text-muted-foreground/50 hover:text-primary"
                  >
                    <Terminal className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>开发者模式 (Ctrl+Shift+D)</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        {/* Messages area */}
        <div className="flex-1 pt-20 pb-32">
          <ScrollArea ref={scrollRef} className="h-full">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {/* Empty state - only show if no agent and no messages */}
              {messages.length === 0 && !agentConfig && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    开始对话
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    输入你想要完成的任务，AI 助手将帮助你实现
                  </p>
                </motion.div>
              )}

              {/* Messages */}
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    
                    <div
                      className={`
                        max-w-[80%] rounded-2xl px-4 py-3
                        ${message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card/80 backdrop-blur-sm border border-border/50'
                        }
                      `}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">思考中...</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input area */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-6">
          <div className="max-w-3xl mx-auto px-4">
            <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-lg">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的消息..."
                disabled={isLoading}
                rows={1}
                className="
                  w-full bg-transparent py-4 pl-5 pr-14
                  text-foreground placeholder:text-muted-foreground/60
                  focus:outline-none resize-none
                  disabled:opacity-50
                "
                style={{ minHeight: '56px', maxHeight: '200px' }}
              />
              
              <Button
                size="icon"
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <p className="text-center text-xs text-muted-foreground/40 mt-2">
              按 Enter 发送，Shift + Enter 换行
            </p>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
}
