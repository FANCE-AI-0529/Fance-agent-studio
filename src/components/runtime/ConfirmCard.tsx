import { Shield, AlertTriangle, Check, X, Clock, FileText, Network, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ConfirmAction {
  id: string;
  type: "write" | "network" | "execute" | "read";
  skillName: string;
  description: string;
  permissions: string[];
  riskLevel: "low" | "medium" | "high";
  details?: string;
}

interface ConfirmCardProps {
  action: ConfirmAction;
  onConfirm: () => void;
  onReject: () => void;
  isPending?: boolean;
}

const permissionIcons: Record<string, React.ElementType> = {
  write: FileText,
  network: Network,
  read: Database,
  execute: Shield,
};

const riskColors = {
  low: "text-status-executing bg-status-executing/10 border-status-executing/20",
  medium: "text-status-planning bg-status-planning/10 border-status-planning/20",
  high: "text-destructive bg-destructive/10 border-destructive/20",
};

const riskLabels = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};

export function ConfirmCard({ action, onConfirm, onReject, isPending }: ConfirmCardProps) {
  return (
    <div className="w-full max-w-md p-4 rounded-lg border-2 border-status-confirm/50 bg-status-confirm/5 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-status-confirm/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-status-confirm" />
          </div>
          <div>
            <div className="text-sm font-semibold">MPLP 确认请求</div>
            <div className="text-xs text-muted-foreground">需要您的授权才能继续</div>
          </div>
        </div>
        <Badge className={cn("text-[10px]", riskColors[action.riskLevel])}>
          {riskLabels[action.riskLevel]}
        </Badge>
      </div>

      {/* Action Details */}
      <div className="p-3 rounded-lg bg-card border border-border space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">技能:</span>
          <Badge variant="outline" className="text-xs">{action.skillName}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">操作:</span>
          <span className="text-sm font-medium">{action.description}</span>
        </div>
        {action.details && (
          <p className="text-xs text-muted-foreground bg-secondary/50 p-2 rounded">
            {action.details}
          </p>
        )}
      </div>

      {/* Required Permissions */}
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">所需权限:</div>
        <div className="flex flex-wrap gap-1">
          {action.permissions.map((perm) => {
            const Icon = permissionIcons[perm] || Shield;
            return (
              <Badge key={perm} variant="secondary" className="text-xs gap-1">
                <Icon className="h-3 w-3" />
                {perm}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Warning for high risk */}
      {action.riskLevel === "high" && (
        <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-xs text-destructive">
            此操作将修改数据，请确认您了解操作的影响
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={onReject}
          disabled={isPending}
        >
          <X className="h-3.5 w-3.5" />
          拒绝
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-1.5"
          onClick={onConfirm}
          disabled={isPending}
        >
          <Check className="h-3.5 w-3.5" />
          确认执行
        </Button>
      </div>

      {/* Timer */}
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>确认将在 30 秒后自动拒绝</span>
      </div>
    </div>
  );
}
