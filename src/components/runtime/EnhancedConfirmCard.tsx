import { useState, useEffect } from "react";
import { 
  Shield, 
  AlertTriangle, 
  Check, 
  X, 
  Clock, 
  FileText, 
  Network, 
  Database,
  Heart,
  Lock,
  Unlock,
  Info,
  Zap,
  Sparkles,
  Terminal,
  Plug,
} from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { Checkbox } from "../ui/checkbox.tsx";
import { Label } from "../ui/label.tsx";
import { Progress } from "../ui/progress.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { cn } from "../../lib/utils.ts";

export interface ConfirmAction {
  id: string;
  type: "write" | "network" | "execute" | "read" | "admin" | "mcp_tool";
  skillName: string;
  description: string;
  permissions: string[];
  riskLevel: "low" | "medium" | "high";
  details?: string;
  // MCP-specific fields
  isMCP?: boolean;
  mcpServer?: string;
  mcpTool?: string;
  mcpInputs?: Record<string, unknown>;
}

interface EnhancedConfirmCardProps {
  action: ConfirmAction;
  onConfirm: () => void;
  onReject: () => void;
  isPending?: boolean;
  timeoutSeconds?: number;
}

const riskConfig = {
  low: {
    color: "text-status-executing",
    bgColor: "bg-status-executing/10",
    borderColor: "border-status-executing/30",
    icon: Sparkles,
    label: "安全操作",
    labelEn: "Safe Operation",
    description: "这是一个低风险操作，不会修改任何数据",
    descriptionEn: "This is a low-risk operation that won't modify any data",
  },
  medium: {
    color: "text-status-planning",
    bgColor: "bg-status-planning/10",
    borderColor: "border-status-planning/30",
    icon: Info,
    label: "请确认",
    labelEn: "Please Confirm",
    description: "此操作会访问外部服务或修改数据",
    descriptionEn: "This operation will access external services or modify data",
  },
  high: {
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    icon: AlertTriangle,
    label: "高风险操作",
    labelEn: "High Risk Operation",
    description: "此操作可能产生不可逆影响，请仔细确认",
    descriptionEn: "This operation may have irreversible effects, please confirm carefully",
  },
};

const actionTypeConfig: Record<string, { icon: React.ElementType; label: string; labelEn: string; color: string }> = {
  read: { icon: Database, label: "读取数据", labelEn: "Read Data", color: "text-blue-500" },
  write: { icon: FileText, label: "写入数据", labelEn: "Write Data", color: "text-orange-500" },
  network: { icon: Network, label: "网络请求", labelEn: "Network Request", color: "text-purple-500" },
  execute: { icon: Zap, label: "执行脚本", labelEn: "Execute Script", color: "text-yellow-500" },
  admin: { icon: Lock, label: "管理操作", labelEn: "Admin Operation", color: "text-red-500" },
  mcp_tool: { icon: Terminal, label: "MCP 工具调用", labelEn: "MCP Tool Call", color: "text-purple-600" },
};

// Get risk level for MCP tools based on tool name
export function getMCPRiskLevel(mcpTool: string): "low" | "medium" | "high" {
  const highRiskTools = ["execute_command", "run_shell", "write_file", "delete", "rm", "remove", "drop", "truncate"];
  const lowRiskTools = ["list", "get", "read", "search", "query", "fetch"];
  
  const toolLower = mcpTool.toLowerCase();
  
  if (highRiskTools.some(t => toolLower.includes(t))) return "high";
  if (lowRiskTools.some(t => toolLower.includes(t))) return "low";
  return "medium"; // MCP defaults to medium
}

// Get permissions for MCP tools based on tool name
export function getMCPToolPermissions(mcpTool: string): string[] {
  const toolLower = mcpTool.toLowerCase();
  const permissions: string[] = [];
  
  if (toolLower.includes("execute") || toolLower.includes("shell") || toolLower.includes("run")) {
    permissions.push("execute", "file_system");
  }
  if (toolLower.includes("write") || toolLower.includes("create") || toolLower.includes("update")) {
    permissions.push("write");
  }
  if (toolLower.includes("read") || toolLower.includes("get") || toolLower.includes("list")) {
    permissions.push("read");
  }
  if (toolLower.includes("delete") || toolLower.includes("remove") || toolLower.includes("drop")) {
    permissions.push("delete", "admin");
  }
  if (toolLower.includes("network") || toolLower.includes("fetch") || toolLower.includes("api")) {
    permissions.push("network");
  }
  
  return permissions.length > 0 ? permissions : ["mcp_access"];
}

