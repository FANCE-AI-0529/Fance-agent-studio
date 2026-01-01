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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ConfirmAction {
  id: string;
  type: "write" | "network" | "execute" | "read" | "admin";
  skillName: string;
  description: string;
  permissions: string[];
  riskLevel: "low" | "medium" | "high";
  details?: string;
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
    description: "这是一个低风险操作，不会修改任何数据",
  },
  medium: {
    color: "text-status-planning",
    bgColor: "bg-status-planning/10",
    borderColor: "border-status-planning/30",
    icon: Info,
    label: "请确认",
    description: "此操作会访问外部服务或修改数据",
  },
  high: {
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    icon: AlertTriangle,
    label: "高风险操作",
    description: "此操作可能产生不可逆影响，请仔细确认",
  },
};

const actionTypeConfig: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  read: { icon: Database, label: "读取数据", color: "text-blue-500" },
  write: { icon: FileText, label: "写入数据", color: "text-orange-500" },
  network: { icon: Network, label: "网络请求", color: "text-purple-500" },
  execute: { icon: Zap, label: "执行脚本", color: "text-yellow-500" },
  admin: { icon: Lock, label: "管理操作", color: "text-red-500" },
};

export function EnhancedConfirmCard({ 
  action, 
  onConfirm, 
  onReject, 
  isPending,
  timeoutSeconds = 30,
}: EnhancedConfirmCardProps) {
  const [rememberChoice, setRememberChoice] = useState(false);
  const [countdown, setCountdown] = useState(timeoutSeconds);
  const [isExpanded, setIsExpanded] = useState(false);

  const config = riskConfig[action.riskLevel];
  const actionConfig = actionTypeConfig[action.type] || actionTypeConfig.read;
  const RiskIcon = config.icon;
  const ActionIcon = actionConfig.icon;

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

  const progressValue = (countdown / timeoutSeconds) * 100;

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
                {config.label}
              </h3>
              <Badge variant="outline" className={cn("text-[10px]", config.borderColor, config.color)}>
                {countdown}秒
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {config.description}
            </p>
          </div>
        </div>

        {/* 操作详情卡片 */}
        <div className="p-3 rounded-lg bg-card border border-border space-y-3">
          {/* 技能和操作类型 */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              config.bgColor
            )}>
              <ActionIcon className={cn("h-4 w-4", actionConfig.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{action.skillName}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {actionConfig.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
          </div>

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
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
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
            记住我的选择，下次自动{action.riskLevel === "high" ? "询问" : "执行"}
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
