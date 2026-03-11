// =====================================================
// MPLP 合规报告面板
// Compliance Report Panel for MPLP Policy Check
// =====================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Trash2,
  Edit,
  CreditCard,
  Globe,
  Terminal,
  Database,
  ChevronDown,
  ChevronRight,
  Info,
  Wrench,
} from "lucide-react";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible.tsx";
import { cn } from "../../lib/utils.ts";
import type { RiskLevel } from "../../types/workflowDSL.ts";
import type { ComplianceReport, PermissionMeta } from "../../utils/policyInjector.ts";

// ========== 类型定义 ==========

interface ComplianceReportPanelProps {
  report: ComplianceReport | null;
  permissions: string[];
  permissionMeta?: Record<string, PermissionMeta>;
  className?: string;
  compact?: boolean;
}

// ========== 图标映射 ==========

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Eye: Eye,
  Edit: Edit,
  Trash2: Trash2,
  Globe: Globe,
  CreditCard: CreditCard,
  Terminal: Terminal,
  Database: Database,
  Shield: Shield,
  Wrench: Wrench,
};

// ========== 风险级别颜色 ==========

const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  low: {
    bg: "bg-green-500/10",
    text: "text-green-500",
    border: "border-green-500/30",
  },
  medium: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-500",
    border: "border-yellow-500/30",
  },
  high: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    border: "border-red-500/30",
  },
};

// ========== 主组件 ==========

export function ComplianceReportPanel({
  report,
  permissions,
  permissionMeta = {},
  className,
  compact = false,
}: ComplianceReportPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    status: true,
    operations: true,
    autoFix: true,
    permissions: true,
    recommendations: false,
  });

  if (!report) {
    return (
      <div className={cn("p-4 text-center text-muted-foreground text-sm", className)}>
        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>暂无合规检查报告</p>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const statusConfig = report.isCompliant
    ? {
        icon: CheckCircle,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/30",
        label: "合规通过",
        description: "所有高危操作均已受到保护",
      }
    : {
        icon: AlertTriangle,
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/30",
        label: "需要关注",
        description: `${report.unprotectedOperations.length} 个操作需要人工确认`,
      };

  const StatusIcon = statusConfig.icon;

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="p-4 space-y-4">
        {/* 合规状态卡片 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-lg border",
            statusConfig.bgColor,
            statusConfig.borderColor
          )}
        >
          <div className="flex items-center gap-3">
            <StatusIcon className={cn("h-6 w-6", statusConfig.color)} />
            <div className="flex-1">
              <p className={cn("font-semibold", statusConfig.color)}>
                {statusConfig.label}
              </p>
              <p className="text-sm text-muted-foreground">
                {statusConfig.description}
              </p>
            </div>
          </div>

          {/* 快速统计 */}
          <div className="mt-3 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">高危操作:</span>
              <Badge variant="outline" className={report.totalRiskyOperations > 0 ? "text-red-500 border-red-500/50" : ""}>
                {report.totalRiskyOperations}
              </Badge>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">已保护:</span>
              <Badge variant="outline" className="text-green-500 border-green-500/50">
                {report.protectedOperations}
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* 自动修复日志 */}
        {report.autoFixedOperations.length > 0 && (
          <Collapsible
            open={expandedSections.autoFix}
            onOpenChange={() => toggleSection("autoFix")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto hover:bg-secondary/50"
              >
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">自动修复日志</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {report.autoFixedOperations.length}
                  </Badge>
                  {expandedSections.autoFix ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2 pt-2"
              >
                {report.autoFixedOperations.map((op, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-md bg-blue-500/5 border border-blue-500/20 text-sm"
                  >
                    <CheckCircle className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{op}</span>
                  </div>
                ))}
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* 未保护操作 */}
        {report.unprotectedOperations.length > 0 && (
          <Collapsible
            open={expandedSections.operations}
            onOpenChange={() => toggleSection("operations")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto hover:bg-secondary/50"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-sm">需关注操作</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-[10px]">
                    {report.unprotectedOperations.length}
                  </Badge>
                  {expandedSections.operations ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2 pt-2"
              >
                {report.unprotectedOperations.map((op, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-md bg-yellow-500/5 border border-yellow-500/20 text-sm"
                  >
                    <XCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{op}</span>
                  </div>
                ))}
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* 权限声明 */}
        {permissions.length > 0 && (
          <Collapsible
            open={expandedSections.permissions}
            onOpenChange={() => toggleSection("permissions")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto hover:bg-secondary/50"
              >
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">权限声明</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {permissions.length}
                  </Badge>
                  {expandedSections.permissions ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap gap-2 pt-2"
              >
                {permissions.map((perm) => {
                  const meta = permissionMeta[perm];
                  const IconComponent = meta?.icon ? ICON_MAP[meta.icon] || Shield : Shield;
                  const riskColors = RISK_COLORS[meta?.riskLevel || "low"];

                  return (
                    <Badge
                      key={perm}
                      variant="outline"
                      className={cn(
                        "gap-1.5 py-1.5 px-2.5",
                        riskColors.text,
                        riskColors.border,
                        riskColors.bg
                      )}
                    >
                      <IconComponent className="h-3 w-3" />
                      <span>{meta?.label || perm}</span>
                    </Badge>
                  );
                })}
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* 建议列表 */}
        {report.recommendations.length > 0 && !compact && (
          <Collapsible
            open={expandedSections.recommendations}
            onOpenChange={() => toggleSection("recommendations")}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-3 h-auto hover:bg-secondary/50"
              >
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">优化建议</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {report.recommendations.length}
                  </Badge>
                  {expandedSections.recommendations ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-2 pt-2"
              >
                {report.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 rounded-md bg-muted/50 text-sm"
                  >
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{rec}</span>
                  </div>
                ))}
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </ScrollArea>
  );
}

// ========== 紧凑版权限标签组件 ==========

export function PermissionBadges({
  permissions,
  permissionMeta = {},
  maxDisplay = 5,
  className,
}: {
  permissions: string[];
  permissionMeta?: Record<string, PermissionMeta>;
  maxDisplay?: number;
  className?: string;
}) {
  const displayPermissions = permissions.slice(0, maxDisplay);
  const remainingCount = permissions.length - maxDisplay;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {displayPermissions.map((perm) => {
        const meta = permissionMeta[perm];
        const IconComponent = meta?.icon ? ICON_MAP[meta.icon] || Shield : Shield;
        const riskColors = RISK_COLORS[meta?.riskLevel || "low"];

        return (
          <Badge
            key={perm}
            variant="outline"
            className={cn(
              "gap-1 text-[10px] py-0.5 px-1.5",
              riskColors.text,
              riskColors.border
            )}
          >
            <IconComponent className="h-2.5 w-2.5" />
            {meta?.label || perm}
          </Badge>
        );
      })}
      {remainingCount > 0 && (
        <Badge variant="outline" className="text-[10px] py-0.5 px-1.5">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
}

export default ComplianceReportPanel;
