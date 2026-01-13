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
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Code2,
  MessageCircle,
  PanelBottomClose,
  PanelBottomOpen,
  Sparkles,
  Brain,
} from "lucide-react";
import { useAppModeStore } from "@/stores/appModeStore";
import { ConsumerRuntime } from "@/components/runtime/ConsumerRuntime";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EnhancedConfirmCard as ConfirmCard, ConfirmAction, getMCPRiskLevel, getMCPToolPermissions } from "@/components/runtime/EnhancedConfirmCard";
import { QuickShareButton } from "@/components/runtime/ShareDialog";
import { QuickCommandPalette } from "@/components/runtime/QuickCommandPalette";
import { AgentQuickSwitcher, QuickAgent } from "@/components/runtime/AgentQuickSwitcher";
import { TraceTree } from "@/components/runtime/TraceTree";
import { useTrace, TraceEventType, TraceSession, TraceEvent } from "@/components/runtime/trace";
import { AgentSelector } from "@/components/runtime/AgentSelector";
import { MPLPStepper, MPLPPhase } from "@/components/runtime/MPLPStepper";
import { ThinkingProcess, LogEntry, createLogEntry } from "@/components/runtime/ThinkingProcess";
import { ModelSelector, availableModels } from "@/components/runtime/ModelSelector";
import { SystemPromptEditor } from "@/components/runtime/SystemPromptEditor";
import { ModelRoutingConfig } from "@/components/runtime/ModelRoutingConfig";
import { FormattedText } from "@/components/runtime/FormattedText";
import { TypewriterFormattedText } from "@/components/runtime/TypewriterFormattedText";
import { MessageBubble } from "@/components/runtime/MessageBubble";
import { TypingIndicator } from "@/components/runtime/TypingIndicator";
import VoiceInputButton from "@/components/runtime/VoiceInputButton";
import WelcomeGuide from "@/components/runtime/WelcomeGuide";
import { EnhancedWelcomeCard } from "@/components/runtime/EnhancedWelcomeCard";
import OnboardingTour, { useOnboardingTour } from "@/components/runtime/OnboardingTour";
import { QuickCommandMenu, MessageTemplates } from "@/components/runtime/QuickCommandMenu";
import { FileUploadButton } from "@/components/runtime/FileUploadButton";
import { AttachmentPreview } from "@/components/runtime/AttachmentPreview";
import { DevToolsPanel } from "@/components/runtime/DevToolsPanel";
import { CircuitBreakerContent } from "@/components/runtime/CircuitBreakerContent";
import { ContextPanelContent } from "@/components/runtime/ContextPanelContent";
import { AgentAvatarAnimated, AvatarState } from "@/components/runtime/AgentAvatarAnimated";
import { SceneBackground, scenePresets } from "@/components/runtime/SceneBackground";
import { ScenarioSelector } from "@/components/runtime/ScenarioSelector";
import { ScenarioPrompts } from "@/components/runtime/ScenarioPrompts";
import { MemoryPanel } from "@/components/runtime/MemoryPanel";
import { ManusMemoryPanel } from "@/components/runtime/ManusMemoryPanel";
import { ManusStatusBadge } from "@/components/runtime/ManusStatusIndicator";
import { ImmersiveHeader } from "@/components/runtime/ImmersiveHeader";
import { useDevToolsState } from "@/hooks/useDevToolsState";
import { useManusKernel } from "@/hooks/useManusKernel";
import { useScenarios, Scenario, useSetSessionScenario, useActiveScenario } from "@/hooks/useScenarios";
import { useMemoryContext } from "@/hooks/useMemory";
import { useAutoMemoryExtraction } from "@/hooks/useAutoMemoryExtraction";
import { useManusSessionFiles } from "@/hooks/useManusSessionFiles";
import { useAgentChat, createMultimodalContent, type ChatMessage } from "@/hooks/useAgentChat";
import { useFileUpload, type UploadedFile } from "@/hooks/useFileUpload";
import { useChatSession } from "@/hooks/useChatSession";
import { useDeployedAgents, Agent } from "@/hooks/useAgents";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Attachment info stored with messages
interface MessageAttachment {
  id: string;
  type: 'image' | 'document';
  name: string;
  url: string;
  mimeType: string;
}

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
  attachments?: MessageAttachment[]; // For multimodal messages
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
  actionType: "read" | "write" | "network" | "execute" | "admin" | "mcp_tool";
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
    permissions: ["database_write", "admin"],
    actionType: "admin",
    description: "删除数据库记录",
    details: "⚠️ 此操作将永久删除数据，无法恢复。请确认您要执行此操作。",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: data_delete - HIGH RISK", level: "warn" },
      { module: "MPLP:Auth", message: "Permission check: database_write, admin... REQUIRES_CONFIRM", level: "warn" },
      { module: "MPLP:Policy", message: "🔴 HIGH RISK OPERATION - Admin confirmation required", level: "error" },
    ],
    mockResponse: "🗑️ 数据删除完成！\n\n已成功删除以下内容：\n- 删除记录数：23 条\n- 释放空间：1.5 MB\n- 操作时间：2024-01-15 14:30:25\n\n此操作已记录到审计日志。",
  },
  // High Risk - Execute Script
  {
    keywords: ["执行", "运行", "脚本", "命令"],
    skillName: "脚本执行",
    requiresConfirm: true,
    riskLevel: "high",
    permissions: ["execute", "admin"],
    actionType: "execute",
    description: "执行系统脚本",
    details: "⚠️ 将在服务器上执行脚本命令，可能影响系统状态",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: script_execute - HIGH RISK", level: "warn" },
      { module: "MPLP:Auth", message: "Permission check: execute, admin... REQUIRES_CONFIRM", level: "warn" },
      { module: "MPLP:Policy", message: "🔴 Script execution requires admin approval", level: "error" },
    ],
    mockResponse: "⚡ 脚本执行完成！\n\n```bash\n$ ./deploy.sh --env=production\n[OK] Building application...\n[OK] Running tests...\n[OK] Deploying to server...\n[OK] Health check passed\n```\n\n部署成功！服务已在生产环境上线。",
  },
  // High Risk - Payment
  {
    keywords: ["支付", "付款", "转账", "扣款"],
    skillName: "支付处理",
    requiresConfirm: true,
    riskLevel: "high",
    permissions: ["payment", "admin"],
    actionType: "admin",
    description: "处理支付交易",
    details: "⚠️ 将执行资金转移操作，请仔细核对金额和收款方",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: payment_process - HIGH RISK", level: "warn" },
      { module: "MPLP:Auth", message: "Permission check: payment, admin... REQUIRES_CONFIRM", level: "warn" },
      { module: "MPLP:Policy", message: "🔴 Financial transaction requires explicit approval", level: "error" },
    ],
    mockResponse: "💰 支付处理完成！\n\n**交易详情：**\n- 交易ID: TXN-2024-001234\n- 金额: ¥1,500.00\n- 收款方: 某某供应商\n- 状态: ✅ 成功\n\n电子回单已发送至您的邮箱。",
  },
  // MCP Tool - Terminal Command (High Risk)
  {
    keywords: ["MCP", "终端", "命令", "shell", "execute"],
    skillName: "MCP 终端执行",
    requiresConfirm: true,
    riskLevel: "high",
    permissions: ["execute", "file_system", "mcp_access"],
    actionType: "mcp_tool",
    description: "调用 MCP 工具执行终端命令",
    details: "⚠️ MCP 工具将在外部服务器执行命令，可能影响系统状态。请仔细确认工具名称和输入参数。",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: mcp_tool_call - HIGH RISK", level: "warn" },
      { module: "MPLP:Auth", message: "Permission check: execute, mcp_access... REQUIRES_CONFIRM", level: "warn" },
      { module: "MPLP:Policy", message: "🔴 MCP tool execution requires explicit user approval", level: "error" },
    ],
    mockResponse: "⚡ MCP 工具执行完成！\n\n```\n$ execute_command\n[OK] Command executed successfully\n[OK] Output captured\n```\n\n工具执行成功，结果已返回。",
  },
  // MCP Tool - Browser (Medium Risk)
  {
    keywords: ["浏览器", "网页", "playwright", "puppeteer", "scrape"],
    skillName: "MCP 浏览器自动化",
    requiresConfirm: true,
    riskLevel: "medium",
    permissions: ["browser", "network", "mcp_access"],
    actionType: "mcp_tool",
    description: "调用 MCP 浏览器自动化工具",
    details: "此操作将通过 MCP 控制浏览器访问网页，可能涉及网络请求和数据抓取。",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: mcp_browser_automation", level: "info" },
      { module: "MPLP:Auth", message: "Permission check: browser, network... REQUIRES_CONFIRM", level: "warn" },
      { module: "MPLP:Policy", message: "MCP browser access requires user confirmation", level: "warn" },
    ],
    mockResponse: "🌐 MCP 浏览器工具执行完成！\n\n**操作详情：**\n- 访问页面: https://example.com\n- 状态: 200 OK\n- 截图已保存\n\n网页内容已抓取完成。",
  },
  // MCP Tool - Database (Medium Risk)
  {
    keywords: ["数据库", "postgres", "mysql", "sqlite", "query"],
    skillName: "MCP 数据库操作",
    requiresConfirm: true,
    riskLevel: "medium",
    permissions: ["database", "read", "mcp_access"],
    actionType: "mcp_tool",
    description: "调用 MCP 数据库工具",
    details: "此操作将通过 MCP 连接到外部数据库执行查询或操作。",
    thinkingSteps: [
      { module: "MPLP:Router", message: "Intent detected: mcp_database_query", level: "info" },
      { module: "MPLP:Auth", message: "Permission check: database, mcp_access... REQUIRES_CONFIRM", level: "warn" },
      { module: "MPLP:Policy", message: "MCP database access requires user confirmation", level: "warn" },
    ],
    mockResponse: "🗄️ MCP 数据库工具执行完成！\n\n**查询结果：**\n- 返回记录数: 42\n- 执行时间: 125ms\n\n数据已成功检索。",
  },
];

