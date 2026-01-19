import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Wrench,
  History,
  Brain,
  RefreshCw,
  Code2,
  Globe,
} from "lucide-react";
import { EnhancedWelcomeCard } from "./EnhancedWelcomeCard";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AuroraBackground } from "@/components/consumer/AuroraBackground";
import { useAppModeStore } from "@/stores/appModeStore";
import { useAuth } from "@/contexts/AuthContext";
import { useAgent } from "@/hooks/useAgents";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useChatSession } from "@/hooks/useChatSession";
import { useAgentChat, ChatMessage as AgentChatMessage } from "@/hooks/useAgentChat";
import { useMemoryContext } from "@/hooks/useMemory";
import { useAutoMemoryExtraction } from "@/hooks/useAutoMemoryExtraction";
import { useStudioSyncNotifications } from "@/hooks/useStudioSyncNotifications";
import { useAgentContextHotReload } from "@/hooks/useAgentContextHotReload";
import { SystemBubble, SystemMessage } from "@/components/consumer/SystemBubble";
import { PersonalityRefreshIndicator } from "@/components/consumer/PersonalityRefreshIndicator";
import { CodingModeLayout } from "./CodingModeLayout";
import { useOpenCodeRuntime } from "@/hooks/useOpenCodeRuntime";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { MiniStudioPreview } from "@/components/consumer/MiniStudioPreview";
import logoIcon from "@/assets/logo-icon.png";

// Union type for all message types in the chat
type ChatItem = Message | SystemMessage;

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
  agentId?: string;
}

function isSystemMessage(item: ChatItem): item is SystemMessage {
  return 'type' in item && typeof (item as SystemMessage).type === 'string';
}

