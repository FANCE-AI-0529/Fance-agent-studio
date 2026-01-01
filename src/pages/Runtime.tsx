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
  Key,
  Settings2,
  HelpCircle
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmCard, ConfirmAction } from "@/components/runtime/ConfirmCard";
import { TraceTree, TraceSession, TraceEvent, TraceEventType } from "@/components/runtime/TraceTree";
import { AgentSelector } from "@/components/runtime/AgentSelector";
import { MPLPStepper, MPLPPhase } from "@/components/runtime/MPLPStepper";
import { ThinkingProcess, LogEntry, createLogEntry } from "@/components/runtime/ThinkingProcess";
import { ModelSelector, availableModels } from "@/components/runtime/ModelSelector";
import { SystemPromptEditor } from "@/components/runtime/SystemPromptEditor";
import { ModelRoutingConfig } from "@/components/runtime/ModelRoutingConfig";
import { AgentCollaborationPanel } from "@/components/runtime/AgentCollaborationPanel";
import { CircuitBreakerPanel } from "@/components/runtime/CircuitBreakerPanel";
import { TaskChainPanel } from "@/components/runtime/TaskChainPanel";
import { ExecutionHistoryPanel } from "@/components/runtime/ExecutionHistoryPanel";
import { FormattedText } from "@/components/runtime/FormattedText";
import { TypewriterFormattedText } from "@/components/runtime/TypewriterFormattedText";
import { MessageBubble } from "@/components/runtime/MessageBubble";
import { TypingIndicator } from "@/components/runtime/TypingIndicator";
import VoiceInputButton from "@/components/runtime/VoiceInputButton";
import WelcomeGuide from "@/components/runtime/WelcomeGuide";
import OnboardingTour, { useOnboardingTour } from "@/components/runtime/OnboardingTour";
import { QuickCommandMenu, MessageTemplates } from "@/components/runtime/QuickCommandMenu";
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
  isNew?: boolean; // Flag for typewriter effect
}

interface MemoryItem {
  key: string;
  value: string;
  type: "context" | "entity" | "fact";
}

// MPLP Scenario definitions
interface MPLPScenario {
  keywords: string[];
  skillName: string;
  requiresConfirm: boolean;
  riskLevel: "low" | "medium" | "high";
  permissions: string[];
  actionType: "read" | "write" | "network" | "execute" | "admin";
  description: string;
  details: string;
  thinkingSteps: { module: string; message: string; level: "info" | "warn" | "success" | "error" }[];
  mockResponse: string;
}