// Helper function to create MCP confirm action
function createMCPConfirmAction(
  server: string,
  tool: string,
  inputs: Record<string, unknown>
): ConfirmAction {
  const riskLevel = getMCPRiskLevel(tool);
  const permissions = getMCPToolPermissions(tool);
  
  return {
    id: `mcp-${Date.now()}`,
    type: "mcp_tool",
    skillName: `${server} / ${tool}`,
    description: `调用 MCP 工具: ${tool}`,
    permissions,
    riskLevel,
    isMCP: true,
    mcpServer: server,
    mcpTool: tool,
    mcpInputs: inputs,
    details: riskLevel === "high" 
      ? `⚠️ 此 MCP 工具 (${tool}) 可能执行危险操作。请仔细确认参数后再继续。`
      : `此操作将向 MCP 服务器 ${server} 发送请求。`,
  };
}

const Runtime = () => {
  const { user } = useAuth();
  const { mode } = useAppModeStore();
  
  const { data: deployedAgents = [], isLoading: isLoadingAgents } = useDeployedAgents();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  // Consumer mode - render simplified runtime
  if (mode === 'consumer') {
    return <ConsumerRuntime />;
  }
  
  // Onboarding tour (Studio mode only)
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
    findOrCreateSessionForAgent,
  } = useChatSession();

  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showQuickCommands, setShowQuickCommands] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<MPLPPhase>("idle");
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmAction | null>(null);
  const [pendingScenario, setPendingScenario] = useState<MPLPScenario | null>(null);
  
  // Use the new trace hook - single source of truth for trace state
  const trace = useTrace();
  
  const [showHistory, setShowHistory] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [contextMemory, setContextMemory] = useState<MemoryItem[]>([]);
  const [currentThinkingLogs, setCurrentThinkingLogs] = useState<LogEntry[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("google/gemini-2.5-flash");
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  const [promptVariables, setPromptVariables] = useState<Record<string, string>>({});
  const assistantContentRef = useRef("");
  const currentEventsRef = useRef<TraceEvent[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // DevTools state
  const devToolsState = useDevToolsState();
  
  // File upload hook
  const { files: pendingFiles, isUploading, addFiles, removeFile, clearFiles } = useFileUpload();

  // Scenario management
  const setSessionScenario = useSetSessionScenario();
  
  // Memory context for AI
  const { generateContext: generateMemoryContext, hasMemories } = useMemoryContext(selectedAgent?.id);
  
  // Auto memory extraction
  const { extractAndSaveMemories } = useAutoMemoryExtraction(selectedAgent?.id);
  
  // Manus session files management
  const { ensureManusFiles } = useManusSessionFiles();

  // Get selected model info
  const selectedModel = availableModels.find(m => m.id === selectedModelId) || availableModels[0];

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, currentThinkingLogs]);

  // Keyboard shortcut for developer mode toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setIsDeveloperMode(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
  const variableReplacedPrompt = baseSystemPrompt 
    ? baseSystemPrompt.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => promptVariables[key] || `{{${key}}}`)
    : undefined;
  
  // Inject memory context into system prompt
  const memoryContext = generateMemoryContext();
  const effectiveSystemPrompt = [
    variableReplacedPrompt,
    memoryContext,
    activeScenario ? `\n\n【当前场景】${activeScenario.name}\n${activeScenario.description || ""}\n你扮演: ${activeScenario.agentRole || "智能助手"}\n用户扮演: ${activeScenario.userRole || "用户"}` : "",
  ].filter(Boolean).join("\n\n");

  const currentAgentConfig = {
    name: selectedAgent?.name,
    systemPrompt: effectiveSystemPrompt || undefined,
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
      const agentName = selectedAgent?.name || "Fance 智能助手";
      const isDefaultAgent = !selectedAgent;
      
      // Different welcome messages for default Fance guide vs custom agents
      const welcomeContent = user
        ? isDefaultAgent
          ? `您好！我是 **${agentName}**，您的专属平台向导。\n\n我可以帮您：\n- 了解如何快速创建您的第一个智能体\n- 探索平台上的各种技能和能力包\n- 解答关于 Fance OS 的任何问题\n- 推荐适合您需求的智能体模板\n\n请问有什么我可以帮您的吗？`
          : `您好！我是 **${agentName}**，很高兴为您服务。\n\n请告诉我您需要什么帮助，我会尽力协助您完成任务。`
        : `您好！我是 **${agentName}**。请先登录以保存对话历史。`;
      
      setLocalMessages([
        {
          id: "welcome",
          role: "assistant",
          content: welcomeContent,
          timestamp: new Date(),
          status: "idle",
        },
      ]);
    }
  }, [chatSession, isLoadingSession, user, localMessages.length, selectedAgent]);

  // Reset messages when agent changes and load existing session
  const handleAgentChange = useCallback(async (agent: Agent | null) => {
    setSelectedAgent(agent);
    
    // Clear temporary state
    trace.clearSessions();
    setContextMemory([]);
    setCurrentThinkingLogs([]);
    
    // Find or create session for this agent (preserves chat history)
    if (user) {
      const session = await findOrCreateSessionForAgent(agent?.id ?? null);
      if (!session) {
        // If no session, just clear messages for welcome screen
        setLocalMessages([]);
      }
      // If session loaded, persistedMessages will update via useEffect
    } else {
      setLocalMessages([]);
    }
  }, [trace, user, findOrCreateSessionForAgent]);

  const handleTraceEvent = useCallback((type: string, data: Record<string, unknown>) => {
    if (type === "error") {
      toast.error(data.message as string);
    }
  }, []);

  const { streamChat, isLoading: isAILoading } = useAgentChat({
    agentConfig: currentAgentConfig,
    onTraceEvent: handleTraceEvent,
  });

  // Compute avatar state based on current phase
  const avatarState: AvatarState = isAILoading || currentPhase === "executing" 
    ? "thinking" 
    : currentPhase === "planning" 
      ? "listening"
      : "idle";

  // Add thinking log
  const addThinkingLog = useCallback((module: string, message: string, level: LogEntry["level"] = "info") => {
    const log = createLogEntry(module, message, level);
    setCurrentThinkingLogs(prev => [...prev, log]);
    return log;
  }, []);

  // Add trace event to current session - now uses the trace hook
  const addTraceEvent = useCallback((type: TraceEventType, data: TraceEvent["data"]) => {
    const event: TraceEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: new Date(),
      data,
    };
    currentEventsRef.current = [...currentEventsRef.current, event];
    trace.addEvent(type, data);
  }, [trace]);

  // Start a new trace session - now uses the trace hook
  const startTraceSession = useCallback((query: string) => {
    currentEventsRef.current = [];
    setCurrentThinkingLogs([]);
    return trace.startSession(query);
  }, [trace]);

  // End current trace session - now uses the trace hook
  const endTraceSession = useCallback((status: TraceSession["status"]) => {
    trace.endSession(status);
  }, [trace]);

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
        type: "context" 
      });
      if (scenario.riskLevel !== "low") {
        newMemory.push({ 
          key: "risk_level", 
          value: scenario.riskLevel, 
          type: "fact" 
        });
      }
    }

    // Extract entities from user message (simple example)
    const dateMatch = userMessage.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
    if (dateMatch) {
      newMemory.push({ key: "date_entity", value: dateMatch[1], type: "entity" });
    }

    const amountMatch = userMessage.match(/([¥$€]\s*[\d,]+\.?\d*)/);
    if (amountMatch) {
      newMemory.push({ key: "amount_entity", value: amountMatch[1], type: "entity" });
    }

    setContextMemory(prev => [...prev, ...newMemory].slice(-10)); // Keep last 10 items
  }, []);

  // Execute a scenario (after confirm if needed)
  const executeScenario = async (scenario: MPLPScenario, userMessage: string) => {
    setCurrentPhase("executing");
    setActiveSkill(scenario.skillName);
    
    addTraceEvent("skill_selected", { skillName: scenario.skillName });
    addTraceEvent("permission_check", { 
      permissions: scenario.permissions, 
      result: "approved" 
    });
    addTraceEvent("execution_started", { skillName: scenario.skillName });

    addThinkingLog("Skill:" + scenario.skillName, "Executing skill...", "info");
    await new Promise(resolve => setTimeout(resolve, 800));
    
    addThinkingLog("Skill:" + scenario.skillName, "Processing complete", "success");
    await new Promise(resolve => setTimeout(resolve, 300));

    setCurrentPhase("trace");
    
    addTraceEvent("execution_completed", { 
      skillName: scenario.skillName, 
      result: "success" 
    });

    const events = [...currentEventsRef.current];
    const thinkingLogs = [...currentThinkingLogs];
    
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

    setLocalMessages(prev => [...prev, 
      {
        id: `msg-thinking-${Date.now()}`,
        role: "system" as const,
        content: "",
        timestamp: new Date(),
        thinkingLogs,
      },
      response
    ]);

    await new Promise(resolve => setTimeout(resolve, 500));
    
    setCurrentPhase("idle");
    setActiveSkill(null);
    endTraceSession("completed");

    updateContextMemory(scenario, userMessage);

    if (chatSession) {
      await addMessage({
        role: "assistant",
        content: scenario.mockResponse,
      }, scenario.skillName);
    }
  };

  // Match user input to MPLP scenario
  const matchScenario = (message: string): MPLPScenario | null => {
    const lowerMessage = message.toLowerCase();
    
    for (const scenario of mplpScenarios) {
      for (const keyword of scenario.keywords) {
        if (lowerMessage.includes(keyword.toLowerCase())) {
          return scenario;
        }
      }
    }
    
    return null;
  };

  // Send message handler
  const sendMessage = async (messageContent: string, attachments: MessageAttachment[] = []) => {
    startTraceSession(messageContent);
    
    const scenario = matchScenario(messageContent);
    
    // ============ PLANNING PHASE ============
    setCurrentPhase("planning");
    addThinkingLog("MPLP:Gateway", `Received message: "${messageContent.slice(0, 50)}${messageContent.length > 50 ? '...' : ''}"`, "info");
    
    // Add attachment info to thinking logs
    if (attachments.length > 0) {
      addThinkingLog("MPLP:Gateway", `附件: ${attachments.length} 个文件 (${attachments.map(a => a.type).join(', ')})`, "info");
    }
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
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
      await executeScenario(scenario, messageContent);
    } else {
      // No matching scenario - use AI chat
      addThinkingLog("MPLP:Router", `Intent detected: "${messageContent.slice(0, 50)}..."`, "info");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      addThinkingLog("MPLP:Auth", `Permission check: general_query... OK`, "success");
      await new Promise(resolve => setTimeout(resolve, 200));
      
      addThinkingLog("Skill:Selector", `Match: "AI 对话" skill`, "info");
      
      setCurrentPhase("executing");
      setActiveSkill("AI 对话");
      
      addTraceEvent("skill_selected", { skillName: "AI 对话" });
      addTraceEvent("execution_started", { skillName: "AI 对话" });

      const chatMessages: ChatMessage[] = localMessages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ 
          role: m.role as "user" | "assistant", 
          content: m.attachments?.length 
            ? createMultimodalContent(m.content, m.attachments.map(a => ({ type: a.type, url: a.url })))
            : m.content 
        }));
      
      // Add the new user message with attachments
      const newMessageContent = attachments.length > 0
        ? createMultimodalContent(messageContent, attachments.map(a => ({ type: a.type, url: a.url })))
        : messageContent;
      chatMessages.push({ role: "user", content: newMessageContent });

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

          updateContextMemory(null, messageContent);
          
          // Auto-extract memories from the conversation
          if (assistantContentRef.current) {
            extractAndSaveMemories(messageContent, assistantContentRef.current);
          }

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
  };

  const handleSend = async () => {
    if ((!input.trim() && pendingFiles.length === 0) || currentPhase !== "idle") return;
    
    const messageContent = input.trim();
    setInput("");
    
    // Collect attachments from pending files
    const attachments: MessageAttachment[] = pendingFiles.map(file => ({
      id: file.id,
      type: file.type === 'image' ? 'image' : 'document',
      name: file.name,
      url: file.preview, // Use local data URL (base64 preview)
      mimeType: file.file.type,
    }));
    clearFiles();

    let activeSession = chatSession;
    if (!activeSession && user) {
      const agentId = selectedAgent?.id || undefined;
      activeSession = await createSession(agentId);
      if (!activeSession) {
        toast.error("创建会话失败");
        return;
      }
      // Initialize Manus kernel files for new session
      if (activeSession) {
        ensureManusFiles(activeSession.id, agentId || null);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setLocalMessages(prev => [...prev, userMessage]);

    if (activeSession) {
      await addMessage({ role: "user", content: messageContent });
    }
    
    await sendMessage(messageContent, attachments);
  };

  const handleNewSession = async () => {
    if (!user) {
      toast.error("请先登录");
      return;
    }
    await createSession();
    trace.clearSessions();
    setContextMemory([]);
    setCurrentThinkingLogs([]);
    toast.success("已创建新会话");
  };

  const handleLoadSession = async (sessionId: string) => {
    await loadSession(sessionId);
    setShowHistory(false);
    trace.clearSessions();
    setContextMemory([]);
    setCurrentThinkingLogs([]);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSession(sessionId);
    toast.success("已删除会话");
  };

  // Handle scenario selection
  const handleSelectScenario = async (scenario: Scenario | null) => {
    setActiveScenario(scenario);
    
    if (scenario) {
      // Add enhanced opening message if available
      if (scenario.openingLines && scenario.openingLines.length > 0) {
        const opening = scenario.openingLines[Math.floor(Math.random() * scenario.openingLines.length)];
        const roleInfo = [];
        if (scenario.agentRole) roleInfo.push(`🤖 AI扮演: **${scenario.agentRole}**`);
        if (scenario.userRole) roleInfo.push(`👤 你扮演: **${scenario.userRole}**`);
        
        const welcomeContent = [
          `🎭 **${scenario.name}**`,
          scenario.description ? `\n${scenario.description}` : "",
          roleInfo.length > 0 ? `\n\n${roleInfo.join(" | ")}` : "",
          `\n\n---\n\n${opening}`,
        ].filter(Boolean).join("");
        
        setLocalMessages(prev => [...prev, {
          id: `scenario-welcome-${Date.now()}`,
          role: "assistant" as const,
          content: welcomeContent,
          timestamp: new Date(),
          isNew: true,
        }]);
      }
      
      // Update session with scenario
      if (chatSession) {
        await setSessionScenario.mutateAsync({
          sessionId: chatSession.id,
          scenarioId: scenario.id,
          sceneConfig: (scenario.sceneBackground as Record<string, unknown>) || undefined,
        });
      }
      
      toast.success(`已进入「${scenario.name}」场景`);
    } else {
      // Clear scenario
      if (chatSession) {
        await setSessionScenario.mutateAsync({
          sessionId: chatSession.id,
          scenarioId: null,
          sceneConfig: undefined,
        });
      }
      toast.info("已退出场景模式");
    }
  };

  // Render DevTools content panels
  const renderTraceContent = () => (
    <TraceTree 
      sessions={trace.sessions} 
      currentSessionId={trace.activeSessionId || undefined}
      onClearSessions={() => {
        trace.clearSessions();
        currentEventsRef.current = [];
      }}
      onRefresh={() => {}}
    />
  );

  const renderContextContent = () => (
    <ContextPanelContent agent={selectedAgent} memory={contextMemory} />
  );

  const renderCircuitContent = () => (
    <CircuitBreakerContent
      agentId={selectedAgent?.id}
      agentName={selectedAgent?.name}
      onWarningChange={devToolsState.setCircuitWarning}
    />
  );

  return (
    <>
      {/* Onboarding Tour */}
      <OnboardingTour onComplete={completeTour} forceShow={showTour} />
      
      <div className="h-full flex flex-col">
        {/* Main Content */}
        <ResizablePanelGroup direction="vertical" className="flex-1">
          {/* Chat Area Panel */}
          <ResizablePanel defaultSize={isDeveloperMode ? 65 : 100} minSize={40}>
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
              <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
                {/* Scene Background - Only in Immersive Mode with active scenario */}
                {!isDeveloperMode && activeScenario && (
                  <SceneBackground
                    scene={(activeScenario.sceneBackground?.preset as string) || "default"}
                    className="absolute inset-0 z-0 pointer-events-none"
                  />
                )}
                
                {/* Header - Different for Immersive vs Expert Mode */}
                {!isDeveloperMode ? (
                  <ImmersiveHeader
                    isDeveloperMode={isDeveloperMode}
                    onToggleMode={setIsDeveloperMode}
                    showHistory={showHistory}
                    onToggleHistory={() => setShowHistory(!showHistory)}
                    isLoggedIn={!!user}
                    agents={deployedAgents}
                    selectedAgent={selectedAgent}
                    onSelectAgent={handleAgentChange}
                    isLoadingAgents={isLoadingAgents}
                    hasActiveSession={!!chatSession}
                    activeScenario={activeScenario}
                    onSelectScenario={handleSelectScenario}
                    isIdle={currentPhase === "idle"}
                    messages={localMessages}
                    sessionId={chatSession?.id}
                  />
                ) : (
                  <div className="panel-header border-b border-border relative z-20">
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
                      
                      {/* Developer Mode Config */}
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
                      </div>
                      
                      {/* Mode Toggle - Segmented Controller */}
                      <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/50 border border-border/50">
                        <Button
                          variant={!isDeveloperMode ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "h-7 gap-1.5 text-xs rounded-md transition-all",
                            !isDeveloperMode && "shadow-sm"
                          )}
                          onClick={() => setIsDeveloperMode(false)}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">沉浸</span>
                        </Button>
                        <Button
                          variant={isDeveloperMode ? "default" : "ghost"}
                          size="sm"
                          className={cn(
                            "h-7 gap-1.5 text-xs rounded-md transition-all",
                            isDeveloperMode && "shadow-sm"
                          )}
                          onClick={() => setIsDeveloperMode(true)}
                        >
                          <Code2 className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">专家</span>
                        </Button>
                      </div>
                      
                      {/* DevTools Panel Toggle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={devToolsState.toggleCollapsed}
                        title={devToolsState.isCollapsed ? "展开开发者工具" : "折叠开发者工具"}
                      >
                        {devToolsState.isCollapsed ? (
                          <PanelBottomOpen className="h-4 w-4" />
                        ) : (
                          <PanelBottomClose className="h-4 w-4" />
                        )}
                      </Button>
                      
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
                )}

                {/* MPLP Protocol Status Bar (Stepper) - Only in Developer Mode */}
                {isDeveloperMode && (
                  <div className="px-4 py-3 bg-secondary/30 border-b border-border flex items-center justify-center">
                    <MPLPStepper currentPhase={currentPhase} />
                  </div>
                )}

                {/* Messages or Welcome Guide */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-0">
                  {localMessages.length === 0 && currentPhase === "idle" ? (
                    <div className="flex-1 flex items-center justify-center py-8">
                      <EnhancedWelcomeCard 
                        agent={selectedAgent} 
                        onQuickStart={(command) => {
                          setInput(command);
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      {localMessages.map(message => {
                        // Render Thinking Process card - Only in Developer Mode
                        if (message.role === "system" && message.thinkingLogs && message.thinkingLogs.length > 0) {
                          if (!isDeveloperMode) return null;
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
                            attachments={message.attachments}
                            agentAvatar={
                              selectedAgent?.manifest 
                                ? {
                                    iconId: (selectedAgent.manifest as any).iconId || "bot",
                                    colorId: (selectedAgent.manifest as any).colorId || "blue",
                                  }
                                : undefined
                            }
                            // Roleplay mode props
                            isRoleplay={!!activeScenario?.isMultiAgent}
                            roleName={
                              activeScenario?.isMultiAgent 
                                ? message.role === "user" 
                                  ? activeScenario.userRole || "用户"
                                  : activeScenario.agentRole || "Agent"
                                : undefined
                            }
                            avatarState={message.isNew && message.role === "assistant" ? avatarState : "idle"}
                            onRegenerate={
                              message.role === "assistant" && currentPhase === "idle"
                                ? () => {
                                    const messageIndex = localMessages.findIndex(m => m.id === message.id);
                                    if (messageIndex > 0) {
                                      const userMessage = localMessages
                                        .slice(0, messageIndex)
                                        .reverse()
                                        .find(m => m.role === "user");
                                      if (userMessage) {
                                        setLocalMessages(prev => prev.filter((_, i) => i < messageIndex));
                                        sendMessage(userMessage.content, userMessage.attachments);
                                      }
                                    }
                                  }
                                : undefined
                            }
                          />
                        );
                      })}
                      
                      {/* Typing Indicator with Animated Avatar */}
                      {(currentPhase === "executing" || isAILoading) && (
                        <div className="flex gap-3">
                          <AgentAvatarAnimated
                            iconId={(selectedAgent?.manifest as any)?.iconId || "bot"}
                            colorId={(selectedAgent?.manifest as any)?.colorId || "blue"}
                            state="thinking"
                            size="sm"
                            showGlow={true}
                          />
                          <div className="flex-1">
                            <TypingIndicator phase={
                              currentPhase === "confirm" ? "executing" : 
                              currentPhase === "idle" ? "executing" : 
                              currentPhase
                            } />
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border bg-card/80 backdrop-blur-sm relative z-20">
                  {/* Scenario Quick Prompts */}
                  {activeScenario?.suggestedPrompts && activeScenario.suggestedPrompts.length > 0 && currentPhase === "idle" && (
                    <ScenarioPrompts
                      prompts={activeScenario.suggestedPrompts}
                      onSelect={(prompt) => {
                        setInput(prompt);
                      }}
                      disabled={currentPhase !== "idle"}
                    />
                  )}
                  
                  {/* Quick Commands */}
                  {showQuickCommands && (
                    <div className="mb-3">
                      <QuickCommandMenu
                        isOpen={showQuickCommands}
                        onClose={() => setShowQuickCommands(false)}
                        onSelect={(cmd) => {
                          setInput(cmd);
                          setShowQuickCommands(false);
                        }}
                        filter={input.slice(1)}
                      />
                    </div>
                  )}

                  {/* Attachment Preview */}
                  {pendingFiles.length > 0 && (
                    <AttachmentPreview 
                      files={pendingFiles} 
                      onRemove={removeFile}
                      isUploading={isUploading}
                    />
                  )}
                  
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <FileUploadButton
                        onFilesSelected={addFiles}
                        disabled={currentPhase !== "idle" || isUploading}
                      />
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
                      disabled={(!input.trim() && pendingFiles.length === 0) || currentPhase !== "idle"}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">
                    输入 <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">/</kbd> 打开快捷命令 · 按 <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Enter</kbd> 发送
                    {isDeveloperMode && (
                      <span className="ml-2">
                        · <kbd className="px-1 py-0.5 bg-muted rounded text-[9px]">Ctrl+`</kbd> 切换工具面板
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </ResizablePanel>

          {/* Developer Tools Panel */}
          {isDeveloperMode && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel 
                defaultSize={35} 
                minSize={15} 
                maxSize={60}
                collapsible
                collapsedSize={0}
                onCollapse={() => devToolsState.setCollapsed(true)}
                onExpand={() => devToolsState.setCollapsed(false)}
              >
                <DevToolsPanel
                  renderTrace={renderTraceContent}
                  renderContext={renderContextContent}
                  renderCircuit={renderCircuitContent}
                  renderManus={() => (
                    <ManusMemoryPanel
                      agentId={selectedAgent?.id || null}
                      onUpdateFile={async () => true}
                    />
                  )}
                  onClose={() => setIsDeveloperMode(false)}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </>
  );
};

export default Runtime;
