import { useState, useCallback, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  CheckCircle2,
  Plus,
  History,
  Trash2,
  Cpu,
  Database,
  FileCode,
  Key
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmCard, ConfirmAction } from "@/components/runtime/ConfirmCard";
import { TraceTree, TraceSession, TraceEvent, TraceEventType } from "@/components/runtime/TraceTree";
import { AgentSelector } from "@/components/runtime/AgentSelector";
import { MPLPStepper, MPLPPhase } from "@/components/runtime/MPLPStepper";
import { ThinkingProcess, LogEntry, createLogEntry } from "@/components/runtime/ThinkingProcess";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useChatSession } from "@/hooks/useChatSession";
import { useDeployedAgents, Agent } from "@/hooks/useAgents";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  skill?: string;
  status?: MPLPPhase;
  confirmAction?: ConfirmAction;
  traceEvents?: TraceEvent[];
  thinkingLogs?: LogEntry[];
}

interface MemoryItem {
  key: string;
  value: string;
  type: "context" | "entity" | "fact";
}

// Context Panel Component
function ContextPanel({ 
  agent, 
  memory 
}: { 
  agent: Agent | null; 
  memory: MemoryItem[];
}) {
  const skills = agent ? ((agent.manifest as any)?.skills?.details || []) : [];
  
  return (
    <div className="w-72 border-l border-border bg-card/50 hidden xl:flex flex-col">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-governance" />
          <span className="font-semibold text-sm">运行上下文</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Agent Info */}
        <div className="p-3 border-b border-border">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            当前 Agent
          </label>
          <div className="mt-2 p-2 rounded-lg bg-secondary/30 border border-border">
            {agent ? (
              <>
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-cognitive" />
                  <span className="text-sm font-medium">{agent.name}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{agent.department || '通用'}</span>
                  <span>•</span>
                  <span>{agent.model}</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground">使用默认 Demo Agent</div>
            )}
          </div>
        </div>

        {/* Loaded Skills */}
        <div className="p-3 border-b border-border">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            已加载技能
          </label>
          <div className="mt-2 space-y-1.5">
            {skills.length > 0 ? (
              skills.map((skill: any) => (
                <div 
                  key={skill.id} 
                  className="flex items-center gap-2 p-1.5 rounded bg-cognitive/5 border border-cognitive/20"
                >
                  <FileCode className="h-3 w-3 text-cognitive" />
                  <span className="text-xs">{skill.name}</span>
                  {skill.permissions?.length > 0 && (
                    <div className="flex gap-0.5 ml-auto">
                      {skill.permissions.slice(0, 2).map((p: string) => (
                        <Badge key={p} variant="outline" className="text-[8px] px-1 py-0 h-3">
                          {p}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-2">
                无已加载技能
              </div>
            )}
          </div>
        </div>

        {/* Memory / Context */}
        <div className="p-3">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
            <Database className="h-3 w-3" />
            Memory / Context
          </label>
          <div className="mt-2 space-y-1">
            {memory.length > 0 ? (
              memory.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-2 p-1.5 rounded bg-secondary/30 border border-border/50"
                >
                  <Key className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-medium text-muted-foreground">{item.key}</div>
                    <div className="text-xs truncate">{item.value}</div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[8px] px-1 py-0 h-3",
                      item.type === 'entity' && 'border-cognitive/50 text-cognitive',
                      item.type === 'fact' && 'border-governance/50 text-governance',
                      item.type === 'context' && 'border-primary/50 text-primary'
                    )}
                  >
                    {item.type}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                <Database className="h-5 w-5 mx-auto mb-1 opacity-50" />
                对话开始后将显示上下文
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const Runtime = () => {
  const { user } = useAuth();
  const { data: deployedAgents = [], isLoading: isLoadingAgents } = useDeployedAgents();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  const {
    session: chatSession,
    sessions: chatSessions,
    messages: persistedMessages,
    isLoading: isLoadingSession,
    createSession,
    loadSession,
    addMessage,
    deleteSession,
  } = useChatSession();

  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentPhase, setCurrentPhase] = useState<MPLPPhase>("idle");
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmAction | null>(null);
  const [traceSessions, setTraceSessions] = useState<TraceSession[]>([]);
  const [currentTraceSessionId, setCurrentTraceSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [contextMemory, setContextMemory] = useState<MemoryItem[]>([]);
  const [currentThinkingLogs, setCurrentThinkingLogs] = useState<LogEntry[]>([]);
  const assistantContentRef = useRef("");
  const currentEventsRef = useRef<TraceEvent[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, currentThinkingLogs]);

  // Get current agent config for AI
  const currentAgentConfig = selectedAgent ? {
    name: selectedAgent.name,
    systemPrompt: (selectedAgent.manifest as any)?.system_prompt || undefined,
    model: selectedAgent.model,
  } : undefined;

  // Sync persisted messages to local state
  useEffect(() => {
    if (persistedMessages.length > 0) {
      setLocalMessages(
        persistedMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          skill: m.skill,
          status: "idle" as MPLPPhase,
        }))
      );
    }
  }, [persistedMessages]);

  // Initialize with welcome message if no session
  useEffect(() => {
    if (!chatSession && !isLoadingSession && localMessages.length === 0) {
      const agentName = selectedAgent?.name || "餐饮办证助手";
      setLocalMessages([
        {
          id: "welcome",
          role: "assistant",
          content: user 
            ? `您好！我是${agentName}，请问有什么可以帮您的？`
            : `您好！我是${agentName}。请先登录以保存对话历史。`,
          timestamp: new Date(),
          status: "idle",
        },
      ]);
    }
  }, [chatSession, isLoadingSession, user, localMessages.length, selectedAgent]);

  // Reset messages when agent changes
  const handleAgentChange = useCallback((agent: Agent | null) => {
    setSelectedAgent(agent);
    setLocalMessages([]);
    setTraceSessions([]);
    setContextMemory([]);
    setCurrentThinkingLogs([]);
  }, []);

  const handleTraceEvent = useCallback((type: string, data: Record<string, unknown>) => {
    if (type === "error") {
      toast.error(data.message as string);
    }
  }, []);

  const { streamChat, isLoading } = useAgentChat({
    agentConfig: currentAgentConfig,
    onTraceEvent: handleTraceEvent,
  });

  // Add thinking log
  const addThinkingLog = useCallback((module: string, message: string, level: LogEntry["level"] = "info") => {
    const log = createLogEntry(module, message, level);
    setCurrentThinkingLogs(prev => [...prev, log]);
    return log;
  }, []);

  // Add trace event to current session
  const addTraceEvent = useCallback((type: TraceEventType, data: TraceEvent["data"]) => {
    const event: TraceEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      data,
    };

    currentEventsRef.current = [...currentEventsRef.current, event];

    setTraceSessions(prev => prev.map(session => 
      session.id === currentTraceSessionId
        ? { ...session, events: [...session.events, event] }
        : session
    ));
  }, [currentTraceSessionId]);

  // Start a new trace session
  const startTraceSession = useCallback((query: string) => {
    const sessionId = `session-${Date.now()}`;
    const newSession: TraceSession = {
      id: sessionId,
      query,
      startTime: new Date(),
      status: "running",
      events: [],
    };
    setTraceSessions(prev => [newSession, ...prev]);
    setCurrentTraceSessionId(sessionId);
    currentEventsRef.current = [];
    setCurrentThinkingLogs([]);
    return sessionId;
  }, []);

  // End current trace session
  const endTraceSession = useCallback((status: TraceSession["status"]) => {
    setTraceSessions(prev => prev.map(session =>
      session.id === currentTraceSessionId
        ? { ...session, status, endTime: new Date() }
        : session
    ));
  }, [currentTraceSessionId]);

  // Update context memory based on conversation
  const updateContextMemory = useCallback((userMessage: string) => {
    const newMemory: MemoryItem[] = [];
    
    if (userMessage.includes("火锅") || userMessage.includes("餐饮")) {
      newMemory.push({ key: "business_type", value: "餐饮服务", type: "entity" });
    }
    if (userMessage.includes("办证") || userMessage.includes("许可")) {
      newMemory.push({ key: "intent", value: "办理许可证", type: "context" });
    }
    if (userMessage.includes("地址") || userMessage.includes("店铺")) {
      newMemory.push({ key: "has_location", value: "true", type: "fact" });
    }
    
    if (contextMemory.length === 0) {
      newMemory.push({ key: "session_start", value: new Date().toLocaleString('zh-CN'), type: "context" });
    }
    
    setContextMemory(prev => {
      const updated = [...prev];
      newMemory.forEach(item => {
        const existingIdx = updated.findIndex(m => m.key === item.key);
        if (existingIdx >= 0) {
          updated[existingIdx] = item;
        } else {
          updated.push(item);
        }
      });
      return updated.slice(-10);
    });
  }, [contextMemory]);

  const sendMessage = async (userMessage: string) => {
    // Start trace session
    startTraceSession(userMessage);

    // ============ PLANNING PHASE ============
    setCurrentPhase("planning");
    setActiveSkill(null);
    
    // Add thinking logs
    addThinkingLog("MPLP:Router", `Intent detected: "${userMessage.slice(0, 50)}..."`, "info");
    await new Promise(resolve => setTimeout(resolve, 300));
    
    addThinkingLog("MPLP:Auth", `Checking permissions for "${selectedAgent?.department || 'General'}"... OK`, "success");
    await new Promise(resolve => setTimeout(resolve, 400));
    
    addTraceEvent("intent_detected", { intent: userMessage });

    // Check if this action requires confirmation
    const needsConfirm = userMessage.includes("生成") || userMessage.includes("表单") || userMessage.includes("申请");
    
    if (needsConfirm) {
      addThinkingLog("MPLP:Policy", "Sensitive operation detected - requires user confirmation", "warn");
      addTraceEvent("permission_check", { permissions: ["write", "network"] });

      const confirmAction: ConfirmAction = {
        id: `confirm-${Date.now()}`,
        type: "write",
        skillName: "表单生成",
        description: "生成餐饮经营许可证申请表",
        permissions: ["write", "network"],
        riskLevel: "medium",
        details: "将根据您提供的信息自动填写申请表单，并准备提交到市场监管局系统。",
      };

      setPendingConfirm(confirmAction);
      setCurrentPhase("confirm");
      addTraceEvent("confirm_requested", { skillName: "表单生成" });

      // Insert thinking process card before confirm card
      const thinkingLogs = [...currentThinkingLogs];
      
      setLocalMessages(prev => [...prev, 
        {
          id: `msg-thinking-${Date.now()}`,
          role: "system" as const,
          content: "",
          timestamp: new Date(),
          thinkingLogs,
        },
        {
          id: `msg-confirm-${Date.now()}`,
          role: "system" as const,
          content: "",
          timestamp: new Date(),
          confirmAction,
        }
      ]);

      return;
    }

    // ============ EXECUTING PHASE ============
    addThinkingLog("Skill:Selector", `Match: "AI 对话" skill`, "info");
    await new Promise(resolve => setTimeout(resolve, 200));
    
    setCurrentPhase("executing");
    setActiveSkill("AI 对话");
    
    addThinkingLog("Skill:AI", "Loading context...", "info");
    addTraceEvent("skill_selected", { skillName: "AI 对话" });
    addTraceEvent("execution_started", { skillName: "AI 对话" });

    // Prepare conversation history for AI
    const chatMessages = localMessages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    chatMessages.push({ role: "user", content: userMessage });

    assistantContentRef.current = "";

    // Insert thinking process card
    const thinkingLogs = [...currentThinkingLogs];
    setLocalMessages(prev => [...prev, {
      id: `msg-thinking-${Date.now()}`,
      role: "system" as const,
      content: "",
      timestamp: new Date(),
      thinkingLogs,
    }]);

    const upsertAssistant = (nextChunk: string) => {
      assistantContentRef.current += nextChunk;
      setLocalMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.id.startsWith("ai-")) {
          return prev.map((m, i) => 
            i === prev.length - 1 
              ? { ...m, content: assistantContentRef.current }
              : m
          );
        }
        return [...prev, {
          id: `ai-${Date.now()}`,
          role: "assistant" as const,
          content: assistantContentRef.current,
          timestamp: new Date(),
          skill: "AI 对话",
          status: "idle" as const,
          traceEvents: [],
        }];
      });
    };

    await streamChat({
      messages: chatMessages,
      onDelta: upsertAssistant,
      onDone: async () => {
        // ============ TRACE PHASE ============
        setCurrentPhase("trace");
        
        addTraceEvent("execution_completed", { 
          skillName: "AI 对话", 
          result: "success" 
        });
        
        // Attach trace events to the message
        const events = [...currentEventsRef.current];
        setLocalMessages(prev => prev.map((m, i) => 
          i === prev.length - 1 && m.role === "assistant"
            ? { ...m, traceEvents: events }
            : m
        ));

        await new Promise(resolve => setTimeout(resolve, 500));
        
        setCurrentPhase("idle");
        setActiveSkill(null);
        endTraceSession("completed");

        // Update context memory
        updateContextMemory(userMessage);

        // Save assistant message to DB
        if (chatSession) {
          await addMessage({
            role: "assistant",
            content: assistantContentRef.current,
          }, "AI 对话");
        }
      },
    });
  };

  const handleConfirm = async () => {
    if (!pendingConfirm) return;

    addTraceEvent("confirm_approved", { skillName: pendingConfirm.skillName });
    
    setLocalMessages(prev => prev.filter(m => !m.confirmAction));
    setPendingConfirm(null);
    
    setCurrentPhase("executing");
    setActiveSkill("表单生成");
    
    addThinkingLog("Skill:Form", "Starting form generation...", "info");
    addTraceEvent("execution_started", { skillName: "表单生成" });

    await new Promise(resolve => setTimeout(resolve, 800));
    addThinkingLog("Skill:Form", "Collecting user data...", "info");
    
    await new Promise(resolve => setTimeout(resolve, 700));
    addThinkingLog("Skill:Form", "Form generated successfully", "success");

    addTraceEvent("execution_completed", { 
      skillName: "表单生成", 
      duration: 1500,
      result: "success" 
    });

    // Trace phase
    setCurrentPhase("trace");
    await new Promise(resolve => setTimeout(resolve, 300));

    const events = [...currentEventsRef.current];
    const responseContent = "✅ 申请表已生成完成！\n\n我已为您准备好《餐饮服务许可证申请表》，包含以下信息：\n\n- 申请人信息（待填写）\n- 经营场所信息\n- 经营项目：火锅餐饮\n- 所需材料清单\n\n您可以点击下载或在线编辑。是否需要我帮您预约递交材料的时间？";

    const response: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: responseContent,
      timestamp: new Date(),
      skill: "表单生成",
      status: "idle",
      traceEvents: events,
    };

    setLocalMessages(prev => [...prev, response]);
    setCurrentPhase("idle");
    setActiveSkill(null);
    endTraceSession("completed");
    toast.success("操作已完成");

    setContextMemory(prev => [...prev, { key: "form_generated", value: "餐饮服务许可证申请表", type: "fact" }]);

    if (chatSession) {
      await addMessage({ role: "assistant", content: responseContent }, "表单生成");
    }
  };

  const handleReject = async () => {
    if (!pendingConfirm) return;

    addThinkingLog("MPLP:Policy", "User rejected operation", "warn");
    addTraceEvent("confirm_rejected", { 
      skillName: pendingConfirm.skillName,
      reason: "用户拒绝" 
    });

    setLocalMessages(prev => prev.filter(m => !m.confirmAction));
    setPendingConfirm(null);
    setCurrentPhase("idle");
    setActiveSkill(null);

    const events = [...currentEventsRef.current];
    const responseContent = "好的，已取消表单生成操作。如果您有其他问题，请随时告诉我。";

    const response: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: responseContent,
      timestamp: new Date(),
      status: "idle",
      traceEvents: events,
    };

    setLocalMessages(prev => [...prev, response]);
    endTraceSession("cancelled");
    toast.info("操作已取消");

    if (chatSession) {
      await addMessage({ role: "assistant", content: responseContent });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || currentPhase !== "idle") return;

    const messageContent = input;
    setInput("");

    let activeSession = chatSession;
    if (!activeSession && user) {
      const agentId = selectedAgent?.id || undefined;
      activeSession = await createSession(agentId);
      if (!activeSession) {
        toast.error("创建会话失败");
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      timestamp: new Date()
    };

    setLocalMessages(prev => [...prev, userMessage]);

    if (activeSession) {
      await addMessage({ role: "user", content: messageContent });
    }
    
    await sendMessage(messageContent);
  };

  const handleNewSession = async () => {
    if (!user) {
      toast.error("请先登录");
      return;
    }
    await createSession();
    setTraceSessions([]);
    setContextMemory([]);
    setCurrentThinkingLogs([]);
    toast.success("已创建新会话");
  };

  const handleLoadSession = async (sessionId: string) => {
    await loadSession(sessionId);
    setShowHistory(false);
    setTraceSessions([]);
    setContextMemory([]);
    setCurrentThinkingLogs([]);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    toast.success("已删除会话");
  };

  return (
    <div className="h-full flex">
      {/* History Sidebar */}
      {showHistory && user && (
        <div className="w-64 border-r border-border bg-card/50 flex flex-col">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="font-semibold text-sm">历史会话</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleNewSession}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {chatSessions.map((s) => (
                <div
                  key={s.id}
                  className={`p-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors group ${
                    chatSession?.id === s.id ? "bg-accent" : ""
                  }`}
                  onClick={() => handleLoadSession(s.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(s.createdAt, { addSuffix: true, locale: zhCN })}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSession(s.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {chatSessions.length === 0 && (
                <div className="text-center text-muted-foreground text-xs py-4">
                  暂无历史会话
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="panel-header border-b border-border">
          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowHistory(!showHistory)}
              >
                <History className="h-4 w-4" />
              </Button>
            )}
            <AgentSelector
              agents={deployedAgents}
              selectedAgent={selectedAgent}
              onSelectAgent={handleAgentChange}
              isLoading={isLoadingAgents}
            />
            {chatSession && (
              <Badge variant="secondary" className="text-xs">已保存</Badge>
            )}
          </div>
          
          {activeSkill && (
            <Badge variant="outline" className="text-xs gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {activeSkill}
            </Badge>
          )}
        </div>

        {/* MPLP Protocol Status Bar (Stepper) */}
        <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center justify-center">
          <MPLPStepper currentPhase={currentPhase} />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {localMessages.map(message => {
            // Render Thinking Process card
            if (message.role === "system" && message.thinkingLogs && message.thinkingLogs.length > 0) {
              return (
                <div key={message.id} className="max-w-[85%]">
                  <ThinkingProcess logs={message.thinkingLogs} />
                </div>
              );
            }

            // Render Confirm Card
            if (message.role === "system" && message.confirmAction) {
              return (
                <div key={message.id} className="flex justify-center">
                  <ConfirmCard
                    action={message.confirmAction}
                    onConfirm={handleConfirm}
                    onReject={handleReject}
                    isPending={currentPhase === "executing"}
                  />
                </div>
              );
            }

            // Render regular messages
            return (
              <div
                key={message.id}
                className={`flex gap-3 animate-slide-up ${message.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  message.role === "user" 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-card border border-border"
                }`}>
                  {message.role === "user" 
                    ? <User className="h-4 w-4" />
                    : <Bot className="h-4 w-4" />
                  }
                </div>
                
                <div className={`max-w-[70%] ${message.role === "user" ? "text-right" : ""}`}>
                  <div className={`p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  
                  {message.skill && (
                    <div className={cn(
                      "mt-1.5 flex items-center gap-2",
                      message.role === "user" ? "justify-end" : ""
                    )}>
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {message.skill}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Inline Thinking Process during processing */}
          {currentPhase !== "idle" && currentPhase !== "confirm" && currentThinkingLogs.length > 0 && (
            <div className="max-w-[85%]">
              <ThinkingProcess logs={currentThinkingLogs} />
            </div>
          )}

          {/* Typing indicator */}
          {currentPhase !== "idle" && currentPhase !== "confirm" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <span className="text-sm text-muted-foreground">
                  {currentPhase === "planning" && "正在分析意图并选择技能..."}
                  {currentPhase === "executing" && "正在执行任务..."}
                  {currentPhase === "trace" && "正在记录执行结果..."}
                </span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              placeholder="输入您的问题... (试试: '帮我生成申请表')"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="bg-card"
              disabled={currentPhase !== "idle"}
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || currentPhase !== "idle"}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel - Trace Tree */}
      <div className="w-80 border-l border-border bg-card/50 hidden lg:flex flex-col">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cognitive" />
            <span className="font-semibold text-sm">决策追踪</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {traceSessions.length} 会话
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <TraceTree 
            sessions={traceSessions} 
            currentSessionId={currentTraceSessionId || undefined}
          />
        </div>
      </div>

      {/* Context Panel */}
      <ContextPanel agent={selectedAgent} memory={contextMemory} />
    </div>
  );
};

export default Runtime;