const mplpScenarios: MPLPScenario[] = [
  // Low Risk - Read Operations
  {
    keywords: ["读取", "查看", "文件", "查询", "获取"],
    skillName: "文件读取",
    requiresConfirm: false,
    riskLevel: "low",
    permissions: ["filesystem_read"],
    actionType: "read",
    description: "读取本地文件",
    details: "访问本地文件系统读取指定文件内容",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: file_read", level: "info" },
      { module: "MPLP:Auth", message: "Permission check: filesystem_read... OK", level: "success" },
      { module: "Skill:FileReader", message: "Scanning file path...", level: "info" },
      { module: "Skill:FileReader", message: "File loaded successfully", level: "success" },
    ],
    mockResponse: "📂 文件读取完成！\n\n已成功读取目标文件：\n```\n配置项: production\n数据库: postgresql://...\n缓存: redis://...\n```\n\n文件大小：2.3KB，最后修改时间：今天 14:30",
  },
  // Low Risk - Query Operations
  {
    keywords: ["搜索", "查找", "数据", "统计"],
    skillName: "数据查询",
    requiresConfirm: false,
    riskLevel: "low",
    permissions: ["database_read"],
    actionType: "read",
    description: "查询数据库信息",
    details: "从数据库中检索符合条件的记录",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: data_query", level: "info" },
      { module: "MPLP:Auth", message: "Permission check: database_read... OK", level: "success" },
      { module: "Skill:DBQuery", message: "Building SQL query...", level: "info" },
      { module: "Skill:DBQuery", message: "Executing query on database...", level: "info" },
      { module: "Skill:DBQuery", message: "Query returned 156 records", level: "success" },
    ],
    mockResponse: "📊 数据查询结果：\n\n共查询到 156 条记录\n\n| 类别 | 数量 | 占比 |\n|------|------|------|\n| 待处理 | 45 | 28.8% |\n| 处理中 | 67 | 42.9% |\n| 已完成 | 44 | 28.2% |\n\n需要我进一步分析这些数据吗？",
  },
  // Medium Risk - Network Operations
  {
    keywords: ["API", "接口", "调用", "请求", "发送"],
    skillName: "API调用",
    requiresConfirm: true,
    riskLevel: "medium",
    permissions: ["network", "api_access"],
    actionType: "network",
    description: "调用外部API接口",
    details: "将向第三方服务发送网络请求，可能涉及数据传输",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: api_call", level: "info" },
      { module: "MPLP:Auth", message: "Permission check: network... REQUIRES_CONFIRM", level: "warn" },
      { module: "MPLP:Policy", message: "External network access detected - user confirmation required", level: "warn" },
    ],
    mockResponse: "🌐 API调用成功！\n\n**请求详情：**\n- 端点: https://api.example.com/v1/data\n- 方法: POST\n- 状态码: 200 OK\n\n**响应数据：**\n```json\n{\n  \"success\": true,\n  \"data\": {\n    \"id\": \"txn_123456\",\n    \"status\": \"completed\"\n  }\n}\n```\n\n耗时：235ms",
  },
  // Medium Risk - Write Operations
  {
    keywords: ["生成", "创建", "表单", "申请", "写入"],
    skillName: "表单生成",
    requiresConfirm: true,
    riskLevel: "medium",
    permissions: ["write", "network"],
    actionType: "write",
    description: "生成餐饮经营许可证申请表",
    details: "将根据您提供的信息自动填写申请表单，并准备提交到市场监管局系统",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: form_generation", level: "info" },
      { module: "MPLP:Auth", message: "Permission check: write, network... REQUIRES_CONFIRM", level: "warn" },
      { module: "MPLP:Policy", message: "Sensitive write operation - user confirmation required", level: "warn" },
    ],
    mockResponse: "✅ 申请表已生成完成！\n\n我已为您准备好《餐饮服务许可证申请表》，包含以下信息：\n\n- 申请人信息（待填写）\n- 经营场所信息\n- 经营项目：火锅餐饮\n- 所需材料清单\n\n您可以点击下载或在线编辑。是否需要我帮您预约递交材料的时间？",
  },
  // Medium Risk - File Upload
  {
    keywords: ["上传", "导入", "传输"],
    skillName: "文件上传",
    requiresConfirm: true,
    riskLevel: "medium",
    permissions: ["filesystem_write", "network"],
    actionType: "write",
    description: "上传文件到服务器",
    details: "将本地文件上传到远程服务器，涉及网络传输",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: file_upload", level: "info" },
      { module: "MPLP:Auth", message: "Permission check: filesystem_write, network... REQUIRES_CONFIRM", level: "warn" },
      { module: "MPLP:Policy", message: "File transfer operation - user confirmation required", level: "warn" },
    ],
    mockResponse: "📤 文件上传成功！\n\n**上传详情：**\n- 文件名: document.pdf\n- 大小: 1.2 MB\n- 上传时间: 3.2秒\n- 存储路径: /uploads/2024/document.pdf\n\n文件已加密存储，有效期30天。",
  },
  // High Risk - Delete Operations
  {
    keywords: ["删除", "移除", "清空", "销毁"],
    skillName: "数据删除",
    requiresConfirm: true,
    riskLevel: "high",
    permissions: ["database_write", "delete"],
    actionType: "admin",
    description: "删除数据库记录",
    details: "⚠️ 此操作将永久删除数据，无法恢复！请谨慎确认",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: data_deletion", level: "info" },
      { module: "MPLP:Auth", message: "Permission check: delete... HIGH RISK", level: "error" },
      { module: "MPLP:Policy", message: "CRITICAL: Destructive operation detected!", level: "error" },
      { module: "MPLP:Policy", message: "Escalating to user confirmation with high-risk warning", level: "warn" },
    ],
    mockResponse: "🗑️ 数据删除完成\n\n已成功删除以下记录：\n- 删除记录数：23条\n- 释放空间：156KB\n\n操作已记录到审计日志。如需恢复，请联系管理员。",
  },
  // High Risk - Execute Operations
  {
    keywords: ["执行", "运行", "脚本", "命令", "部署"],
    skillName: "脚本执行",
    requiresConfirm: true,
    riskLevel: "high",
    permissions: ["execute", "system"],
    actionType: "execute",
    description: "执行系统脚本",
    details: "⚠️ 将在服务器上执行脚本命令，可能影响系统状态",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: script_execution", level: "info" },
      { module: "MPLP:Auth", message: "Permission check: execute, system... HIGH RISK", level: "error" },
      { module: "MPLP:Policy", message: "CRITICAL: Code execution request!", level: "error" },
      { module: "MPLP:Sandbox", message: "Preparing isolated execution environment...", level: "warn" },
    ],
    mockResponse: "⚡ 脚本执行完成！\n\n**执行结果：**\n```\n[2024-01-15 10:30:45] Starting deployment...\n[2024-01-15 10:30:47] Building application...\n[2024-01-15 10:31:02] Deploying to production...\n[2024-01-15 10:31:15] Deployment successful!\n```\n\n✅ 所有步骤执行成功，服务已更新。",
  },
  // High Risk - Payment Operations
  {
    keywords: ["支付", "转账", "付款", "交易"],
    skillName: "支付处理",
    requiresConfirm: true,
    riskLevel: "high",
    permissions: ["payment", "financial"],
    actionType: "admin",
    description: "处理支付交易",
    details: "⚠️ 此操作涉及资金流转，请仔细核对金额和收款方信息",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: payment_processing", level: "info" },
      { module: "MPLP:Auth", message: "Permission check: payment, financial... CRITICAL", level: "error" },
      { module: "MPLP:Policy", message: "FINANCIAL OPERATION - Maximum security required", level: "error" },
      { module: "MPLP:Compliance", message: "Checking transaction limits...", level: "warn" },
      { module: "MPLP:Compliance", message: "Anti-fraud check passed", level: "success" },
    ],
    mockResponse: "💳 支付处理成功！\n\n**交易详情：**\n- 交易号: PAY-2024011512345\n- 金额: ¥299.00\n- 收款方: 餐饮服务有限公司\n- 状态: 已完成\n\n交易凭证已发送至您的邮箱，请查收。",
  },
  // Medium Risk - Email Operations
  {
    keywords: ["邮件", "发送", "通知", "推送"],
    skillName: "邮件发送",
    requiresConfirm: true,
    riskLevel: "medium",
    permissions: ["network", "email"],
    actionType: "network",
    description: "发送电子邮件",
    details: "将通过邮件服务发送消息到指定收件人",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: email_send", level: "info" },
      { module: "MPLP:Auth", message: "Permission check: email, network... REQUIRES_CONFIRM", level: "warn" },
      { module: "MPLP:Policy", message: "External communication - user confirmation required", level: "warn" },
    ],
    mockResponse: "📧 邮件发送成功！\n\n**发送详情：**\n- 收件人: user@example.com\n- 主题: 您的申请已受理\n- 状态: 已送达\n- 消息ID: MSG-20240115-001\n\n预计对方将在24小时内回复。",
  },
];

