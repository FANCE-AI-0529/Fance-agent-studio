import { useState, useCallback } from "react";
import { 
  Send, 
  History, 
  Bot, 
  User, 
  Loader2,
  CheckCircle2,
  Clock,
  Zap,
  Brain,
  Shield,
  GitBranch
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmCard, ConfirmAction } from "@/components/runtime/ConfirmCard";
import { TraceTree, TraceSession, TraceEvent, TraceEventType } from "@/components/runtime/TraceTree";

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
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "您好！我是餐饮办证助手，可以帮您了解开店所需的证照和办理流程。请问有什么可以帮您的？",
      timestamp: new Date(),
      status: "idle"
    }
  ]);
  const [input, setInput] = useState("");
  const [currentStatus, setCurrentStatus] = useState<MPLPStatus>("idle");
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmAction | null>(null);
  const [traceSessions, setTraceSessions] = useState<TraceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Add trace event to current session
  const addTraceEvent = useCallback((type: TraceEventType, data: TraceEvent["data"]) => {
    const event: TraceEvent = {
      id: `event-${Date.now()}`,
      type,
      timestamp: new Date(),
      data,
    };

    setTraceSessions(prev => prev.map(session => 
      session.id === currentSessionId
        ? { ...session, events: [...session.events, event] }
        : session
    ));
  }, [currentSessionId]);

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
    setCurrentSessionId(sessionId);
    return sessionId;
  }, []);

  // End current trace session
  const endTraceSession = useCallback((status: TraceSession["status"]) => {
    setTraceSessions(prev => prev.map(session =>
      session.id === currentSessionId
        ? { ...session, status, endTime: new Date() }
        : session
    ));
  }, [currentSessionId]);

  const simulateResponse = async (userMessage: string) => {
    // Start trace session
    startTraceSession(userMessage);

    // Simulate planning phase
    setCurrentStatus("planning");
    setActiveSkill("政策查询");
    
    addTraceEvent("intent_detected", { intent: userMessage });
    await new Promise(resolve => setTimeout(resolve, 800));
    
    addTraceEvent("skill_selected", { skillName: "政策查询" });
    await new Promise(resolve => setTimeout(resolve, 600));

    // Check if this action requires confirmation (e.g., generating a form)
    const needsConfirm = userMessage.includes("生成") || userMessage.includes("表单") || userMessage.includes("申请");
    
    if (needsConfirm) {
      addTraceEvent("permission_check", { permissions: ["write", "network"] });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Trigger confirm flow
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

      // Add system message for confirm
      setMessages(prev => [...prev, {
        id: `msg-confirm-${Date.now()}`,
        role: "system",
        content: "",
        timestamp: new Date(),
        confirmAction,
      }]);

      return; // Wait for user confirmation
    }
    
    // Simulate execution
    setCurrentStatus("executing");
    addTraceEvent("execution_started", { skillName: "政策查询" });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    addTraceEvent("execution_completed", { 
      skillName: "政策查询", 
      duration: 1000,
      result: "success" 
    });

    // Generate response
    const response: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: userMessage.includes("火锅") 
        ? "好的，根据2025年最新规定，开设火锅店需要办理以下证照：\n\n1. **营业执照** - 市场监管局办理\n2. **食品经营许可证** - 需现场核查\n3. **消防安全检查合格证** - 消防部门出具\n4. **环保审批** - 餐饮油烟需达标\n\n请问需要我帮您生成申请表吗？"
        : "好的，我来为您查询相关信息。根据当前政策，餐饮行业需要办理的基本证照包括营业执照、食品经营许可证等。请问您具体想了解哪方面的内容？",
      timestamp: new Date(),
      skill: "政策查询",
      status: "idle"
    };

    setMessages(prev => [...prev, response]);
    setCurrentStatus("idle");
    setActiveSkill(null);
    endTraceSession("completed");
  };

  const handleConfirm = async () => {
    if (!pendingConfirm) return;

    addTraceEvent("confirm_approved", { skillName: pendingConfirm.skillName });
    
    // Remove confirm message and add approved message
    setMessages(prev => prev.filter(m => !m.confirmAction));
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

    const response: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: "✅ 申请表已生成完成！\n\n我已为您准备好《餐饮服务许可证申请表》，包含以下信息：\n\n- 申请人信息（待填写）\n- 经营场所信息\n- 经营项目：火锅餐饮\n- 所需材料清单\n\n您可以点击下载或在线编辑。是否需要我帮您预约递交材料的时间？",
      timestamp: new Date(),
      skill: "表单生成",
      status: "idle"
    };

    setMessages(prev => [...prev, response]);
    setCurrentStatus("idle");
    setActiveSkill(null);
    endTraceSession("completed");
  };

  const handleReject = () => {
    if (!pendingConfirm) return;

    addTraceEvent("confirm_rejected", { 
      skillName: pendingConfirm.skillName,
      reason: "用户拒绝" 
    });

    setMessages(prev => prev.filter(m => !m.confirmAction));
    setPendingConfirm(null);
    setCurrentStatus("idle");
    setActiveSkill(null);

    const response: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: "好的，已取消表单生成操作。如果您有其他问题，请随时告诉我。",
      timestamp: new Date(),
      status: "idle"
    };

    setMessages(prev => [...prev, response]);
    endTraceSession("cancelled");
  };

  const handleSend = async () => {
    if (!input.trim() || currentStatus !== "idle") return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    
    await simulateResponse(input);
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
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with MPLP Status */}
        <div className="panel-header border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm">餐饮办证助手</div>
              <div className="text-xs text-muted-foreground">市场监管局</div>
            </div>
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
          {messages.map(message => {
            // Render confirm card for system confirm messages
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
            currentSessionId={currentSessionId || undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default Runtime;
