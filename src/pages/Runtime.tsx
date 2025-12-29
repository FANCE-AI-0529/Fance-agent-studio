import { useState } from "react";
import { 
  Send, 
  History, 
  Bot, 
  User, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Brain,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type MPLPStatus = "idle" | "planning" | "confirm" | "executing";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  skill?: string;
  status?: MPLPStatus;
}

const statusConfig = {
  idle: { label: "待命", icon: Clock, className: "text-muted-foreground bg-muted" },
  planning: { label: "规划中", icon: Brain, className: "text-status-planning bg-status-planning/10" },
  confirm: { label: "待确认", icon: AlertCircle, className: "text-status-confirm bg-status-confirm/10" },
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

  const simulateResponse = async (userMessage: string) => {
    // Simulate planning phase
    setCurrentStatus("planning");
    setActiveSkill("政策查询");
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate execution
    setCurrentStatus("executing");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate response
    const response: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: userMessage.includes("火锅") 
        ? "好的，根据2025年最新规定，开设火锅店需要办理以下证照：\n\n1. **营业执照** - 市场监管局办理\n2. **食品经营许可证** - 需现场核查\n3. **消防安全检查合格证** - 消防部门出具\n4. **环保审批** - 餐饮油烟需达标\n\n请问需要我帮您生成申请表吗？"
        : "好的，我来为您查询相关信息...",
      timestamp: new Date(),
      skill: "政策查询",
      status: "idle"
    };

    setMessages(prev => [...prev, response]);
    setCurrentStatus("idle");
    setActiveSkill(null);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

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
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <History className="h-4 w-4" />
            </Button>
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
            {["Planning", "Confirm", "Executing"].map((phase, i) => (
              <div key={phase} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  currentStatus === phase.toLowerCase() 
                    ? "bg-primary" 
                    : "bg-muted"
                }`} />
                <span className={`text-[10px] ${
                  currentStatus === phase.toLowerCase()
                    ? "text-foreground"
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
          {messages.map(message => (
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
          ))}

          {/* Typing indicator */}
          {currentStatus !== "idle" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              <div className="p-3 rounded-lg bg-card border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {currentStatus === "planning" && "正在分析意图并选择技能..."}
                    {currentStatus === "confirm" && "等待用户确认操作..."}
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

      {/* Right Panel - Trace / History */}
      <div className="w-72 border-l border-border bg-card/50 hidden lg:flex flex-col">
        <div className="panel-header">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="font-semibold text-sm">决策追踪</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              当前会话
            </div>
            
            {messages.filter(m => m.role === "assistant" && m.skill).map((msg, i) => (
              <div key={msg.id} className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded bg-cognitive/10 flex items-center justify-center">
                    <Brain className="h-3 w-3 text-cognitive" />
                  </div>
                  <span className="text-xs font-medium">{msg.skill}</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {msg.content.substring(0, 80)}...
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-status-executing" />
                  <span className="text-[10px] text-muted-foreground">执行成功</span>
                </div>
              </div>
            ))}

            {messages.filter(m => m.role === "assistant" && m.skill).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">
                暂无决策记录
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Runtime;