export function ConsumerRuntime() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toggleMode, ejectToStudio } = useAppModeStore();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [systemMessages, setSystemMessages] = useState<SystemMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPersonalityRefreshing, setIsPersonalityRefreshing] = useState(false);
  const [newPersonalityName, setNewPersonalityName] = useState<string | undefined>();
  const [webSearchEnabled, setWebSearchEnabled] = useState(true); // 联网开关状态
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Get agentId from URL - support both 'agent' and 'agentId' params
  const agentId = searchParams.get('agent') || searchParams.get('agentId');
  const { data: agent, isLoading: isLoadingAgent } = useAgent(agentId);

  // Chat session management for persistence
  const {
    session,
    messages: persistedMessages,
    isLoading: isLoadingSession,
    loadSession,
    createSession,
    addMessage: saveMessageToDb,
    updateLastAssistantMessage,
    sessions,
    findOrCreateSessionForAgent,
  } = useChatSession();

  // Memory context for long-term memory
  const { generateContext, hasMemories } = useMemoryContext(agentId || undefined);
  const memoryContext = generateContext();
  
  // Auto memory extraction
  const { extractAndSaveMemories } = useAutoMemoryExtraction(agentId || undefined);

  // OpenCode Runtime state for TUI
  const openCodeRuntime = useOpenCodeRuntime();

  // AI Chat hook - pass webSearchEnabled
  const { streamChat, isLoading: isAiLoading, error: aiError } = useAgentChat({
    agentConfig: agentConfig ? {
      ...agentConfig,
      agentId: agentId || undefined,
      webSearchEnabled,
    } : undefined,
  });

  // Studio sync notifications - listen for remote changes
  const handleSystemMessage = useCallback((msg: SystemMessage) => {
    setSystemMessages(prev => [...prev, msg]);
    // Auto-scroll when system message arrives
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  }, []);

  // Context hot reload - update config when Studio changes manifest
  const handleConfigUpdate = useCallback((newConfig: { name: string; systemPrompt: string; model: string; agentId: string }) => {
    setAgentConfig({
      name: newConfig.name,
      systemPrompt: newConfig.systemPrompt,
      model: newConfig.model,
      agentId: newConfig.agentId,
    });
    console.log('[ConsumerRuntime] Hot-reloaded agent config:', newConfig.name);
  }, []);

  // Handle personality change with animation
  const handlePersonalityChange = useCallback((personalityName?: string) => {
    setNewPersonalityName(personalityName);
    setIsPersonalityRefreshing(true);
    // Auto-hide after 2 seconds
    setTimeout(() => {
      setIsPersonalityRefreshing(false);
      setNewPersonalityName(undefined);
    }, 2000);
  }, []);

  // Studio sync notifications hook
  const { isSubscribed: isSyncSubscribed } = useStudioSyncNotifications({
    agentId,
    onSystemMessage: handleSystemMessage,
    onContextRefresh: (storeConfig) => {
      const manifest = storeConfig.manifest as any;
      handleConfigUpdate({
        name: storeConfig.name,
        systemPrompt: manifest?.systemPrompt || `你是${storeConfig.name}，一个专业的AI助手。`,
        model: storeConfig.model,
        agentId: storeConfig.id,
      });
    },
    onPersonalityChange: handlePersonalityChange,
    enabled: !!agentId && isInitialized,
  });

  // Context hot reload hook - memoize initialConfig to avoid infinite loops
  const initialHotReloadConfig = useMemo(() => {
    if (!agentConfig) return null;
    return { ...agentConfig, agentId: agentId || '' };
  }, [agentConfig?.name, agentConfig?.systemPrompt, agentConfig?.model, agentId]);

  const { effectiveConfig, configVersion } = useAgentContextHotReload({
    agentId,
    initialConfig: initialHotReloadConfig,
    onConfigUpdate: handleConfigUpdate,
  });

  // Track latest assistant message for MiniStudioPreview highlights
  const latestAssistantMessage = useMemo(() => {
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    if (assistantMessages.length > 0) {
      return assistantMessages[assistantMessages.length - 1].content;
    }
    // Also consider streaming content
    if (streamingContent) {
      return streamingContent;
    }
    return null;
  }, [messages, streamingContent]);

  // Merge messages and system messages for display
  const allChatItems = useMemo<ChatItem[]>(() => {
    const items: ChatItem[] = [...messages, ...systemMessages];
    // Sort by timestamp
    return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [messages, systemMessages]);
  useEffect(() => {
    const initSession = async () => {
      if (agentId && user && !isInitialized) {
        const existingSession = await findOrCreateSessionForAgent(agentId);
        if (existingSession) {
          setIsInitialized(true);
        }
      }
    };
    initSession();
  }, [agentId, user, isInitialized, findOrCreateSessionForAgent]);

  // Load persisted messages into local state (guard against infinite loops)
  const lastPersistedHashRef = useRef<string>("");
  useEffect(() => {
    if (!isInitialized) return;
    if (!persistedMessages || persistedMessages.length === 0) return;

    // Create a stable hash from message ids + updated timestamps
    const hash = persistedMessages
      .map((m) => `${m.id}:${new Date(m.timestamp).getTime()}`)
      .join("|");

    if (hash === lastPersistedHashRef.current) return;
    lastPersistedHashRef.current = hash;

    const formattedMessages: Message[] = persistedMessages.map((m, i) => ({
      id: m.id || `msg-${i}`,
      role: m.role as 'user' | 'assistant',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      timestamp: m.timestamp,
    }));

    setMessages(formattedMessages);
  }, [persistedMessages, isInitialized]);

  // Load agent config when agent data is available
  useEffect(() => {
    if (agent) {
      const manifest = agent.manifest as any;
      setAgentConfig({
        name: agent.name,
        systemPrompt: manifest?.systemPrompt || `你是${agent.name}，一个专业的AI助手。`,
        model: agent.model || 'gpt-4',
        agentId: agent.id,
      });

      // Add welcome message marker if no persisted messages
      if (messages.length === 0 && isInitialized && (!persistedMessages || persistedMessages.length === 0)) {
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content: '__ENHANCED_WELCOME_CARD__', // Special marker for enhanced welcome card
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        // Don't save enhanced welcome card to DB
      }
    }
  }, [agent, isInitialized, persistedMessages]);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

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

  const handleSubmit = useCallback(async (value?: string) => {
    const messageContent = value?.trim() || input.trim();
    if (!messageContent || isLoading || isAiLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setStreamingContent("");

    // Save user message to database
    await saveMessageToDb({
      role: 'user',
      content: messageContent,
    });

    // Build messages for AI with memory context
    const systemPromptWithMemory = agentConfig 
      ? `${agentConfig.systemPrompt}\n\n${memoryContext ? `## 用户记忆上下文\n${memoryContext}` : ''}`
      : '';

    const chatMessages: AgentChatMessage[] = [
      ...messages.filter(m => m.id !== 'welcome').map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user' as const, content: messageContent },
    ];

    let fullResponse = "";

    try {
      await streamChat({
        messages: chatMessages,
        onDelta: (delta) => {
          fullResponse += delta;
          setStreamingContent(fullResponse);
        },
        onDone: async () => {
          // Create final assistant message
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setStreamingContent("");
          setIsLoading(false);

          // Save assistant message to database
          await saveMessageToDb({
            role: 'assistant',
            content: fullResponse,
          });

          // Extract and save memories from this conversation turn
          extractAndSaveMemories(messageContent, fullResponse);
        },
        onThinking: (module, message, level) => {
          console.log(`[${module}] ${message} (${level})`);
        },
      });
    } catch (error) {
      console.error("Chat error:", error);
      setIsLoading(false);
      setStreamingContent("");
      
      // Fallback response on error
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "抱歉，我遇到了一些问题。请稍后再试。",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [input, isLoading, isAiLoading, messages, agentConfig, memoryContext, streamChat, saveMessageToDb, extractAndSaveMemories]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Handle "Try it" button click - fill input with suggestion
  const handleTryIt = useCallback((suggestion: string) => {
    setInput(suggestion);
    // Focus the input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  const handleNewConversation = async () => {
    if (agentId) {
      await createSession(agentId);
      setMessages([]);
      setSystemMessages([]); // Clear system messages on new conversation
      setIsInitialized(false);
      // Reinitialize
      setTimeout(() => setIsInitialized(true), 100);
    }
  };

  // Show loading state while fetching agent
  if (agentId && (isLoadingAgent || isLoadingSession)) {
    return (
      <AuroraBackground>
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">正在加载对话...</p>
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
                  {memoryContext && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Brain className="h-3 w-3" />
                          记忆
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>此智能体已启用长期记忆</TooltipContent>
                    </Tooltip>
                  )}
                  {isSyncSubscribed && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="gap-1 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          同步
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>已与 Studio 实时同步 (v{configVersion})</TooltipContent>
                    </Tooltip>
                  )}
                  {openCodeRuntime.isActive && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge 
                          variant="outline" 
                          className="gap-1 text-xs border-orange-500/30 text-orange-600 dark:text-orange-400"
                        >
                          <Code2 className="h-3 w-3" />
                          OpenCode
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>OpenCode 编程模式已激活</TooltipContent>
                    </Tooltip>
                  )}
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
              {/* Toggle OpenCode Mode (for demo) */}
              {agentId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={openCodeRuntime.isActive ? "secondary" : "ghost"}
                      size="icon"
                      onClick={() => {
                        if (openCodeRuntime.isActive) {
                          openCodeRuntime.deactivate();
                        } else {
                          openCodeRuntime.activate();
                          // Add demo terminal command
                          openCodeRuntime.addTerminalCommand({
                            command: 'bun run build',
                            output: '✓ Build completed successfully\n',
                            status: 'success',
                          });
                        }
                      }}
                      className="h-9 w-9"
                    >
                      <Code2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {openCodeRuntime.isActive ? '退出 OpenCode 模式' : '进入 OpenCode 模式'}
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* New conversation */}
              {agentId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNewConversation}
                      className="h-9 w-9"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>新建对话</TooltipContent>
                </Tooltip>
              )}

              {/* History panel */}
              {agentId && sessions && sessions.length > 1 && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <History className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>历史对话</SheetTitle>
                      <SheetDescription>
                        查看与此智能体的历史对话记录
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4 space-y-2">
                      {sessions
                        .filter(s => s.agentId === agentId)
                        .map((s) => (
                          <Button
                            key={s.id}
                            variant={session?.id === s.id ? "secondary" : "ghost"}
                            className="w-full justify-start text-left"
                            onClick={() => loadSession(s.id)}
                          >
                            <div className="truncate">
                              {new Date(s.createdAt).toLocaleDateString('zh-CN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </Button>
                        ))}
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              {/* Open in Studio button */}
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
                          chatSessionId: session?.id || '',
                          returnUrl: `/runtime?agent=${agentId}`,
                        });
                        setTimeout(() => {
                          navigate(`/builder/${agentId}`);
                        }, 800);
                      }}
                      className="gap-2 border-primary/30 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Wrench className="h-4 w-4" />
                      <span className="hidden sm:inline">Studio</span>
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

        {/* Messages area - wrapped in CodingModeLayout when OpenCode is active */}
        <CodingModeLayout
          mode={openCodeRuntime.mode}
          isActive={openCodeRuntime.isActive}
          terminalCommands={openCodeRuntime.terminalCommands}
          isTerminalStreaming={false}
          onClearTerminal={openCodeRuntime.clearTerminal}
          pendingDiffs={openCodeRuntime.pendingDiffs}
          onAcceptDiff={openCodeRuntime.acceptDiff}
          onRejectDiff={openCodeRuntime.rejectDiff}
          currentFile={openCodeRuntime.state.currentFile}
          styleCheckPassed={openCodeRuntime.state.styleCheckPassed}
          styleViolationsCount={openCodeRuntime.state.styleViolationsCount}
        >
        <div className="flex-1 pt-20 pb-32">
          <ScrollArea ref={scrollRef} className="h-full">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {/* Empty state */}
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

              {/* Messages (including system messages) */}
              <AnimatePresence mode="popLayout">
                {allChatItems.map((item) => {
                  // System message
                  if (isSystemMessage(item)) {
                    return (
                      <SystemBubble 
                        key={item.id} 
                        message={item}
                        onTryIt={handleTryIt}
                        onExpand={agentId ? () => {
                          ejectToStudio({
                            agentId,
                            targetPage: 'builder',
                            chatSessionId: session?.id || '',
                            returnUrl: `/runtime?agent=${agentId}`,
                          });
                          setTimeout(() => navigate(`/builder/${agentId}`), 800);
                        } : undefined}
                      />
                    );
                  }
                  
                  // Regular message
                  const message = item as Message;
                  
                  // Check for enhanced welcome card marker
                  if (message.id === 'welcome' && message.content === '__ENHANCED_WELCOME_CARD__') {
                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="py-4"
                      >
                        <EnhancedWelcomeCard 
                          agent={agent || null}
                          onQuickStart={(command) => {
                            setInput(command);
                            setTimeout(() => handleSubmit(command), 100);
                          }}
                        />
                      </motion.div>
                    );
                  }
                  
                  return (
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
                  );
                })}
              </AnimatePresence>

              {/* Streaming content */}
              {streamingContent && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl px-4 py-3 max-w-[80%]">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {streamingContent}
                      <span className="inline-block w-2 h-4 bg-primary/50 ml-1 animate-pulse" />
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Loading indicator */}
              {isLoading && !streamingContent && (
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
        </CodingModeLayout>

        {/* Input area */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent pt-8 pb-6">
          <div className="max-w-3xl mx-auto px-4">
            <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-lg">
              {/* Web Search Toggle */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={webSearchEnabled ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                      className={`h-8 w-8 rounded-lg transition-all ${
                        webSearchEnabled 
                          ? "bg-primary text-primary-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Globe className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {webSearchEnabled ? "联网搜索已开启 (点击关闭)" : "联网搜索已关闭 (点击开启)"}
                  </TooltipContent>
                </Tooltip>
              </div>
              
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入你的消息..."
                disabled={isLoading || isAiLoading}
                rows={1}
                className="
                  w-full bg-transparent py-4 pl-14 pr-14
                  text-foreground placeholder:text-muted-foreground/60
                  focus:outline-none resize-none
                  disabled:opacity-50
                "
                style={{ minHeight: '56px', maxHeight: '200px' }}
              />
              
              <Button
                size="icon"
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isLoading || isAiLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl"
              >
                {isLoading || isAiLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <p className="text-center text-xs text-muted-foreground/40 mt-2">
              按 Enter 发送，Shift + Enter 换行 · 
              <span className={webSearchEnabled ? "text-primary/60" : "text-muted-foreground/40"}>
                {webSearchEnabled ? "🌐 联网搜索已开启" : "联网搜索已关闭"}
              </span>
            </p>
          </div>
        </div>

        {/* Mini Studio Preview - PiP Widget */}
        <MiniStudioPreview
          agentId={agentId}
          latestAgentMessage={latestAssistantMessage}
        />

        {/* Personality Refresh Indicator */}
        <PersonalityRefreshIndicator
          isRefreshing={isPersonalityRefreshing}
          newPersonalityName={newPersonalityName}
        />
      </div>
    </AuroraBackground>
  );
}
