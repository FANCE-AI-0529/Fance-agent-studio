import { useState } from "react";
import { Shield, AlertTriangle, CheckCircle, Clock, Filter, RefreshCw, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AuditLogTable } from "./AuditLogTable";
import { format, subDays, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

interface SecurityStats {
  totalEvents: number;
  successfulLogins: number;
  failedLogins: number;
  recentAlerts: number;
}

export function SecurityAuditDashboard() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState("7");
  const [activeTab, setActiveTab] = useState("overview");

  // 获取安全统计
  const { data: stats, isLoading: loadingStats, refetch } = useQuery({
    queryKey: ["security-stats", user?.id, timeRange],
    queryFn: async (): Promise<SecurityStats> => {
      if (!user?.id) {
        return { totalEvents: 0, successfulLogins: 0, failedLogins: 0, recentAlerts: 0 };
      }

      const startDate = subDays(new Date(), parseInt(timeRange));

      const { data, error } = await supabase
        .from("security_audit_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString());

      if (error) throw error;

      const logs = data || [];
      const successfulLogins = logs.filter(
        (l) => l.event_type === "login_success"
      ).length;
      const failedLogins = logs.filter(
        (l) => l.event_type === "login_failed"
      ).length;
      const recentAlerts = logs.filter((l) => !l.success).length;

      return {
        totalEvents: logs.length,
        successfulLogins,
        failedLogins,
        recentAlerts,
      };
    },
    enabled: !!user?.id,
  });

  // 获取最近的安全事件
  const { data: recentEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["security-events-recent", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("security_audit_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const getEventIcon = (eventType: string, success: boolean) => {
    if (!success) {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    if (eventType.includes("login")) {
      return <CheckCircle className="h-4 w-4 text-status-executing" />;
    }
    return <Shield className="h-4 w-4 text-primary" />;
  };

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      login_success: "登录成功",
      login_failed: "登录失败",
      signup_success: "注册成功",
      signup_failed: "注册失败",
      logout: "退出登录",
      password_change: "密码修改",
      password_reset_request: "密码重置请求",
      password_reset_complete: "密码重置完成",
      profile_update: "资料更新",
      permission_change: "权限变更",
      api_key_created: "API密钥创建",
      api_key_deleted: "API密钥删除",
      agent_created: "智能体创建",
      agent_deleted: "智能体删除",
      agent_published: "智能体发布",
      sensitive_data_access: "敏感数据访问",
    };
    return labels[eventType] || eventType;
  };

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            安全审计
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            查看和管理您的账户安全事件
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">近 7 天</SelectItem>
              <SelectItem value="30">近 30 天</SelectItem>
              <SelectItem value="90">近 90 天</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Shield className="h-5 w-5" />}
          label="总事件数"
          value={stats?.totalEvents || 0}
          loading={loadingStats}
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5 text-status-executing" />}
          label="成功登录"
          value={stats?.successfulLogins || 0}
          loading={loadingStats}
          variant="success"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          label="失败尝试"
          value={stats?.failedLogins || 0}
          loading={loadingStats}
          variant="danger"
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          label="安全告警"
          value={stats?.recentAlerts || 0}
          loading={loadingStats}
          variant="warning"
        />
      </div>

      {/* 详细内容 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="logs">详细日志</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">最近安全事件</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingEvents ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : recentEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无安全事件记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getEventIcon(event.event_type, event.success)}
                        <div>
                          <p className="font-medium text-sm">
                            {getEventLabel(event.event_type)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(event.created_at), "M月d日 HH:mm", {
                              locale: zhCN,
                            })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={event.success ? "secondary" : "destructive"}
                        className="text-[10px]"
                      >
                        {event.success ? "成功" : "失败"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <AuditLogTable timeRange={parseInt(timeRange)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading?: boolean;
  variant?: "default" | "success" | "danger" | "warning";
}) {
  const variantColors = {
    default: "bg-primary/10 text-primary",
    success: "bg-status-executing/10 text-status-executing",
    danger: "bg-destructive/10 text-destructive",
    warning: "bg-amber-500/10 text-amber-500",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${variantColors[variant]}`}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            {loading ? (
              <div className="h-6 w-12 bg-muted animate-pulse rounded mt-1" />
            ) : (
              <p className="text-lg font-semibold">{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