export function EnhancedConfirmCard({ 
  action, 
  onConfirm, 
  onReject, 
  isPending,
  timeoutSeconds,
}: EnhancedConfirmCardProps) {
  const [rememberChoice, setRememberChoice] = useState(false);
  
  // Adjust timeout based on risk level if not provided
  const defaultTimeout = action.riskLevel === "high" ? 30 : action.riskLevel === "medium" ? 20 : 15;
  const timeout = timeoutSeconds ?? defaultTimeout;
  const [countdown, setCountdown] = useState(timeout);

  const config = riskConfig[action.riskLevel];
  const actionConfig = actionTypeConfig[action.type] || actionTypeConfig.read;
  const RiskIcon = config.icon;
  const ActionIcon = action.isMCP ? Terminal : actionConfig.icon;

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) {
      onReject();
      return;
    }
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, onReject]);

  const progressValue = (countdown / timeout) * 100;

  return (
    <div className={cn(
      "w-full max-w-md rounded-xl border-2 overflow-hidden transition-all",
      config.borderColor,
      config.bgColor,
    )}>
      {/* 进度条 */}
      <Progress 
        value={progressValue} 
        className={cn(
          "h-1 rounded-none",
          action.riskLevel === "high" && progressValue < 30 && "bg-destructive/30"
        )}
      />

      <div className="p-4 space-y-4">
        {/* 头部 - 情感化设计 */}
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            config.bgColor
          )}>
            <RiskIcon className={cn("h-6 w-6", config.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className={cn("font-semibold", config.color)}>
                {action.isMCP ? "MCP 工具调用确认" : config.label}
              </h3>
              <Badge variant="outline" className={cn("text-[10px]", config.borderColor, config.color)}>
                {countdown}秒
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {action.isMCP 
                ? "此操作将调用外部 MCP 服务器执行命令"
                : config.description}
            </p>
          </div>
        </div>

        {/* 操作详情卡片 */}
        <div className="p-3 rounded-lg bg-card border border-border space-y-3">
          {/* 技能和操作类型 */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              action.isMCP ? "bg-purple-500/10" : config.bgColor
            )}>
              <ActionIcon className={cn("h-4 w-4", action.isMCP ? "text-purple-600" : actionConfig.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{action.skillName}</span>
                {action.isMCP && (
                  <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/30">
                    MCP
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px]">
                  {action.isMCP ? "MCP 工具" : actionConfig.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{action.description}</p>
            </div>
          </div>

          {/* MCP-specific details */}
          {action.isMCP && action.mcpServer && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center gap-2 text-xs">
                <Plug className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">服务器:</span>
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                  {action.mcpServer}
                </code>
              </div>
              {action.mcpTool && (
                <div className="flex items-center gap-2 text-xs">
                  <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">工具:</span>
                  <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                    {action.mcpTool}
                  </code>
                </div>
              )}
              {action.mcpInputs && Object.keys(action.mcpInputs).length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    输入参数:
                  </span>
                  <ScrollArea className="max-h-24">
                    <pre className="text-[10px] p-2 bg-muted rounded font-mono overflow-x-auto">
                      {JSON.stringify(action.mcpInputs, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}

          {/* 详细说明（可展开） */}
          {action.details && (
            <div 
              className={cn(
                "p-2.5 rounded-lg text-sm transition-all",
                action.riskLevel === "high" 
                  ? "bg-destructive/10 text-destructive" 
                  : "bg-secondary/50 text-muted-foreground"
              )}
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>{action.details}</p>
              </div>
            </div>
          )}

          {/* 权限列表 */}
          <div className="flex flex-wrap gap-1.5">
            {action.permissions.map((perm) => (
              <Badge 
                key={perm} 
                variant="outline" 
                className="text-xs gap-1 bg-background"
              >
                <Lock className="h-2.5 w-2.5" />
                {perm}
              </Badge>
            ))}
          </div>
        </div>

        {/* 记住选择选项 */}
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            id="remember"
            checked={rememberChoice}
            onCheckedChange={(checked) => setRememberChoice(checked as boolean)}
          />
          <Label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer">
            {action.isMCP 
              ? "记住此工具的选择（同一会话内）"
              : `记住我的选择，下次自动${action.riskLevel === "high" ? "询问" : "执行"}`}
          </Label>
        </div>

        {/* 操作按钮 - 情感化设计 */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2 h-11"
            onClick={onReject}
            disabled={isPending}
          >
            <X className="h-4 w-4" />
            <span>不，取消</span>
          </Button>
          <Button
            className={cn(
              "flex-1 gap-2 h-11",
              action.riskLevel === "high" && "bg-destructive hover:bg-destructive/90"
            )}
            onClick={onConfirm}
            disabled={isPending}
          >
            <Check className="h-4 w-4" />
            <span>是的，继续</span>
          </Button>
        </div>

        {/* 友好提示 */}
        <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <Heart className="h-3 w-3" />
          您的安全是我们的首要任务
        </p>
      </div>
    </div>
  );
}

// 简化版确认卡片（用于低风险操作）
export function SimpleConfirmCard({
  action,
  onConfirm,
  onReject,
}: {
  action: ConfirmAction;
  onConfirm: () => void;
  onReject: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
      <Sparkles className="h-4 w-4 text-primary" />
      <span className="text-sm">{action.description}</span>
      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onReject}>
        取消
      </Button>
      <Button size="sm" className="h-7 px-3 gap-1" onClick={onConfirm}>
        <Check className="h-3 w-3" />
        确认
      </Button>
    </div>
  );
}

// 导出原有的 ConfirmCard 以保持兼容性
export { EnhancedConfirmCard as ConfirmCard };
