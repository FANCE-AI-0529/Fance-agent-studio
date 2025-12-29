import { useState, useCallback, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Loader2,
  CheckCircle2,
  Clock,
  Zap,
  Brain,
  Shield,
  GitBranch,
  Plus,
  History,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmCard, ConfirmAction } from "@/components/runtime/ConfirmCard";
import { TraceTree, TraceSession, TraceEvent, TraceEventType } from "@/components/runtime/TraceTree";
import { AgentSelector } from "@/components/runtime/AgentSelector";
import { useAgentChat } from "@/hooks/useAgentChat";
import { useChatSession } from "@/hooks/useChatSession";
import { useDeployedAgents, Agent } from "@/hooks/useAgents";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

type MPLPStatus = "idle" | "planning" | "confirm" | "executing";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  skill?: string;
  status?: MPLPStatus;
  confirmAction?: ConfirmAction;
}

const statusConfig = {
  idle: { label: "待命", icon: Clock, className: "text-muted-foreground bg-muted" },
  planning: { label: "规划中", icon: Brain, className: "text-status-planning bg-status-planning/10" },
  confirm: { label: "待确认", icon: Shield, className: "text-status-confirm bg-status-confirm/10" },
  executing: { label: "执行中", icon: Zap, className: "text-status-executing bg-status-executing/10" },
};

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
    updateLastAssistantMessage,
    deleteSession,
    setMessages: setPersistedMessages,
  } = useChatSession();

  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentStatus, setCurrentStatus] = useState<MPLPStatus>("idle");
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmAction | null>(null);
  const [traceSessions, setTraceSessions] = useState<TraceSession[]>([]);
  const [currentTraceSessionId, setCurrentTraceSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const assistantContentRef = useRef("");

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
          status: "idle" as MPLPStatus,
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
    // Welcome message will be added by the effect above
  }, []);

  const handleTraceEvent = useCallback((type: string, data: Record<string, unknown>) => {
    if (type === "error") {
      toast.error(data.message as string);
    }
  }, []);

  const { streamChat, isLoading, error } = useAgentChat({
    agentConfig: currentAgentConfig,
    onTraceEvent: handleTraceEvent,
  });

  // Add trace event to current session
  const addTraceEvent = useCallback((type: TraceEventType, data: TraceEvent["data"]) => {
    const event: TraceEvent = {
      id: `event-${Date.now()}`,
      type,
      timestamp: new Date(),
      data,
    };

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

  const sendMessage = async (userMessage: string) => {
    // Start trace session
    startTraceSession(userMessage);

    // Planning phase
    setCurrentStatus("planning");
    setActiveSkill("AI 对话");
    addTraceEvent("intent_detected", { intent: userMessage });

    // Check if this action requires confirmation
    const needsConfirm = userMessage.includes("生成") || userMessage.includes("表单") || userMessage.includes("申请");
    
    if (needsConfirm) {
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
      setCurrentStatus("confirm");
      addTraceEvent("confirm_requested", { skillName: "表单生成" });

      setLocalMessages(prev => [...prev, {
        id: `msg-confirm-${Date.now()}`,
        role: "system",
        content: "",
        timestamp: new Date(),
        confirmAction,
      }]);

      return;
    }

    // Execute AI chat
    setCurrentStatus("executing");
    addTraceEvent("skill_selected", { skillName: "AI 对话" });
    addTraceEvent("execution_started", { skillName: "AI 对话" });

    // Prepare conversation history for AI
    const chatMessages = localMessages
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    chatMessages.push({ role: "user", content: userMessage });

    assistantContentRef.current = "";

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
        }];
      });
    };

    await streamChat({
      messages: chatMessages,
      onDelta: upsertAssistant,
      onDone: async () => {
        addTraceEvent("execution_completed", { 
          skillName: "AI 对话", 
          result: "success" 
        });
        setCurrentStatus("idle");
        setActiveSkill(null);
        endTraceSession("completed");

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
    
    setCurrentStatus("executing");
    setActiveSkill("表单生成");
    addTraceEvent("execution_started", { skillName: "表单生成" });

    await new Promise(resolve => setTimeout(resolve, 1500));

    addTraceEvent("execution_completed", { 
      skillName: "表单生成", 
      duration: 1500,
      result: "success" 
    });

    const responseContent = "✅ 申请表已生成完成！\n\n我已为您准备好《餐饮服务许可证申请表》，包含以下信息：\n\n- 申请人信息（待填写）\n- 经营场所信息\n- 经营项目：火锅餐饮\n- 所需材料清单\n\n您可以点击下载或在线编辑。是否需要我帮您预约递交材料的时间？";

    const response: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: responseContent,
      timestamp: new Date(),
      skill: "表单生成",
      status: "idle"
    };

    setLocalMessages(prev => [...prev, response]);
    setCurrentStatus("idle");
    setActiveSkill(null);
    endTraceSession("completed");

    // Save to DB
    if (chatSession) {
      await addMessage({ role: "assistant", content: responseContent }, "表单生成");
    }
  };

  const handleReject = async () => {
    if (!pendingConfirm) return;

    addTraceEvent("confirm_rejected", { 
      skillName: pendingConfirm.skillName,
      reason: "用户拒绝" 
    });

    setLocalMessages(prev => prev.filter(m => !m.confirmAction));
    setPendingConfirm(null);
    setCurrentStatus("idle");
    setActiveSkill(null);

    const responseContent = "好的，已取消表单生成操作。如果您有其他问题，请随时告诉我。";

    const response: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: responseContent,
      timestamp: new Date(),
      status: "idle"
    };

    setLocalMessages(prev => [...prev, response]);
    endTraceSession("cancelled");

    if (chatSession) {
      await addMessage({ role: "assistant", content: responseContent });
    }
  };

  const handleSend = async () => {
    if (!input.trim() || currentStatus !== "idle") return;

    const messageContent = input;
    setInput("");

    // Create session if needed and user is logged in
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

    // Save user message to DB
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
    toast.success("已创建新会话");
  };

  const handleLoadSession = async (sessionId: string) => {
    await loadSession(sessionId);
    setShowHistory(false);
    setTraceSessions([]);
    toast.success("已加载会话");
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    toast.success("已删除会话");
  };

  const StatusBadge = ({ status }: { status: MPLPStatus }) => {
    const config = statusConfig[status];
    const Icon = config.icon;
    
    return (
      <div className={`status-badge ${config.className}`}>
        <Icon className="h-3 w-3" />
        <span>{config.label}</span>
      </div>
    );
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
      <div className="flex-1 flex flex-col">
        {/* Header with MPLP Status */}
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
              <Badge variant="secondary" className="text-xs">
                已保存
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <StatusBadge status={currentStatus} />
            {activeSkill && (
              <Badge variant="outline" className="text-xs gap-1">
                <Brain className="h-3 w-3" />
                {activeSkill}
              </Badge>
            )}
          </div>
        </div>

        {/* MPLP Protocol Indicator */}
        <div className="px-4 py-2 bg-secondary/30 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-governance" />
              <span className="text-xs text-muted-foreground">MPLP Protocol v1.0</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-status-executing animate-pulse" />
              <span className="text-xs text-muted-foreground">治理引擎在线</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {["Planning", "Confirm", "Executing"].map((phase) => (
              <div key={phase} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full transition-colors ${
                  currentStatus === phase.toLowerCase() 
                    ? "bg-primary" 
                    : "bg-muted"
                }`} />
                <span className={`text-[10px] transition-colors ${
                  currentStatus === phase.toLowerCase()
                    ? "text-foreground font-medium"
                    : "text-muted-foreground"
                }`}>
                  {phase}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {localMessages.map(message => {
            if (message.role === "system" && message.confirmAction) {
              return (
                <div key={message.id} className="flex justify-center">
                  <ConfirmCard
                    action={message.confirmAction}
                    onConfirm={handleConfirm}
                    onReject={handleReject}
                    isPending={currentStatus === "executing"}
                  />
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
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
                    <div className="mt-1.5 flex items-center gap-2">
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

          {/* Typing indicator */}
          {currentStatus !== "idle" && currentStatus !== "confirm" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {currentStatus === "planning" && "正在分析意图并选择技能..."}
                    {currentStatus === "executing" && "正在执行任务..."}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              placeholder="输入您的问题..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="bg-card"
              disabled={currentStatus !== "idle"}
            />
            <Button 
              onClick={handleSend} 
              disabled={!input.trim() || currentStatus !== "idle"}
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
            <GitBranch className="h-4 w-4 text-cognitive" />
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
    </div>
  );
};

export default Runtime;
