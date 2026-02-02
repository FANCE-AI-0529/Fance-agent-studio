import { useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Shield, AlertTriangle, CheckCircle, Monitor, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";

interface AuditLogTableProps {
  timeRange?: number;
}

const eventTypeLabels: Record<string, string> = {
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

const eventCategoryLabels: Record<string, string> = {
  authentication: "认证",
  authorization: "授权",
  data_access: "数据访问",
  configuration: "配置",
  general: "通用",
};

export function AuditLogTable({ timeRange = 30 }: AuditLogTableProps) {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["security-audit-logs", user?.id, timeRange, page, categoryFilter],
    queryFn: async () => {
      if (!user?.id) return { logs: [], total: 0 };

      const startDate = subDays(new Date(), timeRange);

      let query = supabase
        .from("security_audit_logs")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (categoryFilter !== "all") {
        query = query.eq("event_category", categoryFilter);
      }

      const { data, error, count } = await query
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;

      return {
        logs: data || [],
        total: count || 0,
      };
    },
    enabled: !!user?.id,
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // 过滤搜索结果
  const filteredLogs = searchQuery
    ? logs.filter(
        (log) =>
          eventTypeLabels[log.event_type]?.includes(searchQuery) ||
          log.event_type.includes(searchQuery) ||
          log.user_agent?.includes(searchQuery)
      )
    : logs;

  const getEventIcon = (eventType: string, success: boolean) => {
    if (!success) {
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
    if (eventType.includes("login") || eventType.includes("signup")) {
      return <CheckCircle className="h-4 w-4 text-status-executing" />;
    }
    return <Shield className="h-4 w-4 text-primary" />;
  };

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return { browser: "未知", os: "未知" };
    
    let browser = "未知";
    let os = "未知";

    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return { browser, os };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">审计日志</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索事件..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-48"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="authentication">认证</SelectItem>
                <SelectItem value="authorization">授权</SelectItem>
                <SelectItem value="data_access">数据访问</SelectItem>
                <SelectItem value="configuration">配置</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>暂无审计日志</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>事件类型</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>设备信息</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead className="w-20">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const { browser, os } = parseUserAgent(log.user_agent);
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          {getEventIcon(log.event_type, log.success)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {eventTypeLabels[log.event_type] || log.event_type}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {eventCategoryLabels[log.event_category] || log.event_category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Monitor className="h-3.5 w-3.5" />
                                <span>{browser}</span>
                                <span className="text-muted-foreground/50">|</span>
                                <Globe className="h-3.5 w-3.5" />
                                <span>{os}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs max-w-xs break-all">
                                {log.user_agent || "未知设备"}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(parseISO(log.created_at), "M月d日 HH:mm:ss", {
                            locale: zhCN,
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={log.success ? "secondary" : "destructive"}
                            className="text-[10px]"
                          >
                            {log.success ? "成功" : "失败"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  共 {total} 条记录
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