// Helper function to match scenario
function matchScenario(message: string): MPLPScenario | null {
  const lowerMessage = message.toLowerCase();
  
  for (const scenario of mplpScenarios) {
    for (const keyword of scenario.keywords) {
      if (lowerMessage.includes(keyword)) {
        return scenario;
      }
    }
  }
  return null;
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
  
  // Onboarding tour
  const { showTour, completeTour, resetTour } = useOnboardingTour();
  
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
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<MPLPPhase>("idle");
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmAction | null>(null);
  const [pendingScenario, setPendingScenario] = useState<MPLPScenario | null>(null);
  const [traceSessions, setTraceSessions] = useState<TraceSession[]>([]);
  const [currentTraceSessionId, setCurrentTraceSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [contextMemory, setContextMemory] = useState<MemoryItem[]>([]);
  const [currentThinkingLogs, setCurrentThinkingLogs] = useState<LogEntry[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("google/gemini-2.5-flash");
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [promptVariables, setPromptVariables] = useState<Record<string, string>>({});
  const assistantContentRef = useRef("");
  const currentEventsRef = useRef<TraceEvent[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get selected model info
  const selectedModel = availableModels.find(m => m.id === selectedModelId) || availableModels[0];

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, currentThinkingLogs]);

  // Get current agent config for AI
  const agentSkills = selectedAgent 
    ? ((selectedAgent.manifest as any)?.skills?.details || []).map((s: any) => ({
        name: s.name,
        description: s.description,
        permissions: s.permissions,
      }))
    : [];

  // Determine the system prompt to use (with variable replacement)
  const baseSystemPrompt = customSystemPrompt || 
    (selectedAgent ? (selectedAgent.manifest as any)?.system_prompt : undefined);
  
  // Replace variables in the system prompt
  const effectiveSystemPrompt = baseSystemPrompt 
    ? baseSystemPrompt.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => promptVariables[key] || `{{${key}}}`)
    : undefined;

  const currentAgentConfig = {
    name: selectedAgent?.name,
    systemPrompt: effectiveSystemPrompt,
    model: selectedModelId,
    skills: agentSkills,
    mplpPolicy: selectedAgent?.mplp_policy,
  };

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
      const agentName = selectedAgent?.name || "MPLP 智能助手";
      setLocalMessages([
        {
          id: "welcome",
          role: "assistant",
          content: user 
            ? `您好！我是 **${agentName}**，运行在 Agent OS 平台上。\n\n🤖 **真实 AI 对话已启用** - 使用 Lovable AI Gateway 提供智能响应\n\n您可以尝试以下操作来体验不同的权限级别：\n\n🟢 **低风险**：查看文件、搜索数据\n🟡 **中风险**：调用API、生成表单、发送邮件\n🔴 **高风险**：删除数据、执行脚本、支付处理\n\n或者直接向我提问任何问题！`
            : `您好！我是 **${agentName}**。请先登录以保存对话历史。`,
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

  const { streamChat, isLoading: isAILoading } = useAgentChat({
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

  // Update context memory based on scenario
  const updateContextMemory = useCallback((scenario: MPLPScenario | null, userMessage: string) => {
    const newMemory: MemoryItem[] = [];
    
    if (scenario) {
      newMemory.push({ 
        key: "last_skill", 
        value: scenario.skillName, 
        type: "context" 
      });
      newMemory.push({ 
        key: "last_action", 
        value: scenario.actionType, 
        type: "fact" 
      });
      newMemory.push({ 
        key: "risk_level", 
        value: scenario.riskLevel, 
        type: "entity" 
      });
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

  const executeScenario = async (scenario: MPLPScenario, userMessage: string) => {
    // ============ EXECUTING PHASE ============
    setCurrentPhase("executing");
    setActiveSkill(scenario.skillName);
    
    addThinkingLog("Skill:" + scenario.skillName.replace(/\s/g, ''), "Starting execution...", "info");
    addTraceEvent("execution_started", { skillName: scenario.skillName });

    // Simulate execution time
    await new Promise(resolve => setTimeout(resolve, 800));
    addThinkingLog("Skill:" + scenario.skillName.replace(/\s/g, ''), "Processing request...", "info");
    
    await new Promise(resolve => setTimeout(resolve, 600));
    addThinkingLog("Skill:" + scenario.skillName.replace(/\s/g, ''), "Operation completed successfully", "success");

    addTraceEvent("execution_completed", { 
      skillName: scenario.skillName, 
      result: "success" 
    });

    // ============ TRACE PHASE ============
    setCurrentPhase("trace");
    await new Promise(resolve => setTimeout(resolve, 300));

    const events = [...currentEventsRef.current];
    const thinkingLogs = [...currentThinkingLogs];

    // Add thinking process card
    setLocalMessages(prev => [...prev, {
      id: `msg-thinking-${Date.now()}`,
      role: "system" as const,
      content: "",
      timestamp: new Date(),
      thinkingLogs,
    }]);

    // Add response
    const response: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: scenario.mockResponse,
      timestamp: new Date(),
      skill: scenario.skillName,
      status: "idle",
      traceEvents: events,
      isNew: true,
    };

    setLocalMessages(prev => [...prev, response]);
    setCurrentPhase("idle");
    setActiveSkill(null);
    endTraceSession("completed");

    updateContextMemory(scenario, userMessage);

    if (chatSession) {
      await addMessage({ role: "assistant", content: scenario.mockResponse }, scenario.skillName);
    }
  };

  const sendMessage = async (userMessage: string) => {
    // Start trace session
    startTraceSession(userMessage);

    // Match scenario
    const scenario = matchScenario(userMessage);

    // ============ PLANNING PHASE ============
    setCurrentPhase("planning");
    setActiveSkill(null);
    
    if (scenario) {
      // Add scenario-specific thinking logs
      for (const step of scenario.thinkingSteps) {
        addThinkingLog(step.module, step.message, step.level);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      addTraceEvent("intent_detected", { intent: scenario.skillName });

      if (scenario.requiresConfirm) {
        // ============ CONFIRM PHASE ============
        const confirmAction: ConfirmAction = {
          id: `confirm-${Date.now()}`,
          type: scenario.actionType,
          skillName: scenario.skillName,
          description: scenario.description,
          permissions: scenario.permissions,
          riskLevel: scenario.riskLevel,
          details: scenario.details,
        };

        setPendingConfirm(confirmAction);
        setPendingScenario(scenario);
        setCurrentPhase("confirm");
        addTraceEvent("confirm_requested", { skillName: scenario.skillName });

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

      // Execute directly for low-risk operations
      await executeScenario(scenario, userMessage);
    } else {
      // No matching scenario - use AI chat
      addThinkingLog("MPLP:Router", `Intent detected: "${userMessage.slice(0, 50)}..."`, "info");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      addThinkingLog("MPLP:Auth", `Permission check: general_query... OK`, "success");
      await new Promise(resolve => setTimeout(resolve, 200));
      
      addThinkingLog("Skill:Selector", `Match: "AI 对话" skill`, "info");
      
      setCurrentPhase("executing");
      setActiveSkill("AI 对话");
      
      addTraceEvent("skill_selected", { skillName: "AI 对话" });
      addTraceEvent("execution_started", { skillName: "AI 对话" });

      const chatMessages = localMessages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
      chatMessages.push({ role: "user", content: userMessage });

      assistantContentRef.current = "";

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
            isNew: true,
          }];
        });
      };

      await streamChat({
        messages: chatMessages,
        onDelta: upsertAssistant,
        onThinking: (module, message, level) => {
          addThinkingLog(module, message, level);
        },
        onDone: async () => {
          setCurrentPhase("trace");
          
          addTraceEvent("execution_completed", { 
            skillName: "AI 对话", 
            result: "success" 
          });
          
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

          updateContextMemory(null, userMessage);

          if (chatSession) {
            await addMessage({
              role: "assistant",
              content: assistantContentRef.current,
            }, "AI 对话");
          }
        },
      });
    }
  };

  const handleConfirm = async () => {
    if (!pendingConfirm || !pendingScenario) return;

    addTraceEvent("confirm_approved", { skillName: pendingConfirm.skillName });
    
    setLocalMessages(prev => prev.filter(m => !m.confirmAction));
    const scenario = pendingScenario;
    setPendingConfirm(null);
    setPendingScenario(null);
    
    await executeScenario(scenario, "");
    toast.success("操作已完成");
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
    setPendingScenario(null);
    setCurrentPhase("idle");
    setActiveSkill(null);

    const events = [...currentEventsRef.current];
    const responseContent = `好的，已取消「${pendingConfirm.skillName}」操作。如果您有其他问题，请随时告诉我。`;

    const response: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: responseContent,
      timestamp: new Date(),
      status: "idle",
      traceEvents: events,
      isNew: true,
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
    <>
      {/* Onboarding Tour */}
      <OnboardingTour onComplete={completeTour} forceShow={showTour} />
      
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
          
          <div className="flex items-center gap-2">
            {activeSkill && (
              <Badge variant="outline" className="text-xs gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {activeSkill}
              </Badge>
            )}
            <SystemPromptEditor
              value={customSystemPrompt || baseSystemPrompt || ""}
              onChange={setCustomSystemPrompt}
              onVariablesChange={setPromptVariables}
              agentId={selectedAgent?.id}
              agentName={selectedAgent?.name || "Default Agent"}
              disabled={currentPhase !== "idle"}
            />
            <div className="flex items-center gap-1.5">
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              <ModelSelector
                value={selectedModelId}
                onChange={setSelectedModelId}
                disabled={currentPhase !== "idle"}
              />
              <ModelRoutingConfig 
                agentId={selectedAgent?.id}
                agentName={selectedAgent?.name}
              />
              <AgentCollaborationPanel
                currentAgentId={selectedAgent?.id}
                currentAgentName={selectedAgent?.name}
              />
              <TaskChainPanel />
              <ExecutionHistoryPanel />
              <CircuitBreakerPanel
                agentId={selectedAgent?.id}
                agentName={selectedAgent?.name}
              />
              <TooltipProvider>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={resetTour}
                  title="查看使用教程"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* MPLP Protocol Status Bar (Stepper) */}
        <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center justify-center">
          <MPLPStepper currentPhase={currentPhase} />
        </div>

        {/* Messages or Welcome Guide */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {localMessages.length === 0 && currentPhase === "idle" ? (
            <WelcomeGuide 
              agent={selectedAgent} 
              onCommandClick={(command) => {
                setInput(command);
              }}
            />
          ) : (
            <>
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
              <MessageBubble
                key={message.id}
                id={message.id}
                role={message.role as "user" | "assistant"}
                content={message.content}
                timestamp={message.timestamp}
                skill={message.skill}
                isNew={message.isNew}
                agentAvatar={
                  selectedAgent?.manifest 
                    ? {
                        iconId: (selectedAgent.manifest as any).iconId || "bot",
                        colorId: (selectedAgent.manifest as any).colorId || "blue",
                      }
                    : undefined
                }
                onRegenerate={
                  message.role === "assistant" && currentPhase === "idle"
                    ? () => {
                        // Find the user message before this assistant message
                        const messageIndex = localMessages.findIndex(m => m.id === message.id);
                        if (messageIndex > 0) {
                          const userMessage = localMessages
                            .slice(0, messageIndex)
                            .reverse()
                            .find(m => m.role === "user");
                          if (userMessage) {
                            // Remove the current assistant message and regenerate
                            setLocalMessages(prev => prev.filter(m => m.id !== message.id));
                            sendMessage(userMessage.content);
                          }
                        }
                      }
                    : undefined
                }
                onEdit={
                  message.role === "user" && currentPhase === "idle"
                    ? (newContent: string) => {
                        const messageIndex = localMessages.findIndex(m => m.id === message.id);
                        // Update the user message content
                        setLocalMessages(prev => {
                          const updated = [...prev];
                          // Update the edited message
                          updated[messageIndex] = { ...updated[messageIndex], content: newContent };
                          // Remove all messages after this one (including AI responses)
                          return updated.slice(0, messageIndex + 1);
                        });
                        // Regenerate response with edited content
                        sendMessage(newContent);
                      }
                    : undefined
                }
              />
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
            <TypingIndicator 
              phase={currentPhase === "planning" ? "planning" : currentPhase === "executing" ? "executing" : "trace"} 
            />
          )}
          
          <div ref={messagesEndRef} />
          </>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border relative">
          {/* Quick Command Menu */}
          <QuickCommandMenu
            isOpen={showQuickCommands}
            onClose={() => setShowQuickCommands(false)}
            onSelect={(prompt) => {
              setInput(prompt);
              setShowQuickCommands(false);
            }}
            filter={input.startsWith("/") ? input.slice(1) : ""}
          />
          
          {/* Message templates for empty state */}
          {localMessages.length <= 1 && !input && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">快速开始：</p>
              <MessageTemplates 
                onSelect={(content) => setInput(content)} 
              />
            </div>
          )}
          
          <div className="flex gap-2">
            <TooltipProvider>
              <VoiceInputButton 
                onTranscript={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
                disabled={currentPhase !== "idle"}
              />
            </TooltipProvider>
            <Input
              placeholder="输入消息，或输入 / 打开快捷命令菜单..."
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // Show quick commands when typing /
                if (e.target.value.startsWith("/")) {
                  setShowQuickCommands(true);
                } else {
                  setShowQuickCommands(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !showQuickCommands) {
                  handleSend();
                } else if (e.key === "Escape") {
                  setShowQuickCommands(false);
                }
              }}
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
          
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            输入 <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">/</kbd> 打开快捷命令 · 按 <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Enter</kbd> 发送
          </p>
        </div>
      </div>

      {/* Right Panel - Trace Tree */}
      <div className="w-72 border-l border-border bg-card/50 hidden lg:flex flex-col">
        <div className="panel-header border-b border-border">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-cognitive" />
            <span className="font-semibold text-sm">决策追踪</span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-2">
          <TraceTree 
            sessions={traceSessions} 
            currentSessionId={currentTraceSessionId || undefined}
            onClearSessions={() => {
              setTraceSessions([]);
              setCurrentTraceSessionId(null);
            }}
            onRefresh={() => {
              // Force re-render
              setTraceSessions(prev => [...prev]);
            }}
          />
        </div>
      </div>

      {/* Context Panel */}
      <ContextPanel agent={selectedAgent} memory={contextMemory} />
    </div>
    </>
  );
};

export default Runtime;